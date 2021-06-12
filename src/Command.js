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
        this.noBind = config.noBind || false;
        this.func = func;

    }

    execute(invokedMessage, args) {
        try {
            if(!this.noBind) {
                console.log("WILL BIND")
                const boundFunc = this.func.bind(this)
                //const boundFunc = this.func
                
                if(Array.isArray(args)){
    
                    boundFunc(invokedMessage, ...args)
                } else {
                    boundFunc(invokedMessage, args)
                }
            } else {
                console.log("WONT BIND")
                if(Array.isArray(args)){
    
                    this.func(invokedMessage, ...args)
                } else {
                    this.func(invokedMessage, args)
                }
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