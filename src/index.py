#!/usr/bin/env python3
"""
Real-Debrid MCP Server (OAuth) - Python Implementation
A Model Context Protocol server for Real-Debrid API with OAuth Device Code Flow
"""

import os
import time
import json
from datetime import datetime, timezone
from typing import Dict, Optional, Any
from urllib.parse import urlencode
import asyncio

import httpx
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

# Real-Debrid API base URLs
RD_API_BASE = "https://api.real-debrid.com/rest/1.0"
RD_OAUTH_BASE = "https://api.real-debrid.com/oauth/v2"

# Default open-source client ID (from Real-Debrid docs)
DEFAULT_CLIENT_ID = "X245A4XAIBGVM"

# In-memory storage for user tokens (in production, use Redis or database)
user_tokens: Dict[str, Dict[str, Any]] = {}

# Initialize FastMCP server
mcp = FastMCP("real-debrid-mcp-oauth")


async def rd_api_request(
    endpoint: str,
    access_token: str,
    method: str = "GET",
    body: Optional[Dict[str, Any]] = None
) -> Any:
    """Helper function to make Real-Debrid API requests with OAuth"""
    url = f"{RD_API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        else:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            data = urlencode(body) if body else None
            response = await client.request(method, url, headers=headers, content=data)
        
        if response.status_code == 204:
            return {"success": True}
        
        data = response.json()
        
        if response.status_code >= 400:
            error_msg = data.get("error", "Unknown error")
            error_code = data.get("error_code", "N/A")
            raise Exception(f"Real-Debrid API Error: {error_msg} (Code: {error_code})")
        
        return data


async def initiate_device_auth() -> Dict[str, Any]:
    """Start OAuth Device Code Flow"""
    url = f"{RD_OAUTH_BASE}/device/code?client_id={DEFAULT_CLIENT_ID}&new_credentials=yes"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        
        return {
            "deviceCode": data["device_code"],
            "userCode": data["user_code"],
            "verificationUrl": data["verification_url"],
            "expiresIn": data["expires_in"],
            "interval": data["interval"]
        }


async def get_device_credentials(device_code: str) -> Optional[Dict[str, str]]:
    """Get device credentials after user authorization"""
    url = f"{RD_OAUTH_BASE}/device/credentials?client_id={DEFAULT_CLIENT_ID}&code={device_code}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        
        if response.status_code != 200:
            return None  # User hasn't authorized yet
        
        data = response.json()
        return {
            "clientId": data["client_id"],
            "clientSecret": data["client_secret"]
        }


async def get_access_token(client_id: str, client_secret: str, device_code: str) -> Optional[Dict[str, Any]]:
    """Get access token using device code"""
    url = f"{RD_OAUTH_BASE}/token"
    
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": device_code,
        "grant_type": "http://oauth.net/grant_type/device/1.0"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            content=urlencode(payload)
        )
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        return {
            "accessToken": data["access_token"],
            "refreshToken": data["refresh_token"],
            "expiresIn": data["expires_in"]
        }


async def refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> Dict[str, Any]:
    """Refresh access token"""
    url = f"{RD_OAUTH_BASE}/token"
    
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": refresh_token,
        "grant_type": "http://oauth.net/grant_type/device/1.0"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            content=urlencode(payload)
        )
        
        data = response.json()
        return {
            "accessToken": data["access_token"],
            "refreshToken": data["refresh_token"],
            "expiresIn": data["expires_in"]
        }


# OAuth Tools
@mcp.tool()
async def oauth_start() -> str:
    """Start OAuth device code flow - returns a code for the user to enter at real-debrid.com/device"""
    auth_data = await initiate_device_auth()
    
    result = {
        "device_code": auth_data["deviceCode"],
        "user_code": auth_data["userCode"],
        "verification_url": auth_data["verificationUrl"],
        "expires_in": auth_data["expiresIn"],
        "message": f"Go to {auth_data['verificationUrl']} and enter code: {auth_data['userCode']}",
        "instructions": "Then use oauth_check with the device_code to complete authentication"
    }
    
    return json.dumps(result, indent=2)


@mcp.tool()
async def oauth_check(device_code: str) -> str:
    """Check if OAuth authorization is complete and get access token
    
    Args:
        device_code: Device code from oauth_start
    """
    # Get device credentials
    credentials = await get_device_credentials(device_code)
    if not credentials:
        result = {
            "status": "pending",
            "message": "User has not authorized yet. Please complete authorization at real-debrid.com/device"
        }
        return json.dumps(result, indent=2)
    
    # Get access token
    tokens = await get_access_token(credentials["clientId"], credentials["clientSecret"], device_code)
    if not tokens:
        result = {
            "status": "pending",
            "message": "Authorization in progress. Please try again in a few seconds."
        }
        return json.dumps(result, indent=2)
    
    # Generate session ID and store tokens
    session_id = f"session_{int(time.time())}_{os.urandom(4).hex()}"
    user_tokens[session_id] = {
        "accessToken": tokens["accessToken"],
        "refreshToken": tokens["refreshToken"],
        "expiresAt": time.time() + tokens["expiresIn"],
        "clientId": credentials["clientId"],
        "clientSecret": credentials["clientSecret"]
    }
    
    result = {
        "status": "authorized",
        "session_id": session_id,
        "message": "Successfully authorized! Use this session_id for all other tools.",
        "expires_in": tokens["expiresIn"]
    }
    
    return json.dumps(result, indent=2)


# Real-Debrid API Tools
@mcp.tool()
async def get_user_info(session_id: str) -> str:
    """Get current Real-Debrid user information
    
    Args:
        session_id: Session ID from oauth_check
    """
    session = user_tokens.get(session_id)
    
    if not session:
        raise ToolError("Invalid session_id. Please authenticate first using oauth_start and oauth_check.")
    
    # Check if token needs refresh
    if time.time() >= session["expiresAt"]:
        new_tokens = await refresh_access_token(
            session["clientId"],
            session["clientSecret"],
            session["refreshToken"]
        )
        session["accessToken"] = new_tokens["accessToken"]
        session["refreshToken"] = new_tokens["refreshToken"]
        session["expiresAt"] = time.time() + new_tokens["expiresIn"]
        user_tokens[session_id] = session
    
    data = await rd_api_request("/user", session["accessToken"])
    return json.dumps(data, indent=2)


@mcp.tool()
async def unrestrict_link(session_id: str, link: str, password: Optional[str] = None) -> str:
    """Unrestrict a hoster link
    
    Args:
        session_id: Session ID from OAuth
        link: The hoster link to unrestrict
        password: Optional password for protected files
    """
    session = user_tokens.get(session_id)
    
    if not session:
        raise ToolError("Invalid session_id. Please authenticate first.")
    
    body = {"link": link}
    if password:
        body["password"] = password
    
    data = await rd_api_request("/unrestrict/link", session["accessToken"], "POST", body)
    return json.dumps(data, indent=2)


@mcp.tool()
async def list_torrents(session_id: str, filter: Optional[str] = None) -> str:
    """Get user's torrents list
    
    Args:
        session_id: Session ID from OAuth
        filter: Filter: 'active' for active torrents only
    """
    session = user_tokens.get(session_id)
    
    if not session:
        raise ToolError("Invalid session_id. Please authenticate first.")
    
    endpoint = "/torrents"
    if filter:
        endpoint += f"?filter={filter}"
    
    data = await rd_api_request(endpoint, session["accessToken"])
    return json.dumps(data, indent=2)


@mcp.tool()
async def add_magnet(session_id: str, magnet: str) -> str:
    """Add a magnet link
    
    Args:
        session_id: Session ID from OAuth
        magnet: The magnet link
    """
    session = user_tokens.get(session_id)
    
    if not session:
        raise ToolError("Invalid session_id. Please authenticate first.")
    
    data = await rd_api_request("/torrents/addMagnet", session["accessToken"], "POST", {"magnet": magnet})
    return json.dumps(data, indent=2)


# Add custom routes
@mcp.custom_route("/", methods=["GET"])
async def root(request):
    """Root endpoint with server information"""
    from starlette.responses import JSONResponse
    return JSONResponse({
        "name": "Real-Debrid MCP Server (OAuth)",
        "version": "2.0.0",
        "status": "running",
        "transport": "HTTP/SSE",
        "authentication": "OAuth Device Code Flow",
        "endpoints": {
            "root": "/",
            "health": "/health",
            "sse": "/sse (MCP connection endpoint)",
        },
        "usage": "Use oauth_start tool to begin authentication",
        "tools": 6
    })


@mcp.custom_route("/health", methods=["GET"])
async def health(request):
    """Health check endpoint"""
    from starlette.responses import JSONResponse
    return JSONResponse({
        "status": "healthy",
        "service": "real-debrid-mcp-oauth",
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "activeSessions": len(user_tokens)
    })


# Main entry point for SSE transport
def main():
    """Start the FastMCP server with SSE transport"""
    # Get port from environment or use default
    port = int(os.getenv("PORT", "3000"))
    
    print("=" * 60)
    print(" REAL-DEBRID MCP SERVER (OAuth) STARTED")
    print("=" * 60)
    print(f" Transport:     HTTP/SSE (Railway-compatible)")
    print(f" Auth Method:   OAuth Device Code Flow")
    print(f" Port:          {port}")
    print(f" Health Check:  http://localhost:{port}/health")
    print(f" SSE Endpoint:  http://localhost:{port}/sse")
    print(f" Tools:         6 Real-Debrid tools available")
    print(f" Started:       {datetime.now(timezone.utc).isoformat()}Z")
    print("=" * 60)
    print(" Users authenticate via oauth_start tool!")
    print("=" * 60)
    
    # Start the server with SSE transport
    mcp.run(transport="sse", host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
