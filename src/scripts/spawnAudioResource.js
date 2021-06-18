const { raw  } = require('youtube-dl-exec')
const { createAudioResource ,demuxProbe } = require('@discordjs/voice')
module.exports = function spawnAudioResource(nextInQueue) {
    return new Promise((resolve, reject) => {
        console.log(nextInQueue.videoUrl)
        const process = raw(
            nextInQueue.videoUrl,
            {
                o: '-',
                q: '',
                f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio/bestvideo/best',
                r: '10M',
                noPlaylist: true
            },
            { stdio: ['ignore', 'pipe', 'ignore'] },
        );

        //f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
        if (!process.stdout) {
            reject(new Error('No stdout'));
            return;
        }
        const stream = process.stdout;
        
        const onError = (error) => {
            console.log("error" , error)
            if (!process.killed) process.kill();

            stream.resume();
            reject(error);
        };
        console.log("process will spawn?")
        
                console.log("ping")
                demuxProbe(stream)
                    .then((probe) => resolve(createAudioResource(probe.stream, { inputType: probe.type })))
                    .catch(onError);
            
    });
}