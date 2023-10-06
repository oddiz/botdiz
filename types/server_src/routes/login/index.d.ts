import { Express } from "express";
import { Db } from "mongodb";
import "dotenv/config";
export default function login(app: Express, db: Db): Promise<void>;
