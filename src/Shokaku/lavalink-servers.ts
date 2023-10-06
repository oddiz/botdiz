import "dotenv/config";
import { NodeOption } from "shoukaku";
const lavalinkUrl = process.env.LAVALINK_URL as string;
export const servers: NodeOption[] = [
    {
        name: "botdiz_main_node",
        url: lavalinkUrl,
        auth: "*5O2gZaDHHTv8G*diqyr9CvpnmQ9H!#!SaVQA9Wqls#6MkF0!69kiR%cZsn#qUo18pgOyrlE*sb#zW9MOHw*pV#xgQnTjccIkGu",
    },
];
