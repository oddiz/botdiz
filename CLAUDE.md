# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Botdiz is a Discord music bot with a web interface that provides music playback, playlist management, and various utility commands. The project consists of two main components:

1. **Discord Bot** (`src/` directory) - Discord.js bot with music functionality via Lavalink
2. **Web Server** (`server_src/` directory) - Express.js API server with WebSocket support for real-time communication

## Common Commands

### Development
- `npm run dev` - Start all services (Database, Lavalink, Server) in development mode
- `npm run start:Database` - Start MongoDB database
- `npm run start:Lava` - Start Lavalink audio server via Docker Compose
- `npm run start:Server` - Start the web server and Discord bot

### Production
- `npm start` - Build TypeScript and run the server
- `npm run forever` - Build and run with forever (production daemon)

### Build & Quality
- `tsc` - Compile TypeScript to JavaScript (outputs to `build/` directory)
- No specific lint/test commands are configured - check with the user if needed

## Architecture

### Core Components

**Discord Bot (`src/`)**
- `main.ts` - Bot entry point, handles Discord client initialization and guild management
- `modules/Controller.ts` - Per-guild controller that manages bot functionality for each Discord server
- `modules/MusicPlayer/MusicControllerLavalink.ts` - Music playback controller using Lavalink
- `commands/` - Discord slash commands (play, pause, skip, etc.)
- `Shokaku/` - Lavalink client wrapper for audio streaming

**Web Server (`server_src/`)**
- `server.ts` - Express.js server with HTTPS support and session management
- `Websocket/` - WebSocket manager for real-time communication with web clients
- `routes/` - REST API endpoints for authentication, guild management, and metrics
- `db/DatabaseManager.ts` - MongoDB connection and query management

### Key Design Patterns

- **Per-Guild Controllers**: Each Discord server gets its own `Controller` instance managed in the `GuildControllers` array
- **Dual Architecture**: Bot and web server run in the same process but serve different purposes
- **WebSocket RPC**: Real-time communication between web clients and Discord bot via WebSocket commands
- **Session-based Auth**: Uses Express sessions with Discord OAuth for web authentication

### Dependencies

**Core Libraries**
- `discord.js` - Discord API client
- `shoukaku` - Lavalink client for audio streaming
- `express` - Web server framework
- `mongodb` - Database driver
- `ws` - WebSocket implementation

**Audio & Music**
- `ytdl-core` - YouTube video downloading
- `ytsr` - YouTube search
- `spotify-web-api-node` - Spotify API integration

### Environment Setup

The project requires:
1. **MongoDB** running locally (started via `npm run start:Database`)
2. **Lavalink** audio server (started via Docker Compose in `lavalink/`)
3. **Environment variables** for Discord tokens, session secrets, and API keys

### Database Schema

MongoDB collections are defined in `server_src/db/databaseTypes.d.ts`:
- Discord users and guild permissions
- Bot statistics and usage metrics
- User sessions and authentication data

### Development Notes

- TypeScript compilation outputs to `build/` directory
- The bot supports both development and production Discord tokens
- HTTPS is used in production with Let's Encrypt certificates
- Session storage uses file-based sessions in development, with 7-day expiration
- Rate limiting is implemented for WebSocket connections

## File Structure

```
src/                    # Discord bot code
├── main.ts            # Bot entry point
├── modules/           # Core bot modules
│   ├── Controller.ts  # Per-guild controller
│   └── MusicPlayer/   # Music functionality
├── commands/          # Discord slash commands
└── Shokaku/          # Lavalink integration

server_src/            # Web server code
├── server.ts         # Express server entry point
├── Websocket/        # WebSocket management
├── routes/           # REST API endpoints
└── db/               # Database management

lavalink/             # Lavalink audio server config
└── compose.yaml      # Docker Compose setup
```