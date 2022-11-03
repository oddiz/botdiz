import { Shoukaku, Connectors } from "shoukaku";
import servers from "./lavalink-server.json";
import { options } from "./shokaku-options";
import { Client } from "discord.js";

export class ShoukakuHandler extends Shoukaku {
    private connected: boolean;
    constructor(client: Client) {
        super(new Connectors.DiscordJS(client), servers, options);

        this.connected = false;

        this.on("ready", (name, resumed) => {
            console.log(
                `Lavalink Node: ${name} is now connected`,
                `This connection is ${resumed ? "resumed" : "a new connection"}`
            );
            this.connected = true;
        });
        this.on("error", (name, error) => console.error(error));
        this.on("close", (name, code, reason) =>
            console.log(`Lavalink Node: ${name} closed with code ${code}`, reason || "No reason")
        );
        this.on("disconnect", (name, players, moved) =>
            console.log(
                `Lavalink Node: ${name} disconnected`,
                moved ? "players have been moved" : "players have been disconnected"
            )
        );
        this.on("debug", (name, reason) => {
            //console.log(`Lavalink Node: ${name}`, reason || 'No reason')
        });
    }

    async ready() {
        while (!this.connected) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        return;
    }
}
