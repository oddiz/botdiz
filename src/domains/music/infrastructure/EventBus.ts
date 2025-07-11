import { createLogger } from "@logger";
import { TypedEmitter } from "tiny-typed-emitter";

export interface MusicEvents {
    "track.started": (data: { track: any; position: number }) => void;
    "track.ended": (data: { track: any; reason: string }) => void;
    "track.paused": (data: { track: any; position: number }) => void;
    "track.resumed": (data: { track: any; position: number }) => void;
    "track.seeked": (data: { track: any; position: number }) => void;
    "queue.updated": (data: { queue: any[]; current: any }) => void;
    "queue.cleared": (data: { guildId: string }) => void;
    "player.connected": (data: { channelId: string }) => void;
    "player.disconnected": (data: { reason: string }) => void;
    "player.error": (data: { error: Error; track?: any }) => void;
    "volume.changed": (data: { volume: number }) => void;
    "repeat.changed": (data: { mode: string }) => void;
    "vote.started": (data: { voteId: string; type: string; userId: string }) => void;
    "vote.added": (data: {
        voteId: string;
        userId: string;
        currentVotes: number;
        requiredVotes: number;
    }) => void;
    "vote.passed": (data: { voteId: string; type: string; result: any }) => void;
    "vote.failed": (data: { voteId: string; type: string; reason: string }) => void;
    "recommendation.added": (data: { tracks: any[]; source: string }) => void;
}

export class MusicEventBus extends TypedEmitter<MusicEvents> {
    private readonly logger = createLogger("MusicEventBus");
    private readonly guildId: string;

    constructor(guildId: string) {
        super();
        this.guildId = guildId;

        // Set up error handling for uncaught event errors
        this.on("error" as any, (error: Error) => {
            this.logger.error("Uncaught event error", error, { guildId: this.guildId });
        });
    }

    emitEvent<K extends keyof MusicEvents>(event: K, data: Parameters<MusicEvents[K]>[0]): boolean {
        this.logger.debug("Emitting event", {
            event,
            guildId: this.guildId,
            dataType: typeof data,
        });

        return super.emit(event, data as any);
    }

    on<K extends keyof MusicEvents>(event: K, listener: MusicEvents[K]): this {
        this.logger.debug("Registering event listener", {
            event,
            guildId: this.guildId,
        });

        return super.on(event, listener);
    }

    once<K extends keyof MusicEvents>(event: K, listener: MusicEvents[K]): this {
        this.logger.debug("Registering one-time event listener", {
            event,
            guildId: this.guildId,
        });

        return super.once(event, listener);
    }

    off<K extends keyof MusicEvents>(event: K, listener: MusicEvents[K]): this {
        this.logger.debug("Removing event listener", {
            event,
            guildId: this.guildId,
        });

        return super.off(event, listener);
    }

    removeAllListeners<K extends keyof MusicEvents>(event?: K): this {
        if (event) {
            this.logger.debug("Removing all listeners for event", {
                event,
                guildId: this.guildId,
            });
        } else {
            this.logger.debug("Removing all event listeners", {
                guildId: this.guildId,
            });
        }

        return super.removeAllListeners(event);
    }

    getListenerCount<K extends keyof MusicEvents>(event: K): number {
        return this.listenerCount(event);
    }

    getEventNames(): (keyof MusicEvents)[] {
        return this.eventNames() as (keyof MusicEvents)[];
    }

    /**
     * Get statistics about event usage
     */
    getStats() {
        const eventNames = this.getEventNames();
        const stats = {
            guildId: this.guildId,
            totalEvents: eventNames.length,
            listeners: {} as Record<string, number>,
        };

        eventNames.forEach((event) => {
            stats.listeners[event as string] = this.getListenerCount(event);
        });

        return stats;
    }

    /**
     * Clean up all listeners (call this when shutting down)
     */
    cleanup(): void {
        this.logger.info("Cleaning up event bus", { guildId: this.guildId });
        this.removeAllListeners();
    }
}
