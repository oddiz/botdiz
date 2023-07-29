import winston from "winston";
import Sentry from "winston-sentry-log";

const sentryOptions = {
    config: {
        dsn: process.env.SENTRY_URI,
    },
    level: "error",
};

const loggerLevels = {
    error: 0,
    lavalinkError: 1,
    warn: 2,
    lavalink: 3,
    info: 4,
    http: 5,
    verbose: 6,
    debug: 7,
    silly: 8,
};
export const logger = winston.createLogger({
    levels: loggerLevels,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        new winston.transports.File({
            filename: "error.log",
            format: winston.format.json(),
            level: "warn",
        }),
        new Sentry(sentryOptions),
    ],
    exceptionHandlers: [new winston.transports.File({ filename: "exceptions.log" })],
});

winston.addColors({
    error: "brightRed",
    warn: "yellow",
    info: "cyan",
    debug: "green",
    lavalink: "red",
    lavalinkError: "brightRed",
});
