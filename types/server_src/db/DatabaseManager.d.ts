import "dotenv/config";
import { Db } from "mongodb";
export declare class DatabaseManager {
    db: Db | null;
    private client;
    private dbUrl;
    constructor();
    connect(): Promise<Db>;
    getDb(): Db;
}
export declare const dbManager: DatabaseManager;
