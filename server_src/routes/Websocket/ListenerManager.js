const Botdiz = require('../../../src/main')

module.exports = class ListenerManager {
    constructor(WebsocketManager, websocket) {
        this.client = Botdiz.client
        this.websocket = websocket

        this.textListeners = new Map();
        this.voiceChannelListeners = new Map();
        
        this.musicListenerGuildId = null;        

        this.listenerCommands = require('./RPC_Commands/listenerCommands')

        
        this.addVoiceChannelListener = this.addVoiceChannelListener.bind(this)
        this.addTextListener = this.addTextListener.bind(this)
        this.processTextMessage = this.processTextMessage.bind(this)
        this.processVoiceChannelUpdate = this.processVoiceChannelUpdate.bind(this)
        this.startMusicPlayerListener = this.startMusicPlayerListener.bind(this)
        
        
        this.client.on("message", this.processTextMessage) 
        this.client.on("voiceStateUpdate", this.processVoiceChannelUpdate)
    }

    processTextMessage(message) {
        try {
            for (const [id,listener] of this.textListeners) {
                listener(message)
            }
        } catch (error) {
            console.log("ERROR while trying to process text message: ", error)
        }
        //console.log("Listener list: " , this.listeners)

    }

    processVoiceChannelUpdate(message) {
        try {
            for (const [id,listener] of this.voiceChannelListeners) {
                listener(message)
            }
        } catch (error) {
            console.log("ERROR while trying to process voice channel update: ", error)
        }

    }

    addTextListener(id, command, params) {
        if (this.textListeners.has(id)) {
            console.log("Text channel already has a listener")

            return
        }
        const constructedFunc = this.listenerCommands[command](id, this.websocket, ...params)
        this.textListeners.set(id, constructedFunc)

        console.log("Adding text listener new list: ", this.textListeners)
    }

    addVoiceChannelListener(id, command, params) {
        if (this.voiceChannelListeners.has(id)) {
            console.log("Voice channel already has a listener")

            return
        }
        const constructedFunc = this.listenerCommands[command](id, this.websocket, ...params)
        this.voiceChannelListeners.set(id, constructedFunc)

        console.log("Adding voice channel listener new list: ", this.voiceChannelListeners)
    }

    startMusicPlayerListener(guildId) {
        const self = this
        this.musicListenerGuildId = guildId
        const guildController = Botdiz.GuildControllers.find(element => element.guildId === guildId).controller

        
        if(guildController) {
        } else {
            console.log("Guild not found?? ID: ", guildId)
            return
        } 

        const MusicController = guildController?.MusicController

        this.listenMusicPlayer = true;
        runLoop(this.websocket, MusicController, guildId)

        function runLoop(websocket, MusicController, loopGuildId) {
            setTimeout(function() {
                if (!self.listenMusicPlayer || (self.musicListenerGuildId !== loopGuildId)) {
                    console.log("Terminating Musicplayer listener.")
                    return
                }
                try {
                    const currentSong = MusicController.currentSong || {}
                    
    
                    const queue = MusicController.queue
                    const currentTitle = currentSong?.videoTitle || "";
                    const streamTime = MusicController.audioPlayer?._state.playbackDuration / 1000 || 0;
                    const videoLenght= currentSong?.videoDuration || 0;
                    const audioPlayerStatus = MusicController.audioPlayerStatus || "none"
                    const videoThumbnailUrl = currentSong.videoThumbnailUrl || "";
                    //console.log(queue, currentTitle, streamTime, videoLength)
                    const message = {
                        guild: guildId,
                        queue: queue,
                        currentTitle: currentTitle,
                        streamTime: streamTime,
                        videoLength: videoLenght,
                        audioPlayerStatus: audioPlayerStatus,
                        videoThumbnailUrl: videoThumbnailUrl
                    }
    
                    const replyMessage = JSON.stringify({
                        event: "musicplayer_update",
                        guild: loopGuildId,
                        message: message,
                        
                    })
    
                    websocket.send(replyMessage)
                } catch (error) {
                    console.log(error)
                }
                runLoop(websocket, MusicController, loopGuildId)
            }, 400)
        }    

    }

    remove(id) {
        this.textListeners.delete(id)
    }
    
    clearListeners() {
        for (const [id,listener] of this.textListeners) {
            this.textListeners.delete(id)
        }
        for (const [id,listener] of this.voiceChannelListeners) {
            this.voiceChannelListeners.delete(id)
        }
        this.listenMusicPlayer = false
        //console.log("Cleared listeners, listener list: ", this.listeners)
    }

    terminate(){
        this.clearListeners()
        this.client.removeListener("message", this.processTextMessage)
        this.client.removeListener("voiceStateUpdate", this.processVoiceChannelUpdate)
        this.websocket = null
    }
}