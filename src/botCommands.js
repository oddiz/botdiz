const Command = require("./Command");

module.exports = function (Controller){
     
    return [
        new Command(
            Controller,
            {
                name: "deploy",
                description: "Deploys slash commands. Must be server owner or goddiz.",
                needArgs:false,
                usage: "/deploy",
                ignoreSlash:true
                
            },
            require("./commands/deploy")
        ),
        new Command(
            Controller,
            {
                name: "debug",
                description: "Toggles debug Mode",
                needArgs:false,
                usage: "/debug on/off or /debug"
            },
            require("./commands/debug")
        ),
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
                    }
                ]
            },
            require("./commands/help")
        ),
        new Command(
            Controller,
            {
                name: "w2g",
                description: "Creates a watch2gether room",
                needArgs: true,
                usage: "/w2g https://www.youtube.com/watch?v=<video id>\n\n/w2g badgers",
                options: [
                    {
                        type: "STRING",
                        name: "input",
                        description: "Query to search or URL.",
                        required: true,
                    }
                ]
            },
            require("./commands/w2g")
        ),
        new Command(
            Controller,
            {
                name: "play",
                description: "Plays song from a link or finds from search.",
                needArgs: true,
                usage:"/play https://www.youtube.com/watch?v=<video id>\n\n/play https://open.spotify.com/track/<track id>\n\n/play best song in the world",
                noBind: true,
                ephemeral: false,
                options: [
                    {
                        type: "STRING",
                        name: "input",
                        description: "Query to search or URL.",
                        required: true,
                    }
                ]
            },
            require("./commands/play")
        ),
        new Command(
            Controller,
            {
                name: "clear",
                description: "Clears channel. Use with caution!",
                needArgs: true,
                usage:"/clear <amount of message to delete>",
                ephemeral: true,
                options: [
                    {
                        type: "INTEGER",
                        name: "amount",
                        description: "Clears specified amount of messages. Must have manage permissions.",
                        required: true
                    }
                ]
            },
            require("./commands/clear")
        ),
        new Command(
            Controller,
            {
                name:"stop",
                description: "Stops the music.",
                needArgs: false,
                usage: "/stop",
                noBind: true
            },
            require("./commands/stop")
        ),
        new Command(
            Controller,
            {
                name:"pause",
                description: "Pauses the music.",
                needArgs: false,
                usage: "/pause",
                noBind: true
            },
            require("./commands/pause")
        ),
        new Command(
            Controller,
            {
                name:"resume",
                description: "Stops the music.",
                needArgs: false,
                usage: "/resume",
                noBind: true
            },
            require("./commands/resume")
        ),
        new Command(
            Controller,
            {
                name:"queue",
                description: "Shows current music queue",
                needArgs: false,
                usage: "/queue" 
            },
            require("./commands/queue")
        
        ),
        new Command(
            Controller,
            {
                name:"skip",
                description: "Skips current song, or skips specified times",
                needArgs: false,
                usage:"/skip or /skip 4 (to skip to 4. song in queue)",
                noBind:true,
                ephemeral: true,
                options: [
                    {
                        type: "INTEGER",
                        name: "amount",
                        description: "Skips specified amount of songs in queue.",
                        required: false
                    }
                ]
            },
            require("./commands/skip")   
        ),
        new Command(
            Controller,
            {
                name:"next",
                description: "Skips the current song.",
                needArgs:false,
                usage: "/next",
                noBind: true,
                ephemeral: true,
            },
            require("./commands/next")
        ),
        new Command(
            Controller,
            {
                name: "status",
                description: "Shows the status of current playing song",
                needArgs: false,
                usage: "/status",
                ephemeral: true
        
            },
            require('./commands/status')
        ),
        new Command(
            Controller,
            {
                name:"epic",
                description: "Shows current epic free deals.",
                needArgs: false,
                usage: "/epic",
        
        
            },
            require("./commands/epic")
        ),
        new Command(
            Controller,
            {
                name:"invite",
                description: "Gets invite link for the bot to use in other servers.",
                needArgs: false,
                usage: "/invite"
            },
            require("./commands/invite")
        )
    ]
}
