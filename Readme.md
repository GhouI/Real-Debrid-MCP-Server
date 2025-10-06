# Real-Debrid MCP Server

A Model Context Protocol (MCP) server that provides access to Real-Debrid API functionality. This server allows AI assistants like Claude to interact with your Real-Debrid account to unrestrict links, manage torrents, and more.

**Available in both TypeScript and Python!**

## Features

This MCP server provides the following Real-Debrid capabilities:

### User Management
- **get_user_info**: Get current user information including premium status, expiration date, and fidelity points

### Link Unrestricting
- **unrestrict_link**: Convert premium links to direct download links
- **oauth_start**: Start OAuth device code flow for authentication
- **oauth_check**: Check OAuth authorization status and get access token

### Torrent Management
- **list_torrents**: View all your torrents with optional filtering
- **add_magnet**: Add a torrent via magnet link

### Authentication
- **OAuth Device Code Flow**: Secure authentication without storing API tokens
- **Session Management**: In-memory token storage with automatic refresh

## Prerequisites

### For Python Version (Recommended for Railway deployment)
- Python 3.11 or higher
- pip
- A Real-Debrid premium account

### For TypeScript Version
- Node.js 18 or higher
- npm or yarn
- A Real-Debrid premium account

## Installation

### Python Version

1. Clone or download this repository:
```bash
git clone https://github.com/GhouI/Real-Debrid-MCP-Server.git
cd Real-Debrid-MCP-Server
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python src/index.py
```

The server will start on port 3000 by default (or the PORT environment variable if set).

### TypeScript Version

1. Clone or download this repository:
```bash
git clone https://github.com/GhouI/Real-Debrid-MCP-Server.git
cd Real-Debrid-MCP-Server
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Run the server:
```bash
npm start
```

## Deployment

### Deploy to Railway (Recommended)

Railway is a great platform for deploying MCP servers with low cognitive overhead.

#### Python Version (Easier)

1. Fork/clone this repository to your GitHub account
2. Create a new project on [Railway](https://railway.com/)
3. Connect your GitHub repository
4. Railway will automatically detect the Python application
5. Set the Dockerfile to use: `Dockerfile.python`
6. Your server will be deployed with a public URL like `https://your-app.up.railway.app`
7. Access the SSE endpoint at: `https://your-app.up.railway.app/sse`

#### TypeScript Version

1. Follow the same steps but use the default `Dockerfile`
2. Railway will build and deploy the TypeScript application

#### Configure with Claude Desktop (for Railway deployment)

Add the server to your Claude Desktop configuration file:

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

Replace `your-app.up.railway.app` with your actual Railway deployment URL.

## Configuration

### OAuth Authentication (Built-in)

This server uses OAuth Device Code Flow, so you don't need to manually configure API tokens. Instead:

1. Connect to the server from Claude/Cursor
2. Use the `oauth_start` tool to begin authentication
3. Follow the instructions to authorize at real-debrid.com/device
4. Use `oauth_check` to complete authentication and get a session ID
5. Use the session ID for all subsequent API calls

### Legacy API Token Authentication

If you prefer the old method, you can still use API tokens (TypeScript version only):

1. Go to https://real-debrid.com/apitoken
2. Log in to your Real-Debrid account
3. Copy your private API token (keep it secret!)

### Configure with Claude Desktop (Local)

For local development with the Python version:

```json
{
  "mcpServers": {
    "real-debrid": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

For local development with the TypeScript version:

```json
{
  "mcpServers": {
    "real-debrid": {
      "command": "node",
      "args": ["/absolute/path/to/real-debrid-mcp/build/index.js"]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/real-debrid-mcp` with the actual full path to your installation directory.

### Configure with VS Code / Cursor

Create or edit `.vscode/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "real-debrid": {
      "command": "node",
      "args": ["/absolute/path/to/real-debrid-mcp/build/index.js"],
      "env": {
        "REAL_DEBRID_API_TOKEN": "your_real_debrid_api_token_here"
      }
    }
  }
}
```

## Usage Examples

Once configured with Claude Desktop or another MCP client, you can interact with Real-Debrid naturally:

### Authenticate with OAuth
```
"Start OAuth authentication for Real-Debrid"
```
Then follow the instructions to authorize and use `oauth_check` to complete.

### Check Your Account Status
```
"What's my Real-Debrid account status?" (using session_id from oauth_check)
```

### Unrestrict a Link
```
"Can you unrestrict this link for me: https://rapidgator.net/file/abc123"
```

### Add a Magnet Link
```
"Add this magnet link to my Real-Debrid: magnet:?xt=urn:btih:..."
```

### List Your Torrents
```
"Show me my active torrents"
```

## Testing

### Test Python Server Locally

```bash
# Start the server
python src/index.py

# In another terminal, test endpoints
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Test TypeScript Server Locally

```bash
# Build and start
npm run build
npm start

# Test endpoints
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Test with MCP Inspector

For TypeScript version:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Tools Reference

### oauth_start
Start OAuth device code flow authentication.

**Parameters:** None

**Returns:** 
- Device code to use with oauth_check
- User code to enter at real-debrid.com/device
- Verification URL

### oauth_check
Check if OAuth authorization is complete and get access token.

**Parameters:**
- `device_code` (required): The device code from oauth_start

**Returns:**
- Session ID to use for all other tools
- Authorization status
- Token expiration time

### get_user_info
Returns information about your Real-Debrid account.

**Parameters:**
- `session_id` (required): Session ID from oauth_check

**Returns:**
- Username and email
- Premium status and expiration date
- Fidelity points
- Account type

### unrestrict_link
Unrestrict a hoster link to get a direct download link.

**Parameters:**
- `session_id` (required): Session ID from OAuth
- `link` (required): The premium hoster link to unrestrict
- `password` (optional): Password if the file is password-protected

**Returns:** Direct download link with file information

### list_torrents
Get user's torrents list.

**Parameters:**
- `session_id` (required): Session ID from OAuth
- `filter` (optional): Set to "active" to show only active torrents

**Returns:** Array of torrent objects with status, progress, and files

### add_magnet
Add a magnet link to Real-Debrid.

**Parameters:**
- `session_id` (required): Session ID from OAuth
- `magnet` (required): The magnet link

**Returns:** Torrent ID and URI

## Error Handling

The server handles Real-Debrid API errors gracefully and returns descriptive error messages. Common errors include:

- **401**: Bad or expired OAuth token (use oauth_check to refresh)
- **403**: Permission denied (account locked or not premium)
- **503**: Service unavailable or file unavailable

## Security Notes

- **OAuth is more secure** than API tokens - tokens are managed automatically
- **Session storage** is in-memory (for production, use Redis or a database)
- **Never share session IDs** - they provide access to your Real-Debrid account
- For Railway deployment, sessions are ephemeral and will be lost on restart

## API Rate Limits

Real-Debrid has rate limiting in place. The server will return appropriate error messages if you exceed rate limits.

## Troubleshooting

### OAuth authentication not working
Make sure you complete the authorization at real-debrid.com/device within the expiration time (usually 5 minutes).

### "Invalid session_id"
Your session may have expired or the server was restarted. Re-authenticate using oauth_start and oauth_check.

### Server not appearing in Claude Desktop
1. For Railway deployment: Verify the URL in `claude_desktop_config.json` is correct
2. For local Python: Make sure the server is running (`python src/index.py`)
3. For local TypeScript: Make sure you've built the code (`npm run build`)
4. Restart Claude Desktop completely
5. Check Claude Desktop logs for errors

### Connection issues
Ensure you have an active internet connection and Real-Debrid services are operational.

## Development

### Python Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run in development mode
python src/index.py

# Test the server
curl http://localhost:3000/health
```

### TypeScript Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run watch
```

## Docker Support

### Python Docker

```bash
docker build -f Dockerfile.python -t real-debrid-mcp-python .
docker run -p 3000:3000 real-debrid-mcp-python
```

### TypeScript Docker

```bash
docker build -t real-debrid-mcp-ts .
docker run -p 3000:3000 real-debrid-mcp-ts
```

## Contributing

Feel free to submit issues or pull requests to improve this MCP server.

## License

MIT

## Resources

- [Real-Debrid API Documentation](https://api.real-debrid.com/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [FastMCP Documentation](https://gofastmcp.com/)
- [Railway Platform](https://railway.com/)

## Disclaimer

This is an unofficial Real-Debrid MCP server. Use it responsibly and in accordance with Real-Debrid's Terms of Service.