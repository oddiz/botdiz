require('dotenv').config()

const { MongoClient } = require('mongodb')


module.exports = class DatabaseManager {
    constructor() {
        this.MongoClient = MongoClient;
        this.dbUrl = process.env.DB_URL


    }

    async connect() {
        return new Promise ((resolve, reject) => {
            
            this.MongoClient.connect(this.dbUrl, {useNewUrlParser: true, useUnifiedTopology: true}, (err,client) => {
                if (err) {
                    console.log(err)   
                    reject(err)
                    return
                }
                if(!client) {
                    reject()
                    return
                }
                this.db = client.db("botdiz_db")
                console.log("Connected to mongo database: botdiz_db")

                this.db.collection('sessions').createIndex(
                    {
                        "createdAt": 1
                    },
                    {
                        expireAfterSeconds: 60 * 60 * 24 * 7
                    }
                )
    
                resolve(this.db)    
            })


        })

    }
}