require("dotenv").config()
const axios = require('axios');
const { logger } = require('../logger')


module.exports = async function(invokedMessage, options={query: null, forceNext:false}) {
    
    try {
        const node = this.controller.MusicController.shoukaku.getNode() 
        
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
                
                // let voiceConnection = await joinVoiceChannel({ 
                //     channelId: memberVoiceChannel.id,
                //     guildId: memberVoiceChannel.guild.id,
                //     adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                //     selfMute: false,
                //     selfDeaf: false
                // })
        
                this.controller.MusicController.setVoiceConnection(memberVoiceChannel)
        
            } else {
                //bot is in a voice channel
        
                if (memberVoiceChannel.id !== botVoiceChannel.id) {
                    logger.log("info", "Bot is in a voice channel but not in same member's")
                    if (this.controller.MusicController.audioPlayer?.playing) {
                        logger.log("info", "Bot is already playing. Won't switch to new channel")
        
                        this.reply("Bot is already playing in another channel ❗")
        
                        return
                    } else if (!this.controller.MusicController.audioPlayer?.playing) {
                        logger.log("info", "Bot is not playing. Switching to new channel.")
                        
                        // let voiceConnection = await joinVoiceChannel({ 
                        //     channelId: memberVoiceChannel.id,
                        //     guildId: memberVoiceChannel.guild.id,
                        //     adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                        //     selfMute: false,
                        //     selfDeaf: false
                        // })
                
                        this.controller.MusicController.setVoiceConnection(memberVoiceChannel)
                    }
        
                } else if (!this.controller.MusicController.activeVoiceChannel) {
                    //bot is in same voice channel but it doesn't have a voice connection
                    
                    //shouldn't happen with the new lavalink system

                    // let voiceConnection = await joinVoiceChannel({ 
                    //     channelId: memberVoiceChannel.id,
                    //     guildId: memberVoiceChannel.guild.id,
                    //     adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                    //     selfMute: false,
                    //     selfDeaf: false
                    // })
        
                    this.controller.MusicController.setVoiceConnection(memberVoiceChannel)
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

        if (input.includes("/play ")) {
            try {
                //idiot proofing
                input = input.replace("/play ", "").trim()
                
            } catch (error) {
                
            }

        }
        try {
            //link is passed
            videoUrl = new URL(input)
            searchMode = false
            
    
        } catch (error) {
            //no link passed

        }
        
        if (searchMode) {
            const query = input
            const searchResult = await node.rest.resolve(query, 'youtube')

            if (!searchResult?.tracks.length) {
                this.controller.MusicController.queueLock = false

                return this.reply("`I couldn't find any tracks with query provided!`")
            }

            const track = searchResult.tracks.shift()
            this.reply(`\`Added ${track.info.title} to queue!\``)
            this.controller.MusicController.addToQueue(track, options)
            
            this.controller.MusicController.processQueue();

            

            return

               
        } else {
            //if URL is provided 
            
            const result = await node.rest.resolve(videoUrl.href) 
            if (!result) {
                this.controller.MusicController.queueLock = false

                if (videoUrl.host.includes("spotify.com")){
                    try {
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
                                            
                                            console.log(data.body.items)
                                            if (data.body.items.length > 0){

                                                for (const item of data.body.items) {
                                                    const videoName = item.name
                                                    const videoArtist = item.artists[0].name
                                                    const videoTitle = videoArtist + " - " + videoName
                                                    const package = {
                                                        info:{
                                                            artist: videoArtist,
                                                            trackName: videoName,
                                                            title: videoTitle,
                                                        },
                                                        isSpotify: true
                                                }
                                                self.controller.MusicController.addToQueue(package, options)
                                                }
                                                self.reply("\`Album added to queue 👍\`")
                                                self.controller.MusicController.queueLock = false
                                                self.controller.MusicController.processQueue();
                                                
                                                return
                                            } else {
                                                self.controller.MusicController.queueLock = false

                                                self.reply("`Error while trying to add spotify album... Check spotify link again, if issue persists contact oddiz 😟`")

                                                return

                                            }
                                        })
                                        .catch(err => {
                                            logger.log("error", "Error while trying to parse spotify album: ", err)
                                            self.controller.MusicController.queueLock = false

                                            self.reply("`Error while trying to add spotify album... Check spotify link again, if issue persists contact oddiz 😟`")

                                            return
                                        })
                                    } else if (parsed.type === "playlist") {
                                        spotifyApi.getPlaylist(parsed.id, { limit: 25} )
                                            .then(function(data) {
                
                                                for (const item of data.body.tracks.items){
                                                    const videoName = item.track.name;
                                                    const videoArtist = item.track.artists[0].name
                                                    const videoTitle = videoArtist + " - " + videoName
                                                    const package = {
                                                        info: {
                                                            artist: videoArtist,
                                                            trackName: videoName,
                                                            title: videoTitle,
                                                        },
                                                        isSpotify: true
                                                    }
                                                    self.controller.MusicController.addToQueue(package, options)
                                                }
                                                self.reply("Playlist added to queue 👍")
                                                self.controller.MusicController.queueLock = false
                                                self.controller.MusicController.processQueue();

                                                return
                                            })
                                            .catch(function(err) {
                                                logger.log("error", 'Something went wrong when trying to play spotify playlist!', err);
                                                self.controller.MusicController.queueLock = false

                                                self.reply("`Error while trying to add spotify playlist... Check spotify link again, if issue persists contact oddiz 😟`")

                                                return

                                            })
                                    } 
            
                                })
                                .catch(err => {
                                    logger.log("error", "Error trying to get info from spotify api@play.js/spotifyApi()", "Error: ", error)
                                    
                                    self.reply("`Error while trying to add playlist... Contact oddiz 😟`")
                                    self.controller.MusicController.queueLock = false
                                    
                                    return
                                })
            
                        } else if (parsed.type === "track"){
                            
                            const trackId = parsed.id;
                
                            await spotifyApi.clientCredentialsGrant()
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
                                                info: {
                                                    trackname: songName,
                                                    artist: artistName,
                                                    title: artistName + " - " + songName,
                                                },
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
                                           return
                                            
                                        }).catch(error => {
                                            logger.log("error", "Error while using spotify AI. Error : " + error)
                                            
                                            self.reply("`Error while trying to add song... Check spotify link again, if issue persists contact oddiz 😟`")
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
    
                            return
                        }
                        
                    } catch (error) {
                        console.log("Error while trying to play spotify link: ", error)
                    }
                } else {
                    return this.reply("`I couldn't find any tracks with query provided!`")
                }


                

            } else {

                try {
                    const { type, tracks, playlistName } = result;
                    const isPlaylist = type === 'PLAYLIST'
        
                    if (isPlaylist) {
                        for (const track of tracks) {
                            this.controller.MusicController.addToQueue(track, options)
                        }
                        this.reply("`Playlist added to queue 👍`")
                    } else {
                        const track = tracks.shift()
                        this.controller.MusicController.addToQueue(track)
                        
                        this.reply(`\`${track.info.title} added to queue 👍\``)
                    }
                    this.controller.MusicController.processQueue()
                    return
                    
                } catch (error) {
                    console.log("Error while trying to parse result from URL: ", error)
                }

            }
            



        }
    } catch (error) {
        logger.log("error", "Error while executing play.js", error)
        this.controller.MusicController.queueLock = false
    }
    



}