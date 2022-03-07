import { MessageEmbed } from 'discord.js'
import { logger } from '@src/logger'
import { Command } from '@src/modules/Command'

export default async () => {

    const self = this as unknown as Command
    try {
        //takes "on" or "off" as argument
        const inviteLink = "https://discord.com/oauth2/authorize?client_id=851497395190890518&scope=bot+applications.commands&permissions=2184309832"
        let newEmbed = new MessageEmbed
    
        newEmbed = newEmbed
            .setColor("#e9b463")
            .setTitle("Invite Link")
            .setURL(inviteLink)
        
            self.reply({ embeds: [newEmbed]})
        
        
    } catch (error) {
        logger.log("error", "Error while executing invite command: ", error)    
    }
}

//https://discord.com/oauth2/authorize?client_id=851497395190890518&scope=bot+applications.commands&permissions=3825192512
