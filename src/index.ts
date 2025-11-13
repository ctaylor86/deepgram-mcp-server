/**
 * Deepgram MCP Server
 * 
 * This MCP server provides async speech-to-text transcription using Deepgram's API.
 * Perfect for marketers transcribing videos and podcasts with advanced features like
 * diarization, sentiment analysis, topic detection, and more.
 * 
 * Documentation:
 * - Deepgram API: https://developers.deepgram.com/
 * - Smithery MCP: https://smithery.ai/docs/getting_started/quickstart_build_typescript
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DeepgramClient } from "./deepgram-client.js";

// Configuration schema for the MCP server
export const configSchema = z.object({
  deepgramApiKey: z.string().describe("Your Deepgram API key for speech-to-text transcription"),
});

export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "Deepgram Async Transcription",
    version: "1.0.0",
  });

  // Initialize Deepgram client
  const deepgramClient = new DeepgramClient({
    apiKey: config.deepgramApiKey,
  });

  // Tool 1: Submit Transcription Job
  server.registerTool(
    "submit_transcription_job",
    {
      title: "Submit Transcription Job",
      description: "Submit an audio or video URL for async transcription with Deepgram. Supports various features like speaker diarization, sentiment analysis, topic detection, and more. Perfect for transcribing marketing videos and podcasts.",
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
      try {
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
        });

        // Build feature list for user feedback
        const enabledFeatures = [];
        if (diarize) enabledFeatures.push("Speaker Diarization");
        if (smart_format !== false) enabledFeatures.push("Smart Formatting");
        if (punctuate !== false) enabledFeatures.push("Punctuation");
        if (paragraphs !== false) enabledFeatures.push("Paragraphs");
        if (utterances) enabledFeatures.push("Utterances");
        if (sentiment) enabledFeatures.push("Sentiment Analysis");
        if (summarize) enabledFeatures.push("Summarization");
        if (topics) enabledFeatures.push("Topic Detection");
        if (detect_entities) enabledFeatures.push("Entity Extraction");
        if (filler_words) enabledFeatures.push("Filler Words");

        const featuresText = enabledFeatures.length > 0
          ? `\n\n📋 Enabled Features:\n${enabledFeatures.map(f => `• ${f}`).join('\n')}`
          : "";

        return {
          content: [
            {
              type: "text",
              text: `✅ Transcription job submitted successfully!\n\n🆔 Request ID: ${result.request_id}\n\n⏳ Your audio/video is now being processed asynchronously by Deepgram. Use the "check_job_status" tool with this request ID to retrieve the results when ready.${featuresText}\n\n💡 Tip: Processing time varies based on file length and complexity. Most jobs complete within 1-5 minutes.`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to submit transcription job: ${errorMessage}\n\n💡 Common issues:\n• Ensure the URL is publicly accessible\n• Verify your Deepgram API key is valid\n• Check that the file format is supported (MP3, WAV, MP4, etc.)\n• Make sure the URL points directly to the media file`,
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
      description: "Check the status of a transcription job and retrieve the results when ready. Use the request_id returned from submit_transcription_job.",
      inputSchema: {
        request_id: z.string().describe("The request ID returned from submit_transcription_job"),
      },
    },
    async ({ request_id }) => {
      try {
        const result = await deepgramClient.getTranscriptionResult(request_id);

        // Check if the response contains transcription data
        if (!result.response || Object.keys(result.response).length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `⏳ Transcription job is still processing...\n\n🆔 Request ID: ${request_id}\n📅 Created: ${result.created}\n\n💡 Please wait a moment and try again. Most jobs complete within 1-5 minutes.`,
              },
            ],
          };
        }

        // Format the transcription result
        const response = result.response;
        let formattedResult = `✅ Transcription Complete!\n\n🆔 Request ID: ${request_id}\n📅 Created: ${result.created}\n\n`;

        // Extract transcript text
        if (response.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
          const transcript = response.results.channels[0].alternatives[0].transcript;
          formattedResult += `📝 Transcript:\n${transcript}\n\n`;
        }

        // Add metadata
        if (response.metadata) {
          formattedResult += `📊 Metadata:\n`;
          if (response.metadata.duration) {
            formattedResult += `• Duration: ${response.metadata.duration.toFixed(2)}s\n`;
          }
          if (response.metadata.channels) {
            formattedResult += `• Channels: ${response.metadata.channels}\n`;
          }
          if (response.metadata.models) {
            formattedResult += `• Model: ${response.metadata.models.join(', ')}\n`;
          }
          formattedResult += '\n';
        }

        // Add sentiment if available
        if (response.results?.sentiments?.segments) {
          formattedResult += `😊 Sentiment Analysis:\n`;
          const sentiments = response.results.sentiments.segments;
          sentiments.forEach((seg: any, idx: number) => {
            formattedResult += `• Segment ${idx + 1}: ${seg.sentiment} (confidence: ${(seg.sentiment_score * 100).toFixed(1)}%)\n`;
          });
          formattedResult += '\n';
        }

        // Add topics if available
        if (response.results?.topics?.segments) {
          formattedResult += `🏷️ Topics Detected:\n`;
          const topics = response.results.topics.segments;
          topics.forEach((seg: any) => {
            seg.topics.forEach((topic: any) => {
              formattedResult += `• ${topic.topic} (confidence: ${(topic.confidence_score * 100).toFixed(1)}%)\n`;
            });
          });
          formattedResult += '\n';
        }

        // Add summary if available
        if (response.results?.summary) {
          formattedResult += `📄 Summary:\n${response.results.summary.short || response.results.summary.text}\n\n`;
        }

        // Add entities if available
        if (response.results?.entities) {
          formattedResult += `🔍 Entities Detected:\n`;
          response.results.entities.forEach((entity: any) => {
            formattedResult += `• ${entity.value} (${entity.type})\n`;
          });
          formattedResult += '\n';
        }

        // Add full JSON response for advanced users
        formattedResult += `\n📦 Full Response (JSON):\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;

        return {
          content: [
            {
              type: "text",
              text: formattedResult,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to check job status: ${errorMessage}\n\n💡 Common issues:\n• Verify the request_id is correct\n• Ensure your Deepgram API key is valid\n• The job may not exist or may have expired`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Test connection tool
  server.registerTool(
    "test_deepgram_connection",
    {
      title: "Test Deepgram Connection",
      description: "Test connectivity to Deepgram API and validate your API key",
      inputSchema: {},
    },
    async () => {
      try {
        const isConnected = await deepgramClient.testConnection();

        if (isConnected) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Deepgram API Connection Successful!\n\n🔑 API Key: ${config.deepgramApiKey.substring(0, 8)}...\n\n🚀 You can now transcribe audio and video files using Deepgram's powerful speech-to-text API.\n\n📚 Available Tools:\n• submit_transcription_job - Submit audio/video for async transcription\n• check_job_status - Check status and retrieve results\n• test_deepgram_connection - Test API connectivity`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ Connection test failed: Invalid API key or network error\n\n💡 Troubleshooting:\n• Verify your Deepgram API key is correct\n• Check your internet connection\n• Visit https://console.deepgram.com to get or verify your API key`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}\n\n💡 Troubleshooting:\n• Verify your Deepgram API key is correct\n• Check your internet connection\n• Visit https://console.deepgram.com to get or verify your API key`,
            },
          ],
        };
      }
    }
  );

  return server.server;
}
