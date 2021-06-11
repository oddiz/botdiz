const Command = require("./Command");
const { logger } = require("./MessageHandler");

module.exports = class Controller {
    
    
    
    constructor(discord, client, MsgHandler) {

        this.PREFIX = "!"
        this.debugMode = false

        this.discord = discord
        this.client = client;
        this.MsgHandler = MsgHandler;


        this.commands = []
    }

    init() {
        this.client.on('ready', () => {
            this.client.user.setActivity(`${this.PREFIX}help`, {type: 'LISTENING'})
        });
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

        const w2g = new Command(
            this,
            {
                name: "w2g",
                description: "Creates a watch2gether room",
                needArgs: true,
                usage: "!w2g https://www.youtube.com/watch?v=<video id>\n\n!w2g badgers"
            },
            require("./commands/w2g")
        )
        this.commands.push(w2g)

        const play = new Command(
            this,
            {
                name: "play",
                description: "Plays song from a link or finds from search.",
                needArgs: true,
                usage:"!play https://www.youtube.com/watch?v=<video id>\n\n!play https://open.spotify.com/track/<track id>\n\n!play badgers"
            },
            require("./commands/play")
        )
        this.commands.push(play)
        
        const clear = new Command(
            this,
            {
                name: "clear",
                description: "Clears channel. Use with caution!",
                needArgs: true,
                usage:"!clear <amount of message to delete>"
            },
            require("./commands/clear")
        )
        this.commands.push(clear)
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