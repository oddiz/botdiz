module.exports = function validate(app, db) {

    app.use('/validate', (req, res) => {

        //console.log(req)
    
        let isValidated;
        //check db and if token checks out
        isValidated = true
        //else send 
        //isValidated = false
        res.send({
            isValidated: isValidated
        });
    });

}