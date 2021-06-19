const { logger } = require("./logger");

module.exports = class Controller {
    
    
    
    constructor(discord, client, MsgHandler, guild) {

        this.PREFIX = "!"
        this.debugMode = false
        this.guild = guild
        this.discord = discord
        this.client = client;
        this.MsgHandler = MsgHandler;
        this.MusicController;
        this.commands = require('./botCommands')

        this.client.application.fetch().then((app) => {
            this.oddiz = app.owner
        })
    }

    init() {
        
        const populateCommands = require('./botCommands')
        this.commands = populateCommands(this)
        this.deploySlashCommands()
    }

    deploySlashCommands() {
        let slashCommands = [];

        for (const command of this.commands) {
            slashCommands.push(command.convertSlashCommand())
        }
        
        this.guild.commands.set(slashCommands)
    }

    destroy() {
        this.MusicController?.stop();
        this.MusicController = null;
    }
    
    handleMessage(message) {
        if (message.author.bot || !message.content.startsWith(this.PREFIX)) return;

        const msgObj = new this.MsgHandler(message, this.PREFIX);
        const responseObj = msgObj.run()

        /*
        {
            command: this.command,
            args: this.args
        } 
        */

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

    async handleInteraction(interaction) {
        if (interaction.user.bot) return;

        const commandName = interaction.commandName
        const args = interaction.options.map(option => option.value)

        
        if (this.debugMode) {
            
        }

        const foundCommand = this.commands.find( ( { name } ) => name === commandName )
        if (foundCommand) {
            if (this.debugMode){
                logger.log("info", `Command found ${foundCommand.name}`)
                //message.channel.send("Command found:\n" + foundCommand.name)
            }
            foundCommand.execute(interaction, args, true)
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