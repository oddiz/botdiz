const express = require("express");
const cors = require("cors")
const app = express();
const WebSocket = require('ws')
const WsManager = require('./routes/Websocket')
const DatabaseManager = require('./db/DatabaseManager')
const RouteManager = require('./routes')
const DiscordClient = require('../src/main').client
const GuildControllers = require('../src/main').GuildControllers
const session = require('cookie-session')
require('dotenv').config()

app.use(cors())

const sessionParser = session({
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    resave: false
  });

app.use(sessionParser)

async function init(app, RouteManager, DatabaseManager, DiscordClient, GuildControllers) {
    //setup database
    console.log("Setting up database.")

    const DbManager = new DatabaseManager
    const db = await DbManager.connect();
    if (!db) {
        console.log("Unable to connect to db.")
    }
    
    
    //serup routes
    console.log("Initilizing Route Manager.")
    const RouteMngr = new RouteManager (app, db)
    RouteMngr.run()
    console.log("Succesfull")

    //setup wss
    const wss = new WebSocket.Server( {
        noServer: true
    })

    const server = app.listen(8080, () => console.log("Api is running on port 8080"))
    
    const websocketManager = new WsManager(server, wss, db, DiscordClient, GuildControllers, sessionParser)


}

init(app, RouteManager, DatabaseManager, DiscordClient, GuildControllers)






const sendRandomNumbers = function(ws) {
    
    setTimeout(() => {
        const randNum = Math.random() * 1000;
        ws.send(randNum);
        console.log(`Sending ${randNum}`);
        sendRandomNumbers(ws)
    }, 50)
}

