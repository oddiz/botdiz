const Botdiz = require('../../../src/main')

module.exports = class ListenerManager {
    constructor(WebsocketManager, websocket) {
        this.client = Botdiz.client
        this.websocket = websocket

        this.listeners = new Map();
        
        
        

        this.processMessage = this.processMessage.bind(this)
        this.client.on("message", this.processMessage) 

        this.add = this.add.bind(this)
        this.startMusicPlayerListener = this.startMusicPlayerListener.bind(this)
    }

    processMessage(message) {
        
        for (const [id,listener] of this.listeners) {
            listener(message)
        }
        //console.log("Listener list: " , this.listeners)

    }

    add(id, command, params) {
        if (this.listeners.has(id)) {
            console.log("Channel already has a listener")

            return
        }
        const listenerCommands = require('./listenerCommands')
        console.log(arguments)
        const constructedFunc = listenerCommands[command](id, this.websocket, ...params)
        this.listeners.set(id, constructedFunc)

        console.log("Adding listener new list: ", this.listeners)
    }

    startMusicPlayerListener(guildId) {
        const self = this
        const guildController = Botdiz.GuildControllers.find(element => element.guildId === guildId).controller

        
        if(guildController) {
            //console.log(guildController)
        } else {
            console.log("Guild not found?? ID: ", guildId)
            return
        } 

        const MusicController = guildController?.MusicController

        this.listenMusicPlayer = true;
        runLoop(this.websocket, MusicController)

        function runLoop(websocket, MusicController) {
            //console.log(MusicController)
            setTimeout(function() {
                if (!self.listenMusicPlayer) {
                    console.log("Terminating Musicplayer listener.")
                    return
                }
                try {
                    const currentSong = MusicController.currentSong || {}
                    
    
                    const queue = MusicController.queue
                    const currentTitle = currentSong?.videoTitle;
                    const streamTime = MusicController.audioPlayer?._state.playbackDuration / 1000 || 0;
                    const videoLenght= currentSong?.videoDuration;
                    const audioPlayerStatus = MusicController.audioPlayerStatus
                    const videoThumbnailUrl = currentSong.videoThumbnailUrl;
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
                        guild: guildId,
                        message: message,
                        audioPlayerStatus: audioPlayerStatus
                    })
    
                    websocket.send(replyMessage)
                } catch (error) {
                    console.log(error)
                }
                runLoop(websocket, MusicController)
            }, 400)
        }    

    }

    remove(id) {
        this.listeners.delete(id)
    }
    
    clearListeners() {
        for (const [id,listener] of this.listeners) {
            this.listeners.delete(id)
        }
        this.listenMusicPlayer = false
        //console.log("Cleared listeners, listener list: ", this.listeners)
    }

    terminate(){
        this.clearListeners()
        this.client.removeListener("message", this.processMessage)
        this.websocket = null
    }
}