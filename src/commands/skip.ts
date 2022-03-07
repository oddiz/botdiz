import { Command } from "@src/modules/Command"
import { CommandInteraction } from "discord.js"
import { logger } from "../logger"

export default async (invokedMessage: CommandInteraction) => {

    const self = this as unknown as Command
    try {
        
        const skipAmount = invokedMessage.options.getInteger("amount") || 1
        const musicController = self.controller.MusicController

        if (!musicController) {
            self.reply("Bot is currently not playing.")
            
            return 
        }
        //set music controller's reply depending on self command
        
        const currentSong = musicController.getCurrentSong()
        if (!currentSong) {
            self.reply("Bot is currently not playing.")

            return
        }
    
        
        if (skipAmount >= 2) {
            musicController.SkipHandler.handle(invokedMessage, skipAmount)
        } else if(skipAmount == 1) {
            musicController.SkipHandler.handle(invokedMessage, 1)

        } else if (skipAmount == 0) {
            self.wrongUsage(invokedMessage, self.name, "Huh?")

            return
        
        } else{
            self.wrongUsage(invokedMessage, self.name, "Can't skip back in time.")

            return
        }
       
    } catch (error) {
        logger.log("error", "Error while executing skip command : ", error)
    }

}