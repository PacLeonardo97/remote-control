import fs from 'node:fs/promises';
import path from 'node:path';
import { targetSchema } from './validation.js';
import type { z } from 'zod';

export type Target = z.infer<typeof targetSchema>;
const configPath = path.resolve(process.cwd(), 'data/config.json');
let current: Target | null = null;

export async function loadTarget(): Promise<Target | null> {
  try { current = targetSchema.parse(JSON.parse(await fs.readFile(configPath, 'utf8'))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Invalid saved TV configuration:', error);
    const host = process.env.TV_HOST;
    const port = Number(process.env.TV_PORT || 5555);
    current = host ? targetSchema.safeParse({ host, port, mac: process.env.TV_MAC || undefined }).data ?? null : null;
  }
  return current;
}
export function getTarget(): Target | null { return current; }
export async function saveTarget(target: Target): Promise<void> {
  const valid = targetSchema.parse(target);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(valid, null, 2) + '\n', { mode: 0o600 });
  current = valid;
}
