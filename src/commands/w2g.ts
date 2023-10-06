import { Command } from "../modules/Command";
import { ChatInputCommandInteraction } from "discord.js";
import "dotenv/config";

import fetch from "node-fetch";
import { logger } from "../logger";
import searchYT from "../scripts/searchYT";

export default async function (this: Command, invokedMessage?: ChatInputCommandInteraction | null) {
    const self = this;
    try {
        if (!invokedMessage) throw "invokedMessage is not defined";

        const input = invokedMessage.options.getString("input");

        let videoUrl, searchMode;
        if (!input) {
            throw new Error("No input provided");
        }
        try {
            const parsedURL = new URL(input);
            videoUrl = parsedURL.href;
            searchMode = false;
        } catch (error) {
            searchMode = true;
        }

        if (searchMode) {
            const query = input;

            searchYT(query, 1, (result) => {
                if (result) {
                    const videoId = result.videoId;
                    const ytUrlTemplate = "https://www.youtube.com/watch?v=";
                    videoUrl = ytUrlTemplate + videoId;

                    self.reply("Video found: " + videoUrl);

                    fetch("https://w2g.tv/rooms/create.json", {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            w2g_api_key: process.env.W2G_TOKEN,
                            share: videoUrl,
                            bg_color: "#2a2c37",
                            bg_opacity: "100",
                        }),
                    })
                        .then((response) => response.json())
                        .then(function (data) {
                            const w2gRoom = "https://w2g.tv/rooms/" + data.streamkey;
                            self.reply("**Room is ready:**\n" + w2gRoom, { followup: true });
                        });
                } else {
                    self.wrongUsage(invokedMessage, self.name, "Video not found.");
                }
            });
        } else {
            fetch("https://w2g.tv/rooms/create.json", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    w2g_api_key: process.env.W2G_TOKEN,
                    share: videoUrl,
                    bg_color: "#2a2c37",
                    bg_opacity: "100",
                }),
            })
                .then((response) => response.json())
                .then(function (data) {
                    const w2gRoom = "https://w2g.tv/rooms/" + data.streamkey;
                    self.reply("**Room is ready:**\n" + w2gRoom);
                });
        }
    } catch (error) {
        logger.log("error", "Error while executing w2g command: ", error);
    }
}
