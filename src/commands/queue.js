
module.exports = function (invokedMessage) {

    if (arguments.lenght > 2) {
        this.wrongUsage(invokedMessage, this.name)
        
        return
    }

    let queue;

    /**
     * If there is not Music Controller present or there are no songs in queue
     */
    try {
        queue = this.controller.MusicController.queue
        if (queue.length === 0) {
            this.reply("No songs in queue.")
            return
        }
    } catch (err) {
        this.reply("No songs in queue.")

        return
    }


    
    let response = "**Current queue:** " + " ```"
    let counter = 1;
    for (const song of queue) {
        let line = ""
        if (counter === 1) {

            line = "Playing:  " + song.videoTitle + "\n\n"
        } else {
            line = counter + "- " + song.videoTitle + "\n\n"
        }
        counter += 1;
        response = response + line;
    }
    response = response + "```"
    
    this.reply(response)

}