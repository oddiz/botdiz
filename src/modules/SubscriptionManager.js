const { logger } = require("../logger");
const axios = require('axios')

module.exports = class SubscriptionManager {
    constructor(guild, db) {
        this.guild = guild
        this.db = db
        this.subscriptions = new Map()
        this.stopLoop = false
        /* 
        {
            "epic_deals" : {
                type: "epic_deals",
                subscribed_channel: channelId,
                last_posted_channel: channelId
                last_posted_content_hash: hash,
                current_content_hash: hash
                current_content: [games]

            }
        }
        */

    }

    init = async() => {
        await this.getGuildSubscriptions()

        this.runLoop()
    }

    runLoop = async () => {
        try {
            this.stopLoop = false
    
            if(this.looping) {
                console.log("Already looping")
                return
            }
            this.looping = true

            while (!this.stopLoop) {
    
                const { dbGuildSubs } = await this.getGuildSubscriptions()
                

                const epicSubObject = this.subscriptions.get("epic_deals")
                if (epicSubObject) {
                    if ((epicSubObject.last_posted_content_hash !== epicSubObject.current_content_hash) ||
                        (epicSubObject.subscribed_channel !== epicSubObject.last_posted_channel)
                    )  {

                        //post new epic message
                        await this.sendEpicDeals(epicSubObject.subscribed_channel).catch(error => {

                            if (error === "Channel not found") {
                                //deactivate subscription
                                for(const sub of dbGuildSubs) {
                
                                    if (sub.type === "epic_deals") {
                                        sub.active = false
                                    }
                                }
                                //update db
                                this.db.collection('guilds').updateOne(
                                    {
                                        guild_id: this.guild.id
                                    }, 
                                    {
                                        $set: {
                                            subscriptions: dbGuildSubs
                                        }
                                    },
                                    {
                                        upsert:true
                                    }
    
                                )
                            }

                            return
                        })
                        
                        try {
                            for(const sub of dbGuildSubs) {
                
                                if (sub.type === "epic_deals") {
                                    sub.last_posted_channel = epicSubObject.subscribed_channel
                                    sub.last_posted_content_hash = epicSubObject.current_content_hash
                                }
                            }
                            //update db
                            this.db.collection('guilds').updateOne(
                                {
                                    guild_id: this.guild.id
                                }, 
                                {
                                    $set: {
                                        subscriptions: dbGuildSubs
                                    }
                                },
                                {
                                    upsert:true
                                }

                            )
                        } catch (error) {
                            console.log("error while trying to update db", error)
                        }

                    } else {
                    }

                }







                await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 10))


            }
    
            this.looping = false
            console.log("Subscription loop stopped")
    
            return
            
        } catch (error) {
            console.log("Error while running subs loop: ",error)
        }
    }

    getGuildSubscriptions = async () => {

        try {
            const dbGuild = await this.db.collection('guilds').findOne({
                guild_id: this.guild.id
            })
    
            const dbGuildSubs = dbGuild?.subscriptions
    
            /* 
                guildSubs = [
                    {
                        type: "epic_deals",
                        active: true,
                        subscribed_channel: channelId,
                        last_posted_content_hash: hash,
                        current_content_hash: hash
                        current_content: [games]
                    },
                    ..
                ]
            */
            if (!dbGuildSubs || dbGuildSubs.length === 0) {
                this.subscriptions.clear()
            } else {
                for (const sub of dbGuildSubs) {
                    if (sub.active) {
                        const subObject = {
                            subscribed_channel: sub.subscribed_channel,
                            last_posted_content_hash: sub.last_posted_content_hash,
                            last_posted_channel: sub.last_posted_channel
                        }
                        const dbSubObject = await this.db.collection('subscription_content').findOne(
                            {
                                type: sub.type
                            }
                        )
                        
                        subObject.current_content_hash = dbSubObject.current_content_hash
                        subObject.current_content = dbSubObject.current_content
                        this.subscriptions.set(sub.type, subObject)

                    }
                }
            }
    
            return {    
                dbGuildSubs: dbGuildSubs
            }
            
        } catch (error) {
            console.log("Error while trying to get guild subscriptions.", error)
        }
    }

    sendEpicDeals = async (channelId, epicSubObj) => {


       const epicDealsSub = this.subscriptions.get("epic_deals")

        if(!epicDealsSub) {
            console.log("No epic deal sub found")

            return
        }

        let textChannel
        try {
            textChannel = await this.guild.channels.fetch(channelId)
            
        } catch (error) {
            console.log("Unable to fetch text channel")

            return
        }
        
        if (!textChannel) {
            throw "Channel not found"
        }
        
        const { MessageEmbed } = require('discord.js')
        let epicGames = epicDealsSub.current_content
        let activeDeals = []
        let futureDeals = []

        /* 
        epicGames = [
            {
                gameTitle: gameTitle,
                isActive: isActive,
                thumbnail: element.keyImages[2].url,
                activateTime?: time
            }
        ]
        */
        
        for (const epicGame of epicGames){
            
            
            
            if (epicGame.isActive) {
                //promotion active
                //console.log("Promotion active for: ", epicGame.title)
                
                
                
                let embedMessage = new MessageEmbed
                embedMessage
                    .setColor("#0FF28F")
                    .setTitle(epicGame.gameTitle)
                    .setThumbnail(epicGame.thumbnail)
                    .setTimestamp()
                    .setDescription("Free now on Epic Store!")


                activeDeals.push(embedMessage)
            } else {
                //promotion not active
                const effectiveDate = epicGame.activateTime
                const date = new Date()
                const currentDate = date.getTime()
                
                const dateDiff = effectiveDate - currentDate;
               
                const seconds = Math.floor((dateDiff / (1000) % 60))
                const minutes = Math.floor((dateDiff / (1000 * 60) % 60))
                const hours = Math.floor((dateDiff / (1000 * 60 * 60 )) % 24)
                const days = Math.floor(dateDiff / (1000 * 60 * 60 * 24))
                //console.log("Days: ", days , "hours: ", hours, "minutes:", minutes, "seconds: ", seconds)

                let embedMessage = new MessageEmbed
                embedMessage = embedMessage
                    .setColor("#CB462C")
                    .setTitle(epicGame.gameTitle)
                    .setThumbnail(epicGame.thumbnail)
                    .setTimestamp()
                    .setDescription(`Will be free in: **${days} Days** **${hours} Hours** **${minutes} Minutes** **${seconds} Seconds**`)

                futureDeals.push(embedMessage)
                
            }  
            
        }
        
        textChannel.send( {embeds: [...activeDeals, ...futureDeals]})

        

    }
        
        
}

/**
 * 
 * @param {*} reply 
 * @returns [
 *  {
 *      gameTitle: string,
 *      isActive: bool,
 *      activateTime: time in ms
 *  }
 * ]
 */
/* 

async function parseEpicDeals (reply) {
    try {
        let epicDealGames
        for (element of reply.data.data.Catalog.searchStore.elements) {
            const effectiveDate = Date.parse(element.effectiveDate)
            const currentDate = new Date().getTime()
            const dateDiff = effectiveDate - currentDate
            const gameTitle = element.title
            const isActive = dateDiff < 0 || (element.promotions && element.promotions.promotionalOffers.length > 0)? true : false
            
            const epicDealObject = {
                gameTitle: gameTitle,
                isActive: isActive,
                thumbnail: element.keyImages[2].url
            }
            
            if (!isActive && !(dateDiff > 1000 * 60 * 60 * 24 * 60)) {
                epicDealObject.activateTime = effectiveDate
            }
            
            epicDealGames.push(epicDealObject)
        }
        
        return epicDealGames
    } catch (error) {
        console.log("error")
    }
}

*/