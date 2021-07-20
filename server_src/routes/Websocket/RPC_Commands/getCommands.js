const Botdiz = require('../../../../src/main')
const failed = {
    status: "failed"
}
/**
 * Botdiz.client
 * Botdiz.GuildControllers
 *    {
 *       guildId: guild[0],
 *       guildObj: guild[1],
 *       controller: Controller
 *    }
 */

module.exports={
    RPC_getGuilds: async function() {
        try {
            const guilds = await Botdiz.client.guilds.cache
            
            
    
            const parsedGuilds = guilds.map(guild => {
                return {
                    id:guild.id,
                    icon:guild.icon
                }
            })
            //console.log(parsedGuilds)
            
    
            return parsedGuilds
            
        } catch (error) {
            console.log("Exception in RPC_getGuilds: ", error)
            return failed
        }
    },

    RPC_getTextChannels: async function(activeGuildId) {
        try {
            const guild = await Botdiz.GuildControllers.find(element => element.guildId === activeGuildId).guildObj
            
            if(guild) {
                //console.log("found guild")
            } else {
                console.log("Guild not found?? ID: ", activeGuildId)
                return
            }
            
            const channels = await guild.channels.fetch()
    
            const textChannels = channels.filter(channel => channel.type === "text").map(channel => {return {name: channel.name, id: channel.id}})
    
    
            return textChannels
            
        } catch (error) {
            console.log("Exception in RPC_getTextChannels: ", error)
            return failed
        }
    },

    RPC_getTextChannelContent: async function(activeGuildId, channelId) {
        try {
            const guild = await Botdiz.GuildControllers.find(element => element.guildId === activeGuildId).guildObj
    
            
            if(guild) {
                //console.log("found guild")
            } else {
                console.log("Guild not found?? ID: ", activeGuildId)
                return
            }
            //const guildmembers = await guild.members.fetch("241939345290952704")
    
            //console.log(guildmembers.displayHexColor)
            //console.log(guild.members.cache.get("241939345290952704").displayHexColor)
    
            const channel = await guild.channels.fetch(channelId)
    
            const messages = await channel.messages.fetch({ limit: 25})
    
            
            const parsedMessages = messages.map(message => {
    
                let color = guild.members.cache.get(message.author.id)?.displayHexColor
    
                if (color === "#000000"){
                    color = "#cdcecf"
                }
                
                return({
                    type: message.type,
                    author: message.author.username,
                    authorColor: color || null,
                    content: message.content    
                })
            })
            
            
            return parsedMessages
            
        } catch (error) {
            console.log("Exception in RPC_getTextChannelContent", error)
            return failed
        }
    },
    RPC_getVoiceChannels: async function (activeGuildId) {
        try {
            const guild = await Botdiz.GuildControllers.find(element => element.guildId === activeGuildId).guildObj
            
            if(guild) {
                //console.log("found guild")
            } else {
                console.log("Guild not found?? ID: ", activeGuildId)
                return failed
            }
            
            const channels = await guild.channels.fetch()
    
            const voiceChannels = channels.filter(channel => channel.type === "voice").map(channel => {
                return {
                    name: channel.name, 
                    id: channel.id,
                    members: channel.members
                }
            })
    
    
            return voiceChannels
            
        } catch (error) {
            console.log("Exception in RPC_getVoiceChannels: ", error)
            return failed
        }
    }

    
}