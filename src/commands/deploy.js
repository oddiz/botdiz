const { logger } = require("../logger");

module.exports = async function(invokedMessage) {
    
    try {
        const guildOwner = await invokedMessage.guild.fetchOwner()
        const guildOwnerId = guildOwner.user.id
    
        let messageUserId;
    
        if (this.lastIsInterraction) {
            messageUserId = invokedMessage.user.id
        } else {
            messageUserId = invokedMessage.author.id
        }
    
        if (messageUserId == this.controller.oddiz.id || messageUserId == guildOwnerId) {
    
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
        
    } catch (error) {
        logger.log("error", "Error while executing deploy command: ", error)
    }
}