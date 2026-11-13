import type { AppName, Command, ConnectionMethod, DiscoveredTv, Status, Target } from '../types/tv';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = sessionStorage.getItem('tv_api_token');
  const response = await fetch(`/api/${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erro de comunicação com a API');
  return data as T;
}
export const api = {
  status: (method: ConnectionMethod) => request<Status>(`control/${method}/status`),
  config: () => request<Target | null>('tv/config'),
  connect: (target: Target) => request<Status>('control/adb/connect', 'POST', target),
  remoteConnect: (host: string) => request<Status>('control/remote/connect', 'POST', { host }),
  disconnect: (method: ConnectionMethod) => request<Status>(`control/${method}/disconnect`, 'POST'),
  pair: (host: string, port: number, code: string) => request<{ paired: boolean }>('tv/pair', 'POST', { host, port, code }),
  remotePin: (code: string) => request<Status>('remote/pin', 'POST', { code }),
  remoteForget: () => request<Status>('remote/pairing', 'DELETE'),
  discover: () => request<DiscoveredTv[]>('remote/discover'),
  command: (method: ConnectionMethod, command: Command) => request<{ ok: true }>(`control/${method}/command`, 'POST', { command }),
  app: (app: AppName) => request<{ ok: true }>('tv/app', 'POST', { app }),
  text: (method: ConnectionMethod, text: string) => request<{ ok: true }>(`control/${method}/text`, 'POST', { text }),
  info: () => request<{ name: string; model: string }>('tv/info'),
};
