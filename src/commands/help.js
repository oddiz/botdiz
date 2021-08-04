const { MessageEmbed } = require('discord.js')

module.exports = function(invokedMessage, commandName) {
    if (arguments.length > 2) {

        this.wrongUsage(invokedMessage, this.name)

        return
    }

    let embedMessage = new MessageEmbed
    const PREFIX = this.controller.PREFIX
    embedMessage = embedMessage
        .setColor("#e9b463")
        .setThumbnail(this.controller.client.user.avatarURL())
        .setTimestamp()
    if (commandName) {
        const foundCommand = this.controller.commands.find( ( { name } ) => name === commandName )
        if (foundCommand) {
            embedMessage = embedMessage
                .setTitle(PREFIX + foundCommand.name)
                .addField("Description", foundCommand.description)
                .addField("Usage", foundCommand.usage)

                this.reply({ embeds: [embedMessage]})
            
            return
        } else {
            this.reply(`Unable to find command: ${PREFIX + commandName}`)
        }
    }

    embedMessage = embedMessage
        .setTitle("Botdiz Help Menu")
        .setDescription(`Below are all the things Botdiz can do.`)
        .setFooter(`Made with 💜 by oddiz#9659`)
        
    for (const command of this.controller.commands) {
        
        embedMessage = embedMessage.addField(
            PREFIX + command.name,
            "```" +`Description:\n${command.description}\n\nUsage:\n${command.usage}` + "```",
            false
        )
    } 
    

    this.reply({ embeds: [embedMessage]})
}