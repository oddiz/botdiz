import { Message, VoiceState } from 'discord.js';
import WebSocket from 'ws';
export type ListenerConstructedFunction = VoiceListenerConstructedFunction | TextListenerConstructedFunction;
export type ListenerFunction = (websocket: WebSocket, guildId: string, channelId?: string) => ListenerConstructedFunction;
type VoiceListenerConstructedFunction = (message: VoiceState) => void;
type TextListenerConstructedFunction = (message: Message) => void;
export declare const RPC_listenTextChannel: (websocket: WebSocket, guildId: string, channelId: string) => TextListenerConstructedFunction;
export declare const RPC_listenVoiceChannels: (websocket: WebSocket, guildId: string) => VoiceListenerConstructedFunction;
export {};
