# Deepgram MCP Server

Remote MCP server for Deepgram Async Speech-to-Text API. Transcribe audio and video files asynchronously with advanced features perfect for marketers transcribing videos and podcasts.

## Features

### Two MCP Tools

1. **Submit Transcription Job** - Send audio/video URLs for async transcription
   - Supports diarization (speaker detection)
   - Smart formatting and punctuation
   - Sentiment analysis
   - Topic detection
   - Entity extraction
   - Summarization
   - And many more marketing-focused features

2. **Check Job Status** - Retrieve transcription results when ready
   - Poll for job completion
   - Get full transcription with all requested features

## Installation

This server is designed to be hosted on [Smithery](https://smithery.ai).

### Prerequisites

- Node.js 20 or higher
- A Deepgram API key ([Get one here](https://console.deepgram.com/signup))

### Configuration

When deploying to Smithery, you'll need to provide:

- **Deepgram API Key**: Your Deepgram API key for authentication (must have **Member role or higher**)
- **Project ID** (Optional): Your Deepgram project ID (only needed if your API key has restricted permissions)

**Important**: Your API key must have at least **Member** role permissions to use all features. See [API_PERMISSIONS.md](./API_PERMISSIONS.md) for detailed information about required permissions and troubleshooting 403 errors.

## API Key Requirements

⚠️ **Important**: Your Deepgram API key must have **Member role or higher** for full functionality.

Required permissions:
- `project:write` - Submit transcription jobs
- `project:read` - Auto-detect project ID (optional if you provide projectId)
- `usage:read` - Check job status and retrieve results

**How to create a proper API key**:
1. Go to [Deepgram Console](https://console.deepgram.com)
2. Navigate to **API Keys** → **Create Key**
3. Select **Member** role (or Admin/Owner)
4. Copy the key and use it in your configuration

For detailed troubleshooting of 403 errors, see [API_PERMISSIONS.md](./API_PERMISSIONS.md).

## Usage

### Tool 1: Submit Transcription Job

Submit an audio or video URL for async transcription with customizable options.

**Parameters:**
- `url` (required): Publicly accessible URL to audio/video file
- `diarize` (optional): Enable speaker detection (default: false)
- `smart_format` (optional): Apply smart formatting (default: true)
- `punctuate` (optional): Add punctuation and capitalization (default: true)
- `paragraphs` (optional): Split into paragraphs (default: true)
- `utterances` (optional): Segment into meaningful units (default: false)
- `sentiment` (optional): Detect sentiment (default: false)
- `summarize` (optional): Generate summary (default: false)
- `topics` (optional): Detect topics (default: false)
- `detect_entities` (optional): Extract entities (default: false)
- `filler_words` (optional): Include filler words like "uh" and "um" (default: false)
- `language` (optional): Language code (default: "en")
- `model` (optional): AI model to use (default: "nova-3")

**Returns:**
- `request_id`: Use this ID to check the status and retrieve results

### Tool 2: Check Job Status

Check the status of a transcription job and retrieve results when ready.

**Parameters:**
- `request_id` (required): The request ID returned from submit_transcription_job

**Returns:**
- Job status and full transcription results when complete

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## License

MIT

## Links

- [Deepgram Documentation](https://developers.deepgram.com/)
- [Smithery Documentation](https://smithery.ai/docs)
- [MCP Protocol](https://modelcontextprotocol.io/)
