import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { createAndroidRemote, RemoteKeyCode, type AndroidRemote, type Certificate } from '@kud/androidtv-remote';
import { TvError } from './adb.js';
import { hostSchema, commands } from './validation.js';

export type RemoteState = 'disconnected' | 'connecting' | 'pairing' | 'connected' | 'error';
export type RemoteStatus = { connected: boolean; state: RemoteState; host: string | null; paired: boolean };
export type RemoteFactory = (host: string, options: { cert?: Certificate }) => AndroidRemote;
const dataDir = path.resolve(process.cwd(), 'data');
const keycodes: Record<keyof typeof commands, number> = {
  POWER: RemoteKeyCode.KEYCODE_POWER, HOME: RemoteKeyCode.KEYCODE_HOME,
  BACK: RemoteKeyCode.KEYCODE_BACK, SETTINGS: RemoteKeyCode.KEYCODE_SETTINGS,
  UP: RemoteKeyCode.KEYCODE_DPAD_UP, DOWN: RemoteKeyCode.KEYCODE_DPAD_DOWN,
  LEFT: RemoteKeyCode.KEYCODE_DPAD_LEFT, RIGHT: RemoteKeyCode.KEYCODE_DPAD_RIGHT,
  OK: RemoteKeyCode.KEYCODE_DPAD_CENTER, VOLUME_UP: RemoteKeyCode.KEYCODE_VOLUME_UP,
  VOLUME_DOWN: RemoteKeyCode.KEYCODE_VOLUME_DOWN, MUTE: RemoteKeyCode.KEYCODE_MUTE,
  PLAY_PAUSE: RemoteKeyCode.KEYCODE_MEDIA_PLAY_PAUSE, NEXT: RemoteKeyCode.KEYCODE_MEDIA_NEXT,
  PREVIOUS: RemoteKeyCode.KEYCODE_MEDIA_PREVIOUS,
};

export class RemoteProtocolService {
  private client: AndroidRemote | null = null;
  private host: string | null = null;
  private state: RemoteState = 'disconnected';
  private paired = false;
  private generation = 0;
  private pendingSave: Promise<void> = Promise.resolve();
  constructor(private factory: RemoteFactory = createAndroidRemote, private directory = dataDir) {}
  private certPath(host: string): string { return path.join(this.directory, `remote-${Buffer.from(host).toString('hex')}.json`); }
  private hostPath(): string { return path.join(this.directory, 'remote-host.json'); }
  async load(): Promise<void> {
    try {
      const value = JSON.parse(await fs.readFile(this.hostPath(), 'utf8')) as { host: string };
      this.host = hostSchema.parse(value.host);
      this.paired = !!(await this.loadCertificate(this.host));
    } catch { /* No previous Remote Protocol target. */ }
  }
  private async loadCertificate(host: string): Promise<Certificate | undefined> {
    try {
      const value = JSON.parse(await fs.readFile(this.certPath(host), 'utf8')) as Certificate;
      return typeof value.key === 'string' && typeof value.cert === 'string' ? value : undefined;
    } catch { return undefined; }
  }
  private async saveCertificate(host: string, certificate: Certificate): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    await fs.chmod(this.directory, 0o700);
    await fs.writeFile(this.certPath(host), JSON.stringify(certificate), { mode: 0o600 });
    await fs.chmod(this.certPath(host), 0o600);
  }
  status(): RemoteStatus { return { connected: this.state === 'connected', state: this.state, host: this.host, paired: this.paired }; }
  async health(): Promise<RemoteStatus> {
    if (this.state !== 'connected' || !this.host) return this.status();
    const reachable = await new Promise<boolean>(resolve => {
      const socket = net.connect({ host: this.host!, port: 6466, timeout: 1200 });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => { socket.destroy(); resolve(false); });
      socket.once('timeout', () => { socket.destroy(); resolve(false); });
    });
    if (!reachable && this.state === 'connected') this.state = 'error';
    return this.status();
  }
  async connect(hostInput: string): Promise<RemoteStatus> {
    const host = hostSchema.parse(hostInput);
    this.disconnect();
    const generation = ++this.generation;
    this.host = host;
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    await fs.chmod(this.directory, 0o700);
    await fs.writeFile(this.hostPath(), JSON.stringify({ host }), { mode: 0o600 });
    await fs.chmod(this.hostPath(), 0o600);
    const certificate = await this.loadCertificate(host);
    this.paired = !!certificate;
    this.state = 'connecting';
    const client = this.factory(host, certificate ? { cert: certificate } : {});
    this.client = client;
    let settled = false;
    let resolveFirst!: (status: RemoteStatus) => void;
    let rejectFirst!: (error: TvError) => void;
    const first = new Promise<RemoteStatus>((resolve, reject) => { resolveFirst = resolve; rejectFirst = reject; });
    const timer = setTimeout(() => {
      if (settled || generation !== this.generation) return;
      settled = true; this.state = 'error'; client.stop();
      rejectFirst(new TvError(504, 'REMOTE_TIMEOUT', 'Remote Protocol connection timed out'));
    }, 15000);
    const settle = (error?: TvError) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) rejectFirst(error); else resolveFirst(this.status());
    };
    client.on('secret', () => { if (generation !== this.generation) return; this.state = 'pairing'; settle(); });
    client.on('ready', () => {
      if (generation !== this.generation) return;
      this.state = 'connected'; this.paired = true;
      this.pendingSave = this.saveCertificate(host, client.getCertificate()).then(() => { settle(); }).catch(() => {
        this.state = 'error'; settle(new TvError(500, 'CERT_SAVE_FAILED', 'Could not save Remote Protocol pairing'));
      });
    });
    client.on('unpaired', () => { if (generation === this.generation) { this.state = 'error'; this.paired = false; } });
    client.on('error', () => { if (generation === this.generation) { this.state = 'error'; settle(new TvError(503, 'REMOTE_ERROR', 'Remote Protocol connection failed')); } });
    void client.start().then(started => {
      if (generation !== this.generation) return;
      if (!started && this.state !== 'connected') { this.state = 'error'; settle(new TvError(503, 'REMOTE_UNAVAILABLE', 'TV unavailable or pairing rejected')); }
    }).catch(() => {
      if (generation !== this.generation) return;
      this.state = 'error'; settle(new TvError(503, 'REMOTE_UNAVAILABLE', 'TV unavailable or pairing rejected'));
    });
    return first;
  }
  async pin(code: string): Promise<RemoteStatus> {
    if (this.state !== 'pairing' || !this.client) throw new TvError(409, 'PAIRING_NOT_STARTED', 'Start pairing first');
    if (!/^[0-9A-Fa-f]{6}$/.test(code)) throw new TvError(400, 'INVALID_PIN', 'PIN must have six hexadecimal characters');
    if (!this.client.sendCode(code)) { this.state = 'error'; this.client.stop(); throw new TvError(400, 'INVALID_PIN', 'PIN rejected; reconnect and check the code shown on TV'); }
    const generation = this.generation;
    const client = this.client;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new TvError(504, 'REMOTE_TIMEOUT', 'Pairing timed out')); }, 15000);
      const ready = () => { if (generation === this.generation) { cleanup(); void this.pendingSave.then(() => resolve(this.status())).catch(() => reject(new TvError(500, 'CERT_SAVE_FAILED', 'Could not save Remote Protocol pairing'))); } };
      const error = () => { cleanup(); reject(new TvError(503, 'PAIR_FAILED', 'Pairing failed')); };
      const cleanup = () => { clearTimeout(timer); client.off('ready', ready); client.off('error', error); client.off('unpaired', error); };
      client.on('ready', ready); client.on('error', error); client.on('unpaired', error);
    });
  }
  disconnect(): RemoteStatus {
    this.generation++;
    this.client?.stop(); this.client = null;
    this.state = 'disconnected';
    return this.status();
  }
  async forget(): Promise<RemoteStatus> {
    const host = this.host;
    this.disconnect();
    if (host) await fs.rm(this.certPath(host), { force: true });
    this.paired = false;
    return this.status();
  }
  private connectedClient(): AndroidRemote {
    if (this.state !== 'connected' || !this.client) throw new TvError(409, 'TV_DISCONNECTED', 'Remote Protocol is disconnected');
    return this.client;
  }
  command(command: keyof typeof commands): void { this.connectedClient().sendKey(keycodes[command]); }
  text(value: string): void { this.connectedClient().sendText(value); }
}
