import {ListOfUsersPlaylistsResponse} from "@types/spotify-api"
import { Guild } from "discord.js";

export interface DbGuildSubscriptions {
    type: string;
    active: boolean;
    subscribed_channel: string;
    last_posted_channel: string;
    last_posted_content_hash: string;
}

export interface DbDiscordGuild {
    id: string;
    name: string;
    icon: string;
    owner: boolean;
    permissions: number;
    features: string[];
    permissions_new: string;
    iconUrl?: string;
    administrator?: boolean;
}

export type DbGuildSettings = {
    autoplay: boolean;
    skipVotingEnabled: boolean;
    skipVotingPassPercentage: number;
}
export interface DbGuildObject {
    guild_id: string;
    guild_name: string;
    owner_id: string;
    dj_roles: string[];
    subscriptions?: DbGuildSubscriptions[]
    settings?: DbGuildSettings

}

export interface AllowedGuild extends Guild {
    administrator?: boolean;
    owner?: boolean;
}

export interface DbSpotifyData {
    auth_token: string;
    refresh_token: string;
    expires: number;
    playlists: {
        href: string;
        limit: number;
        next: string;
        offset: number;
        previous: null;
        total: number;
        items: ListOfUsersPlaylistsResponse[];
    }
}

export interface DbUserData {
    spotify: DbSpotifyData;
    avatarURL: string;
    username: string;
    data: DbUserData;
    is_admin?: boolean;
}
export interface DbDiscordUser extends DbUserData {
    discord_id: string;
    auth_token?: string;
    avatar: string | null;
    email: string;

    all_guilds: AllowedGuild[];
    allowed_guilds: AllowedGuild[] | [];


}

export interface DbUser {
    username: string;
    password: string;
    avatarUrl: string;
    is_admin: boolean;
    data: DbUserData;
}

export interface DbEpicGameContent {
    gameTitle: string;
    isActive: boolean;
    thumbnail: string;
    activateTime?: number;
    endTime?: number;
}
export interface DbSubscriptionContent {
    type: string;
    current_content: DbEpicGameContent[]
    current_content_hash: string;
    next_update_time: number | null;
}
export interface BotdizDb {
    discord_users: DbDiscordUser[];
    guilds: DbDiscordGuild[];
    sessions: DbSession[];
    subscription_content: DbSubscriptionContent[];
    users: DbUser[];
}

export interface DbSession {
    username: string;
    createdAt: Date;
    user_id: string;
    username: string;
    token: string;
    moderator_session?: boolean;
}

export interface DbDiscordSession extends DbSession {
    discord_session: true;
    discord_id: string;
    discord_auth_token: string;
    discord_refresh_token: string;
    discord_token_expiration: Date;
}