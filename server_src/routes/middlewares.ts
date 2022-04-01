import { logger } from '@sentry/utils';
import { NextFunction, Request, Response } from 'express';
import { dbManager } from '../db/DatabaseManager';
import {
    DbDiscordGuild,
    DbDiscordSession,
    DbDiscordUser,
    DbSession,
    DbUser,
} from 'server_src/db/databaseTypes';
import { BotdizSession } from 'server_src/types';

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
export async function withAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const reqSession = req.session as BotdizSession;

        if (!reqSession) throw 'No session was found';

        const reqToken = reqSession.token;

        if (!reqToken) throw 'No session info in credentials';

        const db = dbManager.getDb();

        if (!db) {
            logger.log('error', "No database connection found, this shouldn't happen");
            return;
        }

        const session = (await db
            .collection('sessions')
            .findOne({ token: reqToken })) as unknown as DbSession | DbDiscordSession | undefined;

        if (!session) throw 'Unauthorized, no session';

        let user: DbUser | DbDiscordUser | null;
        if ('discord_session' in session) {
            user = (await db
                .collection('discord_users')
                .findOne({ discord_id: session.discord_id })) as DbDiscordUser | null;
        } else {
            user = (await db
                .collection('users')
                .findOne({ username: session.username })) as DbUser | null;
        }

        if (!user) throw 'Unauthorized, user not found.';

        req.user = user;
        req.dbSession = session;

        next();
    } catch (error) {
        res.status(401).send({
            status: 'error',
            message: error,
        });
    }
    //check db and if token checks out
}
