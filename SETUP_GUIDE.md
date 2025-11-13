# Complete Setup Guide - Deepgram Async MCP Server

This guide will walk you through deploying the complete async transcription system with webhook relay.

## Architecture Overview

```
Claude MCP Connect (10s timeout)
    ↓
Deepgram MCP Server (Smithery)
    ↓
Deepgram API (async with callback)
    ↓
Cloudflare Worker (webhook relay)
    ↓
Cloudflare KV Storage (7-day retention)
    ↑
Deepgram MCP Server (polls for results)
```

## Why This Architecture?

- **Claude MCP Connect**: 10-second timeout (can't wait for long transcriptions)
- **Async Processing**: Videos can take minutes to transcribe
- **Webhook Relay**: Deepgram doesn't store transcripts in Management API
- **Polling**: MCP server checks webhook relay every 30 seconds until ready

## Prerequisites

1. Deepgram API key ([Get one](https://console.deepgram.com/signup))
2. Cloudflare account (free tier works)
3. GitHub account (for Smithery deployment)
4. Node.js 20+ and pnpm (for local testing)

## Part 1: Deploy Webhook Relay (Cloudflare Worker)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Navigate to Webhook Relay Project

```bash
cd deepgram-webhook-relay
```

### Step 4: Create KV Namespace

```bash
wrangler kv:namespace create TRANSCRIPTS
```

This will output something like:
```
[[kv_namespaces]]
binding = "TRANSCRIPTS"
id = "abc123def456..."
```

Copy the `id` value.

### Step 5: Update wrangler.toml

Edit `wrangler.toml` and replace `YOUR_KV_NAMESPACE_ID` with the ID from Step 4:

```toml
[[kv_namespaces]]
binding = "TRANSCRIPTS"
id = "abc123def456..."  # Your actual ID here
```

### Step 6: Deploy Worker

```bash
wrangler deploy
```

You'll get a URL like:
```
https://deepgram-webhook-relay.YOUR_SUBDOMAIN.workers.dev
```

**Save this URL!** You'll need it for the MCP server configuration.

### Step 7: Test Worker

```bash
# Health check
curl https://your-worker.workers.dev/health

# Should return:
# {"status":"healthy","service":"deepgram-webhook-relay","timestamp":"..."}
```

✅ **Webhook Relay is now deployed!**

## Part 2: Deploy MCP Server (Smithery)

### Step 1: Push to GitHub

The MCP server code is already in `deepgram-mcp-server/` directory.

```bash
cd deepgram-mcp-server
git init
git add .
git commit -m "Initial commit: Deepgram Async MCP Server with webhook relay"
gh repo create deepgram-mcp-server --public --source=. --push
```

Or if the repo already exists:
```bash
git add .
git commit -m "Update: Add webhook relay support for async transcription"
git push origin main
```

### Step 2: Deploy to Smithery

1. Go to [Smithery](https://smithery.ai)
2. Click "Connect GitHub" and authorize
3. Select your `deepgram-mcp-server` repository
4. Smithery will automatically detect the configuration and build

### Step 3: Configure Session

When connecting to the MCP server in Smithery, provide:

```json
{
  "deepgramApiKey": "your-deepgram-api-key-here",
  "webhookUrl": "https://your-worker.workers.dev/callback"
}
```

**Important**: Use the `/callback` endpoint from your Cloudflare Worker URL.

✅ **MCP Server is now deployed!**

## Part 3: Connect to Claude

### Option 1: Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "deepgram": {
      "url": "https://your-smithery-deployment.smithery.ai",
      "config": {
        "deepgramApiKey": "your-key",
        "webhookUrl": "https://your-worker.workers.dev/callback"
      }
    }
  }
}
```

### Option 2: Claude MCP Connect (API)

Use the Smithery deployment URL in your API calls.

## Part 4: Usage Workflow

### 1. Submit Transcription Job

```
Use tool: submit_transcription_job
Parameters:
  - url: https://example.com/video.mp4
  - diarize: true
  - smart_format: true
  - punctuate: true
```

Response:
```
✅ Transcription job submitted successfully!
Request ID: `abc123-def456-...`
...
```

### 2. Wait (Use Sleep Tool)

In your AI system prompt, instruct Claude to:
```
After submitting a transcription job, use the sleep tool to wait 30 seconds,
then check the job status. Repeat until transcript is ready.
```

### 3. Check Job Status

```
Use tool: check_job_status
Parameters:
  - request_id: abc123-def456-...
```

First few checks:
```
⏳ Still Processing
Status: Deepgram is still transcribing your audio
...
```

When ready:
```
✅ Transcription Complete!
Full Transcript: ...
```

## Troubleshooting

### Webhook Relay Issues

**Problem**: Worker returns 404 for transcripts

**Solution**:
1. Check Deepgram is sending callbacks: `wrangler tail`
2. Verify callback URL is correct in MCP server config
3. Check KV namespace is properly bound in wrangler.toml

**Problem**: Worker not receiving callbacks

**Solution**:
1. Test manually:
   ```bash
   curl -X POST https://your-worker.workers.dev/callback \
     -H "Content-Type: application/json" \
     -d '{"metadata":{"request_id":"test123"},"results":{"channels":[{"alternatives":[{"transcript":"test"}]}]}}'
   ```
2. Check worker logs: `wrangler tail`
3. Verify Deepgram console shows successful callback delivery

### MCP Server Issues

**Problem**: "Failed to submit transcription job"

**Solution**:
1. Verify Deepgram API key is correct
2. Check account has credits
3. Test API key with curl:
   ```bash
   curl -X GET https://api.deepgram.com/v1/projects \
     -H "Authorization: Token YOUR_API_KEY"
   ```

**Problem**: "Webhook relay unreachable"

**Solution**:
1. Test webhook URL manually: `curl https://your-worker.workers.dev/health`
2. Verify URL in MCP server config is correct
3. Check Cloudflare Worker is deployed: `wrangler deployments list`

### Deepgram Issues

**Problem**: Transcription stuck in "Processing"

**Solution**:
1. Check Deepgram console for errors
2. Verify audio URL is publicly accessible
3. Check file format is supported
4. For very long files (2+ hours), expect 5-10 minutes processing time

## System Prompt for Claude

Add this to your Claude system prompt:

```
When transcribing audio/video files:

1. Use submit_transcription_job to start transcription
2. Extract the request_id from the response
3. Use a sleep/wait tool for 30 seconds
4. Use check_job_status with the request_id
5. If status is "Still Processing", repeat steps 3-4
6. If status is "Complete", extract and present the transcript
7. For 1-hour videos, expect 2-3 minutes total processing time

Example workflow:
- Submit job → Get request_id
- Sleep 30s → Check status → "Processing"
- Sleep 30s → Check status → "Processing"
- Sleep 30s → Check status → "Complete!" → Present transcript
```

## Monitoring

### Webhook Relay Logs

```bash
cd deepgram-webhook-relay
wrangler tail
```

### MCP Server Logs

View in Smithery dashboard or check deployment logs.

### Deepgram Logs

View in [Deepgram Console](https://console.deepgram.com) → Usage → Requests

## Costs

### Cloudflare (Free Tier)
- 100,000 requests/day
- 1 GB KV storage
- More than enough for most use cases

### Deepgram (Pay-as-you-go)
- Nova-3: $0.0043/minute
- 1-hour video = $0.26
- Check [pricing](https://deepgram.com/pricing)

### Smithery (Free Tier)
- Generous free tier for MCP servers
- Check [Smithery pricing](https://smithery.ai/pricing)

## Security Recommendations

### Production Setup

1. **Add API Key Auth to Webhook Relay**:
   ```javascript
   const apiKey = request.headers.get('X-API-Key');
   if (apiKey !== env.WEBHOOK_API_KEY) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

2. **Use Environment Variables**:
   ```bash
   wrangler secret put WEBHOOK_API_KEY
   ```

3. **Restrict CORS**:
   ```javascript
   'Access-Control-Allow-Origin': 'https://yourdomain.com',
   ```

4. **Use Custom Domain**:
   - `deepgram-webhooks.yourdomain.com`
   - Harder to guess, more professional

## Next Steps

1. ✅ Deploy webhook relay
2. ✅ Deploy MCP server
3. ✅ Test with a short video (1-2 minutes)
4. ✅ Test with a long video (30+ minutes)
5. ✅ Add to production system
6. ✅ Monitor usage and costs

## Support

- **Webhook Relay**: Check `deepgram-webhook-relay/README.md`
- **MCP Server**: Check `README.md` and `API_PERMISSIONS.md`
- **Deepgram**: https://developers.deepgram.com or support@deepgram.com
- **Smithery**: https://smithery.ai/docs

## Quick Reference

**Webhook Relay URL**: `https://your-worker.workers.dev/callback`

**Retrieve Transcript**: `https://your-worker.workers.dev/transcript/{request_id}`

**Health Check**: `https://your-worker.workers.dev/health`

**MCP Tools**:
- `submit_transcription_job` - Start async transcription
- `check_job_status` - Poll for results
- `test_deepgram_connection` - Verify setup

**Typical Processing Times**:
- 5 min video → 30-60 seconds
- 30 min video → 1-2 minutes
- 1 hour video → 2-3 minutes
- 2 hour video → 5-8 minutes
