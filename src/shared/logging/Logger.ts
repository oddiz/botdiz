import { BotdizError } from "../errors/BotdizError";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    [key: string]: unknown;
}

export class Logger {
    constructor(private readonly context: string) {}

    debug(message: string, meta?: LogContext): void {
        this.log('debug', message, meta);
    }

    info(message: string, meta?: LogContext): void {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: LogContext): void {
        this.log('warn', message, meta);
    }

    error(message: string, error?: Error | BotdizError, meta?: LogContext): void {
        const errorMeta: LogContext = {
            ...meta,
            error: error?.message,
            stack: error?.stack,
            ...(error instanceof BotdizError && { 
                errorCode: error.code,
                errorContext: error.context 
            })
        };
        
        this.log('error', message, errorMeta);
    }

    private log(level: LogLevel, message: string, meta?: LogContext): void {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            ...meta
        };

        // In production, you'd send this to a proper logging service
        // For now, we'll use console with better formatting
        const formattedMessage = `[${timestamp}] ${level.toUpperCase()} [${this.context}] ${message}`;
        
        switch (level) {
            case 'debug':
                console.debug(formattedMessage, meta || '');
                break;
            case 'info':
                console.info(formattedMessage, meta || '');
                break;
            case 'warn':
                console.warn(formattedMessage, meta || '');
                break;
            case 'error':
                console.error(formattedMessage, meta || '');
                break;
        }
    }

    createChild(childContext: string): Logger {
        return new Logger(`${this.context}.${childContext}`);
    }
}

export function createLogger(context: string): Logger {
    return new Logger(context);
}