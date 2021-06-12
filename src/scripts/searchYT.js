require('dotenv').config()

module.exports = function (query, maxResults = 1, callback) {
    const { google } = require("googleapis");

    const youtube = google.youtube({
        version: "v3",
        auth: process.env.YOUTUBE_TOKEN
    })


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
        /*
        {
            kind: 'youtube#searchResult',
            etag: 'Hg5TCq3_kWr-XnKgtMxc8wvxFuY',
            id: { kind: 'youtube#video', videoId: 'GX8Hg6kWQYI' },
            snippet: {
              publishedAt: '2018-10-01T04:00:05Z',
              channelId: 'UCM9r1xn6s30OnlJWb-jc3Sw',
              title: 'XXXTENTACION - MOONLIGHT (OFFICIAL MUSIC VIDEO)',
              description: 'Written & Creative Directed By XXXTENTACION Directed by JMP @ualreadyknowJMP Producer: Joey Szela DP: Mike Koziel Camera Operators: Mike Koziel ...',
              thumbnails: { default: [Object], medium: [Object], high: [Object] },
              channelTitle: 'XXXTENTACION',
              liveBroadcastContent: 'none',
              publishTime: '2018-10-01T04:00:05Z'
            }
          }
        */
        if (result.length > 1) {
            let videoUrls = []
            let videoIds = []
            let videoTitles = []
            for (const item of result) {
                const videoId = item.id.videoId
                const ytUrlTemplate = "https://www.youtube.com/watch?v="
                const videoUrl = ytUrlTemplate + videoId
                videoIds.push(videoId)
                videoUrls.push(videoUrl)
                videoTitles.push(item.snippet.title)
                
            }
            
            console.log("video Urls array from searchYT.js: " + videoUrls)
            callback({
                videoIds: videoIds,
                videoUrls: videoUrls,
                videoTitles: videoTitles
            })
            
        } else {
            console.log(result)
            const videoId = result[0].id.videoId
            const ytUrlTemplate = "https://www.youtube.com/watch?v="
            const videoUrl = ytUrlTemplate + videoId

            callback({
                videoTitle: [result[0].snippet.title],
                videoId: videoId,
                videoUrl: videoUrl
            })
            
        }
    }).catch(error => {
        console.error("Error while trying to fetch Youtube API with error:  " + error)
    })
}