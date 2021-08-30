const { logger } = require("./logger");
const { MessageEmbed } = require('discord.js')
const MusicController = require("./Shokaku/MusicControllerLavalink");
const SubscriptionManager = require('./SubscriptionManager')

module.exports = class Controller {
        
    constructor(db, client, MsgHandler, guild, shoukaku) {

        this.PREFIX = "/"
        this.debugMode = false
        this.guild = guild
        this.client = client;
        this.MsgHandler = MsgHandler;
        this.MusicController = new MusicController(this, shoukaku)
        this.SubscriptionManager = new SubscriptionManager(guild, db)
        this.commands = null

        this.client.application.fetch().then((app) => {
            this.oddiz = app.owner
        })

        this.roleColor = guild.me.roles?.color?.color || "#e9b463"
    }

    init = () => {
        const populateCommands = require('./botCommands')
        this.commands = populateCommands(this)
        const self = this
        this.guild.commands.fetch().then( commands => {
            if (commands.size !== self.commands.length ) {
                logger.log("info", "Deploying slash commands")
                this.deploySlashCommands()
            } else {
                //commands are up to date
            }
        })

        this.controllerMaintainer()
        this.SubscriptionManager.init()

    }

    controllerMaintainer = async () => {
        let aloneInVoice = false
        const tenMinutes = 1000 * 60 * 10
        while (true) {
            try {
                await new Promise(resolve => setTimeout(resolve, tenMinutes))
    
                const connectedVoiceChannelMembers = this.guild.me.voice.channel?.members
                let members = []
                connectedVoiceChannelMembers.each((member) => {
                    members.push(member.user)
                })

                // if bot is the only member of the voice channel first let the maintainer know bot is alone so it will kill the voice connection next pass 
                if (members.length === 1 && aloneInVoice) {
                    this.MusicController.stop()
                    this.MusicController.disconnectFromVoiceChannel()
                    aloneInVoice = false
                } else if (members.length === 1) {
                    aloneInVoice = true
                } else {
                    aloneInVoice = false
                }
                
            } catch (error) {
                //fail silently
                aloneInVoice = false
            }
        }

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
        let newEmbed = new MessageEmbed
        newEmbed.addField(`Use /${responseObj.command}`,
                        "Botdiz is now using latest slash command tech."
                        )
                .setColor("#e9b463")
                        
       message.channel.send({ embeds: [newEmbed]})

       return
        /*
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
        */
    }
    async handleInteraction(interaction) {
        if (interaction.user.bot) return;
        
        if(interaction.isButton()) {
            console.log(interaction.customID)
            if(!interaction.deferred) {
                interaction.deferReply()
                if (!interaction.replied) {
                    interaction.reply({content: interaction.customID + " clicked"})

                } else {
                    interaction.editReply({content: interaction.customID + " clicked"})
                }
            }

            return
        }

        const commandName = interaction.commandName
        const args = null
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