import { Db } from "mongodb";
import "dotenv/config";
import { Express } from "express";
export declare class RouteManager {
    private app;
    private db;
    constructor(app: Express, db: Db);
    run(): void;
}
