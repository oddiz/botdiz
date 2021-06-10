require('dotenv').config()
const fetch = require('node-fetch')

module.exports = function(invokedMessage, videoLink) {
    if (arguments.length > 2) {

        this.wrongUsage(invokedMessage, this.name)
        
        return
    }
    try {
        const parsedURL = new URL(videoLink)
    } catch (error) {
        this.wrongUsage(invokedMessage, this.name, "Video link is not valid! Copy the whole link, including https://")
        
        return
    }


    fetch("https://w2g.tv/rooms/create.json", {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "w2g_api_key": process.env.W2G_TOKEN,
        "share": videoLink,
        "bg_color": "#2a2c37",
        "bg_opacity": "100"
    })
    })
    .then(response => response.json())
    .then(function (data) {
        console.log(data)
        const w2gRoom = "https://w2g.tv/rooms/" + data.streamkey;
        invokedMessage.channel.send("**Room is ready:**\n" + w2gRoom)
    });
}