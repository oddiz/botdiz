import winston from "winston";
import Sentry from "winston-sentry-log";

const sentryOptions = {
    config: {
        dsn: process.env.SENTRY_URI,
    },
    level: "error",
};

export const logger = winston.createLogger({
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
    error: "red",
    warn: "yellow",
    info: "cyan",
    debug: "green",
    lavalink: "orange",
    lavalinkError: "red",
});
