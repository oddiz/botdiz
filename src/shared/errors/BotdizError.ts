export abstract class BotdizError extends Error {
    abstract readonly code: string;
    abstract readonly statusCode: number;
    
    constructor(
        message: string,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends BotdizError {
    readonly code = 'VALIDATION_ERROR';
    readonly statusCode = 400;
}

export class NotFoundError extends BotdizError {
    readonly code = 'NOT_FOUND';
    readonly statusCode = 404;
}

export class UnauthorizedError extends BotdizError {
    readonly code = 'UNAUTHORIZED';
    readonly statusCode = 401;
}

export class DatabaseError extends BotdizError {
    readonly code = 'DATABASE_ERROR';
    readonly statusCode = 500;
}

export class DiscordApiError extends BotdizError {
    readonly code = 'DISCORD_API_ERROR';
    readonly statusCode = 500;
}

export class MusicPlayerError extends BotdizError {
    readonly code = 'MUSIC_PLAYER_ERROR';
    readonly statusCode = 500;
}

export class LavalinkError extends BotdizError {
    readonly code = 'LAVALINK_ERROR';
    readonly statusCode = 500;
}

export class ConfigurationError extends BotdizError {
    readonly code = 'CONFIGURATION_ERROR';
    readonly statusCode = 500;
}