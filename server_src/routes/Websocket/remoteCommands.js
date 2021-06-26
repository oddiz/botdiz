const Botdiz = require('../../../src/main')

/**
 * Botdiz.client
 * Botdiz.GuildControllers
 */

module.exports={
    RPC_getGuilds: async function() {
        const guilds = await Botdiz.client.guilds.cache
        
        

        const parsedGuilds = guilds.map(guild => {
            return {
                id:guild.id,
                icon:guild.icon
            }
        })
        //console.log(parsedGuilds)
        

        return parsedGuilds
    }
}