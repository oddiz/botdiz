const Botdiz = require('../../../src/main')

module.exports={
    RPC_ListenChannel: function(id, websocket, guildId, channelId){

        return function(message) {
            const listenerID = id
            const guildID = guildId
            const channelID = channelId

            //console.log(id, guildId, channelId)
            if (guildID == message.channel.guild.id &&  channelID == message.channel.id){
                
                const replyMessage = JSON.stringify({
                    event: "new_message",
                    listenerId:listenerID,
                    message: {
                        type: message.type,
                        author: message.author.username,
                        content: message.content
                    }
                })


                
                websocket.send(replyMessage)

            }
                
        }
    },
    
}