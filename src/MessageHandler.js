class MsgHandler {
    static logger = require("./logger").logger 

    constructor(message, prefix) {
        this.message = message
        this.message_content = message.content;
        this.prefix = prefix

        const parsed = this.parseMessage()
        this.command = parsed[1] || ""
        this.args = parsed[2].split(" ") || []
        
    }

    parseMessage() {
        try {
            const message_re = new RegExp(`^${this.prefix}([a-zA-Z0-9]*) *(.*)`, "g" )
            
    
            const matches = message_re.exec(this.message_content)
            
            return matches
            
        } catch (error) {
            MsgHandler.logger.log("error","Couldn't parse string: " + error)
            return false
        }
    }

    run() {

        return {
            command: this.command,
            args: this.args
        }
    }
}


module.exports = MsgHandler