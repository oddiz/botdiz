const { AudioPlayerStatus } = require("@discordjs/voice")

module.exports = function (invokedMessage) {
    
    if (!this.controller.MusicController) {
        
        this.reply("Nothing is playing")
    } else {
        if(this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Idle) {
            this.reply("Nothing is playing")
        } else if (this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Playing){

            const currentSong = this.controller.MusicController.getCurrentSong()

            
            this.controller.MusicController.createSongEmbed(currentSong)
            
        }
    }

    
}