require('dotenv').config()

module.exports = function (query, maxResults = 1, asd) {
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
            maxResults: maxResults
        });
        //console.log(result.data)
        return result.data.items

    }
    searchYoutube(query)
    .then((result) => {

        if (result.length > 1) {
            let videoUrls = []
            for (const item of result) {
                const videoId = item.id.videoId
                const ytUrlTemplate = "https://www.youtube.com/watch?v="
                const videoUrl = ytUrlTemplate + videoId
                videoUrls.push(videoUrl)
                
            }
            
            console.log("video Urls array from searchYT.js: " + videoUrls)

            return videoUrls
        } else {
            const videoId = result[0].id.videoId
            const ytUrlTemplate = "https://www.youtube.com/watch?v="
            const videoUrl = ytUrlTemplate + videoId
            
            return videoUrl
        }
    })
}