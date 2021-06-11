const { logger } = require("./logger");

module.exports = class Command {
    
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

                boundFunc(invokedMessage, ...args)
            } else {
                boundFunc(invokedMessage, args)
            }

        } catch (error) {
            logger.log("error", `Error while trying to execute command: ${this.name}\n, Error: ${error}`)
        }

    }
    wrongUsage(invokedMessage, commandName, errText = "Wrong usage of command!") {
        //notify chat about the wrong usage
        invokedMessage.channel.send(`${errText}`)

        //show help of specified command
        const helpCommand = this.controller.commands.find( ( { name } ) => name === "help" )

        helpCommand.execute(invokedMessage, commandName)

        return
    }
}