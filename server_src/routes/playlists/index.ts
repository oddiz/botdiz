import spotifyWebApi from 'spotify-web-api-node'
import fetch from 'node-fetch'
import { Db } from 'mongodb'
import { Express } from 'express'

import dotenv from 'dotenv'
import { BotdizSession } from '@server_src/types'
import { DbDiscordSession, DbDiscordUser, DbSession, DbUser } from '@server_src/db/databaseTypes'
import { logger } from '@src/logger'
import { getToken } from '@server_src/scripts/getToken'
dotenv.config()

const UNAUTH_RESPONSE = {
    status: "failed",
    message: "401 Not authorized",
    isValidated: false
}
export default async function playlists(app: Express,db: Db) {

    //get playlists if it's available from the database
    app.get('/playlists', async (req, res) => {
        try {
            
            const reqToken = getToken(req)
            if(!reqToken) {
                console.log("No session info in credentials")

                res.status(401).send(UNAUTH_RESPONSE)

                return
            }
            //find username from token
            const session = await db.collection('sessions').findOne( { token: reqToken  } )
            if(!session){
                console.log("Session not found")

                res.status(401).send(UNAUTH_RESPONSE)

                return
            }

            let user, dbUserCollectionName
            
            if (session.discord_session) {
                dbUserCollectionName = "discord_users"
                user = await db.collection(dbUserCollectionName).findOne( { discord_id: session.discord_id } ) as DbDiscordUser | null
                
            } else {
                dbUserCollectionName = "users"
                user = await db.collection(dbUserCollectionName).findOne( { username: session.username } ) as DbUser | null
                
            }

            
            if (!user?.data?.spotify?.playlists) {
                res.send({
                    status: "success",
                    savedPlaylists: null,
                })

                return
            }            
            
            res.send({
                savedPlaylists: user.data.spotify.playlists
            })
            
        } catch (error) {
            logger.log("error", "Error while trying to get playlist: " + error)
            res.status(404).send({
                status: "failed",
                message: "Error while trying to get playlist"
            })
        }
    })

    //get spotify auth token of user, get playlists and set them into user database
    app.post('/playlists', async (req, res) => {

        try {
            const reqToken = getToken(req)
            if(!reqToken) {
                console.log("No session info in credentials")

                res.status(401).send(UNAUTH_RESPONSE)

                return
            }
            //find username from token
            const session = await db.collection('sessions').findOne( { token: reqToken  } ) as unknown as DbSession | DbDiscordSession | null

            if(!session){

                res.status(401).send(UNAUTH_RESPONSE)
                
                return
            }

            //find playlists from id
            let user, dbUserCollectionName
            
            if ("discord_session" in session) {
                
                dbUserCollectionName = "discord_users"
                user = await db.collection(dbUserCollectionName).findOne( { discord_id: session.discord_id } ) as DbDiscordUser | null
                
            } else {
                dbUserCollectionName = "users"
                user = await db.collection(dbUserCollectionName).findOne( { username: session.username } ) as DbUser | null
                
            }

            if (!user) {
                res.status(401).send(UNAUTH_RESPONSE)

                return
            }

            //spotify auth
            
            const reqCode = req.body?.code
            const redirect_uri = req.body?.redirect_uri
            if (!(reqCode || redirect_uri)) {

                res.status(401).send(UNAUTH_RESPONSE)

                return
            } 
            const botdizCredentials = {
                clientId: process.env.SPOTIFY_CLIENTID,
                clientSecret: process.env.SPOTIFY_CLIENTSECRET,
                redirectUri: redirect_uri
            }
    
            const spotifyApi = new spotifyWebApi(botdizCredentials)
    
            // Retrieve an access token and a refresh token
            const spotifyAuthData = await spotifyApi.authorizationCodeGrant(reqCode)
            .catch(err => {
                console.log("Error while accessing spotify api: ", err)
                
            })
            
            if (!spotifyAuthData) {
                logger.log("error", "Error while trying to get spotify auth data")
                res.status(403).send({
                    message: "Error while trying to get spotify auth data. "
                })
                
                return
            }
                
            // Set the access token on the API object to use it in later calls
            spotifyApi.setAccessToken(spotifyAuthData.body['access_token']);
            spotifyApi.setRefreshToken(spotifyAuthData.body['refresh_token']);
            // Set auth data on database
            

            async function fetchSpotifyPlaylists(offset: number) {
                if (!spotifyAuthData) throw "No spotify auth data"

                const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50&offset="+offset, {
                    method:"GET",
                    headers: {
                        "Content-Encoding": "null",
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": "Bearer "+spotifyAuthData.body['access_token'],
                    }
                })

                
                
                return response.json()
            } 

            let offset = 0
            const playlistsResponse = await fetchSpotifyPlaylists(offset)
    
            
            while (parseInt(playlistsResponse.total) > offset + 50) {
                offset += 50
                const nextPlaylistsResponse = await fetchSpotifyPlaylists(offset)
                for (const playlist of nextPlaylistsResponse.items) {
                    playlistsResponse.items.push(playlist)
                }
            }
            
            const expiryTime = spotifyAuthData.body['expires_in'] * 1000 + new Date().getTime()
            const spotifyData = {
                auth_token: spotifyAuthData.body['access_token'],
                refresh_token: spotifyAuthData.body['refresh_token'],
                expires: expiryTime,
                playlists: playlistsResponse
            }
            if ("discord_session" in session && "discord_id" in user) {
                
                await db.collection(dbUserCollectionName).updateOne(
                    {
                        discord_id: user.discord_id
                    },
                    {
                        $set: {
                            "data.spotify": spotifyData
                        }
                    },
                    {upsert: true}
                )
                
            } else {
                
                await db.collection(dbUserCollectionName).updateOne(
                    {
                        username: user.username
                    },
                    {
                        $set: {
                            "data.spotify": spotifyData
                        }
                    },
                    {upsert: true}
                )
            }

            res.send({
                status: "success",
                message:"Playlists added successfuly"
            })
        } catch (error) {
            console.log(error)
            res.status(401).send({
                status: "error",
                message:"Failed to fetch spotify playlists. Try again later, contact Oddiz if issue persists."
            })
        }   

        
    })

    app.post('/playlists/:playlistId', async (req, res) => {

        try {
            const playlistId = req.params.playlistId
            if(!playlistId) {
                console.log("No playlist Id specified")
                
                return
            }

            const reqToken = getToken(req)

            if(!reqToken) {
                console.log("No session info in credentials")

                return
            }
            const session = await db.collection('sessions').findOne( { token: reqToken  } )

            if(!session){
                console.log("Session not found")
                return
            }

            //find playlists from username
            let user;
            if (session.discord_session) {
                user = await db.collection('discord_users').findOne( { discord_id: session.discord_id }) as DbDiscordUser | null
            } else {
                user = await db.collection('users').findOne( { username: session.username } ) as DbUser | null
            }

            if (!user) {
                res.status(401).send(UNAUTH_RESPONSE)

                return
            }
            
            if (!user.data?.spotify?.auth_token) {
                console.log("No spotify data about user")

                return
            }

            const botdizCredentials = {
                clientId: process.env.SPOTIFY_CLIENTID,
                clientSecret: process.env.SPOTIFY_CLIENTSECRET,
            }
    
            const spotifyApi = new spotifyWebApi(botdizCredentials)

            
            spotifyApi.setAccessToken(user.data.spotify.auth_token);
            spotifyApi.setRefreshToken(user.data.spotify.refresh_token);

            if (user.data.spotify.expires < new Date().getTime()) {
                await spotifyApi.refreshAccessToken().then(
                    function(data) {
                        
                        // Save the access token so that it's used in future calls
                        spotifyApi.setAccessToken(data.body['access_token']);
                        const expiryTime = data.body['expires_in'] * 1000 + new Date().getTime()
                        if (session.discord_session) {
                            db.collection('discord_users').updateOne(
                                { 
                                    discord_id: session.discord_id 
                                },
                                {
                                    $set: {
                                        "data.spotify.auth_token": data.body['access_token'],
                                        "data.spotify.expires": expiryTime
                                    }
                                }
                            )

                        } else {
                            db.collection('users').updateOne(
                                { 
                                    username: session.username 
                                },
                                {
                                    $set: {
                                        "data.spotify.auth_token": data.body['access_token'],
                                        "data.spotify.expires": expiryTime
                                    }
                                }
                            )
                        }
                    },
                    function(err) {
                      console.log('Could not refresh access token', err);
                    }
                );
            }

            const playlist = await spotifyApi.getPlaylist(playlistId)
            const playlistBody = playlist.body

            res.send(JSON.stringify({
                status: "success",
                playlistId: playlistId,
                result: playlistBody.tracks.items
            }))

        } catch (error) {
            console.log("Error while trying to get playlist from id : ", error)
        }

    })
}