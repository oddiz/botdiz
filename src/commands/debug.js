module.exports = function(invokedMessage, option) {
    //takes "on" or "off" as argument
    if (arguments.length > 2 || !(option === "on" || option === "off" || option === "") ) {
        this.wrongUsage(invokedMessage, this.name)
        
        return
    }
    
    if (this.controller.toggleDebug(option)) {
        invokedMessage.channel.send("Debug mode is now on.")
    } else {
        invokedMessage.channel.send("Debug mode is now off.")
    }
}