import { Command } from "../modules/Command";
import { logger } from "../logger";
import { EmbedBuilder } from "discord.js";
export default async function (this: Command) {
    const self = this;
    try {
        if (!self.controller.db) {
            logger.log("warn", "Not connected to database so epic deals won't work.");
            return;
        }
        const epicGames = await self.controller.db
            .collection("subscription_content")
            .findOne({ type: "epic_deals" })
            .then((res) => res?.current_content);

        const activeDeals = [];
        const futureDeals = [];

        for (const epicGame of epicGames) {
            if (epicGame.isActive) {
                //promotion active
                //console.log("Promotion active for: ", epicGame.title)
                const date = new Date().getTime();
                const dateDiff = epicGame.endTime - date;

                const seconds = Math.floor((dateDiff / 1000) % 60);
                const minutes = Math.floor((dateDiff / (1000 * 60)) % 60);
                const hours = Math.floor((dateDiff / (1000 * 60 * 60)) % 24);
                const days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

                const embedMessage = new EmbedBuilder();

                embedMessage
                    .setColor("#0FF28F")
                    .setTitle(epicGame.gameTitle)
                    .setThumbnail(epicGame.thumbnail)
                    .setTimestamp()
                    .setDescription(
                        `Free in Epic Store for: **${days} Days** **${hours} Hours** **${minutes} Minutes** **${seconds} Seconds**`
                    );

                activeDeals.push(embedMessage);
            } else {
                //promotion not active
                const effectiveDate = epicGame.activateTime;
                const date = new Date();
                const currentDate = date.getTime();

                const dateDiff = effectiveDate - currentDate;

                const seconds = Math.floor((dateDiff / 1000) % 60);
                const minutes = Math.floor((dateDiff / (1000 * 60)) % 60);
                const hours = Math.floor((dateDiff / (1000 * 60 * 60)) % 24);
                const days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));
                //console.log("Days: ", days , "hours: ", hours, "minutes:", minutes, "seconds: ", seconds)

                let embedMessage = new EmbedBuilder();
                embedMessage = embedMessage
                    .setColor("#CB462C")
                    .setTitle(epicGame.gameTitle)
                    .setThumbnail(epicGame.thumbnail)
                    .setTimestamp()
                    .setDescription(
                        `Will be free in: **${days} Days** **${hours} Hours** **${minutes} Minutes** **${seconds} Seconds**`
                    );

                futureDeals.push(embedMessage);
            }

            self.reply({ embeds: [...activeDeals, ...futureDeals] });
        }
    } catch (error) {
        logger.log("error", "Error while executing epic command: ", error);
    }
}
