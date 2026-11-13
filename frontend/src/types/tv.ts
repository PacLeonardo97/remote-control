export type Command = 'POWER' | 'HOME' | 'BACK' | 'SETTINGS' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'OK' | 'VOLUME_UP' | 'VOLUME_DOWN' | 'MUTE' | 'PLAY_PAUSE' | 'NEXT' | 'PREVIOUS';
export type AppName = 'youtube' | 'netflix' | 'prime' | 'disney';
export type ConnectionMethod = 'adb' | 'remote';
export type Target = { host: string; port: number };
export type Status = { connected: boolean; address: string | null; state?: 'disconnected' | 'connecting' | 'pairing' | 'connected' | 'error'; paired?: boolean; host?: string | null };
export type DiscoveredTv = { name: string; host: string };
