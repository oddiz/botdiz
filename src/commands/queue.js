const { logger } = require('../logger')
module.exports = function (invokedMessage) {

    try {
        if (arguments.lenght > 2) {
            this.wrongUsage(invokedMessage, this.name)
            
            return
        }
    
        let queue,current;
    
        /**
         * If there is not Music Controller present or there are no songs in queue
         */
        try {
            current = this.controller.MusicController?.getCurrentSong()
            queue = this.controller.MusicController?.queue
            if (queue.length === 0 && !current) {
                this.reply("No songs in queue.")
                return
            }
        } catch (err) {
            logger.log("error", "Error trying to get queue or current@queue.js", err)
    
            return
        }
    
        try {
            let response = "**Current queue:**" + " ```apache\n"
            
            response = response + "Playing: " + current.videoTitle + "\n\n";
            let counter = 1;
            for (const song of queue) {
                let line = ""
                
                line = counter + "- " + song.videoTitle + "\n\n"
                
                counter += 1;
                response = response + line;
            }
            response = response + "```"
            
            this.reply(response)
            
        } catch (error) {
            this.reply("Queue is probably bugged atm. Contact my dad.")
        }
        
    } catch (error) {
        logger.log("error", "Error while executing queue command : ", error)
    }

    

}