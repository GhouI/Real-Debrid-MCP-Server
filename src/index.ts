import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import type { Request, Response } from "express";

// Real-Debrid API base URL
const RD_API_BASE = "https://api.real-debrid.com/rest/1.0";

// API token from environment variable (required)
const API_TOKEN = process.env.REAL_DEBRID_API_TOKEN;

if (!API_TOKEN) {
  console.error("❌ Error: REAL_DEBRID_API_TOKEN environment variable is required");
  console.error("📝 Get your API token from: https://real-debrid.com/apitoken");
  process.exit(1);
}

// Helper function to make Real-Debrid API requests
async function rdApiRequest(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, any>
): Promise<any> {
  const url = `${RD_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_TOKEN}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(url, options);
  
  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Real-Debrid API Error: ${data.error || "Unknown error"} (Code: ${data.error_code || "N/A"})`
    );
  }

  return data;
}

// Define all available MCP tools
const TOOLS: Tool[] = [
  {
    name: "get_user_info",
    description: "Get current Real-Debrid user information including premium status, expiration, and points",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "unrestrict_link",
    description: "Unrestrict a hoster link and get a direct download link",
    inputSchema: {
      type: "object",
      properties: {
        link: {
          type: "string",
          description: "The original hoster link to unrestrict",
        },
        password: {
          type: "string",
          description: "Optional password to unlock the file (if required by hoster)",
        },
        remote: {
          type: "number",
          description: "Optional: 0 or 1, use Remote traffic (default: 0)",
        },
      },
      required: ["link"],
    },
  },
  {
    name: "check_link",
    description: "Check if a file is downloadable on the concerned hoster",
    inputSchema: {
      type: "object",
      properties: {
        link: {
          type: "string",
          description: "The original hoster link to check",
        },
        password: {
          type: "string",
          description: "Optional password to unlock the file access",
        },
      },
      required: ["link"],
    },
  },
  {
    name: "list_torrents",
    description: "Get user's torrents list with optional filtering",
    inputSchema: {
      type: "object",
      properties: {
        offset: {
          type: "number",
          description: "Starting offset for pagination",
        },
        limit: {
          type: "number",
          description: "Number of entries to return (max 5000, default 100)",
        },
        filter: {
          type: "string",
          description: "Filter active torrents only (use 'active')",
        },
      },
    },
  },
  {
    name: "get_torrent_info",
    description: "Get detailed information about a specific torrent",
    inputSchema: {
      type: "object",
      properties: {
        torrent_id: {
          type: "string",
          description: "The ID of the torrent",
        },
      },
      required: ["torrent_id"],
    },
  },
  {
    name: "add_torrent",
    description: "Add a torrent file to Real-Debrid via file upload or HTTP link",
    inputSchema: {
      type: "object",
      properties: {
        link: {
          type: "string",
          description: "HTTP link to the torrent file",
        },
        host: {
          type: "string",
          description: "Hoster domain (from /torrents/availableHosts)",
        },
      },
      required: ["link"],
    },
  },
  {
    name: "add_magnet",
    description: "Add a magnet link to Real-Debrid",
    inputSchema: {
      type: "object",
      properties: {
        magnet: {
          type: "string",
          description: "The magnet link to add",
        },
        host: {
          type: "string",
          description: "Hoster domain (from /torrents/availableHosts)",
        },
      },
      required: ["magnet"],
    },
  },
  {
    name: "select_torrent_files",
    description: "Select files from a torrent for download",
    inputSchema: {
      type: "object",
      properties: {
        torrent_id: {
          type: "string",
          description: "The ID of the torrent",
        },
        files: {
          type: "string",
          description: "Selected file IDs (comma separated) or 'all' for all files",
        },
      },
      required: ["torrent_id", "files"],
    },
  },
  {
    name: "delete_torrent",
    description: "Delete a torrent from the torrents list",
    inputSchema: {
      type: "object",
      properties: {
        torrent_id: {
          type: "string",
          description: "The ID of the torrent to delete",
        },
      },
      required: ["torrent_id"],
    },
  },
  {
    name: "list_downloads",
    description: "Get user's downloads list",
    inputSchema: {
      type: "object",
      properties: {
        offset: {
          type: "number",
          description: "Starting offset for pagination",
        },
        limit: {
          type: "number",
          description: "Number of entries to return (max 5000, default 100)",
        },
      },
    },
  },
  {
    name: "delete_download",
    description: "Delete a link from downloads list",
    inputSchema: {
      type: "object",
      properties: {
        download_id: {
          type: "string",
          description: "The ID of the download to delete",
        },
      },
      required: ["download_id"],
    },
  },
  {
    name: "get_traffic_info",
    description: "Get traffic information for limited hosters",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_supported_hosts",
    description: "Get all supported hoster domains",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_available_torrent_hosts",
    description: "Get available hosts to upload torrents to",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "instant_availability",
    description: "Check if torrents are instantly available (cached) by their hash",
    inputSchema: {
      type: "object",
      properties: {
        hash: {
          type: "string",
          description: "Comma-separated list of torrent SHA1 hashes (lowercase, up to 100 hashes)",
        },
      },
      required: ["hash"],
    },
  },
];

// Create MCP server instance
const server = new Server(
  {
    name: "real-debrid-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Ensure args exists
    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "get_user_info": {
        const data = await rdApiRequest("/user");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "unrestrict_link": {
        const data = await rdApiRequest("/unrestrict/link", "POST", {
          link: args.link as string,
          password: args.password as string | undefined,
          remote: (args.remote as number) || 0,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "check_link": {
        const data = await rdApiRequest("/unrestrict/check", "POST", {
          link: args.link as string,
          password: args.password as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "list_torrents": {
        let endpoint = "/torrents";
        const params = new URLSearchParams();
        if (args.offset) params.append("offset", String(args.offset));
        if (args.limit) params.append("limit", String(args.limit));
        if (args.filter) params.append("filter", String(args.filter));
        
        const queryString = params.toString();
        if (queryString) endpoint += `?${queryString}`;
        
        const data = await rdApiRequest(endpoint);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_torrent_info": {
        const data = await rdApiRequest(`/torrents/info/${args.torrent_id as string}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "add_torrent": {
        const data = await rdApiRequest("/torrents/addTorrent", "POST", {
          link: args.link as string,
          host: args.host as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "add_magnet": {
        const data = await rdApiRequest("/torrents/addMagnet", "POST", {
          magnet: args.magnet as string,
          host: args.host as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "select_torrent_files": {
        const data = await rdApiRequest(
          `/torrents/selectFiles/${args.torrent_id as string}`,
          "POST",
          {
            files: args.files as string,
          }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "delete_torrent": {
        await rdApiRequest(
          `/torrents/delete/${args.torrent_id as string}`,
          "DELETE"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, message: "Torrent deleted successfully" }, null, 2),
            },
          ],
        };
      }

      case "list_downloads": {
        let endpoint = "/downloads";
        const params = new URLSearchParams();
        if (args.offset) params.append("offset", String(args.offset));
        if (args.limit) params.append("limit", String(args.limit));
        
        const queryString = params.toString();
        if (queryString) endpoint += `?${queryString}`;
        
        const data = await rdApiRequest(endpoint);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "delete_download": {
        await rdApiRequest(
          `/downloads/delete/${args.download_id as string}`,
          "DELETE"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, message: "Download deleted successfully" }, null, 2),
            },
          ],
        };
      }

      case "get_traffic_info": {
        const data = await rdApiRequest("/traffic");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_supported_hosts": {
        const data = await rdApiRequest("/hosts/domains");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_available_torrent_hosts": {
        const data = await rdApiRequest("/torrents/availableHosts");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "instant_availability": {
        const data = await rdApiRequest(`/torrents/instantAvailability/${args.hash as string}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the HTTP API server with SSE transport
async function main() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Enable JSON parsing for POST requests
  app.use(express.json());

  // Root endpoint - server info
  app.get("/", (req: Request, res: Response) => {
    res.json({
      name: "Real-Debrid MCP Server",
      version: "1.0.0",
      status: "running",
      transport: "HTTP/SSE",
      endpoints: {
        root: "/",
        health: "/health",
        sse: "/sse (MCP connection endpoint)",
        message: "/message (MCP message handler)"
      },
      documentation: "https://api.real-debrid.com/",
      tools: TOOLS.length
    });
  });

  // Health check endpoint for Railway
  app.get("/health", (req: Request, res: Response) => {
    res.json({ 
      status: "healthy", 
      service: "real-debrid-mcp",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // SSE endpoint for MCP client connections
  app.get("/sse", async (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] 🔌 New MCP client connecting via SSE`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    try {
      const transport = new SSEServerTransport("/message", res);
      await server.connect(transport);
      
      console.log(`[${new Date().toISOString()}] ✅ MCP client connected successfully`);
      
      // Handle client disconnect
      req.on('close', () => {
        console.log(`[${new Date().toISOString()}] 👋 MCP client disconnected`);
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error establishing SSE connection:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to establish SSE connection",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // Message endpoint for MCP protocol (handled by SSE transport)
  app.post("/message", express.json(), async (req: Request, res: Response) => {
    // The SSE transport automatically handles message processing
    // This endpoint exists for the MCP protocol but doesn't need manual handling
    res.status(200).end();
  });

  // 404 handler for undefined routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
      availableEndpoints: {
        "GET /": "Server information",
        "GET /health": "Health check",
        "GET /sse": "MCP SSE connection",
        "POST /message": "MCP message handler"
      }
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error(`[${new Date().toISOString()}] ❌ Express error:`, err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message 
    });
  });

  // Start listening
  app.listen(PORT, () => {
    console.log("═".repeat(60));
    console.log("🚀 REAL-DEBRID MCP SERVER STARTED");
    console.log("═".repeat(60));
    console.log(`📡 Transport:     HTTP/SSE (Railway-compatible)`);
    console.log(`🌐 Port:          ${PORT}`);
    console.log(`🏥 Health Check:  http://localhost:${PORT}/health`);
    console.log(`🔌 SSE Endpoint:  http://localhost:${PORT}/sse`);
    console.log(`🛠️  Tools:         ${TOOLS.length} Real-Debrid tools available`);
    console.log(`⏰ Started:       ${new Date().toISOString()}`);
    console.log(`🔐 Token:         ${API_TOKEN ? '✓ Configured' : '✗ Missing'}`);
    console.log("═".repeat(60));
    console.log("💡 Ready to accept MCP connections!");
    console.log("═".repeat(60));
  });
}

// Start the server
main().catch((error) => {
  console.error("❌ Fatal error starting server:", error);
  process.exit(1);
});