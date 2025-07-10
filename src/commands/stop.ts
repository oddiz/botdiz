import { Command } from "../modules/Command"
import { CommandInteraction } from "discord.js"
import { logger } from "../logger"

export default async function (this: Command) {

    const self = this
    try {
        if (!self.controller.MusicController) {
            self.reply("Bot is currently not playing.")
            
            return 
        }
    
        await self.controller.MusicController.stop()
        self.reply("⏹️ Stopped player")
        
    } catch (error) {
        logger.log("error", "Error while executing stop command : ", error)
    }
    

}