const uuid = require('uuid')
const argon2 = require('argon2')
require('dotenv').config()
const crypto = require('crypto')
const fetch = require('node-fetch')

module.exports = async function login(app, db) {

    
    app.post('/login', async (req, res) => {
        
        

        const reqBody = req.body
        let reqUsername, reqPassword,reqReCaptchaToken
        try {
            reqUsername = req.body.username;
            reqPassword = req.body.password;
            reqReCaptchaToken= req.body.reCaptchaToken
        } catch (error) {
            console.log("Failed to parse username or password")
            res.status(404).send({
                message: "Failed to login with given credentials"
            })

            return 
        }


        //recaptcha validation

        const RECAPTCHA_SECRET = encodeURIComponent(process.env.RECAPTCHA_SECRET)
        const reCaptchaUserToken = encodeURIComponent(reqReCaptchaToken)
        const reCapURI = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${reCaptchaUserToken}`

        const recaptchaReply = await fetch(reCapURI).then(data=> data.json())
        if(!recaptchaReply.success) {
            console.log("Recaptcha failed")
            res.status(404).send({
                message: "Recaptcha unsuccesful"
            })
            return
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
        const user = await db.collection('users').findOne({ "username": reqUsername })

        if(!user) {
            res.status(404).send(
                {message: "Failed to login with given credentials"}
            );

            return
        }

        passwordIsVerified = await argon2.verify(user.password, reqPassword)
        
        

        if (passwordIsVerified) {
            //
            const id = uuid.v4()
            const token = await crypto.randomBytes(64).toString('hex')

            db.collection('sessions').updateOne(
                {
                    "username": reqUsername
                },
                { $set: {
                    "createdAt": new Date(),
                    "userid": id,
                    "username": reqUsername,
                    "token": token
                    }
                },
                {
                    upsert: true
                }
            )
            req.session.userId = id;
            req.session.token = token
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7 //7 days
            if (process.env.NODE_ENV == "development") {
                res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
            } else {
                res.header('Access-Control-Allow-Origin', 'https://botdiz.kaansarkaya.com')
            }
            res.header('Access-Control-Allow-Credentials','true')
            //console.log(req)

            res.status(200).send({
                result: "OK",
                message: "Login successfull",
            });

            
        } else {
            res.status(404).send(
                {message: "Failed to login with given credentials"}
            );

            return
        }
    });
    


}