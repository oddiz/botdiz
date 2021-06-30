const uuid = require('uuid');
const WebSocket = require('ws')
const ListenerManager = require('./ListenerManager')


module.exports = class WebsocketManager {
    constructor(server, app, db, DiscordClient, GuildControllers, sessionParser){
        this.server = server;
        
        

        this.db = db
        this.connectedClients = new Map();
        this.client = DiscordClient
        this.GuildControllers = GuildControllers
        this.sessionParser = sessionParser
        
        this.handleWsMessage = this.handleWsMessage.bind(this)
        this.init = this.init.bind(this)
        this.init()
        
        
        
        
    }

    async init() {
        this.WebsocketServer = await new WebSocket.Server( {
            noServer: true
        })

        this.server.on("upgrade", async (request, socket, head) => {
            //console.log("server.on upgrade triggered..")
            
            
            this.sessionParser(request, {}, async () => {

                const session = await self.db.collection('sessions').findOne( { token: request.session.token  } )

                
                
                if(!session) {
                    console.log("Unauthorized websocket request")
                    socket.write('HTTP/1.1 401 Unauthorized\n\r\n');
                    socket.destroy();
                    return
                }
                //from example ws
                //https://github.com/websockets/ws/blob/master/examples/express-session-parse/index.js 
                // if(!request.session.userId) {
                //     console.log("session destroyed")
                //     socket.write('HTTP/1.1 401 Unauthorized\n\r\n');
                //     socket.destroy();
                //     return
                // }

            })
            
            
            //check for token, if valid allow connection 
            
            

            
            console.log("Session is parsed!");

            this.WebsocketServer.handleUpgrade(request, socket, head, (ws) => {
                this.WebsocketServer.emit('connection', ws, request);
            });
        });
        
        this.WebsocketServer.on('connection', async (ws, request) => {
            const self = this
            let userId;
            this.sessionParser(request, {}, async () => {
                
                userId = request.session?.userId;
                if(!userId || self.connectedClients.has(userId)) {
                    console.log("client already is connected")
                    return
                }
                
                //console.log(request.session," REQUEST SESSION@ websocket.index")
                // if(!request.session.userId) {
                //     console.log("session destroyed")
                //     
                // }
                
            })
            
            
            
            
            const clientListener = new ListenerManager(this, ws)

            const client = {
                websocket: ws,
                clientListener: clientListener
            }
            self.connectedClients.set(userId, client)
            
            //console.log(`${client}, connected to web socket.`)
            ws.on('message', (msg) => {
                const token = request.session.token
                this.handleWsMessage(ws, msg, clientListener, token)
                //console.log(token, "WEBSOCKET ON MESSAGE SESSION") 
            })

            ws.on('close', ()=>{
                this.connectedClients.delete(userId)
            })
        })
    }

    async handleWsMessage(ws, msg, clientListener, token) {
        
        
        const session = await this.db.collection('sessions').findOne( { token: token  } )

        if (!session) {
            console.log("Session not validated")
            return
            
        }

        const message = JSON.parse(msg)
        
        /**
         * msg structure:
         *  type
         *  userId
         *  token
         *  command
         *  params
         */
        

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

            console.log("Listener added")

            clientListener.add(message.listenerId, message.command, message.params)

            //console.log(JSON.stringify(clientListener))

            return
        }

        if(message.type === "clearListeners") {
            clientListener.clearListeners()
            console.log("Clearing listeners")
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