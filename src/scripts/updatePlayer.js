const { MessageEmbed } = require('discord.js')


module.exports = function updatePlayer(MusicController, invokedMessage, nextInQueue, botMessage) {
    setTimeout(function () {
        
        let currentTitle

        try {
            currentTitle = MusicController.getCurrentSong().videoTitle;
            
        } catch (error) {
            logger.log("info", "No queue present terminating update queue");
            
            return
        }
        if (currentTitle !== nextInQueue.videoTitle) {
            logger.log("info", "Disabling update loop for "+originalVideoTitle)
            return;
        }
        if(currentTitle === nextInQueue.videoTitle) {
                let newEmbed = new MessageEmbed()
                newEmbed = newEmbed
                .setColor("#e9b463")
                .addField("Now Playing: ",`${nextInQueue.videoTitle}`)
                .setTimestamp()
            if(nextInQueue.videoThumbnailUrl) {
                newEmbed = newEmbed
                    .setThumbnail(nextInQueue.videoThumbnailUrl)
            }
            const streamtime = 1000;
            const streamHours = Math.floor(streamtime / (1000 * 60 * 60) % 60)
            const streamMins = Math.floor(streamtime / (1000 * 60) % 60)
            const streamSecs = Math.floor(streamtime / 1000 % 60)
            
            
            const videoLenght= nextInQueue.videoDuration; //secs
            const videoHours = Math.floor((videoLenght / (60 *60)) % 60)
            const videoMins = Math.floor((videoLenght / 60) % 60)
            const videoSecs = Math.floor(videoLenght % 60)
            
            const videoLenMs = videoLenght * 1000
            
            const percentage = (streamtime * 100) / videoLenMs

            
            let lines = new Array(50);
            lines[parseInt(Math.floor(percentage/2))] = "🟠";
            lines = lines.join("-")
            let newEmbedMessage;
            if (videoHours > 0){
                newEmbedMessage = newEmbed
                .addField(`${streamHours}:${streamMins.toString().padStart(2,0)}:${streamSecs.toString().padStart(2, '0')} / ${videoHours}:${videoMins.toString().padStart(2, 0)}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|`)
            } else {
                newEmbedMessage = newEmbed
                    .addField(`${streamMins}:${streamSecs.toString().padStart(2, '0')} / ${videoMins}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|`)
                
            }
            
            if (botMessage.channel.lastMessage.content.includes("status")) {
                
                botMessage.channel.send({ embeds: [newEmbedMessage]}).then(message => {
                    botMessage = message
                    updatePlayer(MusicController, invokedMessage, nextInQueue, botMessage)
                })
                
            } else {
                botMessage.edit(newEmbedMessage)
                updatePlayer(MusicController, invokedMessage, nextInQueue, botMessage)
            }
            
        } else {
            logger.log("info","Exiting update player")
        }
        

    }, MusicController.UPDATE_INTERVAL)
    
}