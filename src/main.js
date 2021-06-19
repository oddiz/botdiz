require('dotenv').config()

const Discord = require('discord.js')
const client = new Discord.Client( { intents: [
    Discord.Intents.ALL
]});

const MsgHandler = require('./MessageHandler.js');
const MusicController = require('./MusicController');
const Ctrl = require('./Controller.js');
let GuildControllers = []
/*
const winston = require('winston')
const logger = winston.createLogger({
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: 'log' }),
	],
	format: winston.format.printf(log => `[${log.level.toUpperCase()}] - ${log.message}`),
});
*/
const { logger } = require("./logger")

client.on('ready', () => {
    client.user.setActivity(`/help`, {type: 'LISTENING'})
    for (const guild of client.guilds.cache) {
        
        
        const Controller = new Ctrl(Discord, client, MsgHandler, guild[1]) ;
        Controller.init()
        
        GuildControllers.push({
            guildId: guild[0],
            guildObj: guild[1],
            controller: Controller
        })
        logger.log("info", `Creating controller for guild: ${guild[1].name}.`)
    }

    logger.log('info', 'The bot is online!')
});
client.on('debug', m => logger.log('debug', m));
client.on('warn', m => logger.log('warn', m));
client.on('error', m => logger.log('error', m));

client.on("message", message => {
    if (message.interaction) {return}
    let messageGuildId = message.guild.id
    const guildController = GuildControllers.find( ({ guildId }) => guildId === messageGuildId ).controller 
    guildController.handleMessage(message);
})

client.on("interaction", interaction => {
    let messageGuildId = interaction.guild.id
    const guildController = GuildControllers.find( ({ guildId }) => guildId === messageGuildId ).controller 
    guildController.handleInteraction(interaction);
});

client.on("rateLimit", data => {
    console.error("Rate limit achieved: ")
    console.error(data)
});

client.on("guildCreate", guild => {
    const Controller = new Ctrl(Discord, client, MsgHandler, guild) ;
    Controller.init()
    
    GuildControllers.push({
        guildId: guild.id,
        guildObj: guild,
        controller: Controller
    })
    logger.log("info", `${guild.name} controller added.`)
    
});

client.on("guildDelete", guild => {
    
    const deletedGuildId = guild.id
    for (const [index, guildObj] of GuildControllers.entries()) {
        if (guildObj.guildId == deletedGuildId) {
            guildObj.controller.destroy()
            guildObj.controller = null;
            GuildControllers.splice(index, 1)
        }
    }
    logger.log("info", `${guild.name} controller removed.`)

});

client.login(process.env.DISCORD_TOKEN)