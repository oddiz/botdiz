import { Express } from 'express';
import { Db } from 'mongodb';
export default function login(app: Express, db: Db): Promise<void>;
