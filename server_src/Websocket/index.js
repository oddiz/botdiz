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
        
        
        console.log("Created websocket manager")
        
    }

    async init() {
        this.WebsocketServer = await new WebSocket.Server( {
            noServer: true
        })

        this.server.on("upgrade", async (request, socket, head) => {
            //console.log("server.on upgrade triggered..")
            
            
            this.sessionParser(request, {}, async () => {

                const session = await this.db.collection('sessions').findOne( { token: request.session.token  } )

                
                
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
            
            

            

            this.WebsocketServer.handleUpgrade(request, socket, head, (ws) => {
                this.WebsocketServer.emit('connection', ws, request);
            });
        });
        
        this.WebsocketServer.on('connection', async (ws, request) => {
            const self = this
            this.sessionParser(request, {}, async () => {
                
                const userId = request.session?.userId;
                
                if(!userId || self.connectedClients.has(userId)) {
                    // ws.send(JSON.stringify({
                    //     status: "error",
                    //     message: "already connected"
                    // }))
                    
                }
                
                const clientListener = new ListenerManager(self, ws)
    
                const client = {
                    websocket: ws,
                    clientListener: clientListener
                }
                
                self.connectedClients.set(userId, client)
                //console.log(self.connectedClients)
                
                ws.on('message', (msg) => {
                    try {
                        const token = request.session.token
                        self.handleWsMessage(ws, msg, clientListener, token)
                        
                    } catch (error) {
                        console.log("error in websocket message handler")
                    }
                })
    
                ws.on('close', ()=>{
                    try {
                        self.connectedClients.get(userId).clientListener.terminate()
                        self.connectedClients.get(userId).websocket = null
                        self.connectedClients.delete(userId)
                        
                    } catch (error) {
                        console.log("error closing websocket", error)

                    }
                })
            })
            
            
            
            
        })
    }

    async handleWsMessage(ws, msg, clientListener, token) {
        
        
        const session = await this.db.collection('sessions').findOne( { token: token  } )

        if (!session) {
            console.log("Session not validated")
            return
            
        }

        let allowedGuilds, user
        if (session.discord_session) {
            user = await this.db.collection('discord_users').findOne( { discord_id: session.discord_id } )
            allowedGuilds = user.allowed_guilds
        } else if (session.moderator_session) {
            allowedGuilds = "ALL"
        } else {
            console.log("Couldn't parse allowed guilds")
            return
        }

        if (session.moderator_session) {
            allowedGuilds = "ALL"
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
        
        if(message.type === "ping") {
            ws.send(JSON.stringify({
                event:"pong",
                token: token,
                result:"success"
            }))

            return
        }
        if(message.type === "listenMusicPlayer") {
            clientListener.startMusicPlayerListener(allowedGuilds, ...message.params)
        }

        if(message.type === "addTextChannelListener") {
            //console.log(message.listenerId, message.command, ...message.params)
            /**
             * 
             * msg structer:
             *  type = addListener
             *  listenerId 
             *  token
             *  command
             *  params
             */


            clientListener.addTextListener(allowedGuilds, message.listenerId, message.command, message.params)

            //console.log(JSON.stringify(clientListener))

            return
        }

        if(message.type === "addVoiceChannelListener") {
            clientListener.addVoiceChannelListener(allowedGuilds, message.listenerId, message.command, message.params)

            //console.log(JSON.stringify(clientListener))

            return
        }

        if(message.type === "clearListeners") {
            clientListener.clearListeners()
        }

        if (message.type === "get"){
            
            const commands= require('./RPC_Commands/getCommands')

            //find command
            const result = await commands[message.command](allowedGuilds, ...message.params)

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
            const commands = require('./RPC_Commands/execCommands')
            
            const adminExecCommands = [
                "RPC_sendMessage"
            ]
            let result
            try {
                //first param is always guildID so make the check here
                const execGuildId = message.params[0]
                let commandAllowed = false

                if (allowedGuilds === "ALL") {
                    commandAllowed = true
                } else {
                    for (const allowedGuild of allowedGuilds) {
                        //if command is an admin command check if the user is owner or admin of the guild
                        if(adminExecCommands.includes(message.command)) {
                            if (allowedGuild.id === execGuildId && (allowedGuild.owner || allowedGuild.administrator)) {
                                commandAllowed = true
                                break
                            }
                        //if not only checking if guild is in allowed guild enough
                        }else if (allowedGuild.id === execGuildId) {
                            commandAllowed = true
                            break
                        }
                    }
                }
                if (commandAllowed) {
                    result = await commands[message.command](user, ...message.params)
                } else {
                    console.log(`Unauthorized command execution for guildId: ${execGuildId}\nAllowed guilds: ${allowedGuilds}\nSession: ${JSON.stringify(session)}`)
                    return
                }
            } catch (error) {
                console.log("Error while trying to execute command: ", message.command, "args: ", message.params)
                return
            }

            const reply = result;

            if(reply) {
                reply.command = message?.command
                reply.event = "exec_command_status"
                ws.send(JSON.stringify(reply))
            } 

            
        }
    }

    

    

    
}