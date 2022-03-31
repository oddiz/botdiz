import WebSocket, { RawData } from 'ws';
import { ClientListenerManager } from './ClientListenerManager';
import { Server } from 'http';
import { Db } from 'mongodb';
import { Request, RequestHandler, Response } from 'express';
import { Client } from 'discord.js';
import { GuildController } from '../../src/main';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { getToken } from '../scripts/getToken';
import { logger } from '@sentry/utils';
import { BotdizSession } from 'server_src/types';
import { AllowedGuild, DbDiscordSession, DbDiscordUser, DbSession } from '../db/databaseTypes';
import execCommands from './RPC_Commands/execCommands';
import getCommands from './RPC_Commands/getCommands';
import { webSocketRateLimiter } from '../RateLimiter';

interface BotdizWebsocketClient {
    websocket: WebSocket;
    clientListener: ClientListenerManager;
}

type GetCommands =
    | 'RPC_getGuilds'
    | 'RPC_getTextChannels'
    | 'RPC_getTextChannelContent'
    | 'RPC_getVoiceChannels';

export default class WebsocketManager {
    public server: Server;
    public db: Db;
    public client: Client;
    public GuildControllers: GuildController[];
    public sessionParser: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>;
    public connectedClients: Map<string, BotdizWebsocketClient>;
    public WebsocketServer: WebSocket.Server | null;

    constructor(
        server: Server,
        db: Db,
        DiscordClient: Client,
        GuildControllers: GuildController[],
        sessionParser: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
    ) {
        this.server = server;

        this.db = db;
        this.connectedClients = new Map();
        this.client = DiscordClient;
        this.GuildControllers = GuildControllers;
        this.sessionParser = sessionParser;
        this.WebsocketServer = null;

        this.handleWsMessage = this.handleWsMessage.bind(this);
        this.init = this.init.bind(this);

        console.log('Created websocket manager');
    }

    async init() {
        this.WebsocketServer = await new WebSocket.Server({
            noServer: true,
        });

        if (!this.WebsocketServer) {
            logger.log('error', 'Failed to create websocket server');

            return;
        }

        this.server.on('upgrade', async (request, socket, head) => {
            if (!this.WebsocketServer) {
                logger.log('error', 'No websocket server.');
                return;
            }
            const req = request as Request;
            const token = getToken(req);

            if (!token) {
                socket.destroy();

                return;
            }
            this.sessionParser(req, {} as Response, async () => {
                const session = await this.db.collection('sessions').findOne({ token: token });

                if (!session) {
                    console.log('Unauthorized websocket request');
                    socket.destroy();
                    return;
                }
            });

            //check for token, if valid allow connection

            this.WebsocketServer.handleUpgrade(request, socket, head, (ws) => {
                if (!this.WebsocketServer) {
                    logger.log('error', 'No websocket server.');
                    return;
                }
                this.WebsocketServer.emit('connection', ws, request);
            });
        });

        this.WebsocketServer.on('connection', async (ws: WebSocket, request) => {
            const self = this;
            const req = request as Request;
            this.sessionParser(req, {} as Response, async () => {
                const session = req.session as BotdizSession;
                const userId = session?.userId;

                if (!userId) return;

                if (self.connectedClients.has(userId)) {
                    // ws.send(JSON.stringify({
                    //     status: "error",
                    //     message: "already connected"
                    // }))
                    self.connectedClients?.get(userId)?.clientListener.terminate();

                    self.connectedClients.delete(userId);
                }

                const clientListener = new ClientListenerManager(ws);

                const client: BotdizWebsocketClient = {
                    websocket: ws,
                    clientListener: clientListener,
                };

                self.connectedClients.set(userId, client);

                ws.on('message', (msg) => {
                    try {
                        const token = getToken(req);
                        if (!token) {
                            logger.log('error', 'No token found in request');
                            return;
                        }
                        self.handleWsMessage(ws, msg, clientListener, token);
                    } catch (error) {
                        console.log('error in websocket message handler');
                    }
                });

                ws.on('close', () => {
                    try {
                        self.connectedClients?.get(userId)?.clientListener.terminate();

                        self.connectedClients.delete(userId);
                    } catch (error) {
                        console.log('error while closing websocket', error);
                    }
                });
            });
        });
    }

    async handleWsMessage(
        ws: WebSocket,
        msg: RawData,
        clientListener: ClientListenerManager,
        token: string
    ) {
        try {
            const session = (await this.db
                .collection('sessions')
                .findOne({ token: token })) as unknown as DbDiscordSession | DbSession | null;

            if (!session) {
                console.log('Session not validated');
                return;
            }

            const userId = session.user_id;

            let allowedGuilds, user;
            if ('discord_session' in session) {
                user = (await this.db.collection('discord_users').findOne({
                    discord_id: session.discord_id,
                })) as unknown as DbDiscordUser;
                allowedGuilds = user.allowed_guilds;
            } else if (session.moderator_session) {
                allowedGuilds = 'ALL';
            } else {
                console.log("Couldn't parse allowed guilds");
                return;
            }

            if (session.moderator_session) {
                allowedGuilds = 'ALL';
            }

            const message = JSON.parse(msg as unknown as string);

            if (message.type === 'ping') {
                ws.send(
                    JSON.stringify({
                        event: 'pong',
                        result: 'success',
                    })
                );

                return;
            }
            if (message.type === 'listenMusicPlayer') {
                clientListener.startMusicPlayerListener(
                    allowedGuilds as AllowedGuild[] | 'ALL',
                    message.guildId
                );
            }

            if (message.type === 'addTextChannelListener') {
                /**
                 *
                 * msg structer:
                 *  type = addListener
                 *  listenerId
                 *  token
                 *  command
                 *  params
                 */

                clientListener.addTextListener(
                    allowedGuilds as AllowedGuild[] | 'ALL',
                    message.guildId,
                    message.channelId
                );

                return;
            }

            if (message.type === 'addVoiceChannelListener') {
                clientListener.addVoiceChannelListener(
                    allowedGuilds as AllowedGuild[] | 'ALL',
                    message.guildId
                );

                return;
            }

            if (message.type === 'clearListeners') {
                clientListener.clearListeners();
            }

            if (message.type === 'get') {
                const getCommandsName = message.command as GetCommands;
                const commandName = getCommandsName;
                const params = message.params as string[];
                //find command
                const result = await getCommands[commandName](
                    allowedGuilds,
                    //@ts-ignore
                    ...params
                );

                //when a result comes back construct a reply
                const reply = {
                    command: message.command,
                    result: result,
                };

                const parsedReply = JSON.stringify(reply);

                ws.send(parsedReply);

                return;
            }

            if (message.type === 'exec') {
                if (!webSocketRateLimiter.isUserAllowed(userId)) {
                    ws.send(
                        JSON.stringify({
                            status: 'rate_limited',
                            message: 'You are being rate limited',
                        })
                    );

                    return;
                }
                const adminExecCommands = ['RPC_sendMessage'];
                let result;
                try {
                    //first param is always guildID so make the check here
                    const execGuildId = message.params[0];
                    let commandAllowed = false;

                    if (allowedGuilds === 'ALL') {
                        commandAllowed = true;
                    } else {
                        const allowedGuildsArray = allowedGuilds as AllowedGuild[];
                        for (const allowedGuild of allowedGuildsArray) {
                            //if command is an admin command check if the user is owner or admin of the guild
                            if (adminExecCommands.includes(message.command)) {
                                if (
                                    allowedGuild.id === execGuildId &&
                                    (allowedGuild.owner || allowedGuild.administrator)
                                ) {
                                    commandAllowed = true;
                                    break;
                                }
                                //if not only checking if guild is in allowed guild enough
                            } else if (allowedGuild.id === execGuildId) {
                                commandAllowed = true;
                                break;
                            }
                        }
                    }
                    if (commandAllowed) {
                        if (!user) throw 'user is null';

                        result = await execCommands[message.command](user, ...message.params);
                    } else {
                        console.log(
                            `Unauthorized command execution for guildId: ${execGuildId}\nAllowed guilds: ${allowedGuilds}\nSession: ${JSON.stringify(
                                session
                            )}`
                        );
                        return;
                    }
                } catch (error) {
                    console.log(
                        'Error while trying to execute command: \n',
                        message.command + '\n',
                        'args: \n',
                        message.params,
                        '\n',
                        'error :\n',
                        error
                    );
                    return;
                }

                const reply = {
                    ...result,
                    event: 'exec_command_status',
                    command: message.command,
                };

                if (reply) {
                    ws.send(JSON.stringify(reply));
                }
            }
        } catch (error) {}
    }
}
