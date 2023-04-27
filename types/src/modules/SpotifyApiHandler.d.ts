import SpotifyWebApi from 'spotify-web-api-node';
declare class SpotifyApiManager {
    private spotifyApi;
    private access_token;
    private access_token_expiration;
    debug: boolean;
    constructor();
    init(): void;
    private refreshToken;
    private tokenRefreshNeeded;
    getSpotifyApi(): Promise<SpotifyWebApi>;
    getSpotifyToken(): Promise<string>;
}
export declare const spotifyApiManager: SpotifyApiManager;
export {};
