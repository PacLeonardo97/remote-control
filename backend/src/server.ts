import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { tvRouter } from './routes/tv.js';
import { errorHandler } from './middlewares/errors.js';
import { loadTarget } from './services/config.js';

const host = process.env.API_HOST || '127.0.0.1';
const port = Number(process.env.API_PORT || 3001);
const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const token = process.env.API_TOKEN;
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!token || token.length < 24)) throw new Error('API_TOKEN of at least 24 characters is required for LAN access');
const app = express();
app.use(cors({ origin }));
app.use(express.json({ limit: '16kb' }));
app.use('/api', (req, res, next) => {
  if (!token) return next();
  if (req.headers.authorization !== `Bearer ${token}`) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Valid API token required' } });
  next();
});
app.use('/api/tv', tvRouter);
app.use(errorHandler);
await loadTarget();
app.listen(port, host, () => console.log(`TV API listening on http://${host}:${port}`));
