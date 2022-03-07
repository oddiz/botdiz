import { logger } from '@src/logger'
import { Message } from 'discord.js'
export class MsgHandler {

    private message: Message;
    private message_content: string;
    private prefix: string;
    private command: string;
    private args: string[];

    constructor(message: Message, prefix: string) {
        this.message = message
        this.message_content = message.content;
        this.prefix = prefix

        this.command = ""
        this.args = []
        this.parseMessage()
    }

    /**
     * A function that parses the incoming message and extracts the command and arguments.
     * 
     * Returns true if successful, false if not.
     * 
     * @returns {boolean}
     */
    parseMessage(): boolean {
        try {
            const message_re = new RegExp(`^${this.prefix}([a-zA-Z0-9]*) *(.*)`, "g" )
            
    
            const matches = message_re.exec(this.message_content)

            if (matches) {
                
                this.command = matches[1] || ""
                this.args = matches[2].split(" ") || []

            }

            
            return true
            
        } catch (error) {
            logger.log("error","Couldn't parse string: " + error)
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
