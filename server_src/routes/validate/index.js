module.exports = function validate(app, db) {

    app.use('/validate', async (req, res) => {

        const reqToken = req.session.token
        //check db and if token checks out
        const session = await db.collection('sessions').findOne( { token: reqToken  } )
        
        console.log(session)
        if (session) {
            let user
            
            if (session.discord_session) {
                user = await db.collection('discord_users').findOne( { discord_id: session.discord_id } )
                
            } else {
                user = await db.collection('users').findOne( { username: session.username } )
                
            }
            console.log(user)
            const accountInfo = {
                username: user.username,
                avatarURL: user.avatarURL,
                is_admin: user.is_admin
            }
            
            res.send({
                isValidated: true,
                accountInfo: accountInfo,
                token: reqToken
            });
        } else {
            res.status(401).send({
                isValidated:false
            })
        }
        


        //else send 
        //isValidated = false
    });

}