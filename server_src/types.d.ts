import * as session from "express-session";
import { DbDiscordSession, DbDiscordUser, DbSession, DbUser } from "./db/databaseTypes";

export type BotdizSession = session.Session & Partial<session.SessionData> & {
    token: string;
    userId?: string;
}

export interface BotdizWebSocketMessage {
    status: "success" | "failed";
    event: any;
    message: string;
    data?: string; 
}

declare global {
    namespace Express {
        interface Request {
            session: BotdizSession;
            dbSession?: DbSession | DbDiscordSession;
            user?: DbUser | DbDiscordUser;
        }
    }
}

declare module "express-session" {
    interface SessionData {
        token?: string;
        userId?: string;
    }
}