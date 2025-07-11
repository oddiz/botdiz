/// <reference path="../types.d.ts" />
import { Request } from "express";
import { BotdizSession } from "../types";

interface ExtendedRequest extends Request {
    session: BotdizSession;
}

export const getToken = (req: Request): string | null => {
    const extReq = req as ExtendedRequest;
    const reqSession = extReq.session;
    return reqSession?.token || null;
};
