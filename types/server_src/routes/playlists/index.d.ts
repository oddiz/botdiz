import { Db } from "mongodb";
import { Express } from "express";
import "dotenv/config";
export default function playlists(app: Express, db: Db): Promise<void>;
