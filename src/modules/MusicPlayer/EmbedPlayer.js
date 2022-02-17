const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const { logger } = require('../../logger')

module.exports = class UpdatePlayerInfo {
    constructor(MusicController) {
        this.MusicController = MusicController,
        
        this.messageToEdit;
        this.currentSong;

        this.quit = true
        this.loopCount = 1

        
    }

    start() {
        this.quit = false;
        
        this.updateLoop();
    }

    stop(){
        this.quit = true;
    }

    getQuitState() {
        return this.quit
    }

    async updateLoop() {
        const botdizLinkButton = new MessageActionRow()
        const botdizLink = process.env.NODE_ENV === "development" ? "http://localhost:3000/app" : "https://botdiz.kaansarkaya.com/app"
        botdizLinkButton
            .addComponents(
                [new MessageButton()
                    .setLabel("Botdiz Interface")
                    .setStyle("LINK")
                    .setURL(botdizLink),
                ]
            )
        // botdizLinkButton
        //     .addComponents(
        //         [new MessageButton()
        //             .setLabel("Botdiz Interface")
        //             .setStyle("LINK")
        //             .setURL(botdizLink),
        //         new MessageButton()
        //             .setLabel("test")
        //             .setCustomID("test_id")
        //             .setStyle("PRIMARY"),
        //         new MessageButton()
        //             .setLabel("stop")
        //             .setCustomID("stop_button")
        //             .setStyle("DANGER"),
        //         new MessageButton()
        //             .setLabel("play")
        //             .setCustomID("play_button")
        //             .setStyle("SECONDARY"),
        //         ]
        //     )
        while (!this.getQuitState()){

            const currentSong = this.MusicController.getCurrentSong()

            if(!currentSong || this.MusicController.stopped) {
                this.stop()
            }

            if (!(this.messageToEdit && this.currentSong)){
                await new Promise(resolve => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL));

                continue
            }
            try {
                
                this.looping = true;
                let newEmbed = new MessageEmbed()
                    newEmbed = newEmbed
                    .setColor(this.MusicController.controller.roleColor)
                    .addField("Now Playing: ",`${this.currentSong.info.title}`)
                    .setTimestamp()
                if(this.currentSong.info.thumbnail) {
                    newEmbed = newEmbed
                        .setThumbnail(this.currentSong.info.thumbnail)
                }
    
                const streamtime = this.MusicController.audioPlayer.position || 0;
                const streamHours = Math.floor(streamtime / (1000 * 60 * 60) % 60)
                const streamMins = Math.floor(streamtime / (1000 * 60) % 60)
                const streamSecs = Math.floor(streamtime / 1000 % 60)
                
                
                const videoLength= this.currentSong.info.length / 1000; //secs
                const videoHours = Math.floor((videoLength / (60 *60)) % 60)
                const videoMins = Math.floor((videoLength / 60) % 60)
                const videoSecs = Math.floor(videoLength % 60)
                
                const videoLenMs = videoLength * 1000
                
                const percentage = (streamtime * 100) / videoLenMs
    
                let lines = new Array(30);
                lines[parseInt(Math.floor(percentage/(100/30)))] = "🟠";
                lines = lines.join("-")
                let newEmbedMessage;
                
                if (this.currentSong.info.isStream){
                    newEmbedMessage = newEmbed
                    .addField(`Play time:`, `${streamHours}:${streamMins.toString().padStart(2,0)}:${streamSecs.toString().padStart(2, '0')}\n\n Autoplay: ${this.MusicController.autoplay? "On":"Off"}`)
                } else if (videoHours > 0) {
                    newEmbedMessage = newEmbed
                    .addField(`${streamHours}:${streamMins.toString().padStart(2,0)}:${streamSecs.toString().padStart(2, '0')} / ${videoHours}:${videoMins.toString().padStart(2, 0)}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|\n\n Autoplay: ${this.MusicController.autoplay? "On":"Off"} `)
                } else {
                    newEmbedMessage = newEmbed
                        .addField(`${streamMins}:${streamSecs.toString().padStart(2, '0')} / ${videoMins}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|\n\n Autoplay: ${this.MusicController.autoplay? "On":"Off"}`)
                    
                }
                
                await this.messageToEdit.edit({ embeds: [newEmbedMessage], components: [botdizLinkButton]})
                
                this.loopCount ++;

            } catch (error) {
                if (error.code === 10008) {
                    //message to edit changed should be fixed next update
                    
                } else {
                    logger.log("error", "Error in update loop.", error)

                }
            }
            await new Promise(resolve => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL));
        }
        

        if(this.getQuitState()) {
            
            try {
                let newEmbed = new MessageEmbed()
                        newEmbed = newEmbed
                        .setColor(this.MusicController.controller.roleColor)
                        .addField("Stopped playing: ",`${this.currentSong.info.title}`)
                        .setTimestamp()
                if(this.currentSong.info.thumbnail) {
                    newEmbed = newEmbed
                        .setThumbnail(this.currentSong.info.thumbnail)
                }
    
                await this.messageToEdit.edit({ embeds: [newEmbed], components: [botdizLinkButton]})
                
            } catch (error) {
                //silently fail shennanigans
                console.log("Error trying to post stopped playing message: "+error)
            }
        }
        this.looping = false
        
        return

    }

    /**
     * Change the message to be updated
     * @param {Message} message 
     */
    async changeMessage(message) {
        try {
            if(!message) {
                // no message to change
                return
            }
            this.oldMessage = this.messageToEdit
            try {
    
                if(this.oldMessage && !this.oldMessage.deleted) {
                    //no message to delete so just return
                    await this.oldMessage.delete().catch(err=>{console.log("Error while trying to delete message.")})
                    
                }
            } catch (err) {
                logger.log("error", "Error while trying to delete old embed message: ", err)
            }
            this.messageToEdit = message
            this.quit = false;
            
        } catch (error) {
            console.log("Error while trying to change embed player message: ", error)
        }
    }

    /**
     * Change the song
     * @param {nextInQueue} song 
     */
    changeSong(song) {
        this.currentSong = song
        this.quit = false;
    }

    
}