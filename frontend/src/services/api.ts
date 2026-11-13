import type { AppName, Command, Status, Target } from '../types/tv';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = sessionStorage.getItem('tv_api_token');
  const response = await fetch(`/api/tv/${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro de comunicação com a API');
  return data as T;
}
export const api = {
  status: () => request<Status>('status'),
  config: () => request<Target | null>('config'),
  connect: (target: Target) => request<Status>('connect', 'POST', target),
  disconnect: () => request<Status>('disconnect', 'POST'),
  pair: (host: string, port: number, code: string) => request<{ paired: boolean }>('pair', 'POST', { host, port, code }),
  command: (command: Command) => request<{ ok: true }>('command', 'POST', { command }),
  app: (app: AppName) => request<{ ok: true }>('app', 'POST', { app }),
  text: (text: string) => request<{ ok: true }>('text', 'POST', { text }),
  info: () => request<{ name: string; model: string }>('info'),
};
