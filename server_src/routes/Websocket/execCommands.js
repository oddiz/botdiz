const Botdiz = require('../../../src/main')


module.exports={

    RPC_sendMessage: async function(guildId, channelId, message) {
        try {
            const guild = await Botdiz.GuildControllers.find(element => element.guildId === guildId).guildObj


            if (!guild) {
                console.log("Guild not found. ID: ", guildId)
                return
            }

            const channel = await guild.channels.fetch(channelId)

            channel.send({content: message})

            return true
        } catch (error) {
            throw(error)
        }
    }



}