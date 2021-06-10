const { auth } = require("google-auth-library")
require("dotenv").config()

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
        const { google } = require("googleapis");

        const youtube = google.youtube({
            version: "v3",
            auth: process.env.YOUTUBE_TOKEN
        })
        const query = args.join(" ")
        console.log("query is: " , query)

        async function searchYoutube(query) {
            const result = await youtube.search.list({
                part:'snippet',
                type:'video',
                q: query,
                maxResults: 1
            });
            //console.log(result.data)
            return result.data.items[0].id.videoId

        }
        searchYoutube(query).then((result) => {
            if (result) {
                const videoId = result
                const ytUrlTemplate = "https://www.youtube.com/watch?v="
                const vidUrl = ytUrlTemplate + videoId
                
                invokedMessage.channel.send("Video found: " + vidUrl)
            } else {
                invokedMessage.channel.send("Video not found.")
            }
        }, reason => {
            console.error(reason)
        })
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