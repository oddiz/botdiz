
module.exports = function (invokedMessage, num) {
    if (!invokedMessage.member.hasPermission('MANAGE_MESSAGES')){
        invokedMessage.reply("You do not have enough permissions to use this command.")
        
        return 
    }

    if (arguments.lenght > 2 || isNaN(parseInt(arguments[1]))) {
        this.wrongUsage(invokedMessage, this.name)
        
        return
    }

    invokedMessage.channel.bulkDelete(num, true)

}