import { NextFunction, Request, Response } from "express";
export declare function withAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
