const { demuxProbe } = require('@discordjs/voice');
const argon2 = require('argon2')

module.exports = async function addsuperuser(app, db) {

    app.post('/addsuperuser', async (req,res) => {

        let reqUsername, reqPassword, reqAvatarURL
        
        try {
            reqUsername = req.body.username;
            reqPassword = req.body.password;
            reqAvatarURL = req.body.avatarURL
        } catch (error) {
            console.log("Failed to parse username or password")
            res.status(401).send({
                message: "Failed to add user."
            })

            return 
        }


        async function hashPassword(password) {
            try {
                const hash = await argon2.hash(password, {
                    type: argon2.argon2i,
                    memoryCost: 2 ** 16,
                    timeCost: 30,
                    paralellism: 2,
                    salt_length: 128,
                    hashLength: 128
                })
    
                return hash
                
            } catch (error) {
                console.log("Error while trying to hash password.")
                res.status(404).send({
                    message: "Failed to add user."
                })

                return
            }
        }


        //find user from database
        const reqToken = req.session.token
        if(!reqToken) {
            console.log("No session info in credentials")
            res.status(401).send({
                message: "Failed to add user."
            })
            return
        }
        //find username from token
        const session = await db.collection('sessions').findOne( { token: reqToken  } )
        if(!session){
            console.log("Session not found")
            res.status(401).send({
                message: "Failed to add user."
            })
            return
        }

        sessionUsername = session.username 
        
        //find user from username
        const user = await db.collection('users').findOne( { username: sessionUsername } )

        if (!user.is_admin) {
            console.log("You can't add users if you are not an admin.")
            res.status(401).send({
                message: "Failed to add user."
            })
            return
        }

        if(reqPassword < 32) {
            console.log("Password too short.")
            res.status(401).send({
                message: "Failed to add user."
            })
            return 
        }

        const hash = await hashPassword(reqPassword) 

        console.log(reqUsername, hash, reqAvatarURL)

        //find dublicate
        const duplicateFound = await db.collection('users').findOne({username: reqUsername})

        if(duplicateFound) {
            console.log("User already exists")

            res.status(401).send({
                isSuccessful: false,
                message: "Username already exists"
            })

            return
        }

        const dbResponse = await db.collection('users').insertOne({
            username: reqUsername,
            password: hash,
            avatarURL: reqAvatarURL
        })


        if(parseInt(dbResponse.insertedCount) === 1) {
            console.log("User added successfuly")

            res.send({
                isSuccessful: true,
                message: "User added successfuly"
            })
        }

    })
}
