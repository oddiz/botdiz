import "dotenv/config";
import { NodeOption } from "shoukaku";
const lavalinkUrl = process.env.LAVALINK_URL as string;
const authKey = process.env.LAVALINK_AUTH_KEY as string;
export const servers: NodeOption[] = [
    {
        name: "botdiz_main_node",
        url: lavalinkUrl,
        auth: authKey,
    },
];
