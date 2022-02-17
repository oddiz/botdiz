const winston = require('winston')
const Sentry = require('winston-sentry-log');

const sentryOptions = {
    config: {
        dsn: process.env.SENTRY_URI,
    },
    level: "info"
};


const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({
            timestamp: () => (new Date()).toLocaleTimeString(),
            format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
        }),
		new winston.transports.File({ 
            filename: 'error.log',
            format: winston.format.json(),
            level: "warn"
        }),
        new Sentry(sentryOptions)
	],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' })
    ],
	
    

});


winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    debug: 'green'
})

exports.logger = logger