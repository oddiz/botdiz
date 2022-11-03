import { logger } from "../logger";
import ytdl from "ytdl-core";
import { YoutubeSearchResult } from "./searchYT";

export default async (videoUrl: string): Promise<YoutubeSearchResult | null> => {
    try {
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
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const href = videoUrl;
        const hrefArray = href.match(regex) || [];
        const videoId = hrefArray[1];
        //\?v=(.*)&|\?v=(.*)$

        if (videoId) {
            const videoInfo = await ytdl.getBasicInfo(videoId);

            if (videoInfo) {
                const videoDetails = videoInfo.player_response.videoDetails;
                const title = videoDetails.title;
                const duration = videoDetails.lengthSeconds;
                const thumbnailUrl = videoDetails.thumbnails[0].url;

                const parsedInfo: YoutubeSearchResult = {
                    videoUrl: href,
                    videoId: videoId,
                    videoTitle: title,
                    videoThumbnailUrl: thumbnailUrl,
                    videoDuration: duration,
                };

                return parsedInfo;
            }
        }

        return null;
    } catch (error) {
        logger.log("error", "Error while getting info from youtube url : ", error);
        return null;
    }
};

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

            videoDuration = res.player_response.match(playerRegex)[1] / 1000   

        } catch (error) {
            logger.log("error", "Regex approxDuration failed.")
        }

        try {
            const playerRegex = /"lengthSeconds":"(\d*)"/
            videoDuration = res.player_response.match(playerRegex)[1]  

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
