const { logger } = require("../logger");

module.exports = async function (invokedMessage) {
    try {
        //check if user has permissions to use this command
        const user = await invokedMessage.member.fetch()
    
        if(user.permissions.has("ADMINISTRATOR") || user.permissions.has("MANAGE_GUILD")) {
            const MusicController = this.controller.MusicController
        
            MusicController.skipVotingEnabled = !MusicController.skipVotingEnabled
        
            this.controller.saveGuildSettings()
            
            this.reply({ content: `\`Voting to skip songs is now ${MusicController.skipVotingEnabled? "enabled":"disabled"}.\``})
        } else {
            this.reply({ content: `\`Only administrators can change this setting!\``})
        }
        
    } catch (error) {
        
    }
}