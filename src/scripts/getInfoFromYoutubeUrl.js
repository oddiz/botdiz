const { logger } = require("../logger")
const axios = require('axios');
const youtubedl = require('youtube-dl-exec')


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
   console.log(videoUrl)
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const href = videoUrl
    const videoId = href.match(regex)[1]
    //\?v=(.*)&|\?v=(.*)$
    let videoDuration = 0;
    
    youtubedl(videoId, {
        s: true,
        e: true,
        getThumbnail: true,
        getDuration: true,
    }).then(response => {
        const result = response.split("\n")
        
        let videoDurationString = result[2].split(":")

        let videoDuration = 0;
        let secCounter = 1
        
        for (let i = videoDurationString.length-1; i >= 0; i--) {
            videoDuration += parseInt(videoDurationString[i]) * secCounter;
            
            secCounter *= 60
            console.log(videoDuration,secCounter)
        }   

        const videoInfo = {
            videoUrl: href,
            videoId: videoId,
            
            videoTitle: result[0],
            videoThumbnailUrl: result[1],
            videoDuration: videoDuration
        }
        console.log(videoInfo)
        callback(videoInfo)

    }).catch( err => {
        logger.log("error", "Error while trying to get video info inside getInfoFromYoutube\n ERROR: ", err)
    })
    
}
    
/*
    {
        videoTitle: title,
        videoUrl: href,
        videoId: videoId,
        videoDuration: videoDuration,
        videoThumbnailUrl: response.data.thumbnail_url
    }
    
    
   
    

    const yt = require('youtube.get-video-info')
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
            logger.log("error", "Regex lengthSeconds failed.")
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
            callback(result)

            
        }).catch( err => {
            logger.log("error", "Error while trying to get video info inside getInfoFromYoutube\n ERROR: ", err)
        })
        
    })

*/
