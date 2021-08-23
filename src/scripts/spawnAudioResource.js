const ytdl = require('ytdl-core');
const { createAudioResource ,demuxProbe, StreamType } = require('@discordjs/voice')
const fs = require('fs');
const { CLIENT_RENEG_WINDOW } = require('tls');

module.exports = function spawnAudioResource(nextInQueue, controller) {
    return new Promise(async (resolve, reject) => {
        
        
        const videoInfo = await ytdl.getInfo(nextInQueue.videoUrl)
        const MusicController = controller.MusicController
        MusicController.songHistory.push(videoInfo.player_response.videoDetails.videoId)

        
        /* 
        {
            id: 'sWjbQGXz2CE',
            title: 'WHAT IS ATRIAL SEPTAL DEFECT (ASD)?',
            published: '4 years ago',
            author: [Object],
            short_view_count_text: '12K',
            view_count: '12047',
            length_seconds: 526,
            thumbnails: [Array],
            richThumbnails: [Array],
            isLive: false
        }
        */
        if(MusicController.queue.length === 0) {
           
            let recommendedNext;
            //console.log(MusicController.songHistory)

            for (const [index, song] of videoInfo.related_videos.entries()) {
                //console.log("Song id: " + song.id)
                if (!MusicController.songHistory.includes(song.id)) {
                    //console.log("ID not in list. Adding recommended")
                    recommendedNext = videoInfo.related_videos[index]
                    break
                }
            }

            if(!recommendedNext) {
                console.log("Couldn't find recommended")
            } else {
                //time to add recommended
                const ytUrlTemplate = "https://www.youtube.com/watch?v="
                const vidUrl = ytUrlTemplate + recommendedNext.id
    
                const nextSong = {
                    videoUrl: vidUrl,
                    videoId: recommendedNext.id,
                    videoTitle: recommendedNext.title,
                    videoThumbnailUrl: recommendedNext.thumbnails[0].url,
                    videoDuration: recommendedNext.length_seconds,
                    recommendedSong:true
                }
    
    
                MusicController.queue.push(nextSong)

            }
        }
        
        const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audio');
        const chosenFormat = ytdl.chooseFormat(audioFormats, {quality: "highestaudio"})
        /* 
        {
            mimeType: 'video/ts; codecs="H.264, aac"',
            qualityLabel: '720p',
            bitrate: 1500000,
            audioBitrate: 256,
            itag: 95,
            url: 'https://manifest.googlevideo.com/api/manifest/hls_playlist/expire/1629610842/ei/-o4hYdDQDIGJxgKajorIBA/ip/3.8.20.9/id/5qap5aO4i9A.1/itag/95/source/yt_live_broadcast/requiressl/yes/ratebypass/yes/live/1/sgoap/gir%3Dyes%3Bitag%3D140/sgovp/gir%3Dyes%3Bitag%3D136/hls_chunk_host/rr2---sn-aigzrn7k.googlevideo.com/playlist_duration/30/manifest_duration/30/vprv/1/playlist_type/DVR/mh/30/mm/44/mn/sn-aigzrn7k/ms/lva/mv/u/mvi/2/pl/20/dover/11/keepalive/yes/fexp/24001373,24007246/mt/1629588865/sparams/expire,ei,ip,id,itag,source,requiressl,ratebypass,live,sgoap,sgovp,playlist_duration,manifest_duration,vprv,playlist_type/sig/AOq0QJ8wRQIhAKM-9MVOXD8XMLSWdmnWoMW2F2YWp5P0wWPZQpCY7zTUAiAc5wpd9hJK8L07_LkWy2yXEc6NDSmbZYx_AOKx5MaFbg%3D%3D/lsparams/hls_chunk_host,mh,mm,mn,ms,mv,mvi,pl/lsig/AG3C_xAwRgIhANH216l5jRNeIwo47JMKUyYzcb7Hff14juTyis5yD03bAiEAo27CpXIH8lBSylIDBGY2kmrtk7tl_aPu_wMw0YcTH74%3D/playlist/index.m3u8',
            hasVideo: true,
            hasAudio: true,
            container: 'ts',
            codecs: 'H.264, aac',
            videoCodec: 'H.264',
            audioCodec: 'aac',
            isLive: true,
            isHLS: true,
            isDashMPD: false
        }
        */

       console.log("Video name: " +  videoInfo.player_response.videoDetails.title)
       console.log("Audio bitrate: " + chosenFormat.audioBitrate)
        try {
            const channelBitrate = controller.guild.me.voice.channel?.bitrate
            console.log("Channel bitrate:" + channelBitrate)

        } catch (error) {

        }
        if(videoInfo.videoDetails.isLiveContent || videoInfo.videoDetails.lengthSeconds > 60 * 60 *2) {
            
            const stream = ytdl.downloadFromInfo(videoInfo, 
                { 
                    filter: 'audio', 
                    quality:'highestaudio',
                    liveBuffer:10000, 
                    highWaterMark: 1024 * 512, 
                    dlChunkSize:1024 * 1024 * 10, 
                }
            )
            
            
        
            const onError = (error) => {
                console.log("Error on demux probe" , error)

                stream.destroy();
                reject(error);
            };
        
            demuxProbe(stream)
            .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
            .catch(onError);

        } else {
            await fs.writeFile(`./temp/AudioBuffers/${controller.guild.id}`,"", (err) => {
                if(err) {
                    console.log("error while trying to create audio buffer file")
                }
            })
            
            const stream = ytdl.downloadFromInfo(videoInfo, 
                { 
                    filter: 'audio', 
                    quality:'highestaudio',
                    liveBuffer:10000, 
                    highWaterMark: 1024 * 512, 
                    dlChunkSize:1024 * 1024 * 10, 
                }
            )
            
            
            let broadcastStarted = false
            let starttime
            
            stream.once("response", () => {
                starttime= Date.now()
        
                MusicController.downloadFinished = false
    
            })
    
            await stream.pipe(fs.createWriteStream(`./temp/AudioBuffers/${controller.guild.id}`))
    
            
            const readline = require('readline');
            stream.on("progress", (chunkLength, downloaded, total) => {
                
                if(MusicController.currentSong?.videoId !== nextInQueue.videoId) {
                    console.log("\n\n\n\n\nold id: " + MusicController.currentSong?.videoId)
                    console.log("new id: " + nextInQueue.videoId)
                    console.log("song changed")
                    stream.destroy()
    
                    return
                }
                const percent = (downloaded / total) * 100;
                const downloadedMinutes =
                 (Date.now() - starttime) / 1000 / 60;
                const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`${(percent).toFixed(2)}% downloaded `);
                process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
                process.stdout.write(`running for: ${downloadedMinutes.toFixed(2)}minutes`);
                process.stdout.write(`, estimated time left: ${estimatedDownloadTime.toFixed(2)}minutes `);
                process.stdout.write(`, chunkLength: ${chunkLength}`);
                readline.moveCursor(process.stdout, 0, -1);
                if (Math.ceil(percent) === 100) {
                    MusicController.downloadFinished = true
                }
    
                if (downloaded > 1024 * 1024 * 1 && !broadcastStarted) {
                    console.log("creating resource")
                    demuxProbe(fs.createReadStream(`./temp/AudioBuffers/${controller.guild.id}`))
                    .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
                    .catch(onError);
    
                    broadcastStarted = true
                }
            })

            const onError = (error) => {
                console.log("Error while trying to spawn Audio Resource" , error)
    
                stream.destroy();
                reject(error);
            };

            // stream.on("readable", () => {
            //     if (!broadcastStarted) {
            //         console.log("starting stream based on 'readable'")
            //         demuxProbe(fs.createReadStream(`./temp/AudioBuffers/${controller.guild.id}`))
            //         .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
            //         .catch(onError);
    
            //         broadcastStarted = true
            //     }
            // })
            // stream.on("data", () => {
            //     if (!broadcastStarted) {
            //         console.log("starting stream based on 'data'")
            //         demuxProbe(fs.createReadStream(`./temp/AudioBuffers/${controller.guild.id}`))
            //         .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
            //         .catch(onError);
    
            //         broadcastStarted = true
            //     }
            // })
            stream.on("end", () => {
                if (!broadcastStarted) {
                    console.log("starting stream based on 'end'")
                    demuxProbe(fs.createReadStream(`./temp/AudioBuffers/${controller.guild.id}`))
                    .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
                    .catch(onError);
    
                    broadcastStarted = true
                }
            })

            await new Promise(resolve => setTimeout(resolve, 1000 * 2))

            if (!broadcastStarted) {
                demuxProbe(fs.createReadStream(`./temp/AudioBuffers/${controller.guild.id}`))
                        .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
                        .catch(onError);
    
                broadcastStarted = true
            }

            
        }


        
            
    });
}