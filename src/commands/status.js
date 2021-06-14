module.exports = function (invokedMessage) {
    
    if (this.controller.MusicController.dispatcher.destroyed) {
        this.wrongUsage(invokedMessage, this.name, "Nothing is currently playing.")
    }

    
}