const Botdiz = require('../../../src/main')

const { AudioPlayerStatus, joinVoiceChannel } = require('@discordjs/voice')

module.exports={

    RPC_sendMessage: async function(user,guildId, channelId, message) {
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

            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed"
            }
        }
    },

    RPC_pausePlayer: async function (user,guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            await guildMusicController.pause()
            
            return {
                status: "success"
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_pausePlayer :", error)
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed"
            }
        }
    },

    RPC_resumePlayer: async function (user, guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            await guildMusicController.resume()
            
            return {
                status: "success"
            }

        } catch (error) {
            console.log("Error while trying to execute RPC_resumePlayer :", error)
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed"
            }
        }

        
    },
    RPC_skipSong: async function (user, guildId, skipAmount=1) {
        try {

            if (user.discord_id) {
                const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
                
                if (guildMusicController.queue.length === 0){
                    guildMusicController.stop()
                    return
                }
                const result = await guildMusicController.SkipHandler.handleInterface(user.discord_id, skipAmount)
                
                return result
            }
            console.log("Can't execute skip song command. User doesn't have a discord id.")
        } catch (error) {
            console.log("Error while trying to execute RPC_skipSong :", error)
        }
    },
    RPC_stopPlayer: async function (user, guildId) {
        try {
            
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.stop()

            return {
                status: "success"
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_stopPlayer :", error)
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed"
            }
        }
    },
    RPC_deleteQueueSong: async function (user, guildId, songIndex) {
        try {
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
            
            guildMusicController.queue.splice(songIndex, 1)

            return {
                status: "success",
                message: `Deleted ${songIndex}. song.`
            }
        } catch (error) {
            console.log("Error while trying to execute RPC_deleteQueueSong :", error)
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)
            return {
                status: "failed"
            }
        }

    },
    RPC_playCommand: async function(user, guildId, queryArg) {
        try {
            const guildController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller
    
            const playCommand = guildController.commands.find( ( { name } ) => name === "play" )
    
            console.log(queryArg)
            playCommand.execute(null, { query: queryArg })

            return {
                status: "success",
                message: "Executed play command with query: " + queryArg
            }
            
        } catch (error) {
            console.log("Error while trying to execute RPC_playCommand: ", error)
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed"
            }
        }
    },

    /**
     * 
     * @param {string} guildId 
     * @param {Array} playlistArray Playlist array from module spotifyApi  
     */
    RPC_addSpotifyPlaylist: async function(user,guildId, playlistArray) {
        try {
            const guildController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller
            guildController.MusicController.queueLock = true
    
            for (const item of playlistArray){
                const videoName = item.track.name;
                const videoArtist = item.track.artists[0].name
                const videoTitle = videoArtist + " - " + videoName
                const package = {
                    info: {
                        artist: videoArtist,
                        trackName: videoName,
                        title: videoTitle,

                    },
                    isSpotify: true
                }
                guildController.MusicController.addToQueue(package)
            }
    
            guildController.MusicController.queueLock = false
            const result = await guildController.MusicController.processQueue();

            if(result)
            return {
                status: result
            }
        } catch (error) {
            console.log("Error while trying to add spotify playlist")
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            try {
                guildController.MusicController.queueLock = true
            } catch (error) {
                //fail silently
            }
        }

        
    },

    RPC_joinVoiceChannel: async function(user, guildId, channelId) {
        try {
            const guildController = await Botdiz.GuildControllers.find(element => element.guildId === guildId)
            
            const channel = await guildController.guildObj.channels.fetch(channelId)
            await guildController.controller.MusicController.setVoiceConnection(channel)

            return {
                status: "success",
            }

        } catch (error) {
            console.log(error, "<-- Error while trying to execute RPC_joinVoiceChannel command")
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed",
            }
        }
    },

    RPC_updateQueue: async function(user, guildId, queue) {
        try {
            const guildMusicController = await Botdiz.GuildControllers.find(element => element.guildId === guildId).controller.MusicController
    
            guildMusicController.queue = queue
            
            return {
                status: "success"
            }
        } catch (error) {
            console.log(error, "<-- Error while trying to execute RPC_updateQueue")
            const parsedUser = {
                discord_id: user.discord_id,
                username: user.username,
            }
            console.log("Invoked user: ", parsedUser)

            return {
                status: "failed"
            }
        }
    }
}