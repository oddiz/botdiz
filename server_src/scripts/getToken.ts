import { Request } from "express";
import { BotdizSession } from "../types";

export const getToken = (req: Request): string | null => {
    const reqSession = req.session as unknown as BotdizSession | null;
    return reqSession?.token || null;
};
