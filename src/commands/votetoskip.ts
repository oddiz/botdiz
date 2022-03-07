import { Command } from "@src/modules/Command";
import { CommandInteraction, GuildMember } from "discord.js";
import { logger } from "../logger";

export default async (invokedMessage: CommandInteraction) => {
    const self = this as unknown as Command;
    try {
        //check if user has permissions to use this command
        const user = await invokedMessage.member
        
        if (user && user instanceof GuildMember) {
            if(user.permissions.has("ADMINISTRATOR") || user.permissions.has("MANAGE_GUILD")) {
                const MusicController = self.controller.MusicController
                
                if (MusicController) {
                    
                    MusicController.skipVotingEnabled = !MusicController.skipVotingEnabled
                
                    self.controller.saveGuildSettings()
                    
                    self.reply({ content: `\`Voting to skip songs is now ${MusicController.skipVotingEnabled? "enabled":"disabled"}.\``})
                } else {
                    throw new Error("MusicController is not defined")
                }
            } else {
                self.reply({ content: `\`Only administrators can change this setting!\``})
            }
            
        }
        
    } catch (error) {
        logger.log("error", "Error while executing votetoskip command : ", error)
    }
}