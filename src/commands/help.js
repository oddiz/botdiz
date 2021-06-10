module.exports = function(invokedMessage, commandName) {
    if (arguments.length > 2) {

        this.wrongUsage(invokedMessage, this.name)
        
        return
    }

    const Discord = this.controller.discord
    let embedMessage = new Discord.MessageEmbed()
    const PREFIX = this.controller.PREFIX

    embedMessage = embedMessage
        .setColor("#e9b463")
        .setThumbnail("https://i.imgur.com/pW7874x.jpeg")
        .setTimestamp()
    if (commandName) {
        const foundCommand = this.controller.commands.find( ( { name } ) => name === commandName )
        if (foundCommand) {
            embedMessage = embedMessage
                .setTitle(PREFIX + foundCommand.name)
                .addField("Description", foundCommand.description)
                .addField("Usage", foundCommand.usage)

            invokedMessage.channel.send(embedMessage)
            
            return
        } else {
            invokedMessage.channel.send(`Unable to find command: ${PREFIX + commandName}`)
        }
    }

    embedMessage = embedMessage
        .setTitle("Botdiz Help Menu")
        .setDescription("Below are all the things Botdiz can do")
        
    for (const command of this.controller.commands) {
        
        embedMessage = embedMessage.addField(
            PREFIX + command.name,
            "```" +`Description: ${command.description}\n\nUsage: ${command.usage}` + "```",
            true
        )
    } 
    

    invokedMessage.channel.send(embedMessage)
}