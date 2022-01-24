require('dotenv').config()

const { logger } = require("./logger")
const Discord = require('discord.js')
const client = new Discord.Client( { intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_VOICE_STATES,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
]});

const { Shoukaku } = require("shoukaku")
const dbManager = require('../server_src/db/DatabaseManager')
const MsgHandler = require('./modules/MessageHandler.js');
const Ctrl = require('./modules/Controller.js');
const ShoukakuHandler = require("./Shokaku/ShokakuHandler")
const updateEpicDeals = require("./scripts/updateEpicDeals")

let GuildControllers = []


async function main() {
    
    const shoukaku = new ShoukakuHandler(client)
    
    const databaseManager = new dbManager
    const db = await databaseManager.connect()
    
    client.on('ready', async () => {
        client.user.setActivity(`/help`, {type: 'LISTENING'})
        
        if(process.env.NODE_ENV === "development") {
            if(client.username !== "botdiz testing [alpha]") {
                client.user.setUsername("botdiz testing [alpha]")
            }
        } else {
            if(client.username !== "botdiz [alpha]") {
                client.user.setUsername("botdiz [alpha]")
            }
        }
        
        await updateEpicDeals(db)
        setInterval(updateEpicDeals, 1000 * 60 * 30, db)
        await client.guilds.fetch()
        for (const guild of client.guilds.cache) {
            const Controller = new Ctrl(db, client, MsgHandler, guild[1], shoukaku) ;
            Controller.init()
            
            GuildControllers.push({
                guildId: guild[0],
                guildObj: guild[1],
                controller: Controller
            })
            logger.log("info", `Creating controller for guild: ${guild[1].name}.`)
        }
        
        logger.log('info', 'The bot is online!')
        await shoukaku.ready()
    });
    client.on('debug', m => logger.log('debug', m));
    client.on('warn', m => logger.log('warn', m));
    client.on('error', m => logger.log('error', m));
    
    client.on("messageCreate", message => {
        if (message.interaction) {return}
        let messageGuildId = message.guild.id
        const guildController = GuildControllers.find( ({ guildId }) => guildId === messageGuildId ).controller 
        guildController.handleMessage(message);
    })
    
    client.on("interactionCreate", interaction => {
        let messageGuildId = interaction.guild.id
        const guildController = GuildControllers.find( ({ guildId }) => guildId === messageGuildId ).controller 
        guildController.handleInteraction(interaction);
        
    });
    
    client.on("rateLimit", data => {
        console.error("Rate limit achieved: ")
        console.error(data)
    });
    
    client.on("guildCreate", async guild => {
        const Controller = new Ctrl(db, client, MsgHandler, guild, shoukaku) ;
        await Controller.init()
        
        GuildControllers.push({
            guildId: guild.id,
            guildObj: guild,
            controller: Controller
        })
        logger.log("info", `${guild.name} controller added succesfully.`)
        
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
    
    if (process.env.NODE_ENV == "development") {
        client.login(process.env.DISCORD_TESTBOT_TOKEN)
    } else {
        client.login(process.env.DISCORD_TOKEN)
    }
}

 


main()

module.exports = {
    client: client,
    GuildControllers: GuildControllers
}