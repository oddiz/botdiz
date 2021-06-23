require('dotenv').config()

const { MongoClient } = require('mongodb')


module.exports = class DatabaseManager {
    constructor() {
        this.MongoClient = MongoClient;
        this.dbUrl = process.env.DB_URL
    }

    async connect() {

        this.MongoClient.connect(this.dbUrl, {useNewUrlParser: true}, (err,client) => {
            if (err) return console.log(err)

            this.db = client.db("botdiz_db")
            console.log("Connected to mongo database: botdiz_db")
        })

    }
}