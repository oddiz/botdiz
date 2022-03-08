import { Command } from '../modules/Command'
import { logger } from '../logger'
import { CommandInteraction } from 'discord.js';

export default async function (this: Command, invokedMessage?: CommandInteraction | null) {
    const self = this;
    try {
        const musicController = self.controller.MusicController;
        if (!musicController) {
            
            self.reply("Nothing is playing")
        } else {
            if(musicController.audioPlayerStatus !== "PLAYING") {
                self.reply("Nothing is playing")
            } else {
    
                const currentSong = musicController.getCurrentSong()
                if (currentSong) {
                    await self.reply("`Current song:`")
                    musicController.createSongEmbed(currentSong, invokedMessage)
                }
                
                
            }
        }
        
    } catch (error) {
        logger.log("error", "Error while executing status command :", error)
    }
    

    
}