# Railway Deployment Guide

This guide will walk you through deploying the Real-Debrid MCP Server to Railway.

## Prerequisites

- A [Railway](https://railway.com/) account (free tier available)
- A GitHub account
- A Real-Debrid premium account

## Deployment Steps

### Method 1: Deploy from GitHub (Recommended)

1. **Fork or clone this repository** to your GitHub account

2. **Create a new project on Railway:**
   - Go to [railway.com](https://railway.com/)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select your forked/cloned repository

3. **Configure the deployment:**
   - Railway will automatically detect the `railway.toml` configuration
   - The Python version will be deployed by default (using `Dockerfile.python`)
   - No environment variables are required (OAuth authentication is built-in)

4. **Wait for deployment:**
   - Railway will build and deploy your server
   - This typically takes 2-5 minutes
   - You'll see the build logs in real-time

5. **Get your deployment URL:**
   - Once deployed, click on your service
   - Go to "Settings" → "Networking"
   - Click "Generate Domain" to get a public URL
   - Your URL will be something like: `your-app.up.railway.app`

6. **Test your deployment:**
   - Visit `https://your-app.up.railway.app/` to see server info
   - Visit `https://your-app.up.railway.app/health` to check health status
   - The SSE endpoint is at: `https://your-app.up.railway.app/sse`

### Method 2: Deploy TypeScript Version

If you prefer the TypeScript version:

1. In your Railway project settings, change the Dockerfile:
   - Go to "Settings" → "Build"
   - Change "Dockerfile Path" from `Dockerfile.python` to `Dockerfile`
   - Redeploy the service

## Configure with Claude Desktop

Once deployed, add your Railway URL to Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "real-debrid": {
      "url": "https://your-app.up.railway.app/sse"
    }
  }
}
```

Replace `your-app.up.railway.app` with your actual Railway domain.

## Authentication

The server uses OAuth Device Code Flow, so you don't need to configure any API tokens:

1. In Claude/Cursor, ask to "Start OAuth authentication for Real-Debrid"
2. The server will return a code and URL
3. Visit the URL and enter the code
4. Authorize your Real-Debrid account
5. Use `oauth_check` to complete authentication
6. You'll receive a `session_id` to use for all subsequent requests

## Monitoring

Railway provides built-in monitoring:

- **Logs**: View real-time logs in the Railway dashboard
- **Metrics**: CPU, memory, and network usage
- **Health checks**: Automatic health checking at `/health`

## Costs

Railway offers:
- **Free tier**: $5 of usage credit per month (sufficient for personal use)
- **Pro plan**: $20/month for more resources
- **Pay-as-you-go**: After free credits

This MCP server is very lightweight and should run comfortably within the free tier.

## Troubleshooting

### Deployment failed
- Check the build logs in Railway dashboard
- Ensure all dependencies are in `requirements.txt` (Python) or `package.json` (TypeScript)
- Verify the Dockerfile path is correct

### Server not responding
- Check if the service is running in Railway dashboard
- Verify the domain is properly configured
- Check the logs for any runtime errors

### OAuth not working
- Ensure you're accessing the server via HTTPS (Railway provides this automatically)
- Check that the `/sse` endpoint is accessible
- Verify your Real-Debrid account is active and premium

### Session lost after restart
- Sessions are stored in-memory and will be lost when the server restarts
- Simply re-authenticate using oauth_start and oauth_check
- For production, consider using Redis or a database for session storage

## Updating Your Deployment

To update your deployment with new code:

1. Push changes to your GitHub repository
2. Railway will automatically detect the changes and redeploy
3. Or manually trigger a redeploy in the Railway dashboard

## Alternative Deployment Platforms

While this guide focuses on Railway, you can also deploy to:

- **Heroku**: Similar to Railway, supports Dockerfiles
- **Google Cloud Run**: Serverless container platform
- **AWS ECS/Fargate**: More complex but highly scalable
- **DigitalOcean App Platform**: Simple container deployment
- **Fly.io**: Edge deployment platform

## Support

For issues or questions:
- Check the [Railway documentation](https://docs.railway.app/)
- Visit the [Real-Debrid API docs](https://api.real-debrid.com/)
- Open an issue on the GitHub repository
