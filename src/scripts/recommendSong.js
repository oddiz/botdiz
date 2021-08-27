const parseTitleStrings = require("./parseTitleStrings")
require('dotenv').config()

module.exports = async function(ytdlVideoInfo, songHistory, options) {

    try {
        
        let track, artist
        const videoTitle = ytdlVideoInfo.videoDetails?.title
        
        const ytMediaInfo = ytdlVideoInfo.videoDetails?.media
        if(
            ytMediaInfo &&
            ytMediaInfo?.category === 'Music' &&
            ytMediaInfo?.song &&
            ytMediaInfo?.artist
        ) {
            track = ytMediaInfo.track
            artist = ytMediaInfo.artist 
        } else {

            //try to parse the title
            const result = parseTitleStrings(videoTitle)

            if(result) {
                if(result.title === result.artist) {
                    //couldn't parse the title correctly
                    track = null
                    artist= null
                }
                track = result.title
                artist = result.artist
            }

        }


        if (track && artist) {
            const livefmApiKey = process.env.LIVEFM_API_KEY

            const livefmRecommendedUrl = `http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&autocorrect=1&api_key=${livefmApiKey}&format=json`
            
        }

    } catch (error) {
        console.log("Error while trying to recommend song")
    }
}