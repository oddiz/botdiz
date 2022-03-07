
export interface BotdizWebSocketMessage {
    status: "success" | "failed";;
    event: any;
    message: string;
    data?: string; 
}
