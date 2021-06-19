const winston = require('winston')

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
            filename: 'log',
            format: winston.format.simple()
        }),
	],
	
    

});

winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    debug: 'green'
})

exports.logger = logger