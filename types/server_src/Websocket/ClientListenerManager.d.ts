import { Client, Message, VoiceState } from 'discord.js';
import { AllowedGuild } from 'server_src/db/databaseTypes';
import { MusicController, MusicControllerEventsData } from '../modules/MusicPlayer/MusicControllerLavalink';
import WebSocket from 'ws';
export declare class ClientListenerManager {
    client: Client;
    websocket: WebSocket | null;
    textListeners: any;
    activeMusicListenerGuildId: string | null;
    voiceChannelListeners: any;
    private musicPlayerListening;
    constructor(websocket: WebSocket);
    processTextMessage(message: Message): void;
    processVoiceChannelUpdate(state: VoiceState): void;
    addTextListener(allowedGuilds: AllowedGuild[] | 'ALL', guildId: string, channelId: string): void;
    addVoiceChannelListener(allowedGuilds: AllowedGuild[] | 'ALL', guildId: string): void;
    getMusicController(guildId: string): MusicController;
    startMusicPlayerListener(allowedGuilds: AllowedGuild[] | 'ALL', guildId: string): void;
    handleMusicPlayerEvents: (data: MusicControllerEventsData) => void;
    remove(id: string): void;
    clearListeners(): void;
    terminate(): void;
}
