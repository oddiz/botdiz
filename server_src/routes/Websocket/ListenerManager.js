const client = require('../../../src/main').client

module.exports = class ListenerManager {
    constructor(WebsocketManager, websocket) {
        this.client = client
        this.websocket = websocket

        this.listeners = new Map();
        
        
        

        this.client.on("message", message => {
            this.processMessage(message)
        }) 

        
    }

    processMessage(message) {

        for (const [id,listener] of this.listeners) {
            listener(this.websocket, message)
        }
        //console.log("Listener list: " , this.listeners)

    }

    add(id, command, params) {
        if (this.listeners.has(id)) {
            console.log("Channel already has a listener")

            return
        }
        const listenerCommands = require('./listenerCommands')
        
        const constructedFunc = listenerCommands[command](id, ...params)
        this.listeners.set(id, constructedFunc)

        //console.log("Adding listener new list: ", this.listeners)
    }

    remove(id) {
        this.listeners.delete(id)
    }
    
    clearListeners() {
        for (const [id,listener] of this.listeners) {
            this.listeners.delete(id)
        }
        //console.log("Cleared listeners, listener list: ", this.listeners)
    }


}