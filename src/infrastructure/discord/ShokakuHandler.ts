import { Shoukaku, Connectors } from "shoukaku";
import { servers } from "./lavalink-servers";
import { options } from "./shokaku-options";
import { Client } from "discord.js";
import { createLogger } from "@logger";

const logger = createLogger("ShoukakuHandler");
export class ShoukakuHandler extends Shoukaku {
    private connected: boolean;
    constructor(client: Client) {
        super(new Connectors.DiscordJS(client), servers, options);

        this.connected = false;

        this.on("ready", (name, resumed) => {
            logger.info(
                `Lavalink Node: ${name} is now connected \n` +
                    `This connection is ${resumed ? "resumed" : "a new connection"}`
            );
            this.connected = true;
        });
        this.on("error", (name, error) => logger.error("lavalinkError", error));
        this.on("close", (name, code, reason) => {
            this.connected = false;

            logger.info(
                `Lavalink Node: ${name} closed with code ${code}` +
                    (reason ? `\nReason: ${reason}` : "")
            );
        });
        this.on("disconnect", (name, moved) => {
            this.connected = false;

            logger.error(
                `Lavalink Node: ${name} disconnected`,
                moved ? "players have been moved" : "players have been disconnected"
            );
        });
        this.on("debug", (name, reason) => {
            //console.log(`Lavalink Node: ${name}`, reason || 'No reason')
            logger.info(reason);
        });
    }

    async ready() {
        while (!this.connected) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        return;
    }
}
