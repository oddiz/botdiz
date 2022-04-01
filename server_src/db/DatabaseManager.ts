import { logger } from '../../src/logger';
import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, Db } from 'mongodb';

/* 
const MongoClientOptions: MongoClientOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
*/

export class DatabaseManager {
    public db: Db | null;
    private client: MongoClient;
    private dbUrl: string;

    constructor() {
        this.dbUrl = process.env.DB_URL as string;
        this.client = new MongoClient(this.dbUrl);
        this.db = null;
    }

    async connect() {
        try {
            await this.client.connect();

            this.db = this.client.db('botdiz_db');
            logger.log('info', 'Connected to mongo database: botdiz_db');

            this.db.collection('sessions').createIndex(
                {
                    createdAt: 1,
                },
                {
                    expireAfterSeconds: 60 * 60 * 24 * 7,
                }
            );

            return this.db;
        } catch (error) {
            logger.log('error', 'Error while trying to connect to database: ', error);

            return null;
        }
    }

    getDb() {
        if (this.db) {
            return this.db;
        }
    }
}

export const dbManager = new DatabaseManager();
