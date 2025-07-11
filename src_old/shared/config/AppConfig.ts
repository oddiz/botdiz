import "dotenv/config";

export interface DiscordConfig {
    token: string;
    testToken: string;
    clientId: string;
    clientSecret: string;
}

export interface DatabaseConfig {
    url: string;
    name: string;
}

export interface LavalinkConfig {
    host: string;
    port: number;
    password: string;
    secure: boolean;
}

export interface ServerConfig {
    port: number;
    httpsPort: number;
    sessionSecret: string;
    corsOrigins: string[];
}

export interface SpotifyConfig {
    clientId: string;
    clientSecret: string;
}

export interface AppConfig {
    discord: DiscordConfig;
    database: DatabaseConfig;
    lavalink: LavalinkConfig;
    server: ServerConfig;
    spotify: SpotifyConfig;
    nodeEnv: 'development' | 'production';
}

class ConfigService {
    private config: AppConfig;

    constructor() {
        this.config = this.loadAndValidateConfig();
    }

    public getConfig(): AppConfig {
        return this.config;
    }

    private loadAndValidateConfig(): AppConfig {
        const requiredEnvVars = [
            'DISCORD_BOT_TOKEN',
            'SESSION_SECRET',
            'SPOTIFY_CLIENT_ID', 
            'SPOTIFY_CLIENT_SECRET'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Required environment variable ${envVar} is not set`);
            }
        }

        return {
            discord: {
                token: process.env.DISCORD_BOT_TOKEN!,
                testToken: process.env.DISCORD_BOT_TEST_TOKEN || process.env.DISCORD_BOT_TOKEN!,
                clientId: process.env.DISCORD_CLIENT_ID || '',
                clientSecret: process.env.DISCORD_CLIENT_SECRET || ''
            },
            database: {
                url: process.env.DB_URL || 'mongodb://localhost:27017',
                name: process.env.DB_NAME || 'botdiz'
            },
            lavalink: {
                host: process.env.LAVALINK_HOST || 'localhost',
                port: parseInt(process.env.LAVALINK_PORT || '2333'),
                password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
                secure: process.env.LAVALINK_SECURE === 'true'
            },
            server: {
                port: parseInt(process.env.PORT || '8080'),
                httpsPort: parseInt(process.env.HTTPS_PORT || '8443'),
                sessionSecret: process.env.SESSION_SECRET!,
                corsOrigins: process.env.NODE_ENV === 'development' 
                    ? ['http://localhost:3000', 'http://localhost:8080']
                    : ['https://botdiz.kaansarkaya.com', 'https://api.kaansarkaya.com:8080', 'https://oddiz.grafana.net']
            },
            spotify: {
                clientId: process.env.SPOTIFY_CLIENT_ID!,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
            },
            nodeEnv: (process.env.NODE_ENV as 'development' | 'production') || 'development'
        };
    }
}

export const configService = new ConfigService();
export const config = configService.getConfig();