const { auth } = require("google-auth-library")
require("dotenv").config()
const searchYT = require("../scripts/searchYT")

module.exports = function(invokedMessage, ...args) {
    
    let videoUrl, searchMode;
    
    try {
        //link is passed
        videoUrl = new URL(arguments[1])
        searchMode = false
        //console.log("link parsed continuing non search mode")

    } catch (error) {
        //no link passed
        //console.log("no link specified, continuing with search")
        searchMode = true
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

    } else {
        const axios = require('axios');
        
        //console.log(videoUrl.hostname);
        //if link is youtube
        if (videoUrl.host.includes("youtube.com")){
            //console.log("video is from youtube")
            
            const href = videoUrl.href
            const oembed = "https://www.youtube.com/oembed?url="
            const oEmbedUrl = oembed+href
            

            axios.get(oEmbedUrl, {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
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
                    videoUrl: href
                }
                this.controller.MusicController.addToQueue(result)
                this.controller.MusicController.run(invokedMessage)
                
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