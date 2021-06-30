module.exports = function validate(app, db) {

    app.use('/validate', async (req, res) => {

        const reqToken = req.session.token
        //check db and if token checks out
        const session = await db.collection('sessions').findOne( { token: reqToken  } )
        
        console.log(req.session)
        
        let isValidated = false;
        if (session) {
            isValidated = true
        }

        //else send 
        //isValidated = false
        res.send({
            isValidated: isValidated
        });
    });

}