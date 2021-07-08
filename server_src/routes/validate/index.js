module.exports = function validate(app, db) {

    app.use('/validate', async (req, res) => {

        const reqToken = req.session.token
        //check db and if token checks out
        const session = await db.collection('sessions').findOne( { token: reqToken  } )
        
        
        if (session) {
            const user = await db.collection('users').findOne( { username: session.username } )
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
            res.status(404).send({
                isValidated:false
            })
        }
        


        //else send 
        //isValidated = false
    });

}