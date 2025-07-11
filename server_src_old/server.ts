//require("module-alias/register")

import express from "express";
import cors from "cors";

const app = express();

import WsManager from "./Websocket";
import { DatabaseManager, dbManager } from "./db/DatabaseManager";
import { RouteManager } from "./routes";
import { client as DiscordClient, GuildControllers } from "../src/main";
import session from "express-session";
import https from "https";
import fs from "fs";
import "dotenv/config";

import { logger } from "../src/logger";
import session_store from "session-file-store";
import helmet from "helmet";

const SessionFileStore = session_store(session);

let corsOptions;
if (process.env.NODE_ENV === "development") {
    corsOptions = {
        origin: ["http://localhost:3000", "http://localhost:8080"],

        credentials: true,
    };
} else {
    corsOptions = {
        origin: ["https://botdiz.kaansarkaya.com", "https://api.kaansarkaya.com:8080", "https://oddiz.grafana.net"],
        credentials: true,
    };
}
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

let sessionParserOptions: session.SessionOptions;

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set in .env file");
}

if (process.env.NODE_ENV === "development") {
    sessionParserOptions = {
        store: new SessionFileStore({ ttl: 60 * 60 * 24 * 7 }),
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: true,
        cookie: {
            sameSite: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: false,
        },
    };
} else {
    sessionParserOptions = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        store: new SessionFileStore({ ttl: 60 * 60 * 24 * 7, logFn: () => {} }),
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: true,
        cookie: {
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 7, //7 days,
            httpOnly: false,
            secure: true,
        },
    };
}

async function init() {
    const sessionParser = session(sessionParserOptions);

    app.use(sessionParser);
    //setup database
    logger.log("info", "Setting up database.");

    const db = await dbManager.connect();

    if (!db) {
        console.error("Unable to connect to db. Botdiz server cannot run!");
        return;
    }

    //serup routes
    logger.log("info", "Initilizing Route Manager.");
    const RouteMngr = new RouteManager(app, db);
    RouteMngr.run();

    let server;
    if (process.env.NODE_ENV === "development") {
        server = app.listen(8080, () => logger.log("info", "Api is running on port 8080"));

        const websocketManager = new WsManager(server, db, DiscordClient, GuildControllers, sessionParser);

        websocketManager.init();
    } else {
        const httpsServer = https.createServer(
            {
                key: fs.readFileSync("/etc/letsencrypt/live/api.kaansarkaya.com/privkey.pem"),
                cert: fs.readFileSync("/etc/letsencrypt/live/api.kaansarkaya.com/fullchain.pem"),
            },
            app
        );

        server = httpsServer.listen(8080, () => logger.log("info", "Api is running on port 8080 with https"));

        const websocketManager = new WsManager(server, db, DiscordClient, GuildControllers, sessionParser);

        websocketManager.init();
    }
}

init();

export { WsManager, DatabaseManager, dbManager, RouteManager, DiscordClient, GuildControllers };
