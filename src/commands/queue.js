
module.exports = function (invokedMessage, num) {

    if (arguments.lenght > 2) {
        this.wrongUsage(invokedMessage, this.name)
        
        return
    }


    const queue = this.controller.MusicController.queue

    if (queue.length === 0) {
        invokedMessage.channel.send("No songs in queue.")
        return
    }
    console.log("Current queue: " + queue)
    let response = "**Current queue:** " + " ```"
    let counter = 1;
    for (const song of queue) {
        const line = counter + "-   " + song.videoTitle + "\n\n"
        counter += 1;
        response = response + line;
    }
    response = response + "```"
    
    invokedMessage.channel.send(response)

}