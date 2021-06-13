require('dotenv').config()

module.exports = async function (query, maxResults = 1, callback) {

    const ytsr = require('ytsr');
    let videoUrl, videoId, videoTitle,videoThumbnailUrl,videoDuration

    const filters1 = await ytsr.getFilters(query);
    const filter1 = filters1.get('Type').get('Video');


    ytsr(filter1.url, { limit: maxResults }).then(result => {

        const foundVid = result.items[0]
        if (foundVid.type === "video") {
            videoUrl = foundVid.url;
            videoId = foundVid.id;
            videoTitle = foundVid.title;
            videoThumbnailUrl = foundVid.bestThumbnail.url
            
        }
        
        const package = {
            videoUrl: videoUrl,
            videoId: videoId,
            videoTitle: videoTitle,
            videoThumbnailUrl:videoThumbnailUrl
        }
        callback(package)
    })

    // const { google } = require("googleapis");

    // const youtube = google.youtube({
    //     version: "v3",
    //     auth: process.env.YOUTUBE_TOKEN
    // })


    // async function searchYoutube(query) {
    //     const result = await youtube.search.list({
    //         part:'snippet',
    //         type:'video',
    //         q: query,
    //         maxResults: maxResults
    //     });
    //     //console.log(result.data)
    //     return result.data.items

    // }
    // searchYoutube(query)
    // .then((result) => {
    //     /*
    //     {
    //         kind: 'youtube#searchResult',
    //         etag: 'Hg5TCq3_kWr-XnKgtMxc8wvxFuY',
    //         id: { kind: 'youtube#video', videoId: 'GX8Hg6kWQYI' },
    //         snippet: {
    //           publishedAt: '2018-10-01T04:00:05Z',
    //           channelId: 'UCM9r1xn6s30OnlJWb-jc3Sw',
    //           title: 'XXXTENTACION - MOONLIGHT (OFFICIAL MUSIC VIDEO)',
    //           description: 'Written & Creative Directed By XXXTENTACION Directed by JMP @ualreadyknowJMP Producer: Joey Szela DP: Mike Koziel Camera Operators: Mike Koziel ...',
    //           thumbnails: { default: [Object], medium: [Object], high: [Object] },
    //           channelTitle: 'XXXTENTACION',
    //           liveBroadcastContent: 'none',
    //           publishTime: '2018-10-01T04:00:05Z'
    //         }
    //       }
    //     */
    //     if (result.length > 1) {
    //         const randResult = result[Math.round(Math.random() * (result.length - 1))]
    //         const videoId = randResult.id.videoId
    //         const ytUrlTemplate = "https://www.youtube.com/watch?v="
    //         const videoUrl = ytUrlTemplate + videoId
    //         const videoTitle = randResult.snippet.title   
                
    //         console.log("random retrieved video " + videoUrl)
    //         callback({
    //             videoId: videoId,
    //             videoUrl: videoUrl,
    //             videoTitle: videoTitle
    //         })
            
    //     } else {
    //         //console.log(result)
    //         const videoId = result[0].id.videoId
    //         const ytUrlTemplate = "https://www.youtube.com/watch?v="
    //         const videoUrl = ytUrlTemplate + videoId
    //         const videoTitle = result[0].snippet.title
    //         callback({
    //             videoId: videoId,
    //             videoUrl: videoUrl,
    //             videoTitle: videoTitle
    //         })
            
    //     }
    // })
}