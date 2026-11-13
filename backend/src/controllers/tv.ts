import type { RequestHandler } from 'express';
import { AdbService, TvError } from '../services/adb.js';
import { getTarget, saveTarget } from '../services/config.js';
import { appSchema, commandSchema, connectSchema, pairSchema, textSchema, targetSchema } from '../services/validation.js';

const adb = new AdbService();
const apps = {
  youtube: process.env.APP_YOUTUBE || 'com.google.android.youtube.tv',
  netflix: process.env.APP_NETFLIX || 'com.netflix.ninja',
  prime: process.env.APP_PRIME || 'com.amazon.amazonvideo.livingroom',
  disney: process.env.APP_DISNEY || 'com.disney.disneyplus',
};
function requiredTarget() { const target = getTarget(); if (!target) throw new TvError(400, 'NO_TV_CONFIGURED', 'Set the TV address first'); return target; }
export const status: RequestHandler = async (_req, res) => { res.json(await adb.status(getTarget())); };
export const connect: RequestHandler = async (req, res) => {
  const input = connectSchema.parse(req.body);
  const previous = getTarget();
  const target = targetSchema.parse({ host: input.host ?? previous?.host, port: input.port ?? previous?.port ?? 5555, mac: input.mac ?? previous?.mac });
  await saveTarget(target);
  await adb.connect(target);
  res.json(await adb.status(target));
};
export const disconnect: RequestHandler = async (_req, res) => { await adb.disconnect(requiredTarget()); res.json({ connected: false }); };
export const pair: RequestHandler = async (req, res) => {
  const input = pairSchema.parse(req.body);
  await adb.pair({ host: input.host ?? requiredTarget().host, port: input.port }, input.code);
  res.json({ paired: true });
};
export const command: RequestHandler = async (req, res) => { const { command } = commandSchema.parse(req.body); await adb.command(requiredTarget(), command); res.json({ ok: true }); };
export const app: RequestHandler = async (req, res) => { const { app } = appSchema.parse(req.body); await adb.app(requiredTarget(), apps[app]); res.json({ ok: true }); };
export const sendText: RequestHandler = async (req, res) => { const { text } = textSchema.parse(req.body); await adb.text(requiredTarget(), text); res.json({ ok: true }); };
export const listApps: RequestHandler = (_req, res) => { res.json(Object.keys(apps)); };
export const info: RequestHandler = async (_req, res) => { res.json(await adb.info(requiredTarget())); };
export const config: RequestHandler = (_req, res) => { res.json(getTarget()); };
