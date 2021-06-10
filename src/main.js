require('dotenv').config()


const Discord = require('discord.js')
const client = new Discord.Client();
/*
const winston = require('winston')
const logger = winston.createLogger({
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: 'log' }),
	],
	format: winston.format.printf(log => `[${log.level.toUpperCase()}] - ${log.message}`),
});
*/
const { logger } = require("./logger")

client.on('ready', () => logger.log('info', 'The bot is online!'));
client.on('debug', m => logger.log('debug', m));
client.on('warn', m => logger.log('warn', m));
client.on('error', m => logger.log('error', m));

const MsgHandler = require('./MessageHandler.js')
const Ctrl = require('./Controller.js')
const Controller = new Ctrl(Discord, client, MsgHandler)
Controller.init()

client.on("message", message => {
    Controller.handleMessage(message, Controller);
})


client.login(process.env.DISCORD_TOKEN)