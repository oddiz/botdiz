module.exports = async function logout(app, db) {

    app.post('/logout', async (req, res) => {

        const reqToken = req.session?.token


        try {
            await db.collection('sessions').deleteOne({ "token": reqToken })

            res.send({
                message: "Logout successful"
            })
            
            return

        } catch (error) {
           res.status(404).send({
               message: "Token is not valid"
           }) 
        }


    })

}