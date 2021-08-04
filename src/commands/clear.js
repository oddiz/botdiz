
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

    if (num <= 100 && num > 0){
        await invokedMessage.channel.bulkDelete(num, true)
    } else {
        this.wrongUsage(invokedMessage,this.name, "Can't delete more than 100 messages or less then 1 (duh).")
    }

    this.reply({content: `Deleted ${num} messages`,  ephemeral: true })

}
