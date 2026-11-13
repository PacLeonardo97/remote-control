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
  app: (method: ConnectionMethod, app: AppName) => request<{ ok: true }>(`${method === 'adb' ? 'tv' : 'remote'}/app`, 'POST', { app }),
  hold: (command: Command, phase: 'start' | 'end') => request<{ ok: true }>('remote/hold', 'POST', { command, phase }),
  stream: async (onStatus: (status: Status) => void, signal: AbortSignal) => {
    const token = sessionStorage.getItem('tv_api_token');
    const response = await fetch('/api/remote/events', { signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok || !response.body) throw new Error('Falha ao acompanhar estado da TV');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      pending += decoder.decode(value, { stream: true });
      const frames = pending.split('\n\n'); pending = frames.pop() || '';
      for (const frame of frames) {
        const line = frame.split('\n').find(part => part.startsWith('data: '));
        if (line) onStatus(JSON.parse(line.slice(6)) as Status);
      }
    }
  },
  text: (method: ConnectionMethod, text: string) => request<{ ok: true }>(`control/${method}/text`, 'POST', { text }),
  info: () => request<{ name: string; model: string }>('tv/info'),
};
