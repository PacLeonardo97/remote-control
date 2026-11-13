import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type {
  AppName,
  Command,
  ConnectionMethod,
  DiscoveredTv,
  Status,
  Target,
} from "../types/tv";

export function useTv(method: ConnectionMethod | null) {
  const [status, setStatus] = useState<Status>({
    connected: false,
    address: null,
  });
  const [target, setTarget] = useState<Target>({
    host: localStorage.getItem("tv_remote_host") || "",
    port: 5555,
  });
  const [name, setName] = useState("Android TV");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<DiscoveredTv[]>([]);
  const refresh = useCallback(async () => {
    if (!method) return;
    try {
      setStatus(await api.status(method));
    } catch (e) {
      setStatus({ connected: false, address: null });
      setError((e as Error).message);
    }
  }, [method]);
  useEffect(() => {
    api
      .config()
      .then((value) => {
        if (value && method === "adb") setTarget(value);
      })
      .catch(() => {});
  }, [method]);
  useEffect(() => {
    if (method === "remote")
      setTarget({
        host: localStorage.getItem("tv_remote_host") || "",
        port: 5555,
      });
  }, [method]);
  useEffect(() => {
    setStatus({ connected: false, address: null });
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (method !== 'remote') return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const listen = () => { void api.stream(setStatus, controller.signal).catch(() => {}).finally(() => { if (!controller.signal.aborted) retry = setTimeout(listen, 2000); }); };
    listen();
    return () => { controller.abort(); if (retry) clearTimeout(retry); };
  }, [method]);
  useEffect(() => {
    if (method === "adb" && status.connected)
      api
        .info()
        .then((info) => setName(info.model || info.name || "Android TV"))
        .catch(() => {});
    else setName("Android TV");
  }, [method, status.connected]);
  const run = async (action: () => Promise<unknown>, update = false) => {
    setBusy(true);
    setError("");
    try {
      await action();
      if (update) await refresh();
    } catch (e) {
      setError((e as Error).message);
      if (update) await refresh();
    } finally {
      setBusy(false);
    }
  };
  return {
    status,
    target,
    setTarget,
    name,
    error,
    setError,
    busy,
    devices,
    refresh,
    connect: () =>
      run(async () => {
        if (method === "remote") {
          localStorage.setItem("tv_remote_host", target.host);
          setStatus(await api.remoteConnect(target.host));
        } else setStatus(await api.connect(target));
      }, true),
    disconnect: () => method && run(() => api.disconnect(method), true),
    pair: (port: number, code: string) =>
      run(() => api.pair(target.host, port, code)),
    pin: (code: string) => run(() => api.remotePin(code), true),
    forget: () => run(() => api.remoteForget(), true),
    discover: () =>
      run(async () => {
        setDevices(await api.discover());
      }),
    command: (command: Command) =>
      method && run(() => api.command(method, command)),
    app: (app: AppName) => method && run(() => api.app(method, app)),
    hold: (command: Command, phase: 'start' | 'end') => method === 'remote' && api.hold(command, phase).catch(e => setError((e as Error).message)),
    text: (text: string) => method && run(() => api.text(method, text)),
  };
}
