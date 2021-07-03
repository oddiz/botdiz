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
            console.log("Error while trying to execute RPC_sendMessage :", error)
        }
    },

    RPC_pausePlayer: async function (guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
                console.log("Player already paused")
                 
            } else if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Idle) {
                console.log("Player is not active")
            } else {
                await guildMusicController.pause()
                
                
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_pausePlayer :", error)
        }
    },

    RPC_resumePlayer: async function (guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
                
                await guildMusicController.resume()
                
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_resumePlayer :", error)
        }

        
    },
    RPC_skipSong: async function (guildId, skipAmount=1) {
        try {

            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            if (guildMusicController.queue.length === 0){
                guildMusicController.stop()
                return
            }
            guildMusicController.skip(skipAmount)
        } catch (error) {
            console.log("Error while trying to execute RPC_skipSong :", error)
        }
    },
    RPC_stopPlayer: async function (guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.stop()
        } catch (error) {
            console.log("Error while trying to execute RPC_stopPlayer :", error)
        }
    },
    RPC_deleteQueueSong: async function (guildId, songIndex) {
        try {
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.queue.splice(songIndex, 1)
        } catch (error) {
            console.log("Error while trying to execute RPC_deleteQueueSong :", error)
        }

    }



}