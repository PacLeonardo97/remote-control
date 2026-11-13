import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { AppName, Command, Status, Target } from '../types/tv';

export function useTv() {
  const [status, setStatus] = useState<Status>({ connected: false, address: null });
  const [target, setTarget] = useState<Target>({ host: '', port: 5555 });
  const [name, setName] = useState('Android TV');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { setStatus(await api.status()); } catch (e) { setStatus({ connected: false, address: null }); setError((e as Error).message); }
  }, []);
  useEffect(() => { api.config().then(value => { if (value) setTarget(value); }).catch(() => {}); void refresh(); const id = window.setInterval(() => void refresh(), 5000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { if (status.connected) api.info().then(info => setName(info.model || info.name || 'Android TV')).catch(() => {}); }, [status.connected]);
  const run = async (action: () => Promise<unknown>, update = false) => {
    setBusy(true); setError('');
    try { await action(); if (update) await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return { status, target, setTarget, name, error, setError, busy, refresh,
    connect: () => run(() => api.connect(target), true),
    disconnect: () => run(() => api.disconnect(), true),
    pair: (port: number, code: string) => run(() => api.pair(target.host, port, code)),
    command: (command: Command) => run(() => api.command(command)),
    app: (app: AppName) => run(() => api.app(app)),
    text: (text: string) => run(() => api.text(text)),
  };
}
