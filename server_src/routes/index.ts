import { Db } from 'mongodb';

import login from './login';
import validate from './validate';
import logout from './logout';
import playlists from './playlists';
import addsuperuser from './addsuperuser';
import discordlogin from './discordlogin';
import discordguild from './discordguild';
import botdizguild from './botdizguild';
import botdizstats from './botdizstats';
import metrics from './metrics';
import dotenv from 'dotenv';

import { APIRateLimiter } from '../RateLimiter';
import { Express, RequestHandler } from 'express';
import { BotdizSession } from 'server_src/types';
import { logger } from '../../src/logger';
dotenv.config();

const rateLimiter: RequestHandler = (req, res, next) => {
    const session = req.session as BotdizSession;

    const whitelistedRoutes = ['/login', '/discordlogin', '/validate'];

    if (whitelistedRoutes.includes(req.path)) {
        next();
    } else if (session.userId) {
        if (
            APIRateLimiter.isUserAllowed(session.userId) ||
            req.path === '/discordlogin' ||
            req.path === '/login'
        ) {
            next();
        } else {
            logger.log('warn', 'Rate limited user: ' + session.userId + '\nPath: ' + req.path);
            res.status(401).send({ status: 'rate_limited' });
        }
    } else {
        logger.log('warn', 'No user id in session. Path: ' + req.path);
        res.status(401).send({ status: 'rate_limited' });
    }
};

export class RouteManager {
    private app: Express;
    private db: Db;

    constructor(app: Express, db: Db) {
        this.app = app;
        this.db = db;
    }

    run() {
        this.app.use(rateLimiter);
        login(this.app, this.db);
        validate(this.app, this.db);
        logout(this.app, this.db);
        playlists(this.app, this.db);
        addsuperuser(this.app, this.db);
        discordlogin(this.app, this.db);
        discordguild(this.app, this.db);
        botdizguild(this.app, this.db);
        botdizstats(this.app, this.db);
        metrics(this.app);
    }
}
