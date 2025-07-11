import { Guild, VoiceBasedChannel, User, CommandInteraction } from "discord.js";
import { MusicService } from "./services/MusicService";
import { AudioPlayerService } from "./services/AudioPlayerService";
import { QueueService } from "./services/QueueService";
import { TrackResolverService } from "./services/TrackResolverService";
import { MusicEventBus } from "./infrastructure/EventBus";
import { Track, RepeatMode, AddToQueueOptions } from "./models/Track";
import { MusicPlayerError, ValidationError } from "../../shared/errors/BotdizError";
import { createLogger } from "@logger";
import type { ShoukakuHandler } from "infrastructure/discord/ShokakuHandler";
import { config } from "shared/config/AppConfig";

/**
 * Modern MusicController that serves as a facade for all music-related operations
 * Delegates to specialized services while maintaining a clean public API
 */
export class MusicController {
    private readonly logger = createLogger("MusicController");
    private readonly eventBus: MusicEventBus;
    private readonly audioPlayer: AudioPlayerService;
    private readonly queue: QueueService;
    private readonly trackResolver: TrackResolverService;
    private readonly musicService: MusicService;

    constructor(
        private readonly guild: Guild,
        private readonly shoukaku: ShoukakuHandler
    ) {
        // Initialize services in dependency order
        this.eventBus = new MusicEventBus(guild.id);
        this.audioPlayer = new AudioPlayerService(guild.id, shoukaku, this.eventBus);
        this.queue = new QueueService(guild.id, this.eventBus);
        this.trackResolver = new TrackResolverService(shoukaku, {
            clientId: config.spotify.clientId,
            clientSecret: config.spotify.clientSecret,
        });
        this.musicService = new MusicService(
            guild.id,
            this.audioPlayer,
            this.queue,
            this.trackResolver,
            this.eventBus
        );

        this.logger.info("Music controller initialized", {
            guildId: guild.id,
            guildName: guild.name,
        });
    }

    // === Connection Management ===

    async connect(voiceChannel: VoiceBasedChannel): Promise<void> {
        try {
            await this.musicService.connect(voiceChannel);
        } catch (error) {
            this.logger.error("Failed to connect to voice channel", error as Error, {
                guildId: this.guild.id,
                channelId: voiceChannel.id,
            });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.musicService.disconnect();
        } catch (error) {
            this.logger.error("Failed to disconnect from voice channel", error as Error, {
                guildId: this.guild.id,
            });
            throw error;
        }
    }

    // === Playback Control ===

    async play(query: string, requestedBy: User, options?: AddToQueueOptions): Promise<Track[]> {
        try {
            await this.musicService.play(query, requestedBy, options);
            return this.getQueue();
        } catch (error) {
            this.logger.error("Failed to play", error as Error, {
                guildId: this.guild.id,
                query: query.substring(0, 100),
                requestedBy: requestedBy.id,
            });
            throw error;
        }
    }

    async pause(): Promise<void> {
        if (!this.isPlaying()) {
            throw new MusicPlayerError("Nothing is currently playing");
        }

        try {
            await this.musicService.pause();
        } catch (error) {
            this.logger.error("Failed to pause", error as Error, { guildId: this.guild.id });
            throw error;
        }
    }

    async resume(): Promise<void> {
        if (!this.isPaused()) {
            throw new MusicPlayerError("Playback is not paused");
        }

        try {
            await this.musicService.resume();
        } catch (error) {
            this.logger.error("Failed to resume", error as Error, { guildId: this.guild.id });
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            await this.musicService.stop();
        } catch (error) {
            this.logger.error("Failed to stop", error as Error, { guildId: this.guild.id });
            throw error;
        }
    }

    async skip(count: number = 1): Promise<Track[]> {
        if (count < 1) {
            throw new ValidationError("Skip count must be at least 1");
        }

        try {
            return await this.musicService.skip(count);
        } catch (error) {
            this.logger.error("Failed to skip", error as Error, {
                guildId: this.guild.id,
                count,
            });
            throw error;
        }
    }

    async previous(): Promise<void> {
        try {
            await this.musicService.previous();
        } catch (error) {
            this.logger.error("Failed to go to previous track", error as Error, {
                guildId: this.guild.id,
            });
            throw error;
        }
    }

    // === Queue Management ===

    async addToQueue(
        query: string,
        requestedBy: User,
        options?: AddToQueueOptions
    ): Promise<Track[]> {
        try {
            return await this.musicService.addToQueue(query, requestedBy, options);
        } catch (error) {
            this.logger.error("Failed to add to queue", error as Error, {
                guildId: this.guild.id,
                query: query.substring(0, 100),
                requestedBy: requestedBy.id,
            });
            throw error;
        }
    }

    async removeFromQueue(index: number): Promise<Track | null> {
        if (index < 0 || index >= this.getQueue().length) {
            throw new ValidationError("Invalid queue index");
        }

        try {
            return await this.musicService.removeFromQueue(index);
        } catch (error) {
            this.logger.error("Failed to remove from queue", error as Error, {
                guildId: this.guild.id,
                index,
            });
            throw error;
        }
    }

    async clearQueue(): Promise<void> {
        try {
            await this.musicService.clearQueue();
        } catch (error) {
            this.logger.error("Failed to clear queue", error as Error, { guildId: this.guild.id });
            throw error;
        }
    }

    async shuffleQueue(): Promise<void> {
        try {
            await this.musicService.shuffleQueue();
        } catch (error) {
            this.logger.error("Failed to shuffle queue", error as Error, {
                guildId: this.guild.id,
            });
            throw error;
        }
    }

    async moveTrack(fromIndex: number, toIndex: number): Promise<boolean> {
        const queueSize = this.getQueue().length;

        if (fromIndex < 0 || fromIndex >= queueSize || toIndex < 0 || toIndex >= queueSize) {
            throw new ValidationError("Invalid queue indices");
        }

        try {
            return await this.musicService.moveTrack(fromIndex, toIndex);
        } catch (error) {
            this.logger.error("Failed to move track", error as Error, {
                guildId: this.guild.id,
                fromIndex,
                toIndex,
            });
            throw error;
        }
    }

    // === Playback Settings ===

    async setVolume(volume: number): Promise<void> {
        if (volume < 0 || volume > 100) {
            throw new ValidationError("Volume must be between 0 and 100");
        }

        try {
            await this.musicService.setVolume(volume);
        } catch (error) {
            this.logger.error("Failed to set volume", error as Error, {
                guildId: this.guild.id,
                volume,
            });
            throw error;
        }
    }

    async setRepeatMode(mode: RepeatMode): Promise<void> {
        const validModes: RepeatMode[] = ["off", "track", "queue"];
        if (!validModes.includes(mode)) {
            throw new ValidationError(
                `Invalid repeat mode. Must be one of: ${validModes.join(", ")}`
            );
        }

        try {
            await this.musicService.setRepeatMode(mode);
        } catch (error) {
            this.logger.error("Failed to set repeat mode", error as Error, {
                guildId: this.guild.id,
                mode,
            });
            throw error;
        }
    }

    async seekTo(position: number): Promise<void> {
        if (position < 0) {
            throw new ValidationError("Position cannot be negative");
        }

        const currentTrack = this.getCurrentTrack();
        if (!currentTrack) {
            throw new MusicPlayerError("No track is currently playing");
        }

        if (!currentTrack.info.isSeekable) {
            throw new MusicPlayerError("Current track is not seekable");
        }

        if (position > currentTrack.info.duration) {
            throw new ValidationError("Position cannot exceed track duration");
        }

        try {
            await this.musicService.seekTo(position);
        } catch (error) {
            this.logger.error("Failed to seek", error as Error, {
                guildId: this.guild.id,
                position,
            });
            throw error;
        }
    }

    // === State Queries ===

    isPlaying(): boolean {
        return this.musicService.isPlaying();
    }

    isPaused(): boolean {
        return this.musicService.isPaused();
    }

    isConnected(): boolean {
        return this.musicService.isConnected();
    }

    getCurrentTrack(): Track | null {
        return this.musicService.getCurrentTrack();
    }

    getQueue(): Track[] {
        return this.musicService.getQueue();
    }

    getPosition(): number {
        return this.musicService.getPosition();
    }

    getVolume(): number {
        return this.musicService.getVolume();
    }

    getRepeatMode(): RepeatMode {
        return this.musicService.getRepeatMode();
    }

    // === Event Management ===

    onTrackStart(callback: (data: { track: Track; position: number }) => void): void {
        this.eventBus.on("track.started", callback);
    }

    onTrackEnd(callback: (data: { track: Track | null; reason: string }) => void): void {
        this.eventBus.on("track.ended", callback);
    }

    onQueueUpdate(callback: (data: { queue: Track[]; current: Track | null }) => void): void {
        this.eventBus.on("queue.updated", callback);
    }

    onPlayerError(callback: (data: { error: Error; track?: Track }) => void): void {
        this.eventBus.on("player.error", callback);
    }

    onVolumeChange(callback: (data: { volume: number }) => void): void {
        this.eventBus.on("volume.changed", callback);
    }

    onRepeatModeChange(callback: (data: { mode: string }) => void): void {
        this.eventBus.on("repeat.changed", callback);
    }

    // === Utility Methods ===

    /**
     * Get comprehensive status information
     */
    getStatus() {
        const currentTrack = this.getCurrentTrack();
        const queue = this.getQueue();

        return {
            connected: this.isConnected(),
            playing: this.isPlaying(),
            paused: this.isPaused(),
            currentTrack: currentTrack
                ? {
                      title: currentTrack.info.title,
                      artist: currentTrack.info.artist,
                      duration: currentTrack.info.duration,
                      position: this.getPosition(),
                      requestedBy: currentTrack.requestedBy,
                  }
                : null,
            queue: {
                length: queue.length,
                tracks: queue.slice(0, 10), // Return first 10 tracks for preview
            },
            volume: this.getVolume(),
            repeatMode: this.getRepeatMode(),
        };
    }

    /**
     * Get detailed statistics
     */
    getStats() {
        return this.musicService.getStats();
    }

    /**
     * Clean up resources
     */
    async destroy(): Promise<void> {
        this.logger.info("Destroying music controller", { guildId: this.guild.id });

        try {
            await this.musicService.destroy();
            this.eventBus.cleanup();

            this.logger.info("Music controller destroyed", { guildId: this.guild.id });
        } catch (error) {
            this.logger.error("Failed to destroy music controller", error as Error, {
                guildId: this.guild.id,
            });
        }
    }

    // === Compatibility Methods (for gradual migration) ===

    /**
     * Legacy compatibility method - use addToQueue instead
     * @deprecated Use addToQueue for new code
     */
    async addSong(query: string, requestedBy: User): Promise<Track[]> {
        this.logger.warn("Using deprecated addSong method", { guildId: this.guild.id });
        return this.addToQueue(query, requestedBy);
    }

    /**
     * Legacy compatibility method - use skip instead
     * @deprecated Use skip for new code
     */
    async skipSong(): Promise<Track[]> {
        this.logger.warn("Using deprecated skipSong method", { guildId: this.guild.id });
        return this.skip(1);
    }

    /**
     * Legacy compatibility method - use getQueue instead
     * @deprecated Use getQueue for new code
     */
    getSongQueue(): Track[] {
        return this.getQueue();
    }
}
