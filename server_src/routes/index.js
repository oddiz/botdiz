const login = require('./login')
const validate = require('./validate')
const logout = require('./logout')
const playlists = require('./playlists')
const addsuperuser = require('./addsuperuser')
require('dotenv').config()



  
  module.exports = class RouteManager {
      constructor(app, db) {
          
          this.app = app
          this.db = db
          
    }

    run() {
        login(this.app, this.db)
        validate(this.app, this.db)
        logout(this.app, this.db)
        playlists(this.app, this.db)
        addsuperuser(this.app, this.db)
    }

}