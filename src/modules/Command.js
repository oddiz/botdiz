const { logger } = require("../logger");

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
        this.ephemeral = config.ephemeral;

        this.options = false;
        if (config.options) {
            this.options = config.options
        }

        this.lastInvokedMessage;
        this.lastIsInteraction;

    }

    async execute(invokedMessage, args, isInteraction) {
        this.lastInvokedMessage = invokedMessage;
        this.lastIsInterraction = isInteraction;
        
        if (isInteraction) {
            await this.lastInvokedMessage.deferReply({ ephemeral: this.ephemeral })
        }

        try {
            if(!this.noBind) {
                const boundFunc = this.func.bind(this)
                
                if(Array.isArray(args)){
    
                    boundFunc(invokedMessage, ...args)
                } else {
                    boundFunc(invokedMessage, args)
                }
            } else {
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

    async reply(content, options = { followup: false, new:false, required: true }) {
        try {
            function isEmpty(map) {
                return map && map.size === 0
            }
    
            if(!this.lastInvokedMessage) {
                // no message to reply
                return
            }
    
            
            //check if invoked message is still there
            const lastInvokedChannel = await this.lastInvokedMessage?.channel?.fetch(true)
            if(!lastInvokedChannel) {
                return
            }
            const foundMessage = await lastInvokedChannel.messages.fetch(this.lastInvokedMessage)
    
            //if not there send normal message and return
            if(isEmpty(foundMessage)) {
                if(options.required) {
                    return await lastInvokedChannel.send(content)
                }
                return
            }
            
    
            if(this.lastIsInterraction) {
                //if we have interaction
    
                if (foundMessage.deffered && !foundMessage.replied) {
                    return this.lastInvokedMessage.reply(content)
                }
                
                //if followup option is passed or found message is deffered but not replied yet
                if (options.followup) {
                    return this.lastInvokedMessage.followUp(content)
                    
                } 
                
                if (options.new) {
                    this.lastInvokedMessage = await this.lastInvokedMessage.channel.send(content)
                    this.lastIsInterraction = false
    
                    return this.lastInvokedMessage
                }
    
                return await this.lastInvokedMessage.editReply(content).catch(async err=> {
                    console.log(err + " -> Can't edit Last Invoked Message")
    
                    if(options.new && options.required) {
                        this.lastInvokedMessage = await this.lastInvokedMessage.channel.send(content)
                        this.lastIsInterraction = false
    
                        return this.lastInvokedMessage
                    }
                })
            
    
            } else {
                //if normal command
                if (options.required) {
                    this.lastInvokedMessage = await this.lastInvokedMessage.channel.send(content)
                    this.lastIsInterraction = false
    
                    return this.lastInvokedMessage
                }
            }
            
        } catch (error) {
            console.log("Failed to reply to command: \n" + error)
        }
    }

    convertSlashCommand() {
        let command = {
            name: this.name,
            description: this.description
        }

        if (this.options) {
            command.options = this.options
        }

        return command
    }
    wrongUsage(invokedMessage, commandName, errText = "Wrong usage of command!") {
        
        
        //notify chat about the wrong usage
        if (errText !== "") {
            this.reply(`${errText}`)
        }   

        //show help of specified command
        const helpCommand = this.controller.commands.find( ( { name } ) => name === "help" )

        helpCommand.execute(invokedMessage, commandName)

        return
    }
}