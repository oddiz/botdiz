import { Track, TrackSource, SearchResult, TrackBuilder, PlaylistBuilder } from "../models/Track";
import { createLogger } from "../../../shared/logging/Logger";
import { ValidationError } from "../../../shared/errors/BotdizError";
import { validateSchema } from "../../../shared/validation/schemas";
import { ShoukakuHandler } from "../../../Shokaku/ShokakuHandler";
import { LoadType, LavalinkResponse } from "shoukaku";
import SpotifyWebApi from "spotify-web-api-node";

export interface ITrackResolverService {
    resolve(query: string, requestedBy: Track['requestedBy']): Promise<SearchResult>;
    resolveSpotify(spotifyUrl: string, requestedBy: Track['requestedBy']): Promise<SearchResult>;
    search(query: string, source: TrackSource, requestedBy: Track['requestedBy']): Promise<SearchResult>;
}

export class TrackResolverService implements ITrackResolverService {
    private readonly logger = createLogger('TrackResolverService');
    private readonly spotifyApi: SpotifyWebApi;

    constructor(
        private readonly shoukaku: ShoukakuHandler,
        spotifyConfig: { clientId: string; clientSecret: string }
    ) {
        this.spotifyApi = new SpotifyWebApi({
            clientId: spotifyConfig.clientId,
            clientSecret: spotifyConfig.clientSecret
        });
        
        this.initializeSpotifyAuth();
    }

    async resolve(query: string, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        if (!query?.trim()) {
            throw new ValidationError('Query cannot be empty');
        }

        this.logger.info('Resolving track', { 
            query: query.substring(0, 100), // Truncate for logging
            requestedBy: requestedBy.id 
        });

        try {
            const source = this.detectSource(query);
            
            switch (source) {
                case 'spotify':
                    return this.resolveSpotify(query, requestedBy);
                case 'youtube':
                case 'soundcloud':
                case 'url':
                    return this.resolveLavalink(query, requestedBy);
                default:
                    return this.search(query, 'youtube', requestedBy);
            }
        } catch (error) {
            this.logger.error('Failed to resolve track', error as Error, { query, requestedBy: requestedBy.id });
            throw error;
        }
    }

    async resolveSpotify(spotifyUrl: string, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        const spotifyData = this.parseSpotifyUrl(spotifyUrl);
        
        if (!spotifyData) {
            throw new ValidationError('Invalid Spotify URL');
        }

        this.logger.info('Resolving Spotify content', { 
            type: spotifyData.type, 
            id: spotifyData.id,
            requestedBy: requestedBy.id 
        });

        try {
            await this.ensureSpotifyAuth();

            switch (spotifyData.type) {
                case 'track':
                    return this.resolveSpotifyTrack(spotifyData.id, requestedBy);
                case 'playlist':
                    return this.resolveSpotifyPlaylist(spotifyData.id, requestedBy);
                case 'album':
                    return this.resolveSpotifyAlbum(spotifyData.id, requestedBy);
                default:
                    throw new ValidationError(`Unsupported Spotify type: ${spotifyData.type}`);
            }
        } catch (error) {
            this.logger.error('Failed to resolve Spotify content', error as Error, { 
                spotifyUrl, 
                requestedBy: requestedBy.id 
            });
            throw error;
        }
    }

    async search(query: string, source: TrackSource, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        const searchQuery = this.buildSearchQuery(query, source);
        
        this.logger.info('Searching for tracks', { 
            query: searchQuery.substring(0, 100),
            source,
            requestedBy: requestedBy.id 
        });

        return this.resolveLavalink(searchQuery, requestedBy);
    }

    private async resolveLavalink(query: string, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        try {
            const node = this.shoukaku.getIdealNode();
            if (!node) {
                throw new Error('No Lavalink nodes available');
            }

            const response = await node.rest.resolve(query) as LavalinkResponse;
            
            this.logger.debug('Lavalink response', { 
                loadType: response.loadType,
                trackCount: response.data ? (Array.isArray(response.data) ? response.data.length : 1) : 0
            });

            return this.mapLavalinkResponse(response, requestedBy);
        } catch (error) {
            this.logger.error('Lavalink resolution failed', error as Error, { query });
            
            return {
                tracks: [],
                loadType: 'error',
                exception: {
                    message: (error as Error).message,
                    severity: 'common'
                }
            };
        }
    }

    private async resolveSpotifyTrack(trackId: string, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        try {
            const response = await this.spotifyApi.getTrack(trackId);
            const spotifyTrack = response.body;

            const searchQuery = `${spotifyTrack.artists[0]?.name} ${spotifyTrack.name}`;
            const lavalinkResult = await this.resolveLavalink(`ytsearch:${searchQuery}`, requestedBy);

            if (lavalinkResult.tracks.length > 0) {
                // Enhance the first result with Spotify metadata
                const track = lavalinkResult.tracks[0];
                track.spotify = {
                    id: spotifyTrack.id,
                    uri: spotifyTrack.uri,
                    externalUrls: spotifyTrack.external_urls,
                    previewUrl: spotifyTrack.preview_url
                };
                track.metadata = {
                    album: spotifyTrack.album.name,
                    releaseDate: spotifyTrack.album.release_date,
                    isExplicit: spotifyTrack.explicit,
                    popularity: spotifyTrack.popularity
                };
                track.source = 'spotify';
            }

            return lavalinkResult;
        } catch (error) {
            this.logger.error('Failed to resolve Spotify track', error as Error, { trackId });
            throw new Error('Failed to resolve Spotify track');
        }
    }

    private async resolveSpotifyPlaylist(playlistId: string, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        try {
            const response = await this.spotifyApi.getPlaylist(playlistId);
            const spotifyPlaylist = response.body;

            const tracks: Track[] = [];
            const items = spotifyPlaylist.tracks.items;

            for (const item of items.slice(0, 50)) { // Limit to 50 tracks for performance
                if (item.track && item.track.type === 'track') {
                    const spotifyTrack = item.track;
                    const searchQuery = `${spotifyTrack.artists[0]?.name} ${spotifyTrack.name}`;
                    
                    try {
                        const result = await this.resolveLavalink(`ytsearch:${searchQuery}`, requestedBy);
                        if (result.tracks.length > 0) {
                            const track = result.tracks[0];
                            track.spotify = {
                                id: spotifyTrack.id,
                                uri: spotifyTrack.uri,
                                externalUrls: spotifyTrack.external_urls,
                                previewUrl: spotifyTrack.preview_url
                            };
                            track.source = 'spotify';
                            tracks.push(track);
                        }
                    } catch (error) {
                        this.logger.warn('Failed to resolve track in playlist', { 
                            trackId: spotifyTrack.id,
                            error: (error as Error).message 
                        });
                        // Continue with other tracks
                    }
                }
            }

            return {
                tracks,
                loadType: 'playlist',
                playlistInfo: {
                    name: spotifyPlaylist.name,
                    selectedTrack: 0
                }
            };
        } catch (error) {
            this.logger.error('Failed to resolve Spotify playlist', error as Error, { playlistId });
            throw new Error('Failed to resolve Spotify playlist');
        }
    }

    private async resolveSpotifyAlbum(albumId: string, requestedBy: Track['requestedBy']): Promise<SearchResult> {
        try {
            const response = await this.spotifyApi.getAlbum(albumId);
            const spotifyAlbum = response.body;

            const tracks: Track[] = [];

            for (const item of spotifyAlbum.tracks.items.slice(0, 50)) { // Limit to 50 tracks
                const searchQuery = `${item.artists[0]?.name} ${item.name}`;
                
                try {
                    const result = await this.resolveLavalink(`ytsearch:${searchQuery}`, requestedBy);
                    if (result.tracks.length > 0) {
                        const track = result.tracks[0];
                        track.spotify = {
                            id: item.id,
                            uri: item.uri,
                            externalUrls: item.external_urls,
                            previewUrl: item.preview_url
                        };
                        track.metadata = {
                            album: spotifyAlbum.name,
                            releaseDate: spotifyAlbum.release_date,
                            isExplicit: item.explicit
                        };
                        track.source = 'spotify';
                        tracks.push(track);
                    }
                } catch (error) {
                    this.logger.warn('Failed to resolve track in album', { 
                        trackId: item.id,
                        error: (error as Error).message 
                    });
                }
            }

            return {
                tracks,
                loadType: 'playlist',
                playlistInfo: {
                    name: spotifyAlbum.name,
                    selectedTrack: 0
                }
            };
        } catch (error) {
            this.logger.error('Failed to resolve Spotify album', error as Error, { albumId });
            throw new Error('Failed to resolve Spotify album');
        }
    }

    private mapLavalinkResponse(response: LavalinkResponse, requestedBy: Track['requestedBy']): SearchResult {
        switch (response.loadType) {
            case LoadType.TRACK:
                return {
                    tracks: [this.createTrackFromLavalink(response.data, requestedBy)],
                    loadType: 'track'
                };

            case LoadType.PLAYLIST:
                const tracks = response.data.tracks.map(track => 
                    this.createTrackFromLavalink(track, requestedBy)
                );
                return {
                    tracks,
                    loadType: 'playlist',
                    playlistInfo: {
                        name: response.data.info.name,
                        selectedTrack: response.data.info.selectedTrack || 0
                    }
                };

            case LoadType.SEARCH:
                return {
                    tracks: response.data.map(track => 
                        this.createTrackFromLavalink(track, requestedBy)
                    ),
                    loadType: 'search'
                };

            case LoadType.EMPTY:
                return {
                    tracks: [],
                    loadType: 'empty'
                };

            case LoadType.ERROR:
            default:
                return {
                    tracks: [],
                    loadType: 'error',
                    exception: {
                        message: response.data?.message || 'Unknown error',
                        severity: response.data?.severity || 'common'
                    }
                };
        }
    }

    private createTrackFromLavalink(lavalinkTrack: any, requestedBy: Track['requestedBy']): Track {
        return new TrackBuilder()
            .setEncoded(lavalinkTrack.encoded)
            .setInfo({
                title: lavalinkTrack.info.title,
                artist: lavalinkTrack.info.author,
                duration: lavalinkTrack.info.length,
                thumbnail: lavalinkTrack.info.artworkUrl,
                url: lavalinkTrack.info.uri,
                isSeekable: lavalinkTrack.info.isSeekable,
                isStream: lavalinkTrack.info.isStream
            })
            .setSource('youtube') // Default to YouTube, can be overridden
            .setRequestedBy(requestedBy)
            .build();
    }

    private detectSource(query: string): TrackSource {
        if (query.includes('spotify.com')) return 'spotify';
        if (query.includes('youtube.com') || query.includes('youtu.be')) return 'youtube';
        if (query.includes('soundcloud.com')) return 'soundcloud';
        if (query.startsWith('http://') || query.startsWith('https://')) return 'url';
        return 'youtube'; // Default to YouTube search
    }

    private parseSpotifyUrl(url: string): { type: string; id: string } | null {
        const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
        if (match) {
            return { type: match[1], id: match[2] };
        }
        return null;
    }

    private buildSearchQuery(query: string, source: TrackSource): string {
        switch (source) {
            case 'youtube':
                return `ytsearch:${query}`;
            case 'soundcloud':
                return `scsearch:${query}`;
            default:
                return query;
        }
    }

    private async initializeSpotifyAuth(): Promise<void> {
        try {
            const authResponse = await this.spotifyApi.clientCredentialsGrant();
            this.spotifyApi.setAccessToken(authResponse.body.access_token);
            
            // Set up token refresh
            setTimeout(() => {
                this.initializeSpotifyAuth();
            }, (authResponse.body.expires_in - 60) * 1000); // Refresh 1 minute before expiry

            this.logger.info('Spotify authentication initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Spotify authentication', error as Error);
        }
    }

    private async ensureSpotifyAuth(): Promise<void> {
        if (!this.spotifyApi.getAccessToken()) {
            await this.initializeSpotifyAuth();
        }
    }
}