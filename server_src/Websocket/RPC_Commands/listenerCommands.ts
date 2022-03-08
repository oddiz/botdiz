import { Message, TextChannel } from "discord.js"


module.exports={
    RPC_listenTextChannel: function(id: string, websocket: WebSocket, guildId: string, channelId: string){

        return function(message: Message) {
            const listenerID = id
            const guildID = guildId
            const channelID = channelId

            const channel = message.channel as TextChannel

            //console.log(id, guildId, channelId)
            if (guildID == channel.guild.id &&  channelID == channel.id){
                
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
    RPC_listenVoiceChannels: function (id: string, websocket: WebSocket, guildId: string) {
        return function(message: Message) {
            const listenerID = id
            //console.log(id, guildId, channelId)

            if(guildId === message.guild?.id) {
                const replyMessage = JSON.stringify({
                    event: "voicechannel_update",
                    listenerId: listenerID,
                    guildId: guildId
                })
                
                websocket.send(replyMessage)
            }
                
        }
    }
    
}