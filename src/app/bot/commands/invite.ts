import { EmbedBuilder } from "discord.js";
import { logger } from "../logger";
import { Command } from "../modules/Command";

export default function (this: Command) {
    const self = this;

    try {
        // Takes "on" or "off" as argument
        const inviteLink =
            "https://discord.com/oauth2/authorize?client_id=851497395190890518&scope=bot+applications.commands&permissions=2184309832";
        let newEmbed = new EmbedBuilder();

        newEmbed = newEmbed.setColor("#e9b463").setTitle("Invite Link")
            .setURL(inviteLink);

        self.reply({ embeds: [newEmbed] });
    } catch (error) {
        logger.log("error", "Error while executing invite command: ", error);
    }
}

// https://discord.com/oauth2/authorize?client_id=851497395190890518&scope=bot+applications.commands&permissions=3825192512

// https://discord.com/oauth2/authorize?client_id=857957046297034802&scope=bot+applications.commands&permissions=2184309832
