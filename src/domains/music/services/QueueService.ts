import { createLogger } from "@logger";
import { Track, QueueState, RepeatMode, AddToQueueOptions } from "../models/Track";
import type { MusicEventBus } from "domains/music/infrastructure/EventBus";

export interface IQueueService {
    add(tracks: Track[], options?: AddToQueueOptions): void;
    remove(index: number): Track | null;
    clear(): void;
    shuffle(): void;
    unshuffle(): void;
    getNext(): Track | null;
    getPrevious(): Track | null;
    getCurrent(): Track | null;
    getAll(): Track[];
    getCurrentIndex(): number;
    setCurrentIndex(index: number): void;
    setRepeatMode(mode: RepeatMode): void;
    getRepeatMode(): RepeatMode;
    isEmpty(): boolean;
    size(): number;
    getPosition(track: Track): number;
    moveTrack(fromIndex: number, toIndex: number): boolean;
    getState(): QueueState;
    setState(state: QueueState): void;
}

export class QueueService implements IQueueService {
    private readonly logger = createLogger("QueueService");
    private state: QueueState;

    constructor(
        private readonly guildId: string,
        private readonly eventBus: MusicEventBus
    ) {
        this.state = {
            tracks: [],
            currentIndex: -1,
            repeatMode: "off",
            shuffled: false,
        };
    }

    add(tracks: Track[], options: AddToQueueOptions = {}): void {
        const { position = "end", forcePlay = false, silent = false } = options;

        if (tracks.length === 0) {
            this.logger.warn("Attempted to add empty tracks array", { guildId: this.guildId });
            return;
        }

        this.logger.info("Adding tracks to queue", {
            guildId: this.guildId,
            trackCount: tracks.length,
            position,
            forcePlay,
        });

        let insertIndex: number;

        if (position === "end") {
            insertIndex = this.state.tracks.length;
        } else if (position === "next") {
            insertIndex = this.state.currentIndex + 1;
        } else if (typeof position === "number") {
            insertIndex = Math.max(0, Math.min(position, this.state.tracks.length));
        } else {
            insertIndex = this.state.tracks.length;
        }

        // Insert tracks at the specified position
        this.state.tracks.splice(insertIndex, 0, ...tracks);

        // Adjust current index if needed
        if (insertIndex <= this.state.currentIndex) {
            this.state.currentIndex += tracks.length;
        }

        // If this is the first track or forcePlay is true, set it as current
        if (this.state.currentIndex === -1 || forcePlay) {
            this.state.currentIndex = insertIndex;
        }

        if (!silent) {
            this.eventBus.emitEvent("queue.updated", {
                queue: this.getAll(),
                current: this.getCurrent(),
            });
        }
    }

    remove(index: number): Track | null {
        if (index < 0 || index >= this.state.tracks.length) {
            this.logger.warn("Invalid index for track removal", {
                guildId: this.guildId,
                index,
                queueSize: this.state.tracks.length,
            });
            return null;
        }

        const removedTrack = this.state.tracks.splice(index, 1)[0];

        // Adjust current index if needed
        if (index < this.state.currentIndex) {
            this.state.currentIndex--;
        } else if (index === this.state.currentIndex) {
            // If we removed the current track, we might need to adjust
            if (this.state.currentIndex >= this.state.tracks.length) {
                this.state.currentIndex = this.state.tracks.length - 1;
            }
        }

        this.logger.info("Removed track from queue", {
            guildId: this.guildId,
            trackTitle: removedTrack.info.title,
            newQueueSize: this.state.tracks.length,
        });

        this.eventBus.emitEvent("queue.updated", {
            queue: this.getAll(),
            current: this.getCurrent(),
        });

        return removedTrack;
    }

    clear(): void {
        const clearedCount = this.state.tracks.length;
        this.state.tracks = [];
        this.state.currentIndex = -1;
        this.state.shuffled = false;
        this.state.originalOrder = undefined;

        this.logger.info("Cleared queue", {
            guildId: this.guildId,
            clearedCount,
        });

        this.eventBus.emitEvent("queue.cleared", { guildId: this.guildId });
        this.eventBus.emitEvent("queue.updated", {
            queue: [],
            current: null,
        });
    }

    shuffle(): void {
        if (this.state.tracks.length <= 1) {
            return;
        }

        // Store original order if not already shuffled
        if (!this.state.shuffled) {
            this.state.originalOrder = [...this.state.tracks];
        }

        const currentTrack = this.getCurrent();

        // Fisher-Yates shuffle algorithm
        for (let i = this.state.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.state.tracks[i], this.state.tracks[j]] = [
                this.state.tracks[j],
                this.state.tracks[i],
            ];
        }

        // Find the new position of the current track
        if (currentTrack) {
            this.state.currentIndex = this.state.tracks.findIndex(
                (track) => track.id === currentTrack.id
            );
        }

        this.state.shuffled = true;

        this.logger.info("Shuffled queue", {
            guildId: this.guildId,
            queueSize: this.state.tracks.length,
        });

        this.eventBus.emitEvent("queue.updated", {
            queue: this.getAll(),
            current: this.getCurrent(),
        });
    }

    unshuffle(): void {
        if (!this.state.shuffled || !this.state.originalOrder) {
            return;
        }

        const currentTrack = this.getCurrent();

        // Restore original order
        this.state.tracks = [...this.state.originalOrder];

        // Find the position of the current track in the original order
        if (currentTrack) {
            this.state.currentIndex = this.state.tracks.findIndex(
                (track) => track.id === currentTrack.id
            );
        }

        this.state.shuffled = false;
        this.state.originalOrder = undefined;

        this.logger.info("Unshuffled queue", {
            guildId: this.guildId,
            queueSize: this.state.tracks.length,
        });

        this.eventBus.emitEvent("queue.updated", {
            queue: this.getAll(),
            current: this.getCurrent(),
        });
    }

    getNext(): Track | null {
        if (this.isEmpty()) {
            return null;
        }

        switch (this.state.repeatMode) {
            case "track":
                return this.getCurrent();

            case "queue":
                const nextIndex = (this.state.currentIndex + 1) % this.state.tracks.length;
                return this.state.tracks[nextIndex] || null;

            case "off":
            default:
                const straightNextIndex = this.state.currentIndex + 1;
                return this.state.tracks[straightNextIndex] || null;
        }
    }

    getPrevious(): Track | null {
        if (this.isEmpty()) {
            return null;
        }

        switch (this.state.repeatMode) {
            case "track":
                return this.getCurrent();

            case "queue":
                const prevIndex = this.state.currentIndex - 1;
                const wrappedIndex = prevIndex < 0 ? this.state.tracks.length - 1 : prevIndex;
                return this.state.tracks[wrappedIndex] || null;

            case "off":
            default:
                const straightPrevIndex = this.state.currentIndex - 1;
                return straightPrevIndex >= 0 ? this.state.tracks[straightPrevIndex] : null;
        }
    }

    getCurrent(): Track | null {
        if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.tracks.length) {
            return this.state.tracks[this.state.currentIndex];
        }
        return null;
    }

    getAll(): Track[] {
        return [...this.state.tracks];
    }

    getCurrentIndex(): number {
        return this.state.currentIndex;
    }

    setCurrentIndex(index: number): void {
        if (index >= -1 && index < this.state.tracks.length) {
            this.state.currentIndex = index;

            this.eventBus.emitEvent("queue.updated", {
                queue: this.getAll(),
                current: this.getCurrent(),
            });
        }
    }

    setRepeatMode(mode: RepeatMode): void {
        this.state.repeatMode = mode;

        this.logger.info("Changed repeat mode", {
            guildId: this.guildId,
            mode,
        });

        this.eventBus.emitEvent("repeat.changed", { mode });
    }

    getRepeatMode(): RepeatMode {
        return this.state.repeatMode;
    }

    isEmpty(): boolean {
        return this.state.tracks.length === 0;
    }

    size(): number {
        return this.state.tracks.length;
    }

    getPosition(track: Track): number {
        return this.state.tracks.findIndex((t) => t.id === track.id);
    }

    moveTrack(fromIndex: number, toIndex: number): boolean {
        if (
            fromIndex < 0 ||
            fromIndex >= this.state.tracks.length ||
            toIndex < 0 ||
            toIndex >= this.state.tracks.length
        ) {
            return false;
        }

        const track = this.state.tracks.splice(fromIndex, 1)[0];
        this.state.tracks.splice(toIndex, 0, track);

        // Adjust current index if needed
        if (fromIndex === this.state.currentIndex) {
            this.state.currentIndex = toIndex;
        } else if (fromIndex < this.state.currentIndex && toIndex >= this.state.currentIndex) {
            this.state.currentIndex--;
        } else if (fromIndex > this.state.currentIndex && toIndex <= this.state.currentIndex) {
            this.state.currentIndex++;
        }

        this.eventBus.emitEvent("queue.updated", {
            queue: this.getAll(),
            current: this.getCurrent(),
        });

        return true;
    }

    getState(): QueueState {
        return {
            tracks: [...this.state.tracks],
            currentIndex: this.state.currentIndex,
            repeatMode: this.state.repeatMode,
            shuffled: this.state.shuffled,
            originalOrder: this.state.originalOrder ? [...this.state.originalOrder] : undefined,
        };
    }

    setState(state: QueueState): void {
        this.state = {
            tracks: [...state.tracks],
            currentIndex: state.currentIndex,
            repeatMode: state.repeatMode,
            shuffled: state.shuffled,
            originalOrder: state.originalOrder ? [...state.originalOrder] : undefined,
        };

        this.eventBus.emitEvent("queue.updated", {
            queue: this.getAll(),
            current: this.getCurrent(),
        });
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const totalDuration = this.state.tracks.reduce(
            (sum, track) => sum + track.info.duration,
            0
        );
        const sourceCounts = this.state.tracks.reduce(
            (counts, track) => {
                counts[track.source] = (counts[track.source] || 0) + 1;
                return counts;
            },
            {} as Record<string, number>
        );

        return {
            guildId: this.guildId,
            totalTracks: this.state.tracks.length,
            currentIndex: this.state.currentIndex,
            totalDuration,
            averageDuration:
                this.state.tracks.length > 0 ? totalDuration / this.state.tracks.length : 0,
            repeatMode: this.state.repeatMode,
            shuffled: this.state.shuffled,
            sourceCounts,
        };
    }
}
