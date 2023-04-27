/// <reference types="node" />
import WebSocket from 'ws';
import { ClientListenerManager } from './ClientListenerManager';
import { Server } from 'http';
import { Db } from 'mongodb';
import { RequestHandler } from 'express';
import { Client } from 'discord.js';
import { GuildController } from '../../src/main';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
interface BotdizWebsocketClient {
    websocket: WebSocket;
    clientListener: ClientListenerManager;
}
export default class WebsocketManager {
    server: Server;
    db: Db;
    client: Client;
    GuildControllers: GuildController[];
    sessionParser: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>;
    connectedClients: Map<string, BotdizWebsocketClient>;
    WebsocketServer: WebSocket.Server | null;
    constructor(server: Server, db: Db, DiscordClient: Client, GuildControllers: GuildController[], sessionParser: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>);
    init(): Promise<void>;
    handleWsMessage(ws: WebSocket, msg: WebSocket.MessageEvent, clientListener: ClientListenerManager, token: string): Promise<void>;
}
export {};
