require('dotenv').config()
const fetch = require('node-fetch')

module.exports = function(invokedMessage, ...args) {

    let videoUrl, searchMode;
    try {
        const parsedURL = new URL(arguments[1])
        videoUrl = parsedURL.href
        searchMode = false
    } catch (error) {
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
                videoUrl = ytUrlTemplate + videoId
                
                invokedMessage.channel.send("Video found: " + videoUrl)

                fetch("https://w2g.tv/rooms/create.json", {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "w2g_api_key": process.env.W2G_TOKEN,
                        "share": videoUrl,
                        "bg_color": "#2a2c37",
                        "bg_opacity": "100"
                    })
                })
                .then(response => response.json())
                .then(function (data) {

                    const w2gRoom = "https://w2g.tv/rooms/" + data.streamkey;
                    invokedMessage.channel.send("**Room is ready:**\n" + w2gRoom)
                });
            } else {

                this.wrongUsage(invokedMessage, this.name, "Video not found.")
            }
        }, reason => {
            console.error(reason)
        })
    } else {
        fetch("https://w2g.tv/rooms/create.json", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "w2g_api_key": process.env.W2G_TOKEN,
                "share": videoUrl,
                "bg_color": "#2a2c37",
                "bg_opacity": "100"
            })
        })
        .then(response => response.json())
        .then(function (data) {

            const w2gRoom = "https://w2g.tv/rooms/" + data.streamkey;
            invokedMessage.channel.send("**Room is ready:**\n" + w2gRoom)
        });
    }

    
}