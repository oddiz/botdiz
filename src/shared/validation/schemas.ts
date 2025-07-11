import { z } from 'zod';

// Command validation schemas
export const PlayCommandSchema = z.object({
    query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
    forceNext: z.boolean().optional().default(false),
    source: z.enum(['youtube', 'spotify', 'soundcloud']).optional()
});

export const VolumeCommandSchema = z.object({
    volume: z.number().int().min(0).max(100)
});

export const SeekCommandSchema = z.object({
    position: z.number().int().min(0)
});

// API validation schemas
export const CreatePlaylistSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(false),
    tracks: z.array(z.string()).max(100).default([])
});

export const UpdateGuildSettingsSchema = z.object({
    prefix: z.string().min(1).max(5).optional(),
    djRoles: z.array(z.string()).optional(),
    allowedChannels: z.array(z.string()).optional(),
    maxQueueSize: z.number().int().min(1).max(1000).optional(),
    defaultVolume: z.number().int().min(0).max(100).optional()
});

export const WebSocketMessageSchema = z.object({
    event: z.string(),
    data: z.unknown().optional(),
    guildId: z.string().optional()
});

// Database validation schemas
export const GuildSettingsSchema = z.object({
    guildId: z.string(),
    prefix: z.string().default('/'),
    djRoles: z.array(z.string()).default([]),
    allowedChannels: z.array(z.string()).default([]),
    maxQueueSize: z.number().int().default(100),
    defaultVolume: z.number().int().default(50),
    announceNowPlaying: z.boolean().default(true),
    autoLeaveEmpty: z.boolean().default(true),
    autoLeaveEmptyDelay: z.number().int().default(300000) // 5 minutes
});

// Type exports
export type PlayCommandInput = z.infer<typeof PlayCommandSchema>;
export type VolumeCommandInput = z.infer<typeof VolumeCommandSchema>;
export type SeekCommandInput = z.infer<typeof SeekCommandSchema>;
export type CreatePlaylistInput = z.infer<typeof CreatePlaylistSchema>;
export type UpdateGuildSettingsInput = z.infer<typeof UpdateGuildSettingsSchema>;
export type WebSocketMessageInput = z.infer<typeof WebSocketMessageSchema>;
export type GuildSettingsInput = z.infer<typeof GuildSettingsSchema>;

// Validation helper
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join(', ');
            throw new Error(`Validation failed: ${errorMessage}`);
        }
        throw error;
    }
}