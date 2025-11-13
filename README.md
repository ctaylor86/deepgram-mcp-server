# Deepgram Async MCP Server

Remote MCP server for Deepgram Async Speech-to-Text API with webhook relay support. Transcribe long audio and video files asynchronously - perfect for marketers transcribing hour-long videos and podcasts without timeout issues.

## Why This Server?

**Problem**: Claude MCP Connect has a 10-second timeout, but long videos take minutes to transcribe.

**Solution**: True async processing with polling:
1. Submit transcription job (returns immediately with request_id)
2. Deepgram processes in background
3. Results stored in webhook relay (Cloudflare Worker)
4. Poll every 30 seconds until ready
5. Get full transcript with all features

## Architecture

```
Your AI → MCP Server → Deepgram API (async)
                          ↓
                    Webhook Relay (Cloudflare Worker + KV Storage)
                          ↑
         MCP Server ← Poll for results
```

## Features

### Two MCP Tools

1. **submit_transcription_job** - Send audio/video URLs for async transcription
   - ✅ Handles 1-hour+ videos without timeout
   - ✅ Speaker diarization (detect different speakers)
   - ✅ Smart formatting and punctuation
   - ✅ Sentiment analysis
   - ✅ Topic detection
   - ✅ Entity extraction (names, places, brands)
   - ✅ Summarization
   - ✅ Multi-language support
   - ✅ Multiple AI models (Nova-3, Nova-2, Whisper)

2. **check_job_status** - Retrieve transcription results when ready
   - ✅ Poll for job completion
   - ✅ Get full transcription with all requested features
   - ✅ Automatic fallback to Deepgram Management API

3. **test_deepgram_connection** - Verify setup is working

## Prerequisites

1. **Deepgram API key** ([Get one here](https://console.deepgram.com/signup))
2. **Webhook Relay** (Cloudflare Worker) - **Required!**
3. **Smithery account** for deployment

## Quick Start

### Step 1: Deploy Webhook Relay

See the complete guide: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

**Quick version**:
```bash
cd deepgram-webhook-relay
npm install -g wrangler
wrangler login
wrangler kv:namespace create TRANSCRIPTS
# Update wrangler.toml with KV namespace ID
wrangler deploy
```

You'll get a URL like: `https://deepgram-webhook-relay.YOUR_SUBDOMAIN.workers.dev`

### Step 2: Deploy MCP Server to Smithery

1. Push this repo to GitHub
2. Go to [Smithery](https://smithery.ai)
3. Connect your GitHub repository
4. Smithery will auto-deploy

### Step 3: Configure

Provide these values in Smithery:

```json
{
  "deepgramApiKey": "your-deepgram-api-key",
  "webhookUrl": "https://your-worker.workers.dev/callback"
}
```

### Step 4: Use in Claude

**System Prompt**:
```
When transcribing audio/video:
1. Use submit_transcription_job to start
2. Get the request_id from response
3. Wait 30 seconds (use sleep tool)
4. Use check_job_status with request_id
5. If "Still Processing", repeat steps 3-4
6. When "Complete", present the transcript
```

**Example**:
```
User: Transcribe this podcast: https://example.com/podcast.mp4

AI: I'll transcribe that for you.
[Uses submit_transcription_job]
Job submitted! Request ID: abc123
[Waits 30s]
[Uses check_job_status]
Still processing...
[Waits 30s]
[Uses check_job_status]
✅ Complete! Here's the transcript: ...
```

## Configuration

### Required

- **deepgramApiKey**: Your Deepgram API key (must have **Member role or higher**)
- **webhookUrl**: Your Cloudflare Worker callback URL (e.g., `https://your-worker.workers.dev/callback`)

### Optional

- **projectId**: Your Deepgram project ID (auto-detected if not provided)

## API Key Requirements

⚠️ **Important**: Your Deepgram API key must have **Member role or higher**.

**Required permissions**:
- `project:write` - Submit transcription jobs
- `project:read` - Auto-detect project ID (optional if you provide projectId)
- `usage:read` - Check job status via Management API

**How to create a proper API key**:
1. Go to [Deepgram Console](https://console.deepgram.com)
2. Navigate to **API Keys**
3. Click **Create a New API Key**
4. Select **Member** role (or Admin/Owner)
5. Copy the key and use it in your configuration

See [API_PERMISSIONS.md](./API_PERMISSIONS.md) for detailed troubleshooting.

## Usage Examples

### Basic Transcription

```
Tool: submit_transcription_job
Parameters:
  url: "https://example.com/video.mp4"
  smart_format: true
  punctuate: true
```

### Marketing Use Case (Full Features)

```
Tool: submit_transcription_job
Parameters:
  url: "https://example.com/podcast.mp4"
  diarize: true              # Detect speakers
  smart_format: true         # Professional formatting
  punctuate: true            # Add punctuation
  paragraphs: true           # Split into paragraphs
  sentiment: true            # Analyze sentiment
  topics: true               # Detect topics
  detect_entities: true      # Extract names, brands
  summarize: true            # Generate summary
  model: "nova-3"            # Latest model
```

### Check Status

```
Tool: check_job_status
Parameters:
  request_id: "abc123-def456-..."
```

## Processing Times

Typical processing times (varies by file length and complexity):

- **5-minute video**: 30-60 seconds
- **30-minute video**: 1-2 minutes
- **1-hour video**: 2-3 minutes
- **2-hour podcast**: 5-8 minutes

**Recommendation**: Poll every 30 seconds to balance responsiveness and API usage.

## Troubleshooting

### "Webhook relay unreachable"

1. Verify Cloudflare Worker is deployed: `wrangler deployments list`
2. Test manually: `curl https://your-worker.workers.dev/health`
3. Check webhook URL in configuration is correct

### "Transcript not found"

1. Job may still be processing - wait 30s and try again
2. Check request_id is correct
3. Transcripts expire after 7 days in webhook relay

### "403 Forbidden"

1. API key lacks permissions - must be Member role or higher
2. See [API_PERMISSIONS.md](./API_PERMISSIONS.md) for detailed guide

### "Failed to submit transcription job"

1. Verify audio URL is publicly accessible
2. Check Deepgram account has credits
3. Ensure file format is supported (MP3, WAV, MP4, etc.)

## Complete Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Step-by-step deployment guide
- **[API_PERMISSIONS.md](./API_PERMISSIONS.md)** - API key permissions and troubleshooting
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Smithery deployment details
- **[deepgram-webhook-relay/README.md](../deepgram-webhook-relay/README.md)** - Webhook relay documentation

## Project Structure

```
deepgram-mcp-server/          # MCP server (this directory)
├── src/
│   ├── index.ts              # Main MCP server
│   └── deepgram-client.ts    # Deepgram API client
├── package.json
├── smithery.yaml
└── README.md

deepgram-webhook-relay/       # Cloudflare Worker
├── worker.js                 # Webhook relay logic
├── wrangler.toml            # Cloudflare config
└── README.md
```

## Costs

### Deepgram (Pay-as-you-go)
- Nova-3: $0.0043/minute
- 1-hour video = ~$0.26
- [Pricing details](https://deepgram.com/pricing)

### Cloudflare (Free Tier)
- 100,000 requests/day
- 1 GB KV storage
- More than enough for most use cases

### Smithery (Free Tier)
- Generous free tier for MCP servers
- [Pricing details](https://smithery.ai/pricing)

## Support

- **Setup Issues**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **API Permissions**: See [API_PERMISSIONS.md](./API_PERMISSIONS.md)
- **Deepgram**: https://developers.deepgram.com
- **Smithery**: https://smithery.ai/docs

## Related Projects

This MCP server works with other async tools:
- Klap (video editing)
- Rendi (video rendering)
- Any service with async processing + callbacks

## License

MIT

## Contributing

Pull requests welcome! Please ensure:
1. TypeScript compiles without errors
2. Smithery build succeeds
3. Documentation is updated

## Changelog

### v2.0.0 (Current)
- ✅ True async processing with webhook relay
- ✅ Cloudflare Worker for transcript storage
- ✅ Polling support for long videos
- ✅ Handles 1-hour+ content without timeout

### v1.0.0
- Initial release with basic async support
