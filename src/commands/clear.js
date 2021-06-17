
module.exports = async function (invokedMessage, num) {
    const guildmember = await invokedMessage.member.fetch()
    
    if (!guildmember.permissions.has("MANAGE_MESSAGES")){
        this.reply("You do not have enough permissions to use this command.")
        
        return 
    }

    if (arguments.lenght > 2 || isNaN(parseInt(arguments[1]))) {
        this.wrongUsage(invokedMessage, this.name)
        
        return
    }

    if (num <= 100){
        await invokedMessage.channel.bulkDelete(num, true)
    } else {
        this.wrongUsage(invokedMessage,this.name, "Value should be less than or equal to 100.")
    }

    this.reply({content: `Deleted ${num} messages`,  ephemeral: true })

}