require('dotenv').config()

const { MongoClient } = require('mongodb')


module.exports = class DatabaseManager {
    constructor() {
        this.MongoClient = MongoClient;
        this.dbUrl = process.env.DB_URL
    }

    async connect() {
        console.log(this.dbUrl)
        this.MongoClient.connect(this.dbUrl, {useNewUrlParser: true, useUnifiedTopology: true}, (err,client) => {
            if (err) {
                //console.log(err)   
                return false
            }
            this.db = client.db("botdiz_db")
            console.log("Connected to mongo database: botdiz_db")

            return this.db
        })

    }
}