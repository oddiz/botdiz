require('dotenv').config()
const fetch = require('node-fetch')

module.exports = async function(invokedMessage, ...args) {
    
    const self = this

    let videoUrl, searchMode;
    try {
        const parsedURL = new URL(arguments[1])
        videoUrl = parsedURL.href
        searchMode = false
    } catch (error) {
        searchMode = true
    }

    if (searchMode) {
        const query = args.join(" ")
        const searchYT = require("../scripts/searchYT");

        searchYT(query, 1, (result => {
            if (result) {
                const videoId = result.videoId
                const ytUrlTemplate = "https://www.youtube.com/watch?v="
                videoUrl = ytUrlTemplate + videoId
                
                self.reply("Video found: " + videoUrl)

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
                    self.reply("**Room is ready:**\n" + w2gRoom, { followup: true })
                });
            } else {

                this.wrongUsage(invokedMessage, this.name, "Video not found.")
            }
        }))
        
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
            self.reply("**Room is ready:**\n" + w2gRoom)
        });
    }

    
}