import { AdbService, TvError } from './adb.js';
import { getTarget, saveTarget } from './config.js';
import { RemoteProtocolService } from './remote.js';
import { targetSchema, commands } from './validation.js';

export type ConnectionMethod = 'adb' | 'remote';
export type TVCommand = keyof typeof commands;
export interface TVController {
  connect(host: string, port?: number): Promise<unknown>;
  disconnect(): Promise<unknown>;
  getStatus(): Promise<unknown>;
  sendCommand(command: TVCommand): Promise<void>;
  sendText(text: string): Promise<void>;
}
export class ADBController implements TVController {
  constructor(private adb = new AdbService()) {}
  private target() { const target = getTarget(); if (!target) throw new TvError(400, 'NO_TV_CONFIGURED', 'Set the TV address first'); return target; }
  async connect(host: string, port?: number) {
    const target = targetSchema.parse({ host, port: port ?? getTarget()?.port ?? 5555 });
    await saveTarget(target); await this.adb.connect(target);
    return this.adb.status(target);
  }
  async disconnect() { await this.adb.disconnect(this.target()); return { connected: false }; }
  async getStatus() { return this.adb.status(getTarget()); }
  async sendCommand(command: TVCommand) { await this.adb.command(this.target(), command); }
  async sendText(text: string) { await this.adb.text(this.target(), text); }
}
export class RemoteController implements TVController {
  constructor(private remote: RemoteProtocolService) {}
  async connect(host: string) { return this.remote.connect(host); }
  async disconnect() { return this.remote.disconnect(); }
  async getStatus() { return this.remote.health(); }
  async sendCommand(command: TVCommand) { this.remote.command(command); }
  async sendText(text: string) { this.remote.text(text); }
}
export function selectController(method: string, controllers: Record<ConnectionMethod, TVController>): TVController {
  if (method !== 'adb' && method !== 'remote') throw new TvError(400, 'INVALID_METHOD', 'Unknown connection method');
  return controllers[method];
}
