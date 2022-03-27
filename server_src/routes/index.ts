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

import { Express } from 'express';
dotenv.config();

export class RouteManager {
    private app: Express;
    private db: Db;

    constructor(app: Express, db: Db) {
        this.app = app;
        this.db = db;
    }

    run() {
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
