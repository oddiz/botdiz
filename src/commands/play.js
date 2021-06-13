const { auth } = require("google-auth-library")
require("dotenv").config()
const searchYT = require("../scripts/searchYT")
const axios = require('axios');
const { logger } = require("../MessageHandler");

module.exports = function(invokedMessage, ...args) {
    
    let videoUrl, searchMode;
    
    try {
        //link is passed
        videoUrl = new URL(arguments[1])
        searchMode = false
        isYoutubePlaylist = videoUrl.href.includes("&list")
        //console.log("link parsed continuing non search mode")

    } catch (error) {
        //no link passed
        //console.log("no link specified, continuing with search")
        searchMode = true
    }

    if (!invokedMessage.member.voice.channel) {
        invokedMessage.reply("You are not in a voice channel.")

        return
    }

    

    if (searchMode) {
        const query = args.join(" ")
        //console.log("query is: " , query)

        searchYT(query, 1, result => {
            if (result) {
                /* 
                result = {
                    videoId: "123", 
                    videoUrl: "http:...com/..",
                    videoTitle: xxtenacion 
                }        
                */
                invokedMessage.channel.send("Video found: " + result.videoUrl)
                this.controller.MusicController.addToQueue(result)
                this.controller.MusicController.run(invokedMessage)
            } else {
                invokedMessage.channel.send("Video not found.")
            }
        });

    
        /* 
        
        const ytUrlTemplate = "https://www.youtube.com/watch?v="
        const vidUrl = ytUrlTemplate + videoId
        invokedMessage.channel.send("Video found: " + vidUrl)
        */

    } else if (isYoutubePlaylist) {
        const regex = /&list=(.*)$/;
        const playlistId = videoUrl.href.match(regex)[1];
        //console.log(playlistId);
        const self = this;
        (async function(){

            let ytpl = require('ytpl');
    
            const playlist = await ytpl(playlistId, { limit: 25 });
            //console.log(playlist.items);
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
        
        
        //console.log(videoUrl.hostname);
        //if link is youtube
        if (videoUrl.host.includes("youtube.com")){
            //console.log("video is from youtube")
            const regex = /\?v=(.*)&|\?v=(.*)$/
            const href = videoUrl.href
            const videoId = href.match(regex)[1] || href.match(regex)[2];
            console.log(videoId,"VIDEO ID")
            const yt = require('youtube.get-video-info')
            //\?v=(.*)&|\?v=(.*)$
            let videoDuration = 0;
            yt.retrieve(videoId, (err, res) => {
                if (err) throw err;

                try {
                    const playerRegex = /"approxDurationMs":"(\d*)"/
                    console.log(res.player_response)
                    videoDuration = res.player_response.match(playerRegex)[1] / 1000    
                } catch (error) {
                    logger.log("error", "Regex approxDuration failed.")
                }

                try {
                    
                } catch (error){

                }
                
                const oembed = "https://www.youtube.com/oembed?url="
                const oEmbedUrl = oembed+href
                
                axios.get(oEmbedUrl, {
                    headers: {
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*\/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Connection": "keep-alive",
                        "Alt-Used": "www.youtube.com",
                        "Host": "www.youtube.com",
                        "DNT": 1,
                        "Upgrade-Insecure-Requests": 1,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
                    }
                }).then(response => {
                    
                    
                    const title = response.data.title
                    const result = {
                        videoTitle: title,
                        videoUrl: href,
                        videoDuration: videoDuration,
                        videoThumbnailUrl: response.data.thumbnail_url
                    }
                    this.controller.MusicController.addToQueue(result)
                    this.controller.MusicController.run(invokedMessage)
                    
                })
                
            }).catch( err => {
                console.log("Error while tryting to get video info.")
            })
                
            
        }
    
        if (videoUrl.host.includes("spotify.com")){
            console.log("video is from spotify")
            
            const spotifyUri = require('spotify-uri');
            const parsed = spotifyUri.parse(videoUrl.href)

            //console.log(parsed)
            /*
            Track {
                uri: 'https://open.spotify.com/track/73EByXGIiEe7e3SRNLcipP?si=86e056768b8a4fdd',
                type: 'track',
                id: '73EByXGIiEe7e3SRNLcipP'
            } 
            */
            const spotifyApiTrackUrl= "https://api.spotify.com/v1/tracks/"
            const songId = parsed.id
            const searchApiUrl = spotifyApiTrackUrl + songId;
            //console.log(searchApiUrl)
            axios.get(searchApiUrl, {
                headers:{
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer "+process.env.SPOTIFY_TOKEN
                }
            }).then(result => {
                const artistName = result.data.artists[0].name
                //console.log("artist name:", artistName)
                const songName = result.data.name
                //console.log("songName: ", songName )
                
                const query  = songName + " " + artistName
                const searchYT = require('../scripts/searchYT')

                searchYT(query, 1, (result) => {
                /* 
                {
                    videoId: "123", 
                    videoUrl: "http:...com/..",
                    videoTitle: xxtenacion 
                }        
                */
                    if (result) {
                        invokedMessage.channel.send("Video found: " + result.videoUrl)

                    } else {
                        invokedMessage.channel.send("Video not found with query: "+ query)
                    }
                })
                
            }).catch(error => {
                //console.log("Error while using spotify AI. Error : " + error)
            })

        }
    }
    



}