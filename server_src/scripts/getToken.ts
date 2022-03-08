import { BotdizSession } from "../types"
import { Request, Response, Query } from "express-serve-static-core"

export const getToken = (
    req: Request<{}, any, any, Query, Record<string, any>>
): string | null => {
    const reqSession = req.session as unknown as BotdizSession | null;
    return reqSession?.token ||null;
};