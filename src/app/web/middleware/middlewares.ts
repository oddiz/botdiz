/// <reference path="../types.d.ts" />
import { NextFunction, Request, Response } from "express";
import { WithId, Document } from "mongodb";
import { dbManager } from "../db/DatabaseManager";
import { DbDiscordSession, DbDiscordUser, DbSession, DbUser } from "server_src/db/databaseTypes";
import { BotdizSession } from "server_src/types";

/**
 * Authenticate Request and adds session data and user data to request
 */
interface ExtendedRequest extends Request {
    session: BotdizSession;
    dbSession?: DbSession | DbDiscordSession;
    user?: DbUser | DbDiscordUser;
}

interface ExtendedResponse extends Response {
    status(code: number): this;
    send(body?: any): this;
}

export async function withAuth(req: Request, res: Response, next: NextFunction) {
    const extReq = req as ExtendedRequest;
    const extRes = res as ExtendedResponse;
    
    try {
        const reqSession = extReq.session;

        if (!reqSession) throw "No session was found";

        const reqToken = reqSession.token;

        if (!reqToken) throw "No session info in credentials";

        const db = dbManager.getDb();

        if (!db) {
            console.error("No database connection found, this shouldn't happen");
            return;
        }

        const sessionDoc = await db.collection("sessions").findOne({ token: reqToken });
        const session: DbSession | DbDiscordSession | null = sessionDoc ? 
            sessionDoc as WithId<Document> & (DbSession | DbDiscordSession) : null;

        if (!session) throw "Unauthorized, no session";

        let user: DbUser | DbDiscordUser | null;
        if ("discord_session" in session) {
            const userDoc = await db.collection("discord_users").findOne({ discord_id: (session as DbDiscordSession).discord_id });
            user = userDoc ? userDoc as WithId<Document> & DbDiscordUser : null;
        } else {
            const userDoc = await db.collection("users").findOne({ username: (session as DbSession).username });
            user = userDoc ? userDoc as WithId<Document> & DbUser : null;
        }

        if (!user) throw "Unauthorized, user not found.";

        extReq.user = user;
        extReq.dbSession = session;

        next();
    } catch (error) {
        console.log("error withAuth: " + JSON.stringify(error));
        extRes.status(401).send({
            status: "failed",
            message: error,
        });
    }
    //check db and if token checks out
}
