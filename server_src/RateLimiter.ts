import LRU from 'lru-cache';

type UserId = string;
type LastRequestTime = number;

export class RateLimiter {
    clients: LRU<UserId, LastRequestTime>;

    RATE_LIMIT_IN_MILLISECOND = 500;
    constructor() {
        this.clients = new LRU({ max: 100 });
    }

    isUserAllowed(userId: UserId) {
        const now = Date.now();
        const reply = (boolean: Boolean) => {
            this.clients.set(userId, now);

            return boolean;
        };
        if (this.clients.has(userId)) {
            const lastRequestTime = this.clients.get(userId);
            if (!lastRequestTime) {
                return reply(true);
            }
            if (now - lastRequestTime < this.RATE_LIMIT_IN_MILLISECOND) {
                return false;
            }
        }
        return reply(true);
    }
}

const rateLimiter = new RateLimiter();
export default rateLimiter;
