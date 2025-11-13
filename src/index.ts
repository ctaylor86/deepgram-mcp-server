/**
 * Deepgram MCP Server
 * 
 * A Model Context Protocol server for Deepgram's Async Speech-to-Text API
 * Uses webhook relay to store and retrieve transcripts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DeepgramClient } from "./deepgram-client.js";
import { Logger } from "./logger.js";
import axios from "axios";

// Configuration schema for the MCP server
export const configSchema = z.object({
  deepgramApiKey: z.string().describe("Your Deepgram API key for speech-to-text transcription (must have Member role or higher for full functionality)"),
  webhookUrl: z.string().describe("Your webhook relay URL (e.g., https://your-worker.workers.dev/callback) - see deepgram-webhook-relay project"),
  projectId: z.string().optional().describe("Optional: Your Deepgram project ID. If not provided, will be auto-detected from your API key."),
});

export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "Deepgram Async Transcription",
    version: "2.0.0",
  });

  // Initialize Deepgram client
  const deepgramClient = new DeepgramClient({
    apiKey: config.deepgramApiKey,
    projectId: config.projectId,
  });

  // Initialize logger
  const logger = new Logger(config.webhookUrl, true);

  // Tool 1: Submit Transcription Job
  server.registerTool(
    "submit_transcription_job",
    {
      title: "Submit Transcription Job",
      description: "Submit an audio or video URL for async transcription with Deepgram. Returns a request_id that can be used to check status and retrieve results. Perfect for long videos and podcasts that would timeout with synchronous processing.",
      inputSchema: {
        url: z.string().describe("Publicly accessible URL to the audio or video file to transcribe"),
        diarize: z.boolean().optional().describe("Enable speaker diarization to detect different speakers (default: false)"),
        smart_format: z.boolean().optional().describe("Apply smart formatting to improve readability (default: true)"),
        punctuate: z.boolean().optional().describe("Add punctuation and capitalization (default: true)"),
        paragraphs: z.boolean().optional().describe("Split transcript into paragraphs for better readability (default: true)"),
        utterances: z.boolean().optional().describe("Segment speech into meaningful semantic units (default: false)"),
        sentiment: z.boolean().optional().describe("Detect sentiment throughout the transcript (default: false)"),
        summarize: z.union([z.boolean(), z.string()]).optional().describe("Generate a summary of the content (default: false)"),
        topics: z.boolean().optional().describe("Detect topics throughout the transcript (default: false)"),
        detect_entities: z.boolean().optional().describe("Identify and extract key entities like names, places, organizations (default: false)"),
        filler_words: z.boolean().optional().describe("Include filler words like 'uh' and 'um' in the transcript (default: false)"),
        language: z.string().optional().describe("Language code (BCP-47 format, e.g., 'en', 'es', 'fr') (default: 'en')"),
        model: z.string().optional().describe("AI model to use for transcription (e.g., 'nova-2', 'nova-3', 'whisper') (default: 'nova-3')"),
      },
    },
    async ({
      url,
      diarize,
      smart_format,
      punctuate,
      paragraphs,
      utterances,
      sentiment,
      summarize,
      topics,
      detect_entities,
      filler_words,
      language,
      model,
    }) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();
      
      try {
        // Log request received
        await logger.logRequestReceived('submit_transcription_job', requestId, { url, model: model || 'nova-3' });
        
        // Submit transcription with callback to webhook relay
        const apiStartTime = Date.now();
        const result = await deepgramClient.submitTranscription({
          url,
          diarize,
          smart_format: smart_format !== undefined ? smart_format : true,
          punctuate: punctuate !== undefined ? punctuate : true,
          paragraphs: paragraphs !== undefined ? paragraphs : true,
          utterances,
          sentiment,
          summarize,
          topics,
          detect_entities,
          filler_words,
          language,
          model: model || 'nova-3',
          callback: config.webhookUrl,
        });
        
        // Log external API call
        await logger.logExternalApiCall('deepgram', requestId, Date.now() - apiStartTime, 200);

        // Build feature list for user feedback
        const enabledFeatures = [];
        if (diarize) enabledFeatures.push("Speaker Diarization");
        if (sentiment) enabledFeatures.push("Sentiment Analysis");
        if (topics) enabledFeatures.push("Topic Detection");
        if (detect_entities) enabledFeatures.push("Entity Extraction");
        if (summarize) enabledFeatures.push("Summarization");

        let response = `✅ Transcription job submitted successfully!\n\n`;
        response += `**Request ID**: \`${result.request_id}\`\n\n`;
        response += `**Audio URL**: ${url}\n`;
        response += `**Model**: ${model || 'nova-3'}\n`;
        if (enabledFeatures.length > 0) {
          response += `**Features Enabled**: ${enabledFeatures.join(", ")}\n`;
        }
        response += `\n---\n\n`;
        response += `⏳ **Processing**: Deepgram is transcribing your audio asynchronously.\n\n`;
        response += `**Next Steps**:\n`;
        response += `1. Wait 30-60 seconds for processing to complete\n`;
        response += `2. Use the \`check_job_status\` tool with request_id: \`${result.request_id}\`\n`;
        response += `3. Poll every 30 seconds until transcript is ready\n\n`;
        response += `💡 **Tip**: For a 1-hour video, expect ~2-3 minutes processing time.`;

        // Log response sent
        await logger.logResponseSent('submit_transcription_job', requestId, Date.now() - startTime, response.length);

        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      } catch (error: any) {
        // Log error
        await logger.logError('submit_transcription_job', requestId, error);
        
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to submit transcription job: ${error.message}\n\n` +
                    `**Troubleshooting**:\n` +
                    `- Verify the URL is publicly accessible\n` +
                    `- Check that the file format is supported (MP3, WAV, MP4, etc.)\n` +
                    `- Ensure your Deepgram account has sufficient credits\n` +
                    `- Verify your API key has proper permissions\n` +
                    `- Check that your webhook URL is correct and accessible`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 2: Check Job Status
  server.registerTool(
    "check_job_status",
    {
      title: "Check Job Status",
      description: "Check the status of a transcription job and retrieve the transcript when ready. Poll this endpoint every 30 seconds until the transcript is available.",
      inputSchema: {
        request_id: z.string().describe("The request ID returned from submit_transcription_job"),
      },
    },
    async ({ request_id }) => {
      const startTime = Date.now();
      
      try {
        // Log request received
        await logger.logRequestReceived('check_job_status', request_id);
        
        // Try to retrieve from webhook relay first
        const webhookRetrievalUrl = config.webhookUrl.replace('/callback', `/transcript/${request_id}`);
        
        try {
          const webhookResponse = await axios.get(webhookRetrievalUrl);
          const data = webhookResponse.data;
          
          if (data.transcript && data.transcript.results) {
            // Transcript is ready!
            const transcript = data.transcript.results.channels[0].alternatives[0];
            const metadata = data.transcript.metadata;
            
            let response = `✅ **Transcription Complete!**\n\n`;
            response += `**Request ID**: ${request_id}\n`;
            response += `**Duration**: ${metadata.duration?.toFixed(2)}s\n`;
            response += `**Model**: ${metadata.model_info?.name || 'nova-3'}\n`;
            response += `**Channels**: ${metadata.channels}\n`;
            response += `**Stored At**: ${data.stored_at}\n`;
            response += `\n---\n\n`;
            response += `**Full Transcript**:\n\n${transcript.transcript}\n\n`;

            // Add paragraphs if available
            if (transcript.paragraphs?.paragraphs && transcript.paragraphs.paragraphs.length > 0) {
              response += `\n---\n\n**Paragraphs** (${transcript.paragraphs.paragraphs.length}):\n\n`;
              transcript.paragraphs.paragraphs.forEach((para: any, idx: number) => {
                response += `**Paragraph ${idx + 1}** (${para.start.toFixed(2)}s - ${para.end.toFixed(2)}s):\n`;
                response += `${para.sentences.map((s: any) => s.text).join(" ")}\n\n`;
              });
            }

            // Add sentiment if available
            if (transcript.sentiment_segments && transcript.sentiment_segments.length > 0) {
              response += `\n---\n\n**Sentiment Analysis**:\n\n`;
              transcript.sentiment_segments.forEach((seg: any) => {
                const emoji = seg.sentiment === 'positive' ? '😊' : seg.sentiment === 'negative' ? '😞' : '😐';
                response += `${emoji} ${seg.sentiment} (${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s): "${seg.text}"\n`;
              });
            }

            // Add topics if available
            if (data.transcript.results.topics?.segments && data.transcript.results.topics.segments.length > 0) {
              response += `\n---\n\n**Topics Detected**:\n\n`;
              data.transcript.results.topics.segments.forEach((seg: any) => {
                response += `📌 ${seg.text} (${seg.start_word})\n`;
              });
            }

            // Add entities if available
            if (data.transcript.results.entities && data.transcript.results.entities.length > 0) {
              response += `\n---\n\n**Entities Extracted**:\n\n`;
              data.transcript.results.entities.forEach((entity: any) => {
                response += `🏷️ **${entity.label}**: ${entity.value}\n`;
              });
            }

            // Add summary if available
            if (data.transcript.results.summary) {
              response += `\n---\n\n**Summary**:\n\n${data.transcript.results.summary.text}\n`;
            }

            // Log response sent
            await logger.logResponseSent('check_job_status', request_id, Date.now() - startTime, response.length);

            return {
              content: [
                {
                  type: "text",
                  text: response,
                },
              ],
            };
          }
        } catch (webhookError: any) {
          // If 404, transcript not ready yet - this is normal, job is still processing
          if (webhookError.response?.status === 404) {
            // Log still processing
            await logger.log('still_processing', { request_id, duration_ms: Date.now() - startTime });
            
            return {
              content: [
                {
                  type: "text",
                  text: `⏳ **Still Processing**\n\n` +
                        `**Request ID**: ${request_id}\n\n` +
                        `Deepgram is still transcribing your audio. This is normal for longer files.\n\n` +
                        `**Next Steps**:\n` +
                        `- Wait 30 seconds\n` +
                        `- Check status again using this same request_id\n` +
                        `- Repeat until transcript is ready\n\n` +
                        `💡 **Estimated times**: 5min video → 30-60s | 30min video → 1-2min | 1hr video → 2-3min`,
                },
              ],
            };
          }
          
          // Other webhook errors (relay down, network issues, etc.)
          if (webhookError.code === 'ECONNREFUSED' || webhookError.code === 'ENOTFOUND') {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ **Webhook Relay Unreachable**\n\n` +
                        `**Request ID**: ${request_id}\n\n` +
                        `Cannot connect to webhook relay at: ${webhookRetrievalUrl}\n\n` +
                        `**Troubleshooting**:\n` +
                        `- Verify your webhook relay is deployed and running\n` +
                        `- Check the webhook URL in your configuration\n` +
                        `- Test the health endpoint: ${config.webhookUrl.replace('/callback', '/health')}\n` +
                        `- Ensure the Cloudflare Worker is not paused or deleted`,
                },
              ],
              isError: true,
            };
          }
          
          // Other unexpected webhook error
          throw webhookError;
        }

        // Should not reach here
        return {
          content: [
            {
              type: "text",
              text: `❓ Unexpected response format from webhook relay`,
            },
          ],
        };
      } catch (error: any) {
        // Log error
        await logger.logError('check_job_status', request_id, error);
        
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to check job status: ${error.message}\n\n` +
                    `**Troubleshooting**:\n` +
                    `- Verify the request_id is correct\n` +
                    `- Check that your webhook relay is deployed and accessible\n` +
                    `- Ensure your API key has proper permissions\n` +
                    `- Try again in 30 seconds if job is still processing`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 3: Test Connection
  server.registerTool(
    "test_deepgram_connection",
    {
      title: "Test Deepgram Connection",
      description: "Test the connection to Deepgram API and verify your API key is working correctly.",
      inputSchema: {},
    },
    async () => {
      try {
        const result = await deepgramClient.testConnection();
        
        // Also test webhook relay
        let webhookStatus = "❓ Not tested";
        try {
          const webhookHealthUrl = config.webhookUrl.replace('/callback', '/health');
          const webhookResponse = await axios.get(webhookHealthUrl, { timeout: 5000 });
          if (webhookResponse.status === 200) {
            webhookStatus = "✅ Healthy";
          }
        } catch (webhookError) {
          webhookStatus = "❌ Unreachable";
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Connection successful!\n\n` +
                    `**Deepgram API**: Connected and authenticated\n` +
                    `**Webhook Relay**: ${webhookStatus}\n` +
                    `**Webhook URL**: ${config.webhookUrl}\n\n` +
                    `Your setup is ready to transcribe audio and video files!`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Connection failed: ${error.message}\n\n` +
                    `**Troubleshooting**:\n` +
                    `- Verify your Deepgram API key is correct\n` +
                    `- Check that your Deepgram account is active\n` +
                    `- Ensure you have credits in your account\n` +
                    `- Verify your webhook URL is correct and deployed\n` +
                    `- Visit https://console.deepgram.com to manage your account`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
