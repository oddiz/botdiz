import { Request, Query } from "express-serve-static-core";
export declare const getToken: (req: Request<{}, any, any, Query, Record<string, any>>) => string | null;
