# Real-Debrid MCP Server

A Model Context Protocol (MCP) server that provides access to Real-Debrid API functionality. This server allows AI assistants like Claude to interact with your Real-Debrid account to unrestrict links, manage torrents, and more.

## Features

This MCP server provides the following Real-Debrid capabilities:

### User Management
- **get_user_info**: Get current user information including premium status, expiration date, and fidelity points

### Link Unrestricting
- **unrestrict_link**: Convert premium links to direct download links
- **check_link**: Check if a file is downloadable on a specific hoster

### Torrent Management
- **list_torrents**: View all your torrents with optional filtering
- **get_torrent_info**: Get detailed information about a specific torrent
- **add_torrent**: Add a torrent via HTTP link
- **add_magnet**: Add a torrent via magnet link
- **select_torrent_files**: Select which files to download from a torrent
- **delete_torrent**: Remove a torrent from your list
- **instant_availability**: Check if torrents are cached (instantly available)
- **get_available_torrent_hosts**: Get list of available hosts for torrents

### Download Management
- **list_downloads**: View your download history
- **delete_download**: Remove a download from your list

### Traffic & Hosts
- **get_traffic_info**: View traffic usage for limited hosters
- **get_supported_hosts**: Get all supported hoster domains

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Real-Debrid premium account
- Real-Debrid API token (get it from https://real-debrid.com/apitoken)

## Installation

1. Clone or download this repository:
```bash
mkdir real-debrid-mcp
cd real-debrid-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Configuration

### Get Your Real-Debrid API Token

1. Go to https://real-debrid.com/apitoken
2. Log in to your Real-Debrid account
3. Copy your private API token (keep it secret!)

### Setting Up the Environment Variable

You need to set the `REAL_DEBRID_API_TOKEN` environment variable:

**On macOS/Linux:**
```bash
export REAL_DEBRID_API_TOKEN="your_token_here"
```

**On Windows (Command Prompt):**
```cmd
set REAL_DEBRID_API_TOKEN=your_token_here
```

**On Windows (PowerShell):**
```powershell
$env:REAL_DEBRID_API_TOKEN="your_token_here"
```

### Configure with Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### Check Your Account Status
```
"What's my Real-Debrid account status?"
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

### Check Instant Availability
```
"Check if this torrent hash is cached: abc123def456..."
```

### Get Download Links
```
"List my recent downloads"
```

## Testing with MCP Inspector

You can test your server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Make sure to set the `REAL_DEBRID_API_TOKEN` environment variable before running the inspector.

## Tools Reference

### get_user_info
Returns information about your Real-Debrid account:
- Username and email
- Premium status and expiration date
- Fidelity points
- Account type

### unrestrict_link
**Parameters:**
- `link` (required): The premium hoster link to unrestrict
- `password` (optional): Password if the file is password-protected
- `remote` (optional): Use remote traffic (0 or 1)

**Returns:** Direct download link with file information

### add_magnet
**Parameters:**
- `magnet` (required): The magnet link
- `host` (optional): Preferred hoster for upload

**Returns:** Torrent ID and URI

### list_torrents
**Parameters:**
- `offset` (optional): Starting position for pagination
- `limit` (optional): Number of results (max 5000)
- `filter` (optional): Set to "active" to show only active torrents

**Returns:** Array of torrent objects with status, progress, and files

### instant_availability
**Parameters:**
- `hash` (required): Comma-separated SHA1 hashes (lowercase)

**Returns:** Object showing which torrents are instantly available (cached)

## Error Handling

The server handles Real-Debrid API errors gracefully and returns descriptive error messages. Common errors include:

- **401**: Bad or expired token
- **403**: Permission denied (account locked or not premium)
- **503**: Service unavailable or file unavailable

## Security Notes

- **Never share your API token** - it provides full access to your Real-Debrid account
- **Don't commit your token** to version control
- Use environment variables to keep your token secure
- The API token is stored in the configuration file - ensure proper file permissions

## API Rate Limits

Real-Debrid has rate limiting in place. The server will return appropriate error messages if you exceed rate limits.

## Troubleshooting

### "REAL_DEBRID_API_TOKEN environment variable is required"
Make sure you've set the environment variable in your configuration file or system environment.

### "Bad token (expired, invalid)"
Your API token may have expired or been revoked. Generate a new one from https://real-debrid.com/apitoken

### Server not appearing in Claude Desktop
1. Verify the path in `claude_desktop_config.json` is correct and absolute
2. Make sure you've built the TypeScript code (`npm run build`)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

### Connection issues
Ensure you have an active internet connection and Real-Debrid services are operational.

## Development

To work on the server:

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run watch
```

## Contributing

Feel free to submit issues or pull requests to improve this MCP server.

## License

MIT

## Resources

- [Real-Debrid API Documentation](https://api.real-debrid.com/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Get your Real-Debrid API Token](https://real-debrid.com/apitoken)

## Disclaimer

This is an unofficial Real-Debrid MCP server. Use it responsibly and in accordance with Real-Debrid's Terms of Service.