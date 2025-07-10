import { Db } from "mongodb";
import { DbSubscriptionContent } from "../../server_src/db/databaseTypes";
export declare function updateEpicDeals(db: Db): Promise<DbSubscriptionContent>;
