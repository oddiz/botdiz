import { ApplicationCommandOptionData } from "discord.js";
import { Command } from "./modules/Command";
import { Controller as BotdizGuildContoller } from "./modules/Controller";
import helpCommand from "./commands/help";
import recommendSongsCommand from "./commands/recommendSongs";
import w2gCommand from "./commands/w2g";
import stopCommand from "./commands/stop";
import playCommand from "./commands/play";
import playNextCommand from "./commands/playnext";
import clearCommand from "./commands/clear";
import skipCommand from "./commands/skip";
import pauseCommand from "./commands/pause";
import resumeCommand from "./commands/resume";
import shuffleCommand from "./commands/shuffle";
import queueCommand from "./commands/queue";
import statusCommand from "./commands/status";
import voteToSkipCommand from "./commands/votetoskip";
import epicCommand from "./commands/epic";

export interface BotdizCommand {
    name: string;
    description: string;
    needArgs: boolean;
    usage: string;
    noBind?: boolean;
    ephemeral?: boolean;
    options?: ApplicationCommandOptionData[];
}
export const botCommands = function (Controller: BotdizGuildContoller) {
    return [
        new Command(
            Controller,
            {
                name: "help",
                description: "Shows available commands",
                needArgs: false,
                usage: "/help <command> or /help",
                ephemeral: true,
                options: [
                    {
                        type: "STRING",
                        name: "command",
                        description: "Search for a specific command.",
                        required: false,
                    },
                ],
            },
            helpCommand
        ),
        new Command(
            Controller,
            {
                name: "w2g",
                description: "Creates a watch2gether room. You can watch videos with your friends in sync.",
                needArgs: true,
                usage: "/w2g https://www.youtube.com/watch?v=<video id>\n\n/w2g funny memes",
                options: [
                    {
                        type: "STRING",
                        name: "input",
                        description: "Query to search or URL.",
                        required: true,
                    },
                ],
            },
            w2gCommand
        ),
        new Command(
            Controller,
            {
                name: "play",
                description: "Plays song from a link or finds from search.",
                needArgs: true,
                usage: "/play https://www.youtube.com/watch?v=<video id>\n\n/play https://open.spotify.com/track/<track id>\n\n/play chill tunes",
                noBind: true,
                ephemeral: false,
                options: [
                    {
                        type: "STRING",
                        name: "input",
                        description: "Query to search or URL.",
                        required: true,
                    },
                ],
            },
            playCommand
        ),
        new Command(
            Controller,
            {
                name: "playnext",
                description: "Plays song from a link or finds from search after current song.",
                needArgs: true,
                usage: "/playnext https://www.youtube.com/watch?v=<video id>\n\n/playnext https://open.spotify.com/track/<track id>\n\n/playnext chill tunes",
                noBind: true,
                ephemeral: false,
                options: [
                    {
                        type: "STRING",
                        name: "input",
                        description: "Query to search or URL.",
                        required: true,
                    },
                ],
            },
            playNextCommand
        ),
        new Command(
            Controller,
            {
                name: "clear",
                description: "Deletes messages in the channel which are less than 14 days old. Administrators only.",
                needArgs: true,
                usage: "/clear <amount of message to delete (Max 100)>",
                ephemeral: true,
                options: [
                    {
                        type: "INTEGER",
                        name: "amount",
                        description: "Clears specified amount of messages. Must have manage permissions.",
                        required: true,
                    },
                ],
            },
            clearCommand
        ),
        new Command(
            Controller,
            {
                name: "stop",
                description: "Stops the music.",
                needArgs: false,
                usage: "/stop",
                noBind: true,
            },
            stopCommand
        ),
        new Command(
            Controller,
            {
                name: "pause",
                description: "Pauses the music.",
                needArgs: false,
                usage: "/pause",
                noBind: true,
            },
            pauseCommand
        ),
        new Command(
            Controller,
            {
                name: "resume",
                description: "Stops the music.",
                needArgs: false,
                usage: "/resume",
                noBind: true,
            },
            resumeCommand
        ),
        new Command(
            Controller,
            {
                name: "queue",
                description: "Shows current music queue",
                needArgs: false,
                usage: "/queue",
            },
            queueCommand
        ),
        new Command(
            Controller,
            {
                name: "skip",
                description: "Skips current song, or skips specified times",
                needArgs: false,
                usage: "/skip or /skip 4 (to skip to 4. song in queue)",
                noBind: true,
                ephemeral: true,
                options: [
                    {
                        type: "INTEGER",
                        name: "amount",
                        description: "Skips specified amount of songs in queue.",
                        required: false,
                    },
                ],
            },
            skipCommand
        ),
        new Command(
            Controller,
            {
                name: "votetoskip",
                description: "Enables / disables voting to skip songs. Only administrator can change this setting.",
                needArgs: false,
                usage: "/votetoskip",
            },
            voteToSkipCommand
        ),
        new Command(
            Controller,
            {
                name: "next",
                description: "Skips the current song.",
                needArgs: false,
                usage: "/next",
                noBind: true,
                ephemeral: true,
            },
            skipCommand
        ),
        new Command(
            Controller,
            {
                name: "status",
                description: "Shows the status of current playing song",
                needArgs: false,
                usage: "/status",
                ephemeral: true,
            },
            statusCommand
        ),
        new Command(
            Controller,
            {
                name: "epic",
                description: "Shows current epic free deals.",
                needArgs: false,
                usage: "/epic",
            },
            epicCommand
        ),
        new Command(
            Controller,
            {
                name: "recommend",
                description:
                    "Toggles recommend feature. Bot will keep playing recommended songs when queue is finished if enabled.",
                needArgs: false,
                usage: "/recommend",
            },
            recommendSongsCommand
        ),
        new Command(
            Controller,
            {
                name: "invite",
                description: "Gets invite link for the bot to use in other servers.",
                needArgs: false,
                usage: "/invite",
            },
            require("./commands/invite")
        ),
        new Command(
            Controller,
            {
                name: "shuffle",
                description: "Shuffles the current playlist.",
                needArgs: false,
                usage: "/shuffle",
            },
            shuffleCommand
        ),
    ];
};
