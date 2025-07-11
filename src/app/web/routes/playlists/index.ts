import spotifyWebApi from "spotify-web-api-node";

import { Db } from "mongodb";
import { Express } from "express";
import "dotenv/config";
import { getToken } from "../../scripts/getToken";
import { createLogger } from "@logger";
import { withAuth } from "app/web/middleware/middlewares";

const logger = createLogger("BotdizPlaylists");
interface SpotifyPlaylistsResponse {
    total: string;
    items: any[];
}

const UNAUTH_RESPONSE = {
    status: "failed",
    message: "401 Not authorized",
    isValidated: false,
};
export default async function playlists(app: Express, db: Db) {
    //get playlists if it's available from the database
    app.get("/playlists", withAuth, async (req, res) => {
        try {
            const reqToken = getToken(req);
            if (!reqToken) {
                console.log("No session info in credentials");

                res.status(401).send(UNAUTH_RESPONSE);

                return;
            }
            //find username from token

            const user = req.user;

            if (!user?.data?.spotify?.playlists) {
                res.send({
                    status: "success",
                    savedPlaylists: null,
                });

                return;
            }

            res.send({
                status: "success",
                savedPlaylists: user.data.spotify.playlists,
            });
        } catch (error) {
            logger.error("Error while trying to get playlist: " + error);
            res.status(404).send({
                status: "failed",
                message: "Error while trying to get playlist",
            });
        }
    });

    //get spotify auth token of user, get playlists and set them into user database
    app.post("/playlists", withAuth, async (req, res) => {
        try {
            //spotify auth

            const reqCode = req.body?.code;
            const redirect_uri = req.body?.redirect_uri;
            if (!(reqCode || redirect_uri)) {
                res.status(401).send(UNAUTH_RESPONSE);

                return;
            }
            const botdizCredentials = {
                clientId: process.env.SPOTIFY_CLIENTID,
                clientSecret: process.env.SPOTIFY_CLIENTSECRET,
                redirectUri: redirect_uri,
            };

            const spotifyApi = new spotifyWebApi(botdizCredentials);

            // Retrieve an access token and a refresh token
            const spotifyAuthData = await spotifyApi
                .authorizationCodeGrant(reqCode)
                .catch((err) => {
                    logger.error("Error while accessing spotify api: ", err);
                });

            if (!spotifyAuthData) {
                logger.error("Error while trying to get spotify auth data");
                res.status(403).send({
                    message: "Error while trying to get spotify auth data. ",
                });

                return;
            }
            // eslint-disable-next-line no-inner-declarations
            async function fetchSpotifyPlaylists(offset: number) {
                if (!spotifyAuthData) throw "No spotify auth data";

                const { default: fetch } = await import("node-fetch");
                const response = await fetch(
                    "https://api.spotify.com/v1/me/playlists?limit=50&offset=" + offset,
                    {
                        method: "GET",
                        headers: {
                            "Content-Encoding": "null",
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + spotifyAuthData.body["access_token"],
                        },
                    }
                );

                const jsonResponse = await response.json();
                return jsonResponse as SpotifyPlaylistsResponse;
            }

            // Set the access token on the API object to use it in later calls
            spotifyApi.setAccessToken(spotifyAuthData.body["access_token"]);
            spotifyApi.setRefreshToken(spotifyAuthData.body["refresh_token"]);
            // Set auth data on database

            let offset = 0;
            const playlistsResponse = await fetchSpotifyPlaylists(offset);

            while (parseInt(playlistsResponse.total) > offset + 50) {
                offset += 50;
                const nextPlaylistsResponse = await fetchSpotifyPlaylists(offset);
                for (const playlist of nextPlaylistsResponse.items) {
                    playlistsResponse.items.push(playlist);
                }
            }

            const expiryTime = spotifyAuthData.body["expires_in"] * 1000 + new Date().getTime();
            const spotifyData = {
                auth_token: spotifyAuthData.body["access_token"],
                refresh_token: spotifyAuthData.body["refresh_token"],
                expires: expiryTime,
                playlists: playlistsResponse,
            };
            if ("discord_session" in req.session && "discord_id" in req.user) {
                await db.collection("discord_users").updateOne(
                    {
                        discord_id: req.user.discord_id,
                    },
                    {
                        $set: {
                            "data.spotify": spotifyData,
                        },
                    },
                    { upsert: true }
                );
            } else {
                await db.collection("users").updateOne(
                    {
                        username: req.user.username,
                    },
                    {
                        $set: {
                            "data.spotify": spotifyData,
                        },
                    },
                    { upsert: true }
                );
            }

            res.send({
                status: "success",
                message: "Playlists added successfuly",
            });
        } catch (error) {
            console.log(error);
            res.status(401).send({
                status: "error",
                message:
                    "Failed to fetch spotify playlists. Try again later, contact Oddiz if issue persists.",
            });
        }
    });

    app.post("/playlists/:playlistId", withAuth, async (req, res) => {
        try {
            const playlistId = req.params.playlistId;
            if (!playlistId) {
                console.log("No playlist Id specified");

                return;
            }

            const reqToken = getToken(req);

            if (!reqToken) {
                console.log("No session info in credentials");

                return;
            }
            const session = req.dbSession;

            //find playlists from username
            const user = req.user;

            if (!user.data?.spotify?.auth_token) {
                console.log("No spotify data about user");

                return;
            }

            const botdizCredentials = {
                clientId: process.env.SPOTIFY_CLIENTID,
                clientSecret: process.env.SPOTIFY_CLIENTSECRET,
            };

            const spotifyApi = new spotifyWebApi(botdizCredentials);

            spotifyApi.setAccessToken(user.data.spotify.auth_token);
            spotifyApi.setRefreshToken(user.data.spotify.refresh_token);

            if (user.data.spotify.expires < new Date().getTime()) {
                await spotifyApi.refreshAccessToken().then(
                    (data) => {
                        // Save the access token so that it's used in future calls
                        spotifyApi.setAccessToken(data.body["access_token"]);
                        const expiryTime = data.body["expires_in"] * 1000 + new Date().getTime();
                        if ("discord_session" in session) {
                            db.collection("discord_users").updateOne(
                                {
                                    discord_id: session.discord_id,
                                },
                                {
                                    $set: {
                                        "data.spotify.auth_token": data.body["access_token"],
                                        "data.spotify.expires": expiryTime,
                                    },
                                }
                            );
                        } else {
                            db.collection("users").updateOne(
                                {
                                    username: session.username,
                                },
                                {
                                    $set: {
                                        "data.spotify.auth_token": data.body["access_token"],
                                        "data.spotify.expires": expiryTime,
                                    },
                                }
                            );
                        }
                    },
                    (err) => {
                        console.log("Could not refresh access token", err);
                    }
                );
            }

            const playlist = await spotifyApi.getPlaylist(playlistId);
            const playlistBody = playlist.body;

            res.send(
                JSON.stringify({
                    status: "success",
                    playlistId: playlistId,
                    result: playlistBody.tracks.items,
                })
            );
        } catch (error) {
            console.log("Error while trying to get playlist from id : ", error);
        }
    });
}
