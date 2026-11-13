import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Target } from './config.js';
import { commands } from './validation.js';

const exec = promisify(execFile);
export class TvError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export type Runner = (args: string[]) => Promise<string>;
export const realRunner: Runner = async (args) => {
  try {
    const { stdout, stderr } = await exec('adb', args, { timeout: 8000, maxBuffer: 1024 * 1024 });
    return `${stdout}\n${stderr}`.trim();
  } catch (error) {
    const e = error as Error & { killed?: boolean; code?: string | number; stderr?: string };
    if (e.killed || e.code === 'ETIMEDOUT') throw new TvError(504, 'ADB_TIMEOUT', 'ADB did not respond in time');
    if (e.code === 'ENOENT') throw new TvError(503, 'ADB_NOT_FOUND', 'ADB is not installed or is not on PATH');
    throw new TvError(503, 'ADB_FAILED', (e.stderr || e.message).trim().slice(0, 300));
  }
};
export class AdbService {
  constructor(private run: Runner = realRunner) {}
  private address(target: Target): string { return `${target.host}:${target.port}`; }
  async status(target: Target | null): Promise<{ connected: boolean; address: string | null }> {
    if (!target) return { connected: false, address: null };
    const address = this.address(target);
    try {
      const output = await this.run(['devices']);
      const connected = output.split(/\r?\n/).some(line => line.trim() === `${address}\tdevice` || new RegExp(`^${address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+device$`).test(line.trim()));
      return { connected, address };
    } catch (error) { if (error instanceof TvError) throw error; throw new TvError(503, 'ADB_FAILED', String(error)); }
  }
  async connect(target: Target): Promise<void> {
    const output = await this.run(['connect', this.address(target)]);
    if (!/connected to|already connected to/i.test(output)) throw new TvError(503, 'CONNECT_FAILED', output || 'Could not connect to TV');
  }
  async disconnect(target: Target): Promise<void> { await this.run(['disconnect', this.address(target)]); }
  async pair(target: Target, code: string): Promise<void> {
    const output = await this.run(['pair', this.address(target), code]);
    if (!/successfully paired/i.test(output)) throw new TvError(503, 'PAIR_FAILED', output || 'Pairing failed');
  }
  private async requireConnected(target: Target): Promise<string> {
    if (!(await this.status(target)).connected) throw new TvError(409, 'TV_DISCONNECTED', 'TV is disconnected');
    return this.address(target);
  }
  async command(target: Target, command: keyof typeof commands): Promise<void> {
    const address = await this.requireConnected(target);
    await this.run(['-s', address, 'shell', 'input', 'keyevent', String(commands[command])]);
  }
  async app(target: Target, packageName: string): Promise<void> {
    const address = await this.requireConnected(target);
    const output = await this.run(['-s', address, 'shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
    if (/no activities found|aborted/i.test(output)) throw new TvError(404, 'APP_UNAVAILABLE', 'App is not installed on TV');
  }
  async text(target: Target, value: string): Promise<void> {
    const address = await this.requireConnected(target);
    // Android input text accepts ASCII; percent-escaped spaces and shell-safe quoted payload.
    if (!/^[\x20-\x7E]+$/.test(value)) throw new TvError(400, 'UNSUPPORTED_TEXT', 'ADB text input supports ASCII characters only');
    const escaped = value.replace(/ /g, '%s').replace(/'/g, `'\\''`);
    await this.run(['-s', address, 'shell', `input text '${escaped}'`]);
  }
  async info(target: Target): Promise<{ name: string; model: string }> {
    const address = await this.requireConnected(target);
    const [name, model] = await Promise.all([
      this.run(['-s', address, 'shell', 'getprop', 'ro.product.name']),
      this.run(['-s', address, 'shell', 'getprop', 'ro.product.model']),
    ]);
    return { name: name.trim(), model: model.trim() };
  }
}
