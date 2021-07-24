const express = require("express");
const cors = require("cors")
const app = express();

const WsManager = require('./Websocket')
const DatabaseManager = require('./db/DatabaseManager')
const RouteManager = require('./routes')
const DiscordClient = require('../src/main').client
const GuildControllers = require('../src/main').GuildControllers
const session = require('express-session')
const https = require('https')
const fs = require('fs')
require('dotenv').config()

let corsOptions;
if (process.env.NODE_ENV === "development") {
    corsOptions = {
        origin: "http://localhost:3000",
        credentials: true,
      }

} else {
    corsOptions = {
        origin: "https://botdiz.kaansarkaya.com",
        credentials: true,
      }
}
app.use(cors(corsOptions))
app.use(express.json())

let sessionParser;
if(process.env.NODE_ENV === "development") {
    sessionParser = session({
        saveUninitialized: false, 
        secret: process.env.SESSION_SECRET,
        resave: true,
        cookie: {
            sameSite: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: false
        }
    })
} else {
    sessionParser = session({
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: true,
        cookie: {
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 7, //7 days,
            httpOnly: false,
            secure: true
        }
      });
}

  
  async function init(app, RouteManager, DatabaseManager, DiscordClient, GuildControllers) {
    
    app.use(sessionParser)
    //setup database
    console.log("Setting up database.")

    const DbManager = new DatabaseManager
    const db = await DbManager.connect();

    // db.listCollections().toArray(function(err, collInfos) {
    //     // collInfos is an array of collection info objects that look like:
    //     // { name: 'test', options: {} }
    //     console.log(collInfos)
    // });
    
    if (!db) {
        console.log("Unable to connect to db.")
    }
    
    
    //serup routes
    console.log("Initilizing Route Manager.")
    const RouteMngr = new RouteManager (app, db)
    RouteMngr.run()
    let server;
    if (process.env.NODE_ENV === "development") {
        server = app.listen(8080, () => console.log("Api is running on port 8080"))
        
        const websocketManager = new WsManager(server, app, db, DiscordClient, GuildControllers, sessionParser)

    } else {
        const httpsServer = https.createServer({
            key: fs.readFileSync('/etc/letsencrypt/live/api.kaansarkaya.com/privkey.pem'),
            cert: fs.readFileSync('/etc/letsencrypt/live/api.kaansarkaya.com/fullchain.pem')
        }, app)
    
        server = httpsServer.listen(8080, () => console.log("Api is running on port 8080 with https"))
        
        const websocketManager = new WsManager(server, app, db, DiscordClient, GuildControllers, sessionParser)
    }


}

init(app, RouteManager, DatabaseManager, DiscordClient, GuildControllers)




