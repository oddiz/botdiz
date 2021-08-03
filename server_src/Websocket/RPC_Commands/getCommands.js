const Botdiz = require('../../../src/main')
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
    RPC_getGuilds: async function(allowedGuilds) {
        /* 
        options = {
            adminOnly: true|false
        }
        */
        try {
            
            const guilds = await Botdiz.client.guilds.cache
            
            
    
            //console.log(parsedGuilds)
            
            if (allowedGuilds === "ALL") {
                const parsedGuilds = guilds.map(guild => {
                    return {
                        id:guild.id,
                        name: guild.name,
                        icon:guild.icon,
                        administrator: true,
                        botdiz_guild: true
                    }
                })
                return parsedGuilds
            } else {
                return allowedGuilds
                
            }
            
        } catch (error) {
            console.log("Exception in RPC_getGuilds: ", error)
            return failed
        }
    },

    RPC_getTextChannels: async function(allowedGuilds, activeGuildId) {
        try {
            if (allowedGuilds !== "ALL") {
                let commandAllowed = false 
                for(const guild of allowedGuilds) {
                    if (activeGuildId === guild.id &&
                        (guild.owner || guild.administrator)) {
                        commandAllowed = true
                    }
                }
                if(!commandAllowed) {
                    console.log("Command not allowed!")
    
                    return {status: "unauthorized"}
                }
            }
            const guild = await Botdiz.GuildControllers.find(element => element.guildId === activeGuildId).guildObj
            
            if(guild) {
                //console.log("found guild")
            } else {
                console.log("Guild not found?? ID: ", activeGuildId)
                return
            }
            
            const channels = await guild.channels.fetch()
            
            const textChannels = channels.filter(channel => channel.type === "text" && channel.viewable).map(channel => {return {name: channel.name, id: channel.id}})
    
            return textChannels
            
        } catch (error) {
            console.log("Exception in RPC_getTextChannels: ", error)
            return failed
        }
    },

    RPC_getTextChannelContent: async function(allowedGuilds, activeGuildId, channelId) {
        try {
            if (allowedGuilds !== "ALL") {
                let commandAllowed = false 
                for(const guild of allowedGuilds) {
                    if (activeGuildId === guild.id &&
                        (guild.owner || guild.administrator)) {
                        commandAllowed = true
                    }
                }
                if(!commandAllowed) {
                    console.log("Command not allowed!")
    
                    return failed
                }
            }

            
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
            if (error.message.includes("Missing Access")) {
                console.log("Not enough permission to see channel messages")
                return {
                    status: "unauthorized"
                }
            }
            console.log("Exception in RPC_getTextChannelContent", error)
            return failed
        }
    },
    RPC_getVoiceChannels: async function (allowedGuilds, activeGuildId) {
        try {
            if (allowedGuilds !== "ALL") {
                let commandAllowed = false 
                for(const guild of allowedGuilds) {
                    if (activeGuildId === guild.id) {
                        commandAllowed = true
                    }
                }
                if(!commandAllowed) {
                    console.log("Command not allowed!")
    
                    return failed
                }
            }
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