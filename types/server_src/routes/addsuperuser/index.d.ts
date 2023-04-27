import { Db } from "mongodb";
import { Express } from "express";
export default function addsuperuser(app: Express, db: Db): Promise<void>;
