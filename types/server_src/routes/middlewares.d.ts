import { NextFunction, Request, Response } from "express";
import { DbDiscordSession, DbDiscordUser, DbSession, DbUser } from "server_src/db/databaseTypes";
declare global {
    namespace Express {
        interface Request {
            dbSession: DbSession | DbDiscordSession;
            user: DbUser | DbDiscordUser;
        }
    }
}
/**
 * Authenticate Request and adds session data and user data to request
 */
export declare function withAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
