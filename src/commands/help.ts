import { CommandInteraction, MessageEmbed } from "discord.js"

import { logger } from '@src/logger'
import { Command } from "@src/modules/Command"

export default async (invokedMessage: CommandInteraction) => {
    const self = this as unknown as Command
    try {
        
        const commandName = invokedMessage.options.getString("command")
    
        let embedMessage = new MessageEmbed
        const PREFIX = self.controller.PREFIX
        const userAvatar = self.controller.client.user?.avatarURL()

        embedMessage = embedMessage
            .setColor("#e9b463")
            .setTimestamp()

        if (userAvatar) {
            embedMessage = embedMessage.setThumbnail(userAvatar)
        }
        if (commandName) {
            const foundCommand = self.controller.commands.find( ( { name } ) => name === commandName )
            if (foundCommand) {
                embedMessage = embedMessage
                    .setTitle(PREFIX + foundCommand.name)
                    .addField("Description", foundCommand.description)
                    .addField("Usage", foundCommand.usage)
    
                    self.reply({ embeds: [embedMessage]})
                
                return
            } else {
                self.reply(`Unable to find command: ${PREFIX + commandName}`)

                return
            }
        }
        
        embedMessage = embedMessage
            .setTitle("Botdiz Help Menu")
            .setDescription(`Below are all the things Botdiz can do.`)
            .setFooter({ text: `Made with 💜 by oddiz#9659` })
            
        for (const command of self.controller.commands) {
            
            embedMessage = embedMessage.addField(
                PREFIX + command.name,
                "```" +`Description:\n${command.description}\n\nUsage:\n${command.usage}` + "```",
                false
            )
        } 
        
    
        self.reply({ embeds: [embedMessage]})
        
    } catch (error) {
        logger.log("error", "Error while executing help command : ", error)
    }
}