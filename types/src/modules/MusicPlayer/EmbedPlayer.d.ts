import { Message } from "discord.js";
import { BotdizShoukakuTrack, MusicController } from "./MusicControllerLavalink";
export declare class EmbedPlayer {
    MusicController: MusicController;
    messageToEdit: Message | null;
    oldMessage: Message | null;
    currentSong: BotdizShoukakuTrack | null;
    quit: boolean;
    loopCount: number;
    looping: boolean;
    constructor(MusicController: MusicController);
    start(): void;
    stop(): void;
    getQuitState(): boolean;
    updateLoop(): Promise<void>;
    /**
     * Change the message to be updated
     * @param {Message} message
     */
    changeMessage(message: Message): Promise<void>;
    /**
     * Change the song
     * @param {BotdizShoukakuTrack} song
     */
    changeSong(song: BotdizShoukakuTrack): void;
}
