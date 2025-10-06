import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import type { Request, Response } from "express";

// Real-Debrid API base URLs
const RD_API_BASE = "https://api.real-debrid.com/rest/1.0";
const RD_OAUTH_BASE = "https://api.real-debrid.com/oauth/v2";

// Default open-source client ID (from Real-Debrid docs)
const DEFAULT_CLIENT_ID = "X245A4XAIBGVM";

// In-memory storage for user tokens (in production, use Redis or database)
const userTokens = new Map<string, {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
}>();

// Helper function to make Real-Debrid API requests with OAuth
async function rdApiRequest(
  endpoint: string,
  accessToken: string,
  method: string = "GET",
  body?: Record<string, any>
): Promise<any> {
  const url = `${RD_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
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

// OAuth Device Code Flow functions
async function initiateDeviceAuth() {
  const response = await fetch(
    `${RD_OAUTH_BASE}/device/code?client_id=${DEFAULT_CLIENT_ID}&new_credentials=yes`
  );
  const data = await response.json();
  
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresIn: data.expires_in,
    interval: data.interval
  };
}

async function getDeviceCredentials(deviceCode: string) {
  const response = await fetch(
    `${RD_OAUTH_BASE}/device/credentials?client_id=${DEFAULT_CLIENT_ID}&code=${deviceCode}`
  );
  
  if (!response.ok) {
    return null; // User hasn't authorized yet
  }
  
  const data = await response.json();
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret
  };
}

async function getAccessToken(clientId: string, clientSecret: string, deviceCode: string) {
  const response = await fetch(`${RD_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: deviceCode,
      grant_type: "http://oauth.net/grant_type/device/1.0"
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const response = await fetch(`${RD_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: refreshToken,
      grant_type: "http://oauth.net/grant_type/device/1.0"
    })
  });

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

// Define available tools (including OAuth tools)
const TOOLS: Tool[] = [
  {
    name: "oauth_start",
    description: "Start OAuth device code flow - returns a code for the user to enter at real-debrid.com/device",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "oauth_check",
    description: "Check if OAuth authorization is complete and get access token",
    inputSchema: {
      type: "object",
      properties: {
        device_code: {
          type: "string",
          description: "Device code from oauth_start",
        },
      },
      required: ["device_code"],
    },
  },
  {
    name: "get_user_info",
    description: "Get current Real-Debrid user information",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID from oauth_check",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "unrestrict_link",
    description: "Unrestrict a hoster link",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID from OAuth",
        },
        link: {
          type: "string",
          description: "The hoster link to unrestrict",
        },
        password: {
          type: "string",
          description: "Optional password",
        },
      },
      required: ["session_id", "link"],
    },
  },
  {
    name: "list_torrents",
    description: "Get user's torrents list",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID from OAuth",
        },
        filter: {
          type: "string",
          description: "Filter: 'active' for active torrents only",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "add_magnet",
    description: "Add a magnet link",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID from OAuth",
        },
        magnet: {
          type: "string",
          description: "The magnet link",
        },
      },
      required: ["session_id", "magnet"],
    },
  },
];

// Create MCP server instance
const server = new Server(
  {
    name: "real-debrid-mcp-oauth",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "oauth_start": {
        const authData = await initiateDeviceAuth();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                device_code: authData.deviceCode,
                user_code: authData.userCode,
                verification_url: authData.verificationUrl,
                expires_in: authData.expiresIn,
                message: `Go to ${authData.verificationUrl} and enter code: ${authData.userCode}`,
                instructions: "Then use oauth_check with the device_code to complete authentication"
              }, null, 2),
            },
          ],
        };
      }

      case "oauth_check": {
        const deviceCode = args.device_code as string;
        
        // Get device credentials
        const credentials = await getDeviceCredentials(deviceCode);
        if (!credentials) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "pending",
                  message: "User has not authorized yet. Please complete authorization at real-debrid.com/device"
                }, null, 2),
              },
            ],
          };
        }

        // Get access token
        const tokens = await getAccessToken(credentials.clientId, credentials.clientSecret, deviceCode);
        if (!tokens) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "pending",
                  message: "Authorization in progress. Please try again in a few seconds."
                }, null, 2),
              },
            ],
          };
        }

        // Generate session ID and store tokens
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userTokens.set(sessionId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + (tokens.expiresIn * 1000),
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "authorized",
                session_id: sessionId,
                message: "Successfully authorized! Use this session_id for all other tools.",
                expires_in: tokens.expiresIn
              }, null, 2),
            },
          ],
        };
      }

      case "get_user_info": {
        const sessionId = args.session_id as string;
        const session = userTokens.get(sessionId);
        
        if (!session) {
          throw new Error("Invalid session_id. Please authenticate first using oauth_start and oauth_check.");
        }

        // Check if token needs refresh
        if (Date.now() >= session.expiresAt) {
          const newTokens = await refreshAccessToken(
            session.clientId,
            session.clientSecret,
            session.refreshToken
          );
          session.accessToken = newTokens.accessToken;
          session.refreshToken = newTokens.refreshToken;
          session.expiresAt = Date.now() + (newTokens.expiresIn * 1000);
          userTokens.set(sessionId, session);
        }

        const data = await rdApiRequest("/user", session.accessToken);
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
        const sessionId = args.session_id as string;
        const session = userTokens.get(sessionId);
        
        if (!session) {
          throw new Error("Invalid session_id. Please authenticate first.");
        }

        const data = await rdApiRequest("/unrestrict/link", session.accessToken, "POST", {
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
        const sessionId = args.session_id as string;
        const session = userTokens.get(sessionId);
        
        if (!session) {
          throw new Error("Invalid session_id. Please authenticate first.");
        }

        let endpoint = "/torrents";
        if (args.filter) {
          endpoint += `?filter=${args.filter}`;
        }

        const data = await rdApiRequest(endpoint, session.accessToken);
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
        const sessionId = args.session_id as string;
        const session = userTokens.get(sessionId);
        
        if (!session) {
          throw new Error("Invalid session_id. Please authenticate first.");
        }

        const data = await rdApiRequest("/torrents/addMagnet", session.accessToken, "POST", {
          magnet: args.magnet as string,
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

// Start the HTTP server
async function main() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Root endpoint
  app.get("/", (req: Request, res: Response) => {
    res.json({
      name: "Real-Debrid MCP Server (OAuth)",
      version: "2.0.0",
      status: "running",
      transport: "HTTP/SSE",
      authentication: "OAuth Device Code Flow",
      endpoints: {
        root: "/",
        health: "/health",
        sse: "/sse (MCP connection endpoint)",
      },
      usage: "Use oauth_start tool to begin authentication",
      tools: TOOLS.length
    });
  });

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.json({ 
      status: "healthy", 
      service: "real-debrid-mcp-oauth",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeSessions: userTokens.size
    });
  });

  // SSE endpoint for MCP
  app.get("/sse", async (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] 🔌 New MCP client connecting via SSE`);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    try {
      const transport = new SSEServerTransport("/message", res);
      await server.connect(transport);
      
      console.log(`[${new Date().toISOString()}]  MCP client connected successfully`);
      
      req.on('close', () => {
        console.log(`[${new Date().toISOString()}]  MCP client disconnected`);
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}]  Error establishing SSE connection:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to establish SSE connection",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // Message endpoint
  app.post("/message", express.json(), async (req: Request, res: Response) => {
    res.status(200).end();
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`
    });
  });

  // Error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error(`[${new Date().toISOString()}]  Express error:`, err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message 
    });
  });

  app.listen(PORT, () => {
    console.log("═".repeat(60));
    console.log(" REAL-DEBRID MCP SERVER (OAuth) STARTED");
    console.log("═".repeat(60));
    console.log(` Transport:     HTTP/SSE (Railway-compatible)`);
    console.log(` Auth Method:   OAuth Device Code Flow`);
    console.log(` Port:          ${PORT}`);
    console.log(` Health Check:  http://localhost:${PORT}/health`);
    console.log(` SSE Endpoint:  http://localhost:${PORT}/sse`);
    console.log(`  Tools:         ${TOOLS.length} Real-Debrid tools available`);
    console.log(` Started:       ${new Date().toISOString()}`);
    console.log("═".repeat(60));
    console.log(" Users authenticate via oauth_start tool!");
    console.log("═".repeat(60));
  });
}

main().catch((error) => {
  console.error("❌ Fatal error starting server:", error);
  process.exit(1);
});
