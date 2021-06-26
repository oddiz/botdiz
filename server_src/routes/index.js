const login = require('./login')
const validate = require('./validate')

module.exports = class RouteManager {
    constructor(app, db) {

        this.app = app
        this.db = db
    }

    run() {
        login(this.app, this.db)
        validate(this.app, this.db)
    }

}