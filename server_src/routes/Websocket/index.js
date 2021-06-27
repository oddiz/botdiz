const uuid = require('uuid');
const MsgHandler = require('../../../src/MessageHandler');
const ListenerManager = require('./ListenerManager')
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
            
            const clientListener = new ListenerManager(this, ws)

            const client = {
                websocket: ws,
                clientListener: clientListener
            }
            this.connectedClients.set(userId, client)
            
            
            
            //console.log(`${client}, connected to web socket.`)
            ws.on('message', (msg) => {
                this.handleWsMessage(ws, msg, clientListener)
            })

            ws.on('close', ()=>{
                this.connectedClients.delete(userId)
            })
        })

        

    }

    async handleWsMessage(ws, msg, clientListener) {
        
        
        const message = JSON.parse(msg)
        
        /**
         * msg structure:
         *  type
         *  userId
         *  token
         *  command
         *  params
         */
        
        if(!(message.token)) {
            console.log("Not a valid message")
            return
        }

        //authenticate ...
        

        if(message.type === "addListener") {
            //console.log(message.listenerId, message.command, ...message.params)
            /**
             * msg structer:
             *  type = addListener
             *  listenerId 
             *  token
             *  command
             *  params
             */

            

            clientListener.add(message.listenerId, message.command, message.params)

            //console.log(JSON.stringify(clientListener))

            return
        }

        if(message.type === "clearListeners") {
            clientListener.clearListeners()
        }

        if (message.type === "get"){
            
            const commands= require('./getCommands')

            //find command
            const result = await commands[message.command](...message.params)

            //when a result comes back construct a reply
            const reply = {
                token: message.token,
                command: message.command,
                result: result
            }
            
            const parsedReply = JSON.stringify(reply)
            //console.log(parsedReply)
            ws.send(parsedReply)

            return
        }

        if (message.type === "exec") {
            const commands = require('./execCommands')
        
            let result
            try {
                result = await commands[message.command](...message.params)
            } catch (error) {
                console.log("Error while trying to execute command: ", message.command, "args: ", message.params)
                return
            }

            if (result) {
                const reply = JSON.stringify({
                    status: "OK",
                    message: "Command executed succesfully"
                })

                ws.send(reply)
            }
        }
    }

    

    

    
}