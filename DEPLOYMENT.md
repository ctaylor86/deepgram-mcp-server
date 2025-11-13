# Deployment Guide

This guide will help you deploy the Deepgram MCP Server to Smithery.

## Prerequisites

1. A GitHub account
2. A Deepgram API key ([Get one here](https://console.deepgram.com/signup))
3. A Smithery account ([Sign up here](https://smithery.ai))

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `deepgram-mcp-server`)
2. Push this code to your repository:

```bash
cd deepgram-mcp-server
git init
git add .
git commit -m "Initial commit: Deepgram MCP Server"
git remote add origin https://github.com/YOUR_USERNAME/deepgram-mcp-server.git
git push -u origin main
```

## Step 2: Deploy to Smithery

1. Go to [Smithery](https://smithery.ai)
2. Click "Connect GitHub" and authorize Smithery to access your repositories
3. Select your `deepgram-mcp-server` repository
4. Smithery will automatically detect the configuration and start building

## Step 3: Configure Session

When connecting to the server, you'll need to provide:

- **Deepgram API Key**: Your Deepgram API key for authentication

## Step 4: Test the Server

Once deployed, you can test the server using any MCP-compatible client:

### Test Connection
```
Use the "test_deepgram_connection" tool to verify your API key is working
```

### Submit a Transcription Job
```
Use the "submit_transcription_job" tool with:
- url: https://example.com/audio.mp3
- diarize: true (optional)
- smart_format: true (optional)
- punctuate: true (optional)
- etc.

This will return a request_id
```

### Check Job Status
```
Use the "check_job_status" tool with:
- request_id: <the ID from submit_transcription_job>

This will return the transcription results when ready
```

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `pnpm install`
- Check TypeScript compilation: `npx tsc --noEmit`
- Verify smithery.config.js is present

### Connection Fails
- Verify your Deepgram API key is correct
- Check that you have credits in your Deepgram account
- Visit https://console.deepgram.com to manage your account

### Transcription Fails
- Ensure the audio/video URL is publicly accessible
- Verify the file format is supported (MP3, WAV, MP4, etc.)
- Check that the URL points directly to the media file, not a webpage

## Support

For issues with:
- **Deepgram API**: Visit https://developers.deepgram.com or contact support@deepgram.com
- **Smithery Platform**: Visit https://smithery.ai/docs or join their Discord
- **This MCP Server**: Open an issue on GitHub

## Next Steps

After deployment, you can:
1. Customize the tools to fit your specific use case
2. Add more Deepgram features (e.g., custom vocabulary, language detection)
3. Integrate with your existing workflows
4. Share the server with your team on Smithery
