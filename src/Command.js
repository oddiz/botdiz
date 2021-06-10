const { logger } = require("./MessageHandler");

module.exports = class Command {
    
    static logger = require("./logger").logger 
    /*
    config:
        {
            name: help
            description: lists all the commands.
            needArgs: true,
            usage: 
        } 
    inv

    */
    

    constructor (controller, config, func) {

        this.controller = controller
        
        this.name = config.name;
        this.description = config.description;
        this.needArgs = config.needArgs;
        this.usage = config.usage;
        
        this.func = func;

    }

    execute(invokedMessage, args) {
        try {
            const boundFunc = this.func.bind(this)
            
            if(Array.isArray(args)){
                console.log("args are array", args)
                boundFunc(invokedMessage, ...args)
            } else {
                boundFunc(invokedMessage, args)
            }

        } catch (error) {
            logger.log("error", `Error while trying to execute command: ${this.name}\n, Error: ${error}`)
        }

    }
    wrongUsage(invokedMessage, commandName, errText = "Wrong usage of command!") {
        
        invokedMessage.channel.send(`${errText}`)

        const helpCommand = this.controller.commands.find( ( { name } ) => name === "help" )

        helpCommand.execute(invokedMessage, commandName)

        return
    }
}