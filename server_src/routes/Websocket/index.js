const Client = require('./Client')
const uuid = require('uuid')
module.exports = class WebsocketManager {
    constructor(server, wss, db, DiscordClient, GuildControllers, sessionParser){
        this.server = server;
        this.WebsocketServer = wss;
        
        this.db = db
        this.connectedClients = new Map();
        this.client = DiscordClient
        this.GuildControllers = GuildControllers
        this.sessionParser = sessionParser
        this.handleWsMessage = this.handleWsMessage.bind(this)
        
        
        this.server.on("upgrade", (request, socket, head) => {
            console.log("server.on upgrade triggered..")
            
            this.sessionParser(request, {}, () => {
                if(!request.session.userId) {
                    socket.write('HTTP/1.1 401 Unauthorized\n\r\n');
                    socket.destroy();
                    return
                }

            })
            //check for token, if valid allow connection 

            console.log("Session is parsed!");

            wss.handleUpgrade(request, socket, head, function(ws) {
                wss.emit('connection', ws, request);
            });
        });
        
        this.WebsocketServer.on('connection', (ws, request) => {
            const userId = request.session.userId;
            
            this.connectedClients.set(userId, ws)
            
            
            
            //console.log(`${client}, connected to web socket.`)
            ws.on('message', (msg) => {
                this.handleWsMessage(ws, msg)
            })

            ws.on('close', ()=>{
                this.connectedClients.delete(userId)
            })
        })

        

    }

    async handleWsMessage(ws, msg) {
        const commands= require('./remoteCommands')
    
        const message = JSON.parse(msg)
        
        /**
         * msg structure:
         *  token
         *  command
         *  params
         */
        
        if(!(message.token && message.command)) {
            console.log("Not a valid message")
            return
        }

        

        //authenticate ...

        //find command
        const result = await commands[message.command](...message.params)

        //when a result comes back construct a reply
        const reply = {
            token: message.token,
            command: message.command,
            result: result
        }
        
        const parsedReply = JSON.stringify(reply)
        
        ws.send(parsedReply)
    }

    sendWsMessageAll(message) {
        for (const client of this.connectedClients) {
            client.ws.send(message)
        }
    }

    

    
}