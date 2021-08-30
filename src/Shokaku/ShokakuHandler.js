const { Shoukaku, Libraries } = require('shoukaku');
const servers = require('./lavalink-server.json');
const options = require('./shokaku-options.js');


class ShoukakuHandler extends Shoukaku {
    constructor(client) {
        super(new Libraries.DiscordJS(client), servers, options);
        
        this.on('ready',
            (name, resumed) => {
                console.log(`Lavalink Node: ${name} is now connected`, `This connection is ${resumed ? 'resumed' : 'a new connection'}`)
                this.connected = true
            }

        );
        this.on('error',
            (name, error) =>
                console.error(error)
        );
        this.on('close',
            (name, code, reason) =>
                console.log(`Lavalink Node: ${name} closed with code ${code}`, reason || 'No reason')
        );
        this.on('disconnect',
            (name, players, moved) =>
                console.log(`Lavalink Node: ${name} disconnected`, moved ? 'players have been moved' : 'players have been disconnected')
        );
        this.on('debug',
            (name, reason) =>{
                //console.log(`Lavalink Node: ${name}`, reason || 'No reason')
            });
    }

    async ready() {
        while (!this.connected) {
            await new Promise(resolve => setTimeout(resolve, 200))
        }

        return
    }
}

module.exports = ShoukakuHandler;