const Botdiz = require('../../../src/main')

const { AudioPlayerStatus, joinVoiceChannel } = require('@discordjs/voice')

module.exports={

    RPC_sendMessage: async function(guildId, channelId, message) {
        try {
            const guild = await Botdiz.GuildControllers.find(element => element.guildId === guildId).guildObj


            if (!guild) {
                console.log("Guild not found. ID: ", guildId)
                return
            }

            const channel = await guild.channels.fetch(channelId)

            await channel.send({content: message})

            return {
                status: "success"
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_sendMessage :", error)
            return {
                status: "failed"
            }
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
                
                return {
                    status: "success"
                }
                
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_pausePlayer :", error)
            return {
                status: "failed"
            }
        }
    },

    RPC_resumePlayer: async function (guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            if (guildMusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
                
                await guildMusicController.resume()

                return {
                    status: "success"
                }
                
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_resumePlayer :", error)
            return {
                status: "failed"
            }
        }

        
    },
    RPC_skipSong: async function (guildId, skipAmount=1) {
        try {

            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            if (guildMusicController.queue.length === 0){
                guildMusicController.stop()
                return
            }
            const result = await guildMusicController.skip(skipAmount)
            
            return {
                status: result
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_skipSong :", error)
        }
    },
    RPC_stopPlayer: async function (guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.stop()

            return {
                status: "success"
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_stopPlayer :", error)
            return {
                status: "failed"
            }
        }
    },
    RPC_deleteQueueSong: async function (guildId, songIndex) {
        try {
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.queue.splice(songIndex, 1)

            return {
                status: "success"
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_deleteQueueSong :", error)
            return {
                status: "failed"
            }
        }

    },
    RPC_playCommand: async function(guildId, queryArg) {
        const guildController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller

        const playCommand = guildController.commands.find( ( { name } ) => name === "play" )

        
        playCommand.execute(false, [queryArg], false)
    },

    /**
     * 
     * @param {string} guildId 
     * @param {Array} playlistArray Playlist array from module spotifyApi  
     */
    RPC_addSpotifyPlaylist: async function(guildId, playlistArray) {
        try {
            const guildController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller
            guildController.MusicController.queueLock = true
    
            for (const item of playlistArray){
                const videoName = item.track.name;
                const videoArtist = item.track.artists[0].name
                const videoTitle = videoArtist + " - " + videoName
                const package = {
                    videoArtist: videoArtist,
                    videoName: videoName,
                    videoTitle: videoTitle,
                    isSpotify: true
                }
                guildController.MusicController.addToQueue(package)
            }
    
            guildController.MusicController.queueLock = false
            const result = await guildController.MusicController.processQueue();

            return {
                status: result
            }
        } catch (error) {
            console.log("Error while trying to add spotify playlist")
            try {
                guildController.MusicController.queueLock = true
            } catch (error) {
                //fail silently
            }
        }

        
    },

    RPC_joinVoiceChannel: async function(guildId, channelId) {
        try {
            const guildController = await Botdiz.GuildControllers.find(element => element.guildId === guildId)
            
            const voiceConnection = await joinVoiceChannel({
                channelId: channelId,
                guildId: guildId,
                adapterCreator: guildController.guildObj.voiceAdapterCreator,
                selfMute:false,
                selfDeaf:false,
            })

            guildController.controller.MusicController.setVoiceConnection(voiceConnection)

            return {
                status: "success",
            }

        } catch (error) {
            console.log(error, "<-- Error while trying to execute RPC_joinVoiceChannel command")
            return {
                status: "failed",
            }
        }
    },

    RPC_updateQueue: async function(guildId, queue) {
        try {
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
    
            guildMusicController.queue = queue
            
            console.log("updated queue")
            return {
                status: "success"
            }
        } catch (error) {
            console.log(error, "<-- Error while trying to execute RPC_updateQueue")
            return {
                status: "failed"
            }
        }
    }
}