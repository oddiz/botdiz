import { DbDiscordUser } from '../../db/databaseTypes';
export type ExecCommandResponse = {
    status: 'success' | 'failed';
    message?: string;
    command: string;
};
declare const _default: {
    [key: string]: (user: DbDiscordUser, ...args: any[]) => Promise<ExecCommandResponse>;
};
export default _default;
