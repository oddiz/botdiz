const { logger } = require('../logger')
module.exports = async function (invokedMessage) {
    try {
        const guildmember = await invokedMessage.member.fetch()
    
        const deleteAmount = invokedMessage.options.getInteger("amount")
        
        if (!guildmember.permissions.has("MANAGE_MESSAGES")){
            this.reply("You do not have enough permissions to use this command.")
            
            return 
        }
    
        if (deleteAmount <= 100 && deleteAmount > 0){
            await invokedMessage.channel.bulkDelete(deleteAmount, true)
        } else {
            this.wrongUsage(invokedMessage,this.name, "Can't delete more than 100 messages or less then 1 (duh).")
        }
    
        this.reply({content: `Deleted ${deleteAmount} messages`,  ephemeral: true })
        
    } catch (error) {
        logger.log("error", "Error while executing clear command: ", error)
    }

}
