export type BotdizSession = session.Session & Partial<session.SessionData> & {
    token: string;
    userId?: string;
}

export interface BotdizWebSocketMessage {
    status: "success" | "failed";
    event: any;
    message: string;
    data?: string; 
}