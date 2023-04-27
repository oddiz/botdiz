import { Db } from "mongodb";
import { Express } from "express";
export default function playlists(app: Express, db: Db): Promise<void>;
