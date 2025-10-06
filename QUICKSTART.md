# Quick Start Guide

## Choose Your Version

### 🐍 Python (Recommended for Railway)
```bash
# Install and run
pip install -r requirements.txt
python src/index.py

# Or with Docker
docker build -f Dockerfile.python -t rd-mcp .
docker run -p 3000:3000 rd-mcp
```

### 📘 TypeScript (Traditional)
```bash
# Install and build
npm install
npm run build

# Run
npm start

# Or with Docker
docker build -t rd-mcp .
docker run -p 3000:3000 rd-mcp
```

## Railway Deployment (1-Click)

1. Fork this repository to your GitHub
2. Go to [railway.com](https://railway.com)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your forked repository
5. Railway automatically detects `railway.toml` and deploys!
6. Get your URL from Settings → Networking → Generate Domain

Your MCP server will be at: `https://your-app.up.railway.app/sse`

## Configure Claude Desktop

Add to your config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### For Railway Deployment
```json
{
  "mcpServers": {
    "real-debrid": {
      "url": "https://your-app.up.railway.app/sse"
    }
  }
}
```

### For Local Python
```json
{
  "mcpServers": {
    "real-debrid": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### For Local TypeScript
```json
{
  "mcpServers": {
    "real-debrid": {
      "command": "node",
      "args": ["/absolute/path/to/Real-Debrid-MCP-Server/build/index.js"]
    }
  }
}
```

## Using the Server

### 1. Authenticate
```
"Start OAuth authentication for Real-Debrid"
```

You'll get a code to enter at https://real-debrid.com/device

### 2. Complete Authentication
```
"Check OAuth authorization status with device code: XXXXX"
```

You'll get a `session_id` to use for all API calls.

### 3. Use Real-Debrid Features

**Get account info:**
```
"Show my Real-Debrid account info using session_id: XXXXX"
```

**Unrestrict a link:**
```
"Unrestrict this link: https://rapidgator.net/file/abc123 using session_id: XXXXX"
```

**Add a magnet:**
```
"Add this magnet to Real-Debrid: magnet:?xt=urn:btih:... using session_id: XXXXX"
```

**List torrents:**
```
"Show my active torrents using session_id: XXXXX"
```

## Endpoints

- `GET /` - Server information
- `GET /health` - Health check
- `GET /sse` - MCP connection endpoint (use this in Claude config)
- `POST /message` - Message handling (automatic)

## Environment Variables

- `PORT` - Server port (default: 3000, Railway sets automatically)

## Tools Available

1. **oauth_start** - Begin authentication
2. **oauth_check** - Complete authentication
3. **get_user_info** - Get account details
4. **unrestrict_link** - Unrestrict premium links
5. **list_torrents** - View your torrents
6. **add_magnet** - Add magnet links

## Troubleshooting

**Server won't start?**
- Python: Check `pip install -r requirements.txt` completed
- TypeScript: Check `npm install` and `npm run build` completed

**Authentication failing?**
- Make sure you complete the OAuth flow within 5 minutes
- Check your Real-Debrid account is active and premium

**Railway deployment issues?**
- Verify `railway.toml` is in the repository
- Check build logs in Railway dashboard
- Ensure Dockerfile.python is selected

**Claude Desktop not connecting?**
- Restart Claude Desktop after config changes
- Verify the URL/path in config is correct
- Check server is running (visit /health endpoint)

## Support

- 📖 See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for detailed deployment guide
- 🔄 See [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) for TypeScript vs Python comparison
- 📚 See [Readme.md](Readme.md) for full documentation
- 🐛 Open an issue on GitHub for bugs
- 📝 Real-Debrid API docs: https://api.real-debrid.com/
