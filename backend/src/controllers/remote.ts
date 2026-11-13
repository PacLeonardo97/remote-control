import type { RequestHandler } from 'express';
import { RemoteProtocolService } from '../services/remote.js';
import { discoverTvs } from '../services/discovery.js';
import { appSchema, commandSchema, hostSchema, textSchema } from '../services/validation.js';
import { z } from 'zod';
import { TvError } from '../services/adb.js';

export const remote = new RemoteProtocolService();
export const status: RequestHandler = async (_req, res) => { res.json(await remote.health()); };
export const discover: RequestHandler = async (_req, res) => { res.json(await discoverTvs()); };
export const connect: RequestHandler = async (req, res) => {
  const { host } = z.object({ host: hostSchema }).strict().parse(req.body);
  res.json(await remote.connect(host));
};
export const pin: RequestHandler = async (req, res) => {
  const { code } = z.object({ code: z.string() }).strict().parse(req.body);
  res.json(await remote.pin(code));
};
export const disconnect: RequestHandler = (_req, res) => { res.json(remote.disconnect()); };
export const forget: RequestHandler = async (_req, res) => { res.json(await remote.forget()); };
export const command: RequestHandler = (req, res) => { const input = commandSchema.parse(req.body); remote.command(input.command); res.json({ ok: true }); };
export const text: RequestHandler = (req, res) => { const input = textSchema.parse(req.body); remote.text(input.text); res.json({ ok: true }); };
export const app: RequestHandler = (req, _res) => { appSchema.parse(req.body); throw new TvError(501, 'UNSUPPORTED', 'App shortcuts are available only with ADB'); };
