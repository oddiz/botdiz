const { logger } = require("../logger")
const axios = require('axios');

module.exports = function(videoUrl, callback) {
    /*
    Returns an object:
            {
                videoTitle: title,
                videoUrl: href,
                videoId: videoId,
                videoDuration: videoDuration,
                videoThumbnailUrl: response.data.thumbnail_url
            }
    */
    const regex = /\?v=(.*)&|\?v=(.*)$/
    const href = videoUrl
    const videoId = href.match(regex)[1] || href.match(regex)[2];
    const yt = require('youtube.get-video-info')
    //\?v=(.*)&|\?v=(.*)$
    let videoDuration = 0;
    yt.retrieve(videoId, (err, res) => {
        if (err) throw err;

        try {
            const playerRegex = /"approxDurationMs":"(\d*)"/
            //console.log(res.player_response)
            videoDuration = res.player_response.match(playerRegex)[1] / 1000   
            console.log("using approxduration") 
        } catch (error) {
            logger.log("error", "Regex approxDuration failed.")
        }
        //console.log("APPROX DURATION: ", videoDuration)
        try {
            const playerRegex = /"lengthSeconds":"(\d*)"/
            videoDuration = res.player_response.match(playerRegex)[1]  
            console.log("using lengthSeconds") 
        } catch (error){
            logger.log("error", "Regex approxDuration failed.")
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
                videoId: videoId,
                videoDuration: videoDuration,
                videoThumbnailUrl: response.data.thumbnail_url
            }
            //console.log("get youtube info from url succeed. result: ", result)
            callback(result)

            
        }).catch( err => {
            logger.log("error", "Error while trying to get video info inside getInfoFromYoutube\n ERROR: ", err)
        })
        
    })
}