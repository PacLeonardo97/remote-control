import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CirclePower,
  Gamepad2,
  Home,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  SkipBack,
  SkipForward,
  Keyboard,
  Tv2,
  Wifi,
  WifiOff,
  X,
  Terminal,
  Search,
} from "lucide-react";
import { RemoteButton } from "./components/RemoteButton";
import { Touchpad } from "./components/Touchpad";
import { useTv } from "./hooks/useTv";
import type { Command, ConnectionMethod } from "./types/tv";

function appLabel(packageName?: string | null): string {
  if (!packageName) return 'Sem informação';
  if (packageName.includes('youtube')) return 'YouTube';
  if (packageName.includes('netflix')) return 'Netflix';
  if (packageName.includes('amazon')) return 'Prime Video';
  if (packageName.includes('disney')) return 'Disney+';
  return packageName;
}

export default function App() {
  const [method, setMethod] = useState<ConnectionMethod | null>(null);
  const [lastMethod, setLastMethod] = useState(
    localStorage.getItem("tv_method"),
  );
  const tv = useTv(method);
  const [settings, setSettings] = useState(false);
  const [text, setText] = useState("");
  const [pairPort, setPairPort] = useState(37123);
  const [pairCode, setPairCode] = useState("");
  const [remotePin, setRemotePin] = useState("");
  const [token, setToken] = useState(
    sessionStorage.getItem("tv_api_token") || "",
  );
  const choose = (next: ConnectionMethod) => {
    setMethod(next);
    setLastMethod(next);
    localStorage.setItem("tv_method", next);
    tv.setError("");
  };
  useEffect(() => {
    if (tv.error.includes("API token")) setSettings(true);
  }, [tv.error]);
  useEffect(() => {
    const mapping: Record<string, Command> = {
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      ArrowRight: "RIGHT",
      Enter: "OK",
      Escape: "BACK",
      Backspace: "BACK",
      " ": "PLAY_PAUSE",
    };
    const handler = (event: globalThis.KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        settings ||
        !tv.status.connected
      )
        return;
      const command = mapping[event.key];
      if (command) {
        event.preventDefault();
        void tv.command(command);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings, tv.status.connected, tv.command]);
  const button = (
    command: Command,
    icon: ReactNode,
    label: string,
    className = "h-14 w-14",
  ) => (
    <RemoteButton
      icon={icon}
      label={label}
      onClick={() => void tv.command(command)}
      onHoldStart={method === 'remote' ? () => void tv.hold(command, 'start') : undefined}
      onHoldEnd={method === 'remote' ? () => void tv.hold(command, 'end') : undefined}
      disabled={(!tv.status.connected && !(method === 'adb' && command === 'POWER')) || tv.busy}
      className={className}
    />
  );
  if (!method)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090c16] px-4 text-slate-100">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 w-fit rounded-2xl bg-indigo-500/15 p-4 text-indigo-300">
              <Tv2 size={32} />
            </div>
            <h1 className="text-3xl font-semibold">Controle da TV</h1>
            <p className="mt-2 text-slate-400">Escolha como deseja conectar</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => choose("remote")}
              className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-indigo-400 hover:bg-slate-800"
            >
              <Gamepad2 className="mb-5 text-indigo-300" size={32} />
              <h2 className="text-lg font-semibold">Usar Remote Protocol</h2>
              <p className="mt-2 min-h-20 text-sm text-slate-400">
                Controle sua Android TV pela rede local, sem precisar ativar a
                depuração ADB.
              </p>
              <span className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium">
                Usar Remote Protocol
              </span>
              {lastMethod === "remote" && (
                <p className="mt-3 text-xs text-indigo-300">
                  Último método usado
                </p>
              )}
            </button>
            <button
              onClick={() => choose("adb")}
              className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-indigo-400 hover:bg-slate-800"
            >
              <Terminal className="mb-5 text-indigo-300" size={32} />
              <h2 className="text-lg font-semibold">Usar ADB</h2>
              <p className="mt-2 min-h-20 text-sm text-slate-400">
                Controle sua Android TV utilizando Android Debug Bridge.
              </p>
              <span className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium">
                Usar ADB
              </span>
              {lastMethod === "adb" && (
                <p className="mt-3 text-xs text-indigo-300">
                  Último método usado
                </p>
              )}
            </button>
          </div>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#090c16] px-4 py-6 text-slate-100 sm:py-10">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-300">
              <Tv2 size={25} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-slate-500">
                {method === "remote" ? "Remote Protocol" : "ADB"}
              </p>
              <h1 className="text-xl font-semibold">{tv.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              title="Trocar método"
              aria-label="Trocar método"
              onClick={() => {
                setMethod(null);
                setSettings(false);
              }}
              className="rounded-xl bg-slate-800 px-3 text-sm hover:bg-slate-700"
            >
              Trocar
            </button>
            <button
              aria-label="Configurações de conexão"
              onClick={() => setSettings(true)}
              className="rounded-xl bg-slate-800 p-3 hover:bg-slate-700"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            {tv.status.connected ? (
              <Wifi className="text-emerald-400" size={18} />
            ) : (
              <WifiOff className="text-rose-400" size={18} />
            )}
            <span>
              {tv.status.connected
                ? "Conectada"
                : tv.status.state === "pairing"
                  ? "Aguardando PIN"
                  : tv.status.state === "connecting"
                    ? "Conectando"
                    : "Desconectada"}
            </span>
            <span className="text-slate-500">
              {method === "remote" ? tv.status.host : tv.status.address}
            </span>
          </div>
          <button
            disabled={tv.busy}
            onClick={() =>
              void (tv.status.connected ? tv.disconnect() : tv.connect())
            }
            className="text-sm font-medium text-indigo-300 disabled:opacity-40"
          >
            {tv.busy
              ? "Aguarde…"
              : tv.status.connected
                ? "Desconectar"
                : "Conectar"}
          </button>
        </div>
        {tv.error && (
          <div
            role="alert"
            className="mb-5 flex justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            <span>{tv.error}</span>
            <button aria-label="Fechar erro" onClick={() => tv.setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {method === "remote" && tv.status.state === "pairing" && (
          <div className="mb-5 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4">
            <p className="mb-3 text-sm">
              Digite o código de seis caracteres exibido na TV.
            </p>
            <div className="flex gap-2">
              <input
                aria-label="PIN do Remote Protocol"
                value={remotePin}
                maxLength={6}
                onChange={(e) => setRemotePin(e.target.value.toUpperCase())}
                className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3 uppercase"
                placeholder="Código da TV"
              />
              <button
                disabled={tv.busy || !/^[0-9A-F]{6}$/.test(remotePin)}
                onClick={() => void tv.pin(remotePin)}
                className="rounded-xl bg-indigo-600 px-4 disabled:opacity-40"
              >
                Parear
              </button>
            </div>
          </div>
        )}
        {method === 'remote' && <section className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm"><div><p className="text-slate-500">Energia</p><p className="font-medium">{tv.status.powered == null ? 'Sem informação' : tv.status.powered ? 'Ligada' : 'Em espera'}</p></div><div><p className="text-slate-500">Aplicativo aberto</p><p className="break-all font-medium">{appLabel(tv.status.currentApp)}</p></div><div className="col-span-2"><div className="mb-1 flex justify-between"><span className="text-slate-500">Volume {tv.status.volume?.muted ? '· Silenciado' : ''}</span><span>{tv.status.volume ? `${tv.status.volume.level}/${tv.status.volume.maximum}` : 'Sem informação'}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${tv.status.volume ? Math.min(100, Math.max(0, tv.status.volume.level / Math.max(1, tv.status.volume.maximum) * 100)) : 0}%` }}/></div></div></section>}
        {method === 'remote' && tv.status.protocolError && <p role="alert" className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{tv.status.protocolError}</p>}
        <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-900 to-[#111729] p-5 shadow-2xl shadow-black/30">
          <div className="flex justify-between">
            {button("POWER", <CirclePower size={23} />, "Ligar ou desligar")}
            {button("SETTINGS", <Settings size={22} />, "Configurações da TV")}
          </div>
          <div className="mx-auto mt-8 grid w-full max-w-64 grid-cols-3 gap-2">
            <div />
            {button("UP", <ArrowUp />, "Cima", "h-20 w-full")}
            <div />
            {button("LEFT", <ArrowLeft />, "Esquerda", "h-20 w-full")}
            {button(
              "OK",
              <span className="font-bold">OK</span>,
              "OK",
              "h-20 w-full rounded-full bg-indigo-600 hover:bg-indigo-500",
            )}
            {button("RIGHT", <ArrowRight />, "Direita", "h-20 w-full")}
            <div />
            {button("DOWN", <ArrowDown />, "Baixo", "h-20 w-full")}
            <div />
          </div>
          <div className="mt-8 flex justify-center gap-5">
            {button("BACK", <RotateCcw />, "Voltar")}
            {button("HOME", <Home />, "Início")}
          </div>
          <div className="my-6 h-px bg-slate-800" />
          <div className="flex justify-between gap-2">
            {button("VOLUME_DOWN", <Volume1 />, "Diminuir volume")}
            {button("MUTE", <VolumeX />, "Silenciar")}
            {button("VOLUME_UP", <Volume2 />, "Aumentar volume")}
          </div>
          <div className="mt-4 flex justify-between gap-2">
            {button("PREVIOUS", <SkipBack />, "Faixa anterior")}
            {button("PLAY_PAUSE", <Play />, "Reproduzir ou pausar")}
            {button("NEXT", <SkipForward />, "Próxima faixa")}
          </div>
        </section>
        {method === 'remote' && <section className="mt-5"><h2 className="mb-3 text-sm font-semibold text-slate-400">TOUCHPAD</h2><Touchpad disabled={!tv.status.connected} onCommand={command => void tv.command(command)}/><p className="mt-2 text-center text-xs text-slate-500">Segure os botões para pressão longa.</p></section>}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-400">
            APLICATIVOS
          </h2>
          {method === 'remote' && <p className="mb-3 text-xs text-slate-500">Links de abertura podem variar entre versões dos aplicativos.</p>}
          <div className="grid grid-cols-2 gap-2">
            {(["youtube", "netflix", "prime", "disney"] as const).map((app) => (
              <button
                key={app}
                disabled={!tv.status.connected || tv.busy}
                onClick={() => void tv.app(app)}
                className="rounded-xl bg-slate-800 py-3 font-medium capitalize transition active:scale-95 hover:bg-slate-700 disabled:opacity-40"
              >
                {app === "prime"
                  ? "Prime Video"
                  : app === "disney"
                    ? "Disney+"
                    : app === "youtube"
                      ? "YouTube"
                      : "Netflix"}
              </button>
            ))}
          </div>
        </section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text) void tv.text(text);
          }}
          className="mt-5 flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3"
        >
          <Keyboard className="my-auto ml-1 text-slate-500" />
          <input
            aria-label="Texto para enviar à TV"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="Digite na TV…"
            className="min-w-0 flex-1 bg-transparent px-2 outline-none"
          />
          <button
            disabled={!tv.status.connected || !text || tv.busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-600">
          Atalhos: setas, Enter, Esc, Espaço
        </p>
      </div>
      {settings && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/75 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Configurações"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-5 flex justify-between">
              <h2 className="text-xl font-semibold">
                {method === "remote" ? "Remote Protocol" : "Conexão ADB"}
              </h2>
              <button
                aria-label="Fechar configurações"
                onClick={() => setSettings(false)}
              >
                <X />
              </button>
            </div>
            <label className="mb-3 block text-sm text-slate-400">
              IP ou nome da TV
              <input
                value={tv.target.host}
                onChange={(e) =>
                  tv.setTarget({ ...tv.target, host: e.target.value })
                }
                placeholder="192.168.1.50"
                className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            {method === "adb" && (
              <><label className="mb-4 block text-sm text-slate-400">
                Porta ADB
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={tv.target.port}
                  onChange={(e) =>
                    tv.setTarget({ ...tv.target, port: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label><label className="mb-4 block text-sm text-slate-400">MAC da TV para ligar pela rede<input value={tv.target.mac || ''} onChange={e => tv.setTarget({ ...tv.target, mac: e.target.value || undefined })} placeholder="08:c3:b3:24:ef:93" className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"/><span className="mt-1 block text-xs text-slate-500">Necessário se ADB ficar offline em standby.</span></label></>
            )}
            <button
              disabled={tv.busy || !tv.target.host}
              onClick={() => {
                setSettings(false);
                void tv.connect();
              }}
              className="w-full rounded-xl bg-indigo-600 py-3 font-medium disabled:opacity-40"
            >
              Conectar
            </button>
            {method === "remote" ? (
              <div className="mt-5">
                <button
                  disabled={tv.busy}
                  onClick={() => void tv.discover()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 disabled:opacity-40"
                >
                  <Search size={17} />
                  Buscar TVs na rede
                </button>
                {tv.devices.map((device) => (
                  <button
                    key={device.host}
                    onClick={() =>
                      tv.setTarget({ ...tv.target, host: device.host })
                    }
                    className="mt-2 block w-full rounded-xl bg-slate-800 p-3 text-left text-sm"
                  >
                    {device.name} — {device.host}
                  </button>
                ))}
                <button
                  disabled={!tv.status.host || tv.busy}
                  onClick={() => void tv.forget()}
                  className="mt-5 w-full rounded-xl border border-rose-700/60 py-3 text-sm text-rose-300 disabled:opacity-40"
                >
                  Remover pareamento salvo
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <p className="mb-3 text-sm text-slate-400">
                  Pareamento ADB sem fio (se solicitado pela TV)
                </p>
                <div className="flex gap-2">
                  <input
                    aria-label="Porta de pareamento"
                    type="number"
                    min="1"
                    max="65535"
                    value={pairPort}
                    onChange={(e) => setPairPort(Number(e.target.value))}
                    className="w-1/2 rounded-xl bg-slate-800 p-3"
                  />
                  <input
                    aria-label="Código de pareamento"
                    inputMode="numeric"
                    maxLength={6}
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    className="w-1/2 rounded-xl bg-slate-800 p-3"
                  />
                </div>
                <button
                  disabled={tv.busy || !/^\d{6}$/.test(pairCode)}
                  onClick={() => void tv.pair(pairPort, pairCode)}
                  className="mt-3 w-full rounded-xl bg-slate-800 py-3 disabled:opacity-40"
                >
                  Parear ADB
                </button>
              </div>
            )}
            <div className="my-5 h-px bg-slate-700" />
            <label className="block text-sm text-slate-400">
              Token da API (para acesso pela rede)
              <input
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  sessionStorage.setItem("tv_api_token", e.target.value);
                }}
                className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-white"
              />
            </label>
            <button
              onClick={() => {
                tv.setError("");
                void tv.refresh();
                setSettings(false);
              }}
              className="mt-3 w-full rounded-xl bg-slate-800 py-3"
            >
              Aplicar token
            </button>
            <p className="mt-2 text-xs text-slate-500">
              O token fica apenas nesta sessão do navegador.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
