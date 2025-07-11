import { VoiceBasedChannel, User } from "discord.js";
import { Track, RepeatMode, AddToQueueOptions, PlaybackOptions } from "../models/Track";
import { AudioPlayerService } from "./AudioPlayerService";
import { QueueService } from "./QueueService";
import { TrackResolverService } from "./TrackResolverService";
import { MusicEventBus } from "../infrastructure/EventBus";
import { createLogger } from "../../../shared/logging/Logger";
import { MusicPlayerError, ValidationError } from "../../../shared/errors/BotdizError";

export interface IMusicService {
    // Connection management
    connect(voiceChannel: VoiceBasedChannel): Promise<void>;
    disconnect(): Promise<void>;
    
    // Playback control
    play(query: string, requestedBy: User, options?: AddToQueueOptions): Promise<void>;
    playNext(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    skip(count?: number): Promise<Track[]>;
    previous(): Promise<void>;
    
    // Queue management
    addToQueue(query: string, requestedBy: User, options?: AddToQueueOptions): Promise<Track[]>;
    removeFromQueue(index: number): Promise<Track | null>;
    clearQueue(): Promise<void>;
    shuffleQueue(): Promise<void>;
    moveTrack(fromIndex: number, toIndex: number): Promise<boolean>;
    
    // Playback settings
    setVolume(volume: number): Promise<void>;
    setRepeatMode(mode: RepeatMode): Promise<void>;
    seekTo(position: number): Promise<void>;
    
    // State queries
    isPlaying(): boolean;
    isPaused(): boolean;
    isConnected(): boolean;
    getCurrentTrack(): Track | null;
    getQueue(): Track[];
    getPosition(): number;
    getVolume(): number;
    getRepeatMode(): RepeatMode;
    
    // Cleanup
    destroy(): Promise<void>;
}

export class MusicService implements IMusicService {
    private readonly logger = createLogger('MusicService');
    private isDestroyed = false;

    constructor(
        private readonly guildId: string,
        private readonly audioPlayer: AudioPlayerService,
        private readonly queue: QueueService,
        private readonly trackResolver: TrackResolverService,
        private readonly eventBus: MusicEventBus
    ) {
        this.setupEventHandlers();
    }

    async connect(voiceChannel: VoiceBasedChannel): Promise<void> {
        this.ensureNotDestroyed();
        
        if (this.isConnected()) {
            this.logger.warn('Already connected to a voice channel', { guildId: this.guildId });
            return;
        }

        try {
            await this.audioPlayer.connect(voiceChannel);
            this.logger.info('Music service connected', { 
                guildId: this.guildId, 
                channelId: voiceChannel.id 
            });
        } catch (error) {
            this.logger.error('Failed to connect music service', error as Error, { guildId: this.guildId });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected()) {
            return;
        }

        try {
            await this.audioPlayer.disconnect();
            this.logger.info('Music service disconnected', { guildId: this.guildId });
        } catch (error) {
            this.logger.error('Failed to disconnect music service', error as Error, { guildId: this.guildId });
            throw error;
        }
    }

    async play(query: string, requestedBy: User, options: AddToQueueOptions = {}): Promise<void> {
        this.ensureNotDestroyed();
        
        if (!this.isConnected()) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        try {
            const tracks = await this.addToQueue(query, requestedBy, { ...options, silent: true });
            
            if (tracks.length === 0) {
                throw new MusicPlayerError('No tracks found for the given query');
            }

            // If not currently playing, start playing
            if (!this.isPlaying() && !this.isPaused()) {
                await this.playNext();
            }

            this.logger.info('Successfully added and started playing', {
                guildId: this.guildId,
                trackCount: tracks.length,
                query: query.substring(0, 100)
            });
        } catch (error) {
            this.logger.error('Failed to play', error as Error, { 
                guildId: this.guildId, 
                query: query.substring(0, 100) 
            });
            throw error;
        }
    }

    async playNext(): Promise<void> {
        this.ensureNotDestroyed();
        
        if (!this.isConnected()) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        const nextTrack = this.queue.getNext();
        if (!nextTrack) {
            this.logger.info('No more tracks in queue', { guildId: this.guildId });
            return;
        }

        try {
            // Update queue position
            const nextIndex = this.queue.getCurrentIndex() + 1;
            this.queue.setCurrentIndex(nextIndex);

            await this.audioPlayer.play(nextTrack);
            
            this.logger.info('Playing next track', {
                guildId: this.guildId,
                trackTitle: nextTrack.info.title,
                queuePosition: nextIndex
            });
        } catch (error) {
            this.logger.error('Failed to play next track', error as Error, { guildId: this.guildId });
            
            // Try to continue with the next track
            await this.skip(1);
        }
    }

    async pause(): Promise<void> {
        this.ensureNotDestroyed();
        await this.audioPlayer.pause();
    }

    async resume(): Promise<void> {
        this.ensureNotDestroyed();
        await this.audioPlayer.resume();
    }

    async stop(): Promise<void> {
        this.ensureNotDestroyed();
        await this.audioPlayer.stop();
    }

    async skip(count: number = 1): Promise<Track[]> {
        this.ensureNotDestroyed();
        
        if (count < 1) {
            throw new ValidationError('Skip count must be at least 1');
        }

        const skippedTracks: Track[] = [];
        const currentTrack = this.getCurrentTrack();
        
        if (currentTrack) {
            skippedTracks.push(currentTrack);
        }

        try {
            // Skip additional tracks if count > 1
            for (let i = 1; i < count; i++) {
                const nextTrack = this.queue.getNext();
                if (nextTrack) {
                    skippedTracks.push(nextTrack);
                    this.queue.setCurrentIndex(this.queue.getCurrentIndex() + 1);
                } else {
                    break; // No more tracks to skip
                }
            }

            await this.playNext();
            
            this.logger.info('Skipped tracks', {
                guildId: this.guildId,
                skippedCount: skippedTracks.length,
                requestedCount: count
            });
            
            return skippedTracks;
        } catch (error) {
            this.logger.error('Failed to skip tracks', error as Error, { 
                guildId: this.guildId, 
                count 
            });
            throw error;
        }
    }

    async previous(): Promise<void> {
        this.ensureNotDestroyed();
        
        const previousTrack = this.queue.getPrevious();
        if (!previousTrack) {
            throw new MusicPlayerError('No previous track available');
        }

        try {
            const prevIndex = this.queue.getCurrentIndex() - 1;
            this.queue.setCurrentIndex(prevIndex);
            
            await this.audioPlayer.play(previousTrack);
            
            this.logger.info('Playing previous track', {
                guildId: this.guildId,
                trackTitle: previousTrack.info.title
            });
        } catch (error) {
            this.logger.error('Failed to play previous track', error as Error, { guildId: this.guildId });
            throw error;
        }
    }

    async addToQueue(query: string, requestedBy: User, options: AddToQueueOptions = {}): Promise<Track[]> {
        this.ensureNotDestroyed();
        
        if (!query?.trim()) {
            throw new ValidationError('Query cannot be empty');
        }

        try {
            const requestedByData = {
                id: requestedBy.id,
                username: requestedBy.username,
                avatar: requestedBy.avatar || undefined
            };

            const result = await this.trackResolver.resolve(query, requestedByData);
            
            if (result.loadType === 'error') {
                throw new MusicPlayerError(result.exception?.message || 'Failed to resolve track');
            }

            if (result.tracks.length === 0) {
                throw new MusicPlayerError('No tracks found for the given query');
            }

            this.queue.add(result.tracks, options);
            
            this.logger.info('Added tracks to queue', {
                guildId: this.guildId,
                trackCount: result.tracks.length,
                loadType: result.loadType,
                requestedBy: requestedBy.id
            });

            return result.tracks;
        } catch (error) {
            this.logger.error('Failed to add to queue', error as Error, {
                guildId: this.guildId,
                query: query.substring(0, 100),
                requestedBy: requestedBy.id
            });
            throw error;
        }
    }

    async removeFromQueue(index: number): Promise<Track | null> {
        this.ensureNotDestroyed();
        return this.queue.remove(index);
    }

    async clearQueue(): Promise<void> {
        this.ensureNotDestroyed();
        this.queue.clear();
        await this.stop();
    }

    async shuffleQueue(): Promise<void> {
        this.ensureNotDestroyed();
        this.queue.shuffle();
    }

    async moveTrack(fromIndex: number, toIndex: number): Promise<boolean> {
        this.ensureNotDestroyed();
        return this.queue.moveTrack(fromIndex, toIndex);
    }

    async setVolume(volume: number): Promise<void> {
        this.ensureNotDestroyed();
        
        if (volume < 0 || volume > 100) {
            throw new ValidationError('Volume must be between 0 and 100');
        }

        await this.audioPlayer.setVolume(volume);
    }

    async setRepeatMode(mode: RepeatMode): Promise<void> {
        this.ensureNotDestroyed();
        this.queue.setRepeatMode(mode);
    }

    async seekTo(position: number): Promise<void> {
        this.ensureNotDestroyed();
        
        if (position < 0) {
            throw new ValidationError('Position cannot be negative');
        }

        const currentTrack = this.getCurrentTrack();
        if (!currentTrack) {
            throw new MusicPlayerError('No track is currently playing');
        }

        if (position > currentTrack.info.duration) {
            throw new ValidationError('Position cannot exceed track duration');
        }

        await this.audioPlayer.seekTo(position);
    }

    isPlaying(): boolean {
        const state = this.audioPlayer.getState();
        return state.connected && !!state.track && !state.paused;
    }

    isPaused(): boolean {
        const state = this.audioPlayer.getState();
        return state.connected && !!state.track && state.paused;
    }

    isConnected(): boolean {
        return this.audioPlayer.isConnected();
    }

    getCurrentTrack(): Track | null {
        return this.queue.getCurrent();
    }

    getQueue(): Track[] {
        return this.queue.getAll();
    }

    getPosition(): number {
        return this.audioPlayer.getPosition();
    }

    getVolume(): number {
        return this.audioPlayer.getState().volume;
    }

    getRepeatMode(): RepeatMode {
        return this.queue.getRepeatMode();
    }

    async destroy(): Promise<void> {
        if (this.isDestroyed) {
            return;
        }

        this.logger.info('Destroying music service', { guildId: this.guildId });

        try {
            await this.audioPlayer.destroy();
            this.queue.clear();
            
            this.isDestroyed = true;
            
            this.logger.info('Music service destroyed', { guildId: this.guildId });
        } catch (error) {
            this.logger.error('Failed to destroy music service', error as Error, { guildId: this.guildId });
        }
    }

    private setupEventHandlers(): void {
        // Handle track end to automatically play next
        this.eventBus.on('track.ended', (data) => {
            if (data.reason === 'finished') {
                // Automatically play next track
                this.playNext().catch(error => {
                    this.logger.error('Failed to auto-play next track', error, { guildId: this.guildId });
                });
            }
        });

        // Handle player errors
        this.eventBus.on('player.error', (data) => {
            this.logger.error('Player error occurred', data.error, { 
                guildId: this.guildId,
                track: data.track?.info.title 
            });
            
            // Try to recover by playing next track
            if (this.queue.getNext()) {
                this.playNext().catch(error => {
                    this.logger.error('Failed to recover from player error', error, { guildId: this.guildId });
                });
            }
        });
    }

    private ensureNotDestroyed(): void {
        if (this.isDestroyed) {
            throw new MusicPlayerError('Music service has been destroyed');
        }
    }

    /**
     * Get comprehensive statistics about the music service
     */
    getStats() {
        const playerState = this.audioPlayer.getState();
        const queueStats = this.queue.getStats();
        
        return {
            guildId: this.guildId,
            isDestroyed: this.isDestroyed,
            player: {
                connected: playerState.connected,
                playing: this.isPlaying(),
                paused: this.isPaused(),
                volume: playerState.volume,
                position: playerState.position,
                channelId: playerState.channelId
            },
            currentTrack: this.getCurrentTrack(),
            queue: queueStats
        };
    }
}