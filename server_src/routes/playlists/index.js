const spotifyWebApi = require('spotify-web-api-node')
const fetch = require('node-fetch')

require('dotenv').config()
module.exports = async function playlists(app,db) {

    //get playlists if it's available from the database
    app.get('/playlists', async (req, res) => {
        try {
            const reqToken = req.session.token
            if(!reqToken) {
                console.log("No session info in credentials")

                return
            }
            //find username from token
            const session = await db.collection('sessions').findOne( { token: reqToken  } )
            if(!session){
                console.log("Session not found")
                return
            }
            const reqUsername = session.username 
            
            //find user from username
            const user = await db.collection('users').findOne( { username: reqUsername } )
            
            
            res.send({
                savedPlaylists: user.data.spotify.playlists
            })
            
        } catch (error) {
            console.log("Error while trying to get playlist")
            res.status(404).send({
                message: "Couldn't find playlists"
            })
        }
    })

    //get spotify auth token of user, get playlists and set them into user database
    app.post('/playlists', async (req, res) => {

        try {
            
            const reqToken = req.session.token
            if(!reqToken) {
                console.log("No session info in credentials")

                return
            }
            //find username from token
            const session = await db.collection('sessions').findOne( { token: reqToken  } )
            if(!session){
                console.log("Session not found")
                return
            }

            const reqUsername = session.username 
            //find playlists from username
            const user = await db.collection('users').findOne( { username: reqUsername } )
    
            //spotify auth
            
            const reqCode = req.body?.code
            const redirect_uri = req.body?.redirect_uri
            if (!(reqCode || redirect_uri)) {
                res.status(401).send({
                    status: "error",
                    message: "Try again later, contact Oddiz if issue persists."
                })
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
                console.log("Error while accessing spotify api: ")

                

                return
            })
            
            // Set the access token on the API object to use it in later calls
            spotifyApi.setAccessToken(spotifyAuthData.body['access_token']);
            spotifyApi.setRefreshToken(spotifyAuthData.body['refresh_token']);
            // Set auth data on database
            

            async function fetchSpotifyPlaylists(offset) {
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
            
            const expiryTime = parseInt(spotifyAuthData.body['expires_in']) * 1000 + new Date().getTime()
            const spotifyData = {
                auth_token: spotifyAuthData.body['access_token'],
                refresh_token: spotifyAuthData.body['refresh_token'],
                expires: expiryTime,
                playlists: playlistsResponse
            }
    
            await db.collection('users').updateOne(
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
            console.log("playlist id: "+ playlistId)
            if(!playlistId) {
                console.log("No playlist Id specified")
                
                return
            }
            //find username from token
            const reqToken = req.session?.token

            if(!reqToken) {
                console.log("No session info in credentials")

                return
            }
            const session = await db.collection('sessions').findOne( { token: reqToken  } )

            if(!session){
                console.log("Session not found")
                return
            }

            const reqUsername = session.username 
            //find playlists from username
            const user = await db.collection('users').findOne( { username: reqUsername } )
            
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
                        console.log('The access token has been refreshed!');
                        
                        console.log(data.body['access_token'])
                        console.log(data.body['expires_in'])
                        // Save the access token so that it's used in future calls
                        spotifyApi.setAccessToken(data.body['access_token']);
                        const expiryTime = parseInt(data.body['expires_in']) * 1000 + new Date().getTime()
                        db.collection('users').updateOne(
                            { 
                                username: reqUsername 
                            },
                            {
                                $set: {
                                    "data.spotify.auth_token": data.body['access_token'],
                                    "data.spotify.expires": expiryTime
                                }
                            }
                        )
                    },
                    function(err) {
                      console.log('Could not refresh access token', err);
                    }
                );
            }

            let playlist = await spotifyApi.getPlaylist(playlistId)
            playlist = playlist.body

            res.send(JSON.stringify({
                status: "success",
                playlistId: playlistId,
                result: playlist.tracks.items
            }))

        } catch (error) {
            console.log("Error while trying to get playlist from id : ", error)
        }

    })
}