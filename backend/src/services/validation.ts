import { z } from 'zod';

export const commands = {
  POWER: 26, HOME: 3, BACK: 4, SETTINGS: 176,
  UP: 19, DOWN: 20, LEFT: 21, RIGHT: 22, OK: 23,
  VOLUME_UP: 24, VOLUME_DOWN: 25, MUTE: 164,
  PLAY_PAUSE: 85, NEXT: 87, PREVIOUS: 88,
} as const;
export const commandSchema = z.object({ command: z.enum(Object.keys(commands) as [keyof typeof commands, ...(keyof typeof commands)[]]) }).strict();
export const hostSchema = z.string().trim().min(1).max(253).regex(/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/, 'Invalid host');
export const macSchema = z.string().regex(/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/, 'Invalid MAC address');
export const targetSchema = z.object({ host: hostSchema, port: z.number().int().min(1).max(65535), mac: macSchema.optional() }).strict();
export const connectSchema = z.object({ host: hostSchema.optional(), port: z.number().int().min(1).max(65535).optional(), mac: macSchema.optional() }).strict();
export const pairSchema = z.object({ host: hostSchema.optional(), port: z.number().int().min(1).max(65535), code: z.string().regex(/^\d{6}$/, 'Pairing code must have six digits') }).strict();
export const appSchema = z.object({ app: z.enum(['youtube', 'netflix', 'prime', 'disney']) }).strict();
export const textSchema = z.object({ text: z.string().min(1).max(200) }).strict();
