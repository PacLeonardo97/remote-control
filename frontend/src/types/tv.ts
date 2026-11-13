export type Command = 'POWER' | 'HOME' | 'BACK' | 'SETTINGS' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'OK' | 'VOLUME_UP' | 'VOLUME_DOWN' | 'MUTE' | 'PLAY_PAUSE' | 'NEXT' | 'PREVIOUS';
export type AppName = 'youtube' | 'netflix' | 'prime' | 'disney';
export type Target = { host: string; port: number };
export type Status = { connected: boolean; address: string | null };
