export type TrackSource = "youtube" | "spotify" | "soundcloud" | "url" | "file";

export interface TrackInfo {
    title: string;
    artist?: string;
    duration: number; // in milliseconds
    thumbnail?: string;
    url: string;
    isSeekable: boolean;
    isStream: boolean;
}

export interface Track {
    id: string;
    encoded: string; // Lavalink encoded track
    info: TrackInfo;
    source: TrackSource;
    requestedBy: {
        id: string;
        username: string;
        avatar?: string;
    };
    addedAt: Date;
    playCount?: number;

    // Spotify-specific data (if available)
    spotify?: {
        id: string;
        uri: string;
        externalUrls: SpotifyApi.ExternalUrlObject;
        previewUrl?: string;
    };

    // Additional metadata
    metadata?: {
        genre?: string;
        album?: string;
        releaseDate?: string;
        isExplicit?: boolean;
        popularity?: number;
    };
}

export interface Playlist {
    name: string;
    url?: string;
    tracks: Track[];
    selectedTrack?: number;
    source: TrackSource;
}

export type RepeatMode = "off" | "track" | "queue";

export interface QueueState {
    tracks: Track[];
    currentIndex: number;
    repeatMode: RepeatMode;
    shuffled: boolean;
    originalOrder?: Track[]; // Used when shuffle is enabled
}

export interface PlayerState {
    position: number;
    paused: boolean;
    volume: number;
    connected: boolean;
    channelId?: string;
    track?: Track;
}

export interface PlaybackOptions {
    forceNext?: boolean;
    startTime?: number;
    noReplace?: boolean;
}

export interface AddToQueueOptions {
    position?: "next" | "end" | number;
    forcePlay?: boolean;
    silent?: boolean;
}

export interface SearchResult {
    tracks: Track[];
    loadType: "track" | "playlist" | "search" | "empty" | "error";
    playlistInfo?: {
        name: string;
        selectedTrack: number;
    };
    exception?: {
        message: string;
        severity: string;
    };
}

export class TrackBuilder {
    private track: Partial<Track> = {};

    constructor() {
        this.track.id = this.generateId();
        this.track.addedAt = new Date();
    }

    setEncoded(encoded: string): this {
        this.track.encoded = encoded;
        return this;
    }

    setInfo(info: TrackInfo): this {
        this.track.info = info;
        return this;
    }

    setSource(source: TrackSource): this {
        this.track.source = source;
        return this;
    }

    setRequestedBy(user: { id: string; username: string; avatar?: string }): this {
        this.track.requestedBy = user;
        return this;
    }

    setSpotifyData(spotify: Track["spotify"]): this {
        this.track.spotify = spotify;
        return this;
    }

    setMetadata(metadata: Track["metadata"]): this {
        this.track.metadata = metadata;
        return this;
    }

    build(): Track {
        if (
            !this.track.encoded ||
            !this.track.info ||
            !this.track.source ||
            !this.track.requestedBy
        ) {
            throw new Error("Track is missing required fields");
        }

        return this.track as Track;
    }

    private generateId(): string {
        return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class PlaylistBuilder {
    private playlist: Partial<Playlist> = {
        tracks: [],
    };

    setName(name: string): this {
        this.playlist.name = name;
        return this;
    }

    setUrl(url: string): this {
        this.playlist.url = url;
        return this;
    }

    setSource(source: TrackSource): this {
        this.playlist.source = source;
        return this;
    }

    addTrack(track: Track): this {
        this.playlist.tracks!.push(track);
        return this;
    }

    addTracks(tracks: Track[]): this {
        this.playlist.tracks!.push(...tracks);
        return this;
    }

    setSelectedTrack(index: number): this {
        this.playlist.selectedTrack = index;
        return this;
    }

    build(): Playlist {
        if (!this.playlist.name || !this.playlist.source) {
            throw new Error("Playlist is missing required fields");
        }

        return this.playlist as Playlist;
    }
}
