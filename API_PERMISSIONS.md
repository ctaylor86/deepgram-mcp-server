# Deepgram API Key Permissions Guide

This document explains the API key permissions required for the Deepgram MCP Server.

## Required Permissions

The Deepgram MCP Server uses the **Deepgram Management API** to check transcription job status. This requires specific API key permissions.

### Minimum Required Role: **Member**

Your Deepgram API key must have at least **Member** role permissions, which include:

- ✅ `project:read` - Required to list projects and auto-detect project ID
- ✅ `project:write` - Required to submit transcription jobs
- ✅ `usage:read` - Required to check job status and retrieve results
- ✅ `usage:write` - Required for usage tracking

### Supported Roles

| Role | Can Submit Jobs | Can Check Status | Auto-Detect Project ID |
|------|----------------|------------------|------------------------|
| **Owner** | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ |
| **Member** | ✅ | ✅ | ✅ |
| **Limited/Custom** | ✅ | ⚠️ Maybe | ❌ No |

## Creating an API Key with Proper Permissions

### Option 1: Use Console (Recommended)

1. Go to [Deepgram Console](https://console.deepgram.com)
2. Navigate to **API Keys** from the left sidebar
3. Click **"Create Key"**
4. Select **Member** role (or Admin/Owner for more permissions)
5. Give it a descriptive name (e.g., "MCP Server Key")
6. Click **Create Key**
7. Copy the API key and use it in your MCP server configuration

### Option 2: Use Existing Key

If you already have an API key, check its permissions:

1. Go to [Deepgram Console](https://console.deepgram.com)
2. Navigate to **API Keys**
3. Find your key and check its **Role** column
4. If it shows "Member", "Admin", or "Owner", you're good to go!
5. If it shows a custom role or limited permissions, create a new key with Member role

## Troubleshooting 403 Errors

### Error: "403 Forbidden: Your API key does not have permission to list projects"

**Cause**: Your API key lacks `project:read` permission.

**Solutions**:
1. **Recommended**: Create a new API key with Member role or higher
2. **Workaround**: Manually provide your `projectId` in the configuration:
   ```json
   {
     "deepgramApiKey": "your-api-key",
     "projectId": "your-project-id"
   }
   ```

To find your project ID:
- Go to [Deepgram Console](https://console.deepgram.com)
- Look at the URL: `https://console.deepgram.com/project/{PROJECT_ID}/...`
- Copy the UUID between `/project/` and the next `/`

### Error: "403 Forbidden: Your API key does not have permission to access request details"

**Cause**: Your API key lacks `usage:read` permission.

**Solution**: Create a new API key with Member role or higher. There is no workaround for this - the Management API requires `usage:read` permission.

## Configuration Options

### Full Auto-Detection (Recommended)

If your API key has Member role or higher:

```json
{
  "deepgramApiKey": "your-api-key-here"
}
```

The server will automatically:
- Detect your project ID
- Submit transcription jobs
- Check job status

### Manual Project ID (For Restricted Keys)

If your API key has limited permissions but includes `usage:read`:

```json
{
  "deepgramApiKey": "your-api-key-here",
  "projectId": "your-project-id-here"
}
```

This bypasses the project listing API call but still requires `usage:read` to check job status.

## API Endpoints Used

The server uses these Deepgram API endpoints:

1. **Submit Transcription** (requires `project:write`)
   ```
   POST /v1/listen?callback=...
   ```

2. **List Projects** (requires `project:read`) - *Optional if projectId provided*
   ```
   GET /v1/projects
   ```

3. **Get Request Status** (requires `usage:read`)
   ```
   GET /v1/projects/{project_id}/requests/{request_id}
   ```

## Security Best Practices

1. **Never share your API key** - Keep it secure and private
2. **Use environment variables** - Don't hardcode keys in your code
3. **Rotate keys regularly** - Create new keys and delete old ones periodically
4. **Use minimum required permissions** - Member role is sufficient for this server
5. **Monitor usage** - Check your Deepgram Console for unexpected usage

## Additional Resources

- [Deepgram API Documentation](https://developers.deepgram.com/)
- [Working with Roles & API Scopes](https://developers.deepgram.com/guides/deep-dives/working-with-roles)
- [Creating API Keys](https://developers.deepgram.com/docs/create-additional-api-keys)
- [Deepgram Console](https://console.deepgram.com)

## Support

If you continue to experience permission issues:

1. Verify your API key role in the Deepgram Console
2. Check that your Deepgram account has active credits
3. Contact Deepgram support at support@deepgram.com
4. Open an issue on the GitHub repository
