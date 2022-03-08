import { Command } from "src/modules/Command";
import { CommandInteraction } from "discord.js";
import { logger } from "../logger";

export default async (invokedMessage: CommandInteraction) => {
    const self = this as unknown as Command;
    try {
        const guildOwner = await invokedMessage.guild?.fetchOwner()
        
        const guildOwnerId = guildOwner?.user.id

        if (!guildOwnerId) {
            logger.log("error", "Could not get guild owner id.")
            return
        }
    
        let messageUserId;
    
        if (self.lastIsInteraction) {
            messageUserId = invokedMessage.user.id
        } 
    
        if ((messageUserId == self.controller.oddiz?.id) || (messageUserId == guildOwnerId)) {
    
            let slashCommands = [];
    
            for (const command of self.controller.commands) {
                slashCommands.push(command.convertSlashCommand())
            }
            
            await invokedMessage.guild?.commands.set(slashCommands)
    
            self.reply("Slash commands are registered!")
    
            return
        } else {
            self.reply("You cannot use this command. Needs to be guild owner or goddiz")
            return
        }
        
    } catch (error) {
        logger.log("error", "Error while executing deploy command: ", error)
    }
}