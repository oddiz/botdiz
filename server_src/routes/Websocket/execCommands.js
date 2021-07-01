const Botdiz = require('../../../src/main')
const { AudioPlayerStatus } = require('@discordjs/voice')

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
    },

    RPC_pausePlayer: async function (guildId) {
        try {
            console.log(guildId)
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
                console.log("Player already paused")
                 
            } else if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Idle) {
                console.log("Player is not active")
            } else {
                await guildMusicController.pause()
                
                
            }
        } catch (error) {
            console.log("Error while trying to execute player command :", error)
        }
    },

    RPC_resumePlayer: async function (guildId) {
        try {
            console.log("message recieved")
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
                
                await guildMusicController.resume()
                
            }
        } catch (error) {
            console.log("Error while trying to execute player command :", error)
        }

        
    },
    RPC_skipPlayer: async function (guildId) {
        try {

            console.log("message recieved")
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            if (guildMusicController.queue.length === 0){
                guildMusicController.stop()
                return
            }
            guildMusicController.skip(1)
        } catch (error) {
            console.log("Error while trying to execute player command :", error)
        }
    },
    RPC_stopPlayer: async function (guildId) {
        try {
            console.log("message recieved")
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.stop()
        } catch (error) {
            console.log("Error while trying to execute player command :", error)
        }
    }



}