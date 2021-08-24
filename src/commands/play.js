const { auth } = require("google-auth-library")
require("dotenv").config()
const searchYT = require("../scripts/searchYT")
const getInfoFromYoutubeUrl = require("../scripts/getInfoFromYoutubeUrl")
const axios = require('axios');
const { logger } = require('../logger')

const { joinVoiceChannel, AudioPlayerStatus } = require("@discordjs/voice");

module.exports = async function(invokedMessage, options={query: null, forceNext:false}) {
    try {
        let input
        if (options?.query) {
            input = options.query

            if (!input) {

                return null
            }

        } else if(invokedMessage){
            
            input = invokedMessage.options.getString("input")
            
            // if no arguments passed
            if (!input) {
                this.wrongUsage(invokedMessage, this.name, "")
                
                return
            }
        
            const memberVoiceChannel = invokedMessage?.member.voice.channel
            
            if (!memberVoiceChannel) {
                this.reply("You are not in a voice channel.")
                
                return
            }
        
        
            this.controller.MusicController.command = this
        
            const botVoiceChannel = invokedMessage?.guild.me.voice.channel
            //discord.js/voice VoiceConnection object
            //https://discordjs.github.io/voice/classes/voiceconnection.html
            const botVoiceConnection = this.controller.MusicController.voiceConnection
        
            // console.log({
            //     memberVoiceChannel: memberVoiceChannel,
            //     botVoiceChannel: botVoiceChannel,
            //     botVoiceConnection: botVoiceConnection,
            //     audioPlayerStatus: this.controller.MusicController.audioPlayerStatus
            // })
        
            /**
             * if member vc = undefined  ✅
             *      -> "you are not in vc", return
             * 
             * if bot vc = undefined ✅
             *      -> join member vc
             * 
             * 
             * if member vc = bot vc ✅
             *      -> continue 
             * 
             * if member vc != bot vc: ✅
             *      if bot is playing: ✅
             *          -> bot is already playing, return
             *      if bot is idle: ✅
             *          -> join member voice channel
             *          -> set musiccontroller voicechannel to new         
             *          -> continue
             */         
            
            if (!botVoiceChannel) {
                logger.log("info", "Bot is not in a voice channel, joining now.")
                
                let voiceConnection = await joinVoiceChannel({ 
                    channelId: memberVoiceChannel.id,
                    guildId: memberVoiceChannel.guild.id,
                    adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                    selfMute: false,
                    selfDeaf: false
                })
        
                this.controller.MusicController.setVoiceConnection(voiceConnection)
        
            } else {
                //bot is in a voice channel
        
                if (memberVoiceChannel.id !== botVoiceChannel.id) {
                    logger.log("info", "Bot is in a voice channel but not in same member's")
                    if (this.controller.MusicController.audioPlayerStatus == AudioPlayerStatus.Playing) {
                        logger.log("info", "Bot is already playing. Won't switch to new channel")
        
                        this.reply("Bot is already playing in another channel ❗")
        
                        return
                    } else if (this.controller.MusicController.audioPlayerStatus == AudioPlayerStatus.Idle || !this.controller.MusicController.audioPlayerStatus) {
                        logger.log("info", "Bot is not playing. Switching to new channel.")
                        
                        let voiceConnection = await joinVoiceChannel({ 
                            channelId: memberVoiceChannel.id,
                            guildId: memberVoiceChannel.guild.id,
                            adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                            selfMute: false,
                            selfDeaf: false
                        })
                
                        this.controller.MusicController.setVoiceConnection(voiceConnection)
                    }
        
                } else if (!this.controller.MusicController.voiceConnection) {
                    //bot is in same voice channel but it doesn't have a voice connection
        
                    let voiceConnection = await joinVoiceChannel({ 
                        channelId: memberVoiceChannel.id,
                        guildId: memberVoiceChannel.guild.id,
                        adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                        selfMute: false,
                        selfDeaf: false
                    })
        
                    this.controller.MusicController.setVoiceConnection(voiceConnection)
                }
            }
        } else {
            throw "No arguments provided"
        }
    
        if(this.controller.MusicController.queueLock) {
            this.reply("Already processing queue try again in moment.")
            
            return
        }
        this.controller.MusicController.queueLock = true
        
        let videoUrl, searchMode
        const self = this;
        searchMode = true
        try {
            //link is passed
            videoUrl = new URL(input)
            searchMode = false
            isYoutubePlaylist = (videoUrl.href.includes("list") || videoUrl.href.includes("playlist")) && !videoUrl.href.includes("&index") && videoUrl.href.includes("youtube")
    
        } catch (error) {
            //no link passed

        }
        
        if (searchMode) {
            const query = input
            searchYT(query, 1, (result) => {
                                            
                if (result) {
                    //invokedMessage.channel.send("Video found: " + result.videoUrl)
                    getInfoFromYoutubeUrl(result.videoUrl, result2 => {
                        this.controller.MusicController.addToQueue(result2, options)
                        this.reply(`Added \`${result2.videoTitle}\` 👍`)
                        this.controller.MusicController.queueLock = false
                        this.controller.MusicController.processQueue();
                    })
    
                } else {
                    console.error("Error getting YT info from: "+ query)
                    console.error("Error from music COntroller play next()")
                    this.reply("Video not found.")
                    this.controller.MusicController.queueLock = false
                }
            })
    
            return
            
    
        
            /* 
            
            const ytUrlTemplate = "https://www.youtube.com/watch?v="
            const vidUrl = ytUrlTemplate + videoId
            invokedMessage.channel.send("Video found: " + vidUrl)
            */
        
        } else if (isYoutubePlaylist) {
            try {
                const regex = /^.*youtu.be\/|list=([^#\&\?]*).*/;
                const playlistId = videoUrl.href.match(regex)[1];
                const self = this
    
                if (playlistId.startsWith("RD")) {
                    this.reply("`Youtube mixes are not supported yet 😟`")
                    self.controller.MusicController.queueLock = false
                    return
                }
        
                async function getYtPlaylist(){
        
                    let ytpl = require('ytpl');
                    let playlist;
                    try {
                        playlist = await ytpl(playlistId, { limit: 25 });
                    } catch (error) {
                        logger.log("error", "Error trying to get playlist info@play.js/ytpl() " + "Error: " + error)
                        self.controller.MusicController.queueLock = false
                        
                        self.reply("`Error while trying to add playlist... Contact oddiz 😟`")
                        return
                    }
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
                            logger.log("error", "couldn't slice videoURL. (play.js)", videoUrl, i)
                        }
        
                        const package = {
                            videoUrl: videoUrl,
                            videoId: videoId,
                            videoTitle: videoTitle,
                            videoThumbnailUrl:videoThumbnailUrl,
                            videoDuration: videoDuration
                        }
                        
        
                        self.controller.MusicController.addToQueue(package, options)
                        
                    }
                    self.reply("Playlist added 👍")
                    self.controller.MusicController.queueLock = false
                    self.controller.MusicController.processQueue();
                    return 
                }
                await getYtPlaylist()
                
                
                return 
                
            } catch (error) {
                logger.log("error","Error while trying to add youtube playlist :", error)
                this.controller.MusicController.queueLock = false
                return
            }
            
               
        } else {
            //else 
            
            
            //if link is youtube
            if (videoUrl.host.includes("youtube.com") || videoUrl.host.includes("youtu.be")){
                getInfoFromYoutubeUrl(videoUrl.href, result => {
                    this.controller.MusicController.addToQueue(result, options)
                    this.reply(`Added ${result.videoTitle}`)
                    this.controller.MusicController.queueLock = false
                    this.controller.MusicController.processQueue();
                    
                    return
                })
            } else if (videoUrl.host.includes("spotify.com")){
                let spotifyAccessToken = "";
                
                const spotifyUri = require('spotify-uri');
                const parsed = spotifyUri.parse(videoUrl.href)
                const SpotifyWebApi = require('spotify-web-api-node');
                // credentials are optional
                const spotifyApi = new SpotifyWebApi({
                clientId: process.env.SPOTIFY_CLIENTID,
                clientSecret: process.env.SPOTIFY_CLIENTSECRET
                });
    
                
                if (parsed.type === "playlist" || parsed.type === "album"){
                    
                    spotifyApi.clientCredentialsGrant()
                        .then(function(result) {
                            logger.log("info", 'Spotify Api Auth worked!');
                            spotifyAccessToken = result.body.access_token
    
                            spotifyApi.setAccessToken(spotifyAccessToken)
    
                            if (parsed.type === "album") {
                                spotifyApi.getAlbumTracks(parsed.id).then((data)=>{
    
                                    for (const item of data.body.items) {
                                        const videoName = item.name
                                        const videoArtist = item.artists[0].name
                                        const videoTitle = videoArtist + " - " + videoName
                                        const package = {
                                            videoArtist: videoArtist,
                                            videoName: videoName,
                                            videoTitle: videoTitle,
                                            isSpotify: true
                                        }
                                        self.controller.MusicController.addToQueue(package, options)
                                    }
                                    self.reply("\`Album added to queue 👍\`")
                                    self.controller.MusicController.queueLock = false
                                    self.controller.MusicController.processQueue();
                                })
                                .catch(err => {
                                    logger.log("error", "Error while trying to parse spotify album: ", err)
                                    self.controller.MusicController.queueLock = false
                                })
                            } else if (parsed.type === "playlist") {
                                spotifyApi.getPlaylist(parsed.id, { limit: 25} )
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
                                            self.controller.MusicController.addToQueue(package, options)
                                        }
                                        self.reply("Playlist added to queue 👍")
                                        self.controller.MusicController.queueLock = false
                                        self.controller.MusicController.processQueue();
                                    }, function(err) {
                                        logger.log("error", 'Something went wrong when trying to play spotify playlist!', err);
                                        self.controller.MusicController.queueLock = false
                                    });
                            } 
    
                        })
                        .catch(err => {
                            logger.log("error", "Error trying to get info from spotify api@play.js/spotifyApi()", "Error: ", error)
                            
                            self.reply("Error while trying to add playlist... Contact oddiz 😟")
                            self.controller.MusicController.queueLock = false
                            
                            return
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
                                        videoName: songName,
                                        videoArtist: artistName,
                                        videoTitle: artistName + " - " + songName,
                                        isSpotify: isSpotify
                                    }
                                    self.controller.MusicController.addToQueue(package, options)
                                    self.reply(`Added \`${songName}\``)
                                    self.controller.MusicController.queueLock = false
                                    self.controller.MusicController.processQueue();
                                    /*     
                                        //
                                        //    videoId: "123", 
                                        //    videoUrl: "http:...com/..",
                                        //    videoTitle: xxtenacion 
                                        //     
                                    */
                                    
                                }).catch(error => {
                                    logger.log("error", "Error while using spotify AI. Error : " + error)
                                    
                                    self.reply("Error while trying to add song... Contact oddiz 😟")
                                    self.controller.MusicController.queueLock = false
                                    return
                                })
    
                            }, function(err) {
                                logger.log("error", err);
                                self.controller.MusicController.queueLock = false
                                return
                            });
                        }).catch(function(err) {
                            logger.log("error", 'If this is printed, it probably means that you used invalid ' +
                            'clientId and clientSecret values. Please check!');
                            logger.log("error", 'Hint: ');
                            logger.log("error", err);
                            self.controller.MusicController.queueLock = false
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
                
    
            } else {
                this.reply(`\`Couldn't find  ${input}. Only spotify and youtube links supported at the moment.\``)
                this.controller.MusicController.queueLock = false
            }
        }
    } catch (error) {
        logger.log("error", "Error while executing play.js", error)
        this.controller.MusicController.queueLock = false
    }
    



}