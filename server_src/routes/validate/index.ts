import { Db } from "mongodb";
import { Express } from "express";
import { DbDiscordUser, DbUserData } from "@server_src/db/databaseTypes";
import { Session } from "express-session";

interface ValidateUserData {
    username: string;
    avatarURL: string;
    is_admin: boolean;
    user_id?: string;
}

export interface ValidateResponse {
    isValidated: true;
    accountInfo: ValidateUserData;
    token: string;
}
export default function validate(app: Express, db: Db) {

    app.use('/validate', async (req, res) => {
        const reqSession = req.session as Session & { token: string };
        const reqToken = reqSession.token
        //check db and if token checks out
        const session = await db.collection('sessions').findOne( { token: reqToken  } )
        
        if (session) {
            let user;
            let responsePayload: ValidateUserData | null = null;

            if (session.discord_session) {

                user = await db.collection('discord_users').findOne( { discord_id: session.discord_id } ) as unknown as DbDiscordUser | null
                
                if(user) {
                    responsePayload = {
                        username: user.username,
                        avatarURL: user.avatarURL,
                        is_admin: user.is_admin || false,
                        user_id: user.discord_id
                        
                    }
                }

            } else {
                
                user = await db.collection('users').findOne( { username: session.username } ) as unknown as DbUserData | null
                
                if(user) {
                    
                    responsePayload = {
                        username: user.username,
                        avatarURL: user.avatarURL,
                        is_admin: user.is_admin || false,
                        
                    }
                }
            }

            if (responsePayload) {
                
                res.send({
                    isValidated: true,
                    accountInfo: responsePayload,
                    token: reqToken
                });
            }
        } else {
            res.status(401).send({
                isValidated:false
            })
        }
        


        //else send 
        //isValidated = false
    });

}