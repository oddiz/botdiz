import { Shoukaku } from "shoukaku";
import { Client } from "discord.js";
export declare class ShoukakuHandler extends Shoukaku {
    private connected;
    constructor(client: Client);
    ready(): Promise<void>;
}
