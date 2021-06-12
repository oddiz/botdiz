const { auth } = require("google-auth-library")
require("dotenv").config()
const searchYT = require("../scripts/searchYT")
console.log(searchYT)
module.exports = function(invokedMessage, ...args) {
    
    let videoUrl, searchMode;
    
    try {
        //link is passed
        videoUrl = new URL(arguments[1])
        searchMode = false
        console.log("link parsed continuing non search mode")

    } catch (error) {
        //no link passed
        console.log("no link specified, continuing with search")
        searchMode = true
    }

    if (searchMode) {
        const query = args.join(" ")
        console.log("query is: " , query)

        searchYT(query, 1, result => {
            if (result) {
                /* 
                {
                    videoIds: ["123", "234", ..], 
                    videoUrls: ["http:...com/..", "http:...."] 
                }        
                */
                console.log(result)
                invokedMessage.channel.send("Video found: " + result.videoUrls[0])
                this.controller.MusicController.addToQueue(result.videoUrls)
                this.controller.MusicController.play(invokedMessage)
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
        console.log(videoUrl.hostname)
        //if link is youtube
        if (videoUrl.host.includes("youtube.com")){
            console.log("video is from youtube")
            
        }
    
        if (videoUrl.host.includes("spotify.com")){
            console.log("video is from spotify")
            
        }
    }
    



}