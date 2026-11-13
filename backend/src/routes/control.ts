import { Router } from 'express';
import { z } from 'zod';
import { ADBController, RemoteController, selectController, type TVController } from '../services/controller.js';
import { remote } from '../controllers/remote.js';
import { asyncRoute } from '../middlewares/errors.js';
import { commandSchema, hostSchema, macSchema, textSchema } from '../services/validation.js';

export const controlRouter = Router();
const registry: Record<'adb' | 'remote', TVController> = { adb: new ADBController(), remote: new RemoteController(remote) };
function selected(method: string): TVController { return selectController(method, registry); }
controlRouter.get('/:method/status', asyncRoute(async (req, res) => { res.json(await selected(req.params.method).getStatus()); }));
controlRouter.post('/:method/connect', asyncRoute(async (req, res) => {
  const { host, port, mac } = z.object({ host: hostSchema, port: z.number().int().min(1).max(65535).optional(), mac: macSchema.optional() }).strict().parse(req.body);
  res.json(await selected(req.params.method).connect(host, port, mac));
}));
controlRouter.post('/:method/disconnect', asyncRoute(async (req, res) => { res.json(await selected(req.params.method).disconnect()); }));
controlRouter.post('/:method/command', asyncRoute(async (req, res) => {
  const { command } = commandSchema.parse(req.body);
  await selected(req.params.method).sendCommand(command); res.json({ ok: true });
}));
controlRouter.post('/:method/text', asyncRoute(async (req, res) => {
  const { text } = textSchema.parse(req.body);
  await selected(req.params.method).sendText(text); res.json({ ok: true });
}));
