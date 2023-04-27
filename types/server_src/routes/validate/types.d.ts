export interface ValidateUserData {
    username: string;
    avatarURL: string;
    is_admin: boolean;
    user_id?: string;
}
export declare type ValidateResponse = {
    isValidated: true;
    accountInfo: ValidateUserData;
    token: string;
} | {
    isValidated: false;
};
