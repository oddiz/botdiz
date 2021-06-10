const Command = require("./Command");
const { logger } = require("./MessageHandler");

module.exports = class Controller {
    
    
    
    constructor(discord, client, MsgHandler) {

        this.PREFIX = "!"

        this.discord = discord
        this.client = client;
        this.MsgHandler = MsgHandler;

        this.debugMode = true

        this.commands = []
    }

    init() {
        //initialize commands
        const debug = new Command(
            this,
            {
                name: "debug",
                description: "Toggles debug Mode",
                needArgs:false,
                usage: "!debug on/off or !debug"
            },
            require("./commands/debug")
        )
        this.commands.push(debug)
        //debug.execute(message, this.debugMode)

        const help = new Command(
            this,
            {
                name: "help",
                description: "Shows this message",
                needArgs: false,
                usage: "!help <command> or !help"
            },
            require("./commands/help")
        )
        this.commands.push(help)

    }
    
    handleMessage(message, controller) {
        if (message.author.bot || !message.content.startsWith(this.PREFIX)) return;

        const msgObj = new this.MsgHandler(message, this.PREFIX);
        const responseObj = msgObj.run()

        if (this.debugMode) {
            const response = `Command: ${responseObj.command}, Args: ${responseObj.args}`
            message.channel.send(response)
        }

        const foundCommand = this.commands.find( ( { name } ) => name === responseObj.command )
        if (foundCommand) {
            if (this.debugMode){
                logger.log("info", `Command found ${foundCommand.name}`)
                message.channel.send("Command found:\n" + foundCommand.name)
            }
            foundCommand.execute(message, responseObj.args)
        }
    }

    toggleDebug(options){
        if (options === "on"){
            this.debugMode = true
        } else if (options === "off") {
            this.debugMode = false
        } else {
            const curDebug = this.debugMode;
            this.debugMode = !curDebug
        }

        return(this.debugMode)
    }
}