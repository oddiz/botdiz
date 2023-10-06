import LRU from 'lru-cache';
type UserId = string;
type LastRequestTime = number;
declare class RateLimiter {
    clients: LRU<UserId, LastRequestTime>;
    RATE_LIMIT_IN_MILLISECOND: number;
    constructor();
    isUserAllowed(userId: UserId): false | Boolean;
}
export declare const webSocketRateLimiter: RateLimiter;
export declare const APIRateLimiter: RateLimiter;
export {};
