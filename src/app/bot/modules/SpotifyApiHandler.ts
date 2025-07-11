import SpotifyWebApi from 'spotify-web-api-node';

class SpotifyApiManager {
    private spotifyApi: SpotifyWebApi;
    private access_token: string;
    private access_token_expiration: number;
    debug = false;
    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENTID,
            clientSecret: process.env.SPOTIFY_CLIENTSECRET,
        });

        this.access_token = '';
        this.access_token_expiration = 0;
    }

    init() {
        this.refreshToken();
    }

    private async refreshToken() {
        const date = new Date();
        await this.spotifyApi
            .clientCredentialsGrant()
            .then((data) => {
                this.access_token = data.body['access_token'];
                this.access_token_expiration = date.getTime() + data.body['expires_in'] * 1000;

                if (this.debug) console.log('Got new spotify access token.');
                this.spotifyApi.setAccessToken(this.access_token);
            })
            .catch((err) => {
                console.log('Something went wrong when retrieving an access token', err);
            });
    }

    private tokenRefreshNeeded() {
        const date = new Date();

        if (this.debug) console.log('Checking if token refresh needed');

        if (this.access_token_expiration < date.getTime()) {
            if (this.debug) console.log('Yes, token is expired');
            return true;
        }

        if (!this.access_token) {
            if (this.debug) console.log('Yes, token is empty');
            return true;
        }

        if (this.debug) {
            console.log('No, token is not expired');
            console.log(
                'expiry  :' + this.access_token_expiration + '\ncurrent :' + date.getTime()
            );
        }
        return false;
    }

    async getSpotifyApi() {
        const isTokenRefreshNeeded = this.tokenRefreshNeeded();
        if (isTokenRefreshNeeded) {
            await this.refreshToken();
        }

        return this.spotifyApi;
    }
    async getSpotifyToken() {
        const isTokenRefreshNeeded = this.tokenRefreshNeeded();
        if (isTokenRefreshNeeded) {
            await this.refreshToken();
        }

        return this.access_token;
    }
}

export const spotifyApiManager = new SpotifyApiManager();
