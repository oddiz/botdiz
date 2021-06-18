const { auth } = require("google-auth-library")
require("dotenv").config()
const searchYT = require("../scripts/searchYT")
const getInfoFromYoutubeUrl = require("../scripts/getInfoFromYoutubeUrl")
const axios = require('axios');
const { logger } = require("../MessageHandler");
const MusicController = require("../MusicController");
const { joinVoiceChannel } = require("@discordjs/voice");

module.exports = async function(invokedMessage, ...args) {

    // if no arguments passed
    if (arguments[1] === "") {
        this.wrongUsage(invokedMessage, this.name, "")
        
        return
    }

    const voiceChannel = invokedMessage.member.voice.channel
    
    if (!voiceChannel) {
        this.reply("You are not in a voice channel.")
        return
    }
    //if no music controller active
    if (!this.controller.MusicController) {
        console.log("CREATING MUSIC CONTROLLER")
        this.controller.MusicController = new MusicController(this.controller, this, joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: false
        }))

        //this.controller.MusicController.on("error", console.warn)
    }

    let videoUrl, searchMode
    const self = this;
    searchMode = true
    try {
        //link is passed
        videoUrl = new URL(arguments[1])
        searchMode = false
        isYoutubePlaylist = (videoUrl.href.includes("list") || videoUrl.href.includes("playlist")) && !videoUrl.href.includes("&index")

    } catch (error) {
        //no link passed
    }
    


    

    if (searchMode) {
        const query = args.join(" ")
        searchYT(query, 1, (result) => {
                                        
            if (result) {
                //invokedMessage.channel.send("Video found: " + result.videoUrl)
                getInfoFromYoutubeUrl(result.videoUrl, result2 => {
                    this.controller.MusicController.addToQueue(result2, invokedMessage)
                    this.controller.MusicController.processQueue(invokedMessage);
                })

            } else {
                console.error("Error getting YT info from: "+ query)
                console.error("Error from music COntroller play next()")
                this.reply("Video not found.")
            }
        })

        return
        

    
        /* 
        
        const ytUrlTemplate = "https://www.youtube.com/watch?v="
        const vidUrl = ytUrlTemplate + videoId
        invokedMessage.channel.send("Video found: " + vidUrl)
        */
    
    } else if (isYoutubePlaylist) {
        const regex = /^.*youtu.be\/|list=([^#\&\?]*).*/;
        const playlistId = videoUrl.href.match(regex)[1];
        const self = this

        async function getYtPlaylist(){

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
                const videoId = item.id
                const videoThumbnailUrl = item.bestThumbnail.url
                const videoDuration = item.durationSec
                let videoUrl = item.url
                try {
                    const i = videoUrl.search("&list")
                    videoUrl = videoUrl.slice(0, i)
                } catch (error) {
                    console.log("couldn't slice videoURL. (play.js)", videoUrl, i)
                }

                const package = {
                    videoUrl: videoUrl,
                    videoId: videoId,
                    videoTitle: videoTitle,
                    videoThumbnailUrl:videoThumbnailUrl,
                    videoDuration: videoDuration
                }
                

                self.controller.MusicController.addToQueue(package, invokedMessage)
                
            }
            self.reply("Playlist added to queue.")
            self.controller.MusicController.processQueue(invokedMessage);
            return true
        }
        await getYtPlaylist()

        return true
        
           
    } else {
        //else 
        
        
        //if link is youtube
        if (videoUrl.host.includes("youtube.com")){
            getInfoFromYoutubeUrl(videoUrl.href, result => {
                this.controller.MusicController.addToQueue(result, invokedMessage)
                this.controller.MusicController.processQueue(invokedMessage);
                
                return
            })
        }
    
        if (videoUrl.host.includes("spotify.com")){
            let spotifyAccessToken = "";
            
            
            const spotifyUri = require('spotify-uri');
            const parsed = spotifyUri.parse(videoUrl.href)
            const SpotifyWebApi = require('spotify-web-api-node');

            // credentials are optional
            const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENTID,
            clientSecret: process.env.SPOTIFY_CLIENTSECRET
            });

            if (parsed.type === "playlist"){
                //parseplaylist
                const playlistId = parsed.id;

                spotifyApi.clientCredentialsGrant()
                    .then(function(result) {
                        logger.log("info", 'Spotify Api Auth worked! Your access token is: ' + result.body.access_token);
                        spotifyAccessToken = result.body.access_token

                        spotifyApi.setAccessToken(spotifyAccessToken)
                        spotifyApi.getPlaylist(playlistId, { limit: 25} )
                            .then(function(data) {

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
                                    this.controller.MusicController.addToQueue(package, invokedMessage)
                                }
                                this.reply("Playlist added to queue.")
                                this.controller.MusicController.processQueue(invokedMessage);
                            }, function(err) {
                                logger.log("error", 'Something went wrong!', err);
                            });
                    })

            } else if (parsed.type === "track"){
                
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
                                this.controller.MusicController.addToQueue(package, invokedMessage)
                                this.controller.MusicController.processQueue(invokedMessage);
                                /*     
                                    //
                                    //    videoId: "123", 
                                    //    videoUrl: "http:...com/..",
                                    //    videoTitle: xxtenacion 
                                    //     
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