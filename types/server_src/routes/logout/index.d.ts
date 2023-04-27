import { Express } from 'express';
import { Db } from 'mongodb';
export default function logout(app: Express, db: Db): Promise<void>;
