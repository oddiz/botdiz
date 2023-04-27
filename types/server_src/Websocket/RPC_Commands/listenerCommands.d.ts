import { Message, VoiceState } from 'discord.js';
import WebSocket from 'ws';
export declare type ListenerConstructedFunction = VoiceListenerConstructedFunction | TextListenerConstructedFunction;
export declare type ListenerFunction = (websocket: WebSocket, guildId: string, channelId?: string) => ListenerConstructedFunction;
declare type VoiceListenerConstructedFunction = (message: VoiceState) => void;
declare type TextListenerConstructedFunction = (message: Message) => void;
export declare const RPC_listenTextChannel: (websocket: WebSocket, guildId: string, channelId: string) => TextListenerConstructedFunction;
export declare const RPC_listenVoiceChannels: (websocket: WebSocket, guildId: string) => VoiceListenerConstructedFunction;
export {};
