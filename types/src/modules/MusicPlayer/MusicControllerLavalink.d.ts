import { TextBasedChannel, VoiceBasedChannel, CommandInteraction } from "discord.js";
import { TypedEmitter } from "tiny-typed-emitter";
import { EmbedPlayer } from "./EmbedPlayer";
import { SkipHandler, SkipVoteData } from "./SkipHandler";
import { Controller as BotdizGuildController } from "../../modules/Controller";
import { ShoukakuHandler } from "../../Shokaku/ShokakuHandler";
import { PlayerUpdate, Player, Track } from "shoukaku";
import { DbGuildSettings } from "../../../server_src/db/databaseTypes";
export interface BotdizTrack {
    info: {
        artist: string;
        trackName: string;
        title: string;
        trackId?: string;
        artistId?: string;
    };
    isSpotify: boolean;
    recommendedSong?: boolean;
}
export interface BotdizShoukakuTrack extends Track {
    recommendedSong?: boolean;
    thumbnail?: string;
}
export interface YoutubeRecommended {
    info: {
        title: string;
    };
    isYoutubeRecommended: boolean;
    recommendedSong: true;
    thumbnail: string;
    isSpotify: false;
}
export declare type QueueTrack = BotdizTrack | BotdizShoukakuTrack | YoutubeRecommended;
export declare type AudioPlayerStatus = "PLAYING" | "PAUSED" | "STOPPED" | "SKIPPING";
export interface QueueUpdateEvent {
    op: "queueUpdate";
    queue: QueueTrack[];
    guildId: string;
}
export interface SkipVoteEvent {
    op: "skipVoteUpdate";
    skipVoteData: SkipVoteData;
    guildId: string;
}
export interface CurrentSongUpdateEvent {
    op: "currentSongUpdate";
    currentSong: BotdizShoukakuTrack | null;
    guildId: string;
}
export interface PlayerStatusUpdateEvent {
    op: "playerStatusUpdate";
    status: AudioPlayerStatus;
    guildId: string;
}
export interface CurrentSongUpdateEvent {
    op: "currentSongUpdate";
    currentSong: BotdizShoukakuTrack | null;
    guildId: string;
}
export declare type MusicControllerEventsData = QueueUpdateEvent | SkipVoteEvent | CurrentSongUpdateEvent | PlayerUpdate | PlayerStatusUpdateEvent;
export interface MusicControllerEvents {
    playerUpdate: (data: PlayerUpdate) => void;
    queueUpdate: (data: QueueUpdateEvent) => void;
    skipVoteUpdate: (data: SkipVoteEvent) => void;
    currentSongUpdate: (data: CurrentSongUpdateEvent) => void;
    playerStatusUpdate: (data: PlayerStatusUpdateEvent) => void;
}
export declare class MusicController extends TypedEmitter<MusicControllerEvents> {
    controller: BotdizGuildController;
    guild: import("discord.js").Guild;
    private volume;
    private playCommand;
    UPDATE_INTERVAL: number;
    EmbedPlayer: EmbedPlayer;
    SkipHandler: SkipHandler;
    skipVotingEnabled: boolean;
    skipVotingPassPercentage: number;
    shoukaku: ShoukakuHandler;
    audioPlayer: Player | undefined;
    recommendSongs: boolean;
    songHistory: string[];
    youtubeCookies: string | null;
    lastInvokedChannel: TextBasedChannel | null;
    queue: QueueTrack[];
    queueLock: boolean;
    currentSong: BotdizShoukakuTrack | null;
    lastSeekEventTime: number;
    activeVoiceChannel: VoiceBasedChannel | null;
    audioPlayerStatus: AudioPlayerStatus;
    repeat: "ONE" | "ALL" | "NONE";
    constructor(controller: BotdizGuildController, shoukaku: ShoukakuHandler);
    init(): Promise<boolean | undefined>;
    triggerUpdate(updateType?: "queueUpdate" | "currentSongUpdate" | "playerStatusUpdate" | "skipVoteUpdate"): void;
    applySettings(settings: DbGuildSettings): void;
    getAudioPlayerStatusEvent(): PlayerStatusUpdateEvent;
    changeAudioPlayerStatus(status: AudioPlayerStatus): void;
    setVoiceConnection(channel: VoiceBasedChannel): Promise<boolean>;
    disconnectFromVoiceChannel(): Promise<void>;
    addToQueue(song: QueueTrack | QueueTrack[], forceNext?: boolean): void;
    setYoutubeCookies(): Promise<string | null | undefined>;
    findRecommended(song: BotdizTrack): import("winston").Logger | undefined;
    removeRecommended(): void;
    processQueue(): Promise<"success" | "failed">;
    getQueueEvent(): QueueUpdateEvent;
    getCurrentSong(): BotdizShoukakuTrack | null;
    getCurrentSongUpdateEvent(): CurrentSongUpdateEvent;
    changeCurrentSong(song: BotdizShoukakuTrack | null): void;
    updateQueue(queue: QueueTrack[]): "success" | "failed";
    clearQueue(): void;
    deleteQueueItem(index: number): boolean;
    playNext(): Promise<false | "success" | undefined>;
    processNextSong(): Promise<BotdizShoukakuTrack | null>;
    createSongEmbed(currentSong: BotdizShoukakuTrack, invokedMessage?: CommandInteraction | null): Promise<true | undefined>;
    seekTo(timeInMs: number): Promise<"success" | "failed">;
    skip(skipAmount: number): Promise<false | "success" | undefined>;
    shuffleQueue(): Promise<boolean>;
    stop(): Promise<void>;
    pause(): void;
    resume(): void;
}
