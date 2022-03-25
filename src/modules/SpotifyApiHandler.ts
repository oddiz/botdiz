import SpotifyWebApi from 'spotify-web-api-node';

class SpotifyApiManager {
    private spotifyApi: SpotifyWebApi;
    private access_token: string;
    private access_token_expiration: number;
    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENTID,
            clientSecret: process.env.SPOTIFY_CLIENTSECRET,
        });

        this.access_token = '';
        this.access_token_expiration = 0;

        this.init();
    }

    init() {
        this.refreshToken();
    }

    private async refreshToken() {
        this.spotifyApi
            .clientCredentialsGrant()
            .then((data) => {
                this.access_token = data.body['access_token'];
                this.access_token_expiration = Date.now() + data.body['expires_in'] * 1000;

                this.spotifyApi.setAccessToken(this.access_token);
            })
            .catch((err) => {
                console.log('Something went wrong when retrieving an access token', err);
            });
    }

    private tokenRefreshNeeded() {
        if (this.access_token_expiration < Date.now()) return true;

        if (!this.access_token) return true;

        if (this.access_token_expiration === 0) return true;

        return false;
    }

    async getSpotifyApi() {
        if (this.tokenRefreshNeeded()) {
            await this.refreshToken();
        }

        return this.spotifyApi;
    }
}

export const spotifyApiManager = new SpotifyApiManager();
