const { logger } = require("../logger");
const { MessageEmbed } = require('discord.js')
const MusicController = require("./MusicPlayer/MusicControllerLavalink");
const SubscriptionManager = require('./SubscriptionManager')


const musicPlayerCommands = ["play", "skip", "pause", "playnext", "queue", "resume", "skip", "status", "stop", "votetoskip"]

module.exports = class Controller {
        
    constructor(db, client, MsgHandler, guild, shoukaku) {

        this.PREFIX = "/"
        this.debugMode = false
        this.guild = guild
        this.client = client;
        this.MsgHandler = MsgHandler;
        this.MusicController = new MusicController(this, shoukaku)
        this.SubscriptionManager = new SubscriptionManager(guild, db)
        this.db = db
        this.commands = null
        
        this.client.application.fetch().then((app) => {
            this.oddiz = app.owner
        })
        
        this.roleColor = guild.me.roles?.color?.color || "#e9b463"
    }
    
    init = async () => {
        const populateCommands = require('../botCommands')
        this.commands = populateCommands(this)
        const self = this
        
        //check if bot needs to deploy slash commands
        this.guild.commands.fetch().then( commands => {
            if (commands.size !== self.commands.length ) {
                logger.log("info", "Deploying slash commands")
                this.deploySlashCommands()
            } else {
                //commands are up to date
            }
        })
        
        try {
            let dbGuildObject = await this.db.collection('guilds').findOne({guild_id: this.guild.id})
            if(!dbGuildObject) {
                dbGuildObject = {
                    guild_id: this.guild.id,
                    guild_name: this.guild.name,
                    owner_id: this.guild.ownerId
                }
            }
            await this.updateGuildInfoOnDatabase()
            await this.applyGuildSettings(dbGuildObject)
            await this.SubscriptionManager.init(dbGuildObject)
            
        } catch (error) {
            console.log("Error while trying to init controller on database related things: ", error)
        }
        
        
        this.controllerMaintainer()
        logger.log("info", "Controller initialized for guild: " + this.guild.name)


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

    updateGuildInfoOnDatabase = async (dbGuildObject) => {
        
        await this.db.collection('guilds').updateOne(
            {
                guild_id: this.guild.id
            },
            {
                $set: {
                    guild_name: this.guild.name,
                    owner_id: this.guild.ownerId,
                }
            },
            {
                upsert:true
            }
        )
        return
    }

    applyGuildSettings = async (dbGuildObject) => {
        const settings = dbGuildObject?.settings
        //apply settings to music controller
        if (settings) {
            this.MusicController.applySettings(settings)
        }
    }

    saveGuildSettings = async () => {
        try {
            const settings = {
                autoplay: this.MusicController.autoplay,
                skipVotingEnabled: this.MusicController.skipVotingEnabled,
                skipVotingPassPercentage: this.MusicController.skipVotingPassPercentage
            }

            await this.db.collection('guilds').updateOne(
                {
                    guild_id: this.guild.id
                },
                {
                    $set:{
                        settings: settings
                    }
                },
                {
                    upsert: true
                }
            )
            
        } catch (error) {
            
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
        newEmbed.addField(`Discord didn't register your message as a command!`,
                        `Make sure to press tab or enter after you typed /${responseObj.command}!`
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

    async handleButtonInteraction(interaction) {
        
        if(!interaction.deferred) {
            interaction.deferReply()
            if (!interaction.replied) {
                interaction.reply({content: interaction.customID + " clicked"})

            } else {
                interaction.editReply({content: interaction.customID + " clicked"})
            }
        }

    }
    async handleInteraction(interaction) {
        if (interaction.user.bot) return;
        
        if(interaction.isButton()) {
            console.log(interaction.customID)
            this.handleButtonInteraction(interaction)

            return
        }

        
        const commandName = interaction.commandName

        if(musicPlayerCommands.includes(commandName)) {
            this.MusicController.lastInvokedChannel = interaction.channel
        }

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