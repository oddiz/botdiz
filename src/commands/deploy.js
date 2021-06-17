module.exports = async function(invokedMessage) {
    
   
    let guildOwner = await invokedMessage.guild.fetchOwner()
    guildOwner = guildOwner.user
    console.log(guildOwner)
    if (invokedMessage.author == this.controller.oddiz || invokedMessage.author == guildOwner) {
        console.log("this is me or guild owner")
        let slashCommands = [];

        for (command of this.controller.commands) {
            slashCommands.push(command.convertSlashCommand())
        }
        
        await invokedMessage.guild.commands.set(slashCommands)

        this.reply("Slash commands are registered!")

        return
    } else {
        this.reply("You cannot use this command. Needs to be guild owner or goddiz")
        return
    }
}