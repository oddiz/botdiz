const { auth } = require("google-auth-library")
require("dotenv").config()
const searchYT = require("../scripts/searchYT")
const getInfoFromYoutubeUrl = require("../scripts/getInfoFromYoutubeUrl")
const axios = require('axios');
const { logger } = require("../MessageHandler");

module.exports = function(invokedMessage, ...args) {
    
    let videoUrl, searchMode, isSpotifyPlaylist;
    const self = this;
    searchMode = true
    try {
        //link is passed
        videoUrl = new URL(arguments[1])
        searchMode = false
        isYoutubePlaylist = videoUrl.href.includes("&list")

    } catch (error) {
        //no link passed
    }
    
    if (!invokedMessage.member.voice.channel) {
        invokedMessage.reply("You are not in a voice channel.")

        return
    }

    

    if (searchMode) {
        const query = args.join(" ")
        searchYT(query, 1, (result) => {
                                        
            if (result) {
                //invokedMessage.channel.send("Video found: " + result.videoUrl)
                getInfoFromYoutubeUrl(result.videoUrl, result2 => {
                    self.controller.MusicController.addToQueue(result2)
                    self.controller.MusicController.run(invokedMessage)
                })

            } else {
                console.error("Error getting YT info from: "+ query)
                console.error("Error from music COntroller play next()")
                invokedMessage.channel.send("Video not found.")
            }
        })

        return
        

    
        /* 
        
        const ytUrlTemplate = "https://www.youtube.com/watch?v="
        const vidUrl = ytUrlTemplate + videoId
        invokedMessage.channel.send("Video found: " + vidUrl)
        */
    
    } else if (isYoutubePlaylist) {
        const regex = /&list=(.*)$/;
        const playlistId = videoUrl.href.match(regex)[1];
        
        (async function(){

            let ytpl = require('ytpl');
    
            const playlist = await ytpl(playlistId, { limit: 25 });
            /*Array of
            {
                title: 'More Plastic x hayve - Feel Alive [NCS Release]',
                index: 17,
                id: 'VVEssTuPj6g',
                shortUrl: 'https://www.youtube.com/watch?v=VVEssTuPj6g',
                url: 'https://www.youtube.com/watch?v=VVEssTuPj6g&list=UU_aEa8K-EOJ3D6gOs7HcyNg&index=17',
                author: {
                url: 'https://www.youtube.com/c/NoCopyrightSounds',
                channelID: 'UC_aEa8K-EOJ3D6gOs7HcyNg',
                name: 'NoCopyrightSounds'
                },
                thumbnails: [ [Object], [Object], [Object], [Object] ],
                bestThumbnail: {
                url: 'https://i.ytimg.com/vi/VVEssTuPj6g/hqdefault.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLBG3R79uYwsecyf3PlBE_jT4FrqEg',
                width: 336,
                height: 188
                },
                isLive: false,
                duration: '3:02',
                durationSec: 182,
                isPlayable: true
            }
            */
            for (const item of playlist.items) {
                const videoTitle = item.title
                const videoUrl = item.url
                const videoId = item.id
                const videoThumbnailUrl = item.bestThumbnail.url
                const videoDuration = item.durationSec
                const package = {
                    videoUrl: videoUrl,
                    videoId: videoId,
                    videoTitle: videoTitle,
                    videoThumbnailUrl:videoThumbnailUrl,
                    videoDuration: videoDuration
                }

                self.controller.MusicController.addToQueue(package)
                
            }
            invokedMessage.channel.send("Playlist added to queue.")
            self.controller.MusicController.run(invokedMessage)

        })()
        
           
    } else {
        //else 
        
        
        //console.log(videoUrl.hostname);
        //if link is youtube
        if (videoUrl.host.includes("youtube.com")){
            //console.log("video is from youtube")
            getInfoFromYoutubeUrl(videoUrl.href, result => {
                self.controller.MusicController.addToQueue(result)
                self.controller.MusicController.run(invokedMessage)

            })
                
            
        }
    
        if (videoUrl.host.includes("spotify.com")){
            let spotifyAccessToken = "";
            
            //console.log("video is from spotify")
            
            const spotifyUri = require('spotify-uri');
            const parsed = spotifyUri.parse(videoUrl.href)
            const SpotifyWebApi = require('spotify-web-api-node');

            // credentials are optional
            const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENTID,
            clientSecret: process.env.SPOTIFY_CLIENTSECRET
            });

            if (parsed.type === "playlist"){
                //console.log("link is a playlist from spotify")
                //parseplaylist
                const playlistId = parsed.id;

                spotifyApi.clientCredentialsGrant()
                    .then(function(result) {
                        logger.log("info", 'Spotify Api Auth worked! Your access token is: ' + result.body.access_token);
                        spotifyAccessToken = result.body.access_token

                        spotifyApi.setAccessToken(spotifyAccessToken)
                        spotifyApi.getPlaylist(playlistId, { limit: 25} )
                            .then(function(data) {
                                //console.log('Some information about this playlist', data.body.tracks.items[0]);
                                for (const item of data.body.tracks.items){
                                    const videoName = item.track.name;
                                    const videoArtist = item.track.artists[0].name
                                    const videoTitle = videoArtist + " - " + videoName
                                    const package = {
                                        videoArtist: videoArtist,
                                        videoName: videoName,
                                        videoTitle: videoTitle,
                                        isSpotify: true
                                    }
                                    self.controller.MusicController.addToQueue(package)
                                    
                                    
                                }
                                self.controller.MusicController.run(invokedMessage)
                                    
                            }, function(err) {
                                logger.log("error", 'Something went wrong!', err);
                            });
                    })

            } else if (parsed.type === "track"){
                console.log("link is a track from spotify")
                const trackId = parsed.id;
    
                spotifyApi.clientCredentialsGrant()
                    .then(function(result) {
                        logger.log("info", 'Spotify Api Auth worked! Your access token is: ' + result.body.access_token);
                        spotifyAccessToken = result.body.access_token
                        spotifyApi.setAccessToken(spotifyAccessToken)
                        
                        spotifyApi.getAudioFeaturesForTrack(trackId)
                        .then(function(data) {
    
                            const spotifyApiTrackUrl= "https://api.spotify.com/v1/tracks/"
                            const songId = trackId
                            const searchApiUrl = spotifyApiTrackUrl + songId;
                            //console.log(searchApiUrl)
                            axios.get(searchApiUrl, {
                                headers:{
                                    "Accept": "application/json",
                                    "Content-Type": "application/json",
                                    "Authorization": "Bearer "+spotifyAccessToken
                                }
                            }).then(result => {
                                const artistName = result.data.artists[0].name
                                //console.log("artist name:", artistName)
                                const songName = result.data.name
                                //console.log("songName: ", songName )
                                const isSpotify = true
                                
                                const package = {
                                    videoArtist: artistName,
                                    videoTitle: songName,
                                    isSpotify: isSpotify
                                }
                                self.controller.MusicController.addToQueue(package)
                                self.controller.MusicController.run(invokedMessage)
                                /*
                                searchYT(query, 1, (result) => {
                                     
                                    //{
                                    //    videoId: "123", 
                                    //    videoUrl: "http:...com/..",
                                    //    videoTitle: xxtenacion 
                                    //}        
                                    
                                   if (result) {
                                       //invokedMessage.channel.send("Video found: " + result.videoUrl)
                                       getInfoFromYoutubeUrl(result.videoUrl, result => {
                                           self.controller.MusicController.addToQueue(result)
                                           self.controller.MusicController.run(invokedMessage)
                                        })
                                    } else {
                                        invokedMessage.channel.send("Video not found with query: "+ query)
                                    }
                                })
                                */
                                
                            }).catch(error => {
                                console.error("Error while using spotify AI. Error : " + error)
                            })

                        }, function(err) {
                            logger.log("error", err);
                            return
                        });
                    }).catch(function(err) {
                        logger.log("error", 'If this is printed, it probably means that you used invalid ' +
                        'clientId and clientSecret values. Please check!');
                        logger.log("error", 'Hint: ');
                        logger.log("error", err);
                    });
            }
                /* 
*/
            //console.log(parsed)
            /*
            Track {
                uri: 'https://open.spotify.com/track/73EByXGIiEe7e3SRNLcipP?si=86e056768b8a4fdd',
                type: 'track',
                id: '73EByXGIiEe7e3SRNLcipP'
            } 
            */
            

        }
    }
    



}