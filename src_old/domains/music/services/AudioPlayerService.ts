import { VoiceBasedChannel } from "discord.js";
import { Player, PlayerUpdate } from "shoukaku";
import { Track, PlayerState, PlaybackOptions } from "../models/Track";
import { createLogger } from "../../../shared/logging/Logger";
import { MusicEventBus } from "../infrastructure/EventBus";
import { ShoukakuHandler } from "../../../Shokaku/ShokakuHandler";
import { MusicPlayerError } from "../../../shared/errors/BotdizError";

export interface IAudioPlayerService {
    connect(voiceChannel: VoiceBasedChannel): Promise<void>;
    disconnect(): Promise<void>;
    play(track: Track, options?: PlaybackOptions): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    seekTo(position: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getPosition(): number;
    getState(): PlayerState;
    isConnected(): boolean;
    destroy(): Promise<void>;
}

export class AudioPlayerService implements IAudioPlayerService {
    private readonly logger = createLogger('AudioPlayerService');
    private player: Player | null = null;
    private state: PlayerState;
    private currentTrack: Track | null = null;
    private positionUpdateInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly guildId: string,
        private readonly shoukaku: ShoukakuHandler,
        private readonly eventBus: MusicEventBus
    ) {
        this.state = {
            position: 0,
            paused: false,
            volume: 100,
            connected: false
        };
    }

    async connect(voiceChannel: VoiceBasedChannel): Promise<void> {
        try {
            this.logger.info('Connecting to voice channel', {
                guildId: this.guildId,
                channelId: voiceChannel.id,
                channelName: voiceChannel.name
            });

            const node = this.shoukaku.getIdealNode();
            if (!node) {
                throw new MusicPlayerError('No Lavalink nodes available');
            }

            // Create or get existing player
            let player = node.manager.players.get(this.guildId);
            
            if (!player) {
                player = node.manager.joinChannel({
                    guildId: this.guildId,
                    channelId: voiceChannel.id,
                    shardId: 0, // Adjust based on your setup
                    deaf: true
                });
            }

            this.player = player || null;
            this.state.connected = true;
            this.state.channelId = voiceChannel.id;

            this.setupPlayerEventHandlers();
            this.startPositionTracking();

            this.logger.info('Successfully connected to voice channel', {
                guildId: this.guildId,
                channelId: voiceChannel.id
            });

            this.eventBus.emitEvent('player.connected', { channelId: voiceChannel.id });
        } catch (error) {
            this.logger.error('Failed to connect to voice channel', error as Error, {
                guildId: this.guildId,
                channelId: voiceChannel.id
            });
            
            this.state.connected = false;
            throw new MusicPlayerError(`Failed to connect to voice channel: ${(error as Error).message}`);
        }
    }

    async disconnect(): Promise<void> {
        try {
            this.logger.info('Disconnecting from voice channel', { guildId: this.guildId });

            this.stopPositionTracking();
            
            if (this.player) {
                await this.player.connection.disconnect();
                this.player = null;
            }

            this.state.connected = false;
            this.state.channelId = undefined;
            this.currentTrack = null;
            this.state.position = 0;

            this.logger.info('Successfully disconnected from voice channel', { guildId: this.guildId });
            
            this.eventBus.emitEvent('player.disconnected', { reason: 'manual' });
        } catch (error) {
            this.logger.error('Failed to disconnect from voice channel', error as Error, {
                guildId: this.guildId
            });
            throw new MusicPlayerError(`Failed to disconnect: ${(error as Error).message}`);
        }
    }

    async play(track: Track, options: PlaybackOptions = {}): Promise<void> {
        if (!this.player) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        try {
            this.logger.info('Playing track', {
                guildId: this.guildId,
                trackTitle: track.info.title,
                trackDuration: track.info.duration
            });

            const playOptions = {
                track: { encoded: track.encoded },
                ...options
            };

            await this.player.playTrack(playOptions);
            
            this.currentTrack = track;
            this.state.track = track;
            this.state.position = options.startTime || 0;
            this.state.paused = false;

            this.logger.info('Successfully started playing track', {
                guildId: this.guildId,
                trackTitle: track.info.title
            });

            this.eventBus.emitEvent('track.started', { 
                track, 
                position: this.state.position 
            });
        } catch (error) {
            this.logger.error('Failed to play track', error as Error, {
                guildId: this.guildId,
                trackTitle: track.info.title
            });

            this.eventBus.emitEvent('player.error', { 
                error: error as Error, 
                track 
            });
            
            throw new MusicPlayerError(`Failed to play track: ${(error as Error).message}`);
        }
    }

    async pause(): Promise<void> {
        if (!this.player) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        try {
            await this.player.setPaused(true);
            this.state.paused = true;

            this.logger.info('Paused playback', { guildId: this.guildId });
            
            this.eventBus.emitEvent('track.paused', { 
                track: this.currentTrack, 
                position: this.state.position 
            });
        } catch (error) {
            this.logger.error('Failed to pause playback', error as Error, { guildId: this.guildId });
            throw new MusicPlayerError(`Failed to pause: ${(error as Error).message}`);
        }
    }

    async resume(): Promise<void> {
        if (!this.player) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        try {
            await this.player.setPaused(false);
            this.state.paused = false;

            this.logger.info('Resumed playback', { guildId: this.guildId });
            
            this.eventBus.emitEvent('track.resumed', { 
                track: this.currentTrack, 
                position: this.state.position 
            });
        } catch (error) {
            this.logger.error('Failed to resume playback', error as Error, { guildId: this.guildId });
            throw new MusicPlayerError(`Failed to resume: ${(error as Error).message}`);
        }
    }

    async stop(): Promise<void> {
        if (!this.player) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        try {
            await this.player.stopTrack();
            
            const stoppedTrack = this.currentTrack;
            this.currentTrack = null;
            this.state.track = undefined;
            this.state.position = 0;
            this.state.paused = false;

            this.logger.info('Stopped playback', { guildId: this.guildId });
            
            this.eventBus.emitEvent('track.ended', { 
                track: stoppedTrack, 
                reason: 'stopped' 
            });
        } catch (error) {
            this.logger.error('Failed to stop playback', error as Error, { guildId: this.guildId });
            throw new MusicPlayerError(`Failed to stop: ${(error as Error).message}`);
        }
    }

    async seekTo(position: number): Promise<void> {
        if (!this.player) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        if (!this.currentTrack?.info.isSeekable) {
            throw new MusicPlayerError('Current track is not seekable');
        }

        try {
            await this.player.seekTo(position);
            this.state.position = position;

            this.logger.info('Seeked to position', { 
                guildId: this.guildId, 
                position 
            });
            
            this.eventBus.emitEvent('track.seeked', { 
                track: this.currentTrack, 
                position 
            });
        } catch (error) {
            this.logger.error('Failed to seek', error as Error, { 
                guildId: this.guildId, 
                position 
            });
            throw new MusicPlayerError(`Failed to seek: ${(error as Error).message}`);
        }
    }

    async setVolume(volume: number): Promise<void> {
        if (!this.player) {
            throw new MusicPlayerError('Not connected to a voice channel');
        }

        if (volume < 0 || volume > 100) {
            throw new MusicPlayerError('Volume must be between 0 and 100');
        }

        try {
            await this.player.setGlobalVolume(volume);
            this.state.volume = volume;

            this.logger.info('Set volume', { 
                guildId: this.guildId, 
                volume 
            });
            
            this.eventBus.emitEvent('volume.changed', { volume });
        } catch (error) {
            this.logger.error('Failed to set volume', error as Error, { 
                guildId: this.guildId, 
                volume 
            });
            throw new MusicPlayerError(`Failed to set volume: ${(error as Error).message}`);
        }
    }

    getPosition(): number {
        return this.state.position;
    }

    getState(): PlayerState {
        return { ...this.state };
    }

    isConnected(): boolean {
        return this.state.connected && this.player !== null;
    }

    async destroy(): Promise<void> {
        try {
            this.logger.info('Destroying audio player', { guildId: this.guildId });
            
            this.stopPositionTracking();
            
            if (this.player) {
                await this.disconnect();
            }

            // Reset state
            this.state = {
                position: 0,
                paused: false,
                volume: 100,
                connected: false
            };
            this.currentTrack = null;

            this.logger.info('Audio player destroyed', { guildId: this.guildId });
        } catch (error) {
            this.logger.error('Failed to destroy audio player', error as Error, { 
                guildId: this.guildId 
            });
        }
    }

    private setupPlayerEventHandlers(): void {
        if (!this.player) return;

        // Handle player updates (position changes)
        this.player.on('update', (data: PlayerUpdate) => {
            this.state.position = data.state.position;
        });

        // Handle track end
        this.player.on('end', (data) => {
            const endedTrack = this.currentTrack;
            this.currentTrack = null;
            this.state.track = undefined;
            this.state.position = 0;

            this.logger.info('Track ended', { 
                guildId: this.guildId, 
                reason: data.reason 
            });

            this.eventBus.emitEvent('track.ended', { 
                track: endedTrack, 
                reason: data.reason 
            });
        });

        // Handle player errors
        this.player.on('exception', (data) => {
            this.logger.error('Player exception', new Error(data.exception.message), {
                guildId: this.guildId,
                severity: data.exception.severity
            });

            this.eventBus.emitEvent('player.error', { 
                error: new Error(data.exception.message), 
                track: this.currentTrack 
            });
        });

        // Handle connection issues
        this.player.on('stuck', (data) => {
            this.logger.warn('Player stuck', {
                guildId: this.guildId,
                thresholdMs: data.thresholdMs
            });

            this.eventBus.emitEvent('player.error', { 
                error: new Error(`Player stuck for ${data.thresholdMs}ms`), 
                track: this.currentTrack 
            });
        });

        // Handle voice connection events
        this.player.connection.on('disconnect', () => {
            this.state.connected = false;
            this.logger.info('Voice connection disconnected', { guildId: this.guildId });
            
            this.eventBus.emitEvent('player.disconnected', { reason: 'connection_lost' });
        });
    }

    private startPositionTracking(): void {
        this.stopPositionTracking();
        
        this.positionUpdateInterval = setInterval(() => {
            if (this.player && !this.state.paused && this.currentTrack) {
                // Position is updated through player events, this is just a fallback
                // and for potential UI updates
            }
        }, 1000);
    }

    private stopPositionTracking(): void {
        if (this.positionUpdateInterval) {
            clearInterval(this.positionUpdateInterval);
            this.positionUpdateInterval = null;
        }
    }
}