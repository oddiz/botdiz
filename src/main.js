require('dotenv').config()

const { logger } = require("./logger")
const Discord = require('discord.js')
const client = new Discord.Client( { intents: [
    Discord.Intents.ALL
]});

const dbManager = require('../server_src/db/DatabaseManager')
const MsgHandler = require('./MessageHandler.js');
const MusicController = require('./MusicController');
const Ctrl = require('./Controller.js');
const axios = require('axios')
const hash = require('object-hash')
let GuildControllers = []



client.on('ready', async () => {
    client.user.setActivity(`/help`, {type: 'LISTENING'})
    const databaseManager = new dbManager
    const db = await databaseManager.connect()

    await updateEpicDeals(db)
    setInterval(updateEpicDeals, 1000 * 60 * 30, db)
    for (const guild of client.guilds.cache) {
        const Controller = new Ctrl(db, client, MsgHandler, guild[1]) ;
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

if (process.env.NODE_ENV == "development") {
    client.login(process.env.DISCORD_TESTBOT_TOKEN)
} else {
    client.login(process.env.DISCORD_TOKEN)
}

async function updateEpicDeals(db) { 

    try {

        const dbDeals = await db.collection('subscription_content').findOne(
            {
                type: "epic_deals"
            }
        )

        if (dbDeals && dbDeals.next_update_time > new Date().getTime()) {
            return
        }
        const epicApiUrl = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"
    
        const epicApiReply = await axios.get(epicApiUrl, { 
            headers:{
                "content-type": "application/json; charset=utf-8"
            }
        })

        if (epicApiReply.status !== 200) {

            logger.log("error", "Couldn't reach epic API status code: "+ result.status)
            return
        }

        let epicGames = []
        let nextUpdateTime = Infinity
        for (element of epicApiReply.data.data.Catalog.searchStore.elements){
            
            if(!element.promotions) {
                continue
            }

            const currentDate = new Date().getTime()
            const gameTitle = element.title
            const isActive = element.promotions?.promotionalOffers && element.promotions?.promotionalOffers.length > 0? true : false
            
            const epicDealObject = {
                gameTitle: gameTitle,
                isActive: isActive,
                thumbnail: element.keyImages[2].url
            }
            
            if (!isActive) {
                const effectiveDate = Date.parse(element.promotions.upcomingPromotionalOffers[0].promotionalOffers[0].startDate)
                const dateDiff = effectiveDate - currentDate
                if (dateDiff > 1000 * 60 * 60 * 24 * 60) {
                    continue
                } else {
                    epicDealObject.activateTime = effectiveDate
    
                    nextUpdateTime = Math.min(effectiveDate, nextUpdateTime)
                }
            }
            
            epicGames.push(epicDealObject)
        }

        const dealGamesHash = hash(epicGames, { unorderedArrays: true})

        const epicDealsDatabaseObject = {
            type: "epic_deals",
            next_update_time: nextUpdateTime,
            current_content: epicGames,
            current_content_hash: dealGamesHash
        }

        db.collection('subscription_content').updateOne(
            {
            type: "epic_deals"
            },
            {
                $set: epicDealsDatabaseObject
            },
            {
                upsert: true
            }
        )

        return epicDealsDatabaseObject
    } catch (error) {
        console.log("Error updating epic deals: ", error)
    }


} 

module.exports = {
    client: client,
    GuildControllers: GuildControllers
}