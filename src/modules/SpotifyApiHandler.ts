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
        const date = new Date();
        this.spotifyApi
            .clientCredentialsGrant()
            .then((data) => {
                this.access_token = data.body['access_token'];
                this.access_token_expiration = date.getTime() + data.body['expires_in'] * 1000;

                console.log('Got new spotify access token.');
                this.spotifyApi.setAccessToken(this.access_token);
            })
            .catch((err) => {
                console.log('Something went wrong when retrieving an access token', err);
            });
    }

    private tokenRefreshNeeded() {
        const date = new Date();

        console.log('Checking if token refresh needed');

        if (this.access_token_expiration < date.getTime()) {
            console.log('Yes, token is expired');
            return true;
        }

        if (!this.access_token) {
            console.log('Yes, token is empty');
            return true;
        }

        if (this.access_token_expiration === 0) {
            console.log('Yes, token expiration is 0');
            return true;
        }

        console.log('No, token is not expired');
        console.log('expiry  :' + this.access_token_expiration + '\ncurrent :' + date.getTime());

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
