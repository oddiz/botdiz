const uuid = require('uuid')

module.exports = function login(app, db) {

    
    app.use('/login', (req, res) => {
        const id = uuid.v4()

        req.session.userId = id; 
        req.session.token = "test123"
        //console.log(req)
        console.log(id)
        res.send({
            result: "OK",
            message: "Session updated",
            token: "test123"
        });
    });
    


}