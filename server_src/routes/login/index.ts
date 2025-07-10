import uuid from "uuid";
import argon2 from "argon2";
import crypto from "crypto";

import { Express } from "express";
import { Db } from "mongodb";
import { logger } from "../../../src/logger";
import { DbSession, DbUser } from "../../db/databaseTypes";
import { BotdizSession } from "../../types";
import "dotenv/config";

export default async function login(app: Express, db: Db) {
    app.post("/login", async (req, res) => {
        const reqBody = req.body;
        let reqUsername, reqPassword, reqReCaptchaToken;
        try {
            reqUsername = reqBody.username as string;
            reqPassword = reqBody.password as string;
            reqReCaptchaToken = reqBody.reCaptchaToken as string;
        } catch (error) {
            console.log("Failed to parse username or password");
            res.status(404).send({
                message: "Failed to login with given credentials",
            });

            return;
        }

        //recaptcha validation
        const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

        if (!RECAPTCHA_SECRET) {
            logger.log("error", "Env variable RECAPTCHA_SECRET not set");
            return;
        }

        const encodedRecaptchaSecret = encodeURIComponent(RECAPTCHA_SECRET);
        const reCaptchaUserToken = encodeURIComponent(reqReCaptchaToken);
        const reCapURI = `https://www.google.com/recaptcha/api/siteverify?secret=${encodedRecaptchaSecret}&response=${reCaptchaUserToken}`;

        const recaptchaReply = await fetch(reCapURI).then((data) => data.json());
        if (!recaptchaReply.success) {
            console.log("Recaptcha failed");
            res.status(404).send({
                message: "Recaptcha unsuccesful",
            });
            return;
        }

        /**
         * Hashing algorith
         */
        // const hash = await argon2.hash(password, {
        //     type: argon2.argon2i,
        //     memoryCost: 2 ** 16,
        //     timeCost: 30,
        //     paralellism: 2,
        //     salt_length: 128,
        //     hashLength: 128
        // })

        //get username from db
        const user = (await db.collection("users").findOne({ username: reqUsername })) as DbUser | null;

        if (!user) {
            res.status(404).send({ message: "Failed to login with given credentials" });

            return;
        }

        const passwordIsVerified = await argon2.verify(user.password, reqPassword);

        if (passwordIsVerified) {
            //
            const id = uuid.v4();
            const token = await crypto.randomBytes(64).toString("hex");

            const dbObject: DbSession = {
                createdAt: new Date(),
                user_id: id,
                username: reqUsername,
                token: token,
                moderator_session: true,
            };

            db.collection("sessions").updateOne(
                {
                    username: reqUsername,
                },
                {
                    $set: dbObject,
                },
                {
                    upsert: true,
                }
            );
            const reqSession = req.session as unknown as BotdizSession | null;

            if (!reqSession) {
                logger.log("error", "Failed to get session from express");

                return;
            }

            reqSession.userId = id;
            reqSession.token = token;
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; //7 days
            if (process.env.NODE_ENV == "development") {
                res.header("Access-Control-Allow-Origin", "http://localhost:3000");
            } else {
                res.header("Access-Control-Allow-Origin", "https://botdiz.kaansarkaya.com");
            }
            res.header("Access-Control-Allow-Credentials", "true");
            //console.log(req)

            res.status(200).send({
                result: "OK",
                message: "Login successfull",
            });

            console.log(reqUsername + " logged in.");
        } else {
            res.status(401).send({ message: "Failed to login with given credentials" });

            return;
        }
    });
}
