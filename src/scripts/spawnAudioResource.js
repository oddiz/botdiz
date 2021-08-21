const ytdl = require('ytdl-core');
const { createAudioResource ,demuxProbe } = require('@discordjs/voice')
module.exports = function spawnAudioResource(nextInQueue) {
    return new Promise(async (resolve, reject) => {
        
        
        const videoInfo = await ytdl.getInfo(nextInQueue.videoUrl)
        const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audio');
        const chosenFormat = ytdl.chooseFormat(audioFormats, {quality: "highestaudio"})
        console.log("Format playing: ", chosenFormat)
        const stream = ytdl(nextInQueue.videoUrl, { filter: 'audio', liveBuffer:10000, quality:'highestaudio'})
        
        
        const onError = (error) => {
            console.log("Error while trying to spawn Audio Resource" , error)

            stream.destroy();
            reject(error);
        };
        
        demuxProbe(stream)
        .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
        .catch(onError);
            
    });
}