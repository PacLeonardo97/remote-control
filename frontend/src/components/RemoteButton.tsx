import { useRef, type ReactNode } from 'react';
export function RemoteButton({ icon, label, onClick, onHoldStart, onHoldEnd, disabled = false, className = '' }: { icon: ReactNode; label: string; onClick: () => void; onHoldStart?: () => void; onHoldEnd?: () => void; disabled?: boolean; className?: string }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);
  const suppressClick = useRef(false);
  const finish = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (holding.current) { holding.current = false; suppressClick.current = true; onHoldEnd?.(); setTimeout(() => { suppressClick.current = false; }, 0); }
  };
  return <button type="button" title={label} aria-label={label} disabled={disabled} onPointerDown={event => {
    if (!onHoldStart || event.pointerType === 'mouse' && event.button !== 0) return;
    timer.current = setTimeout(() => { timer.current = null; holding.current = true; onHoldStart(); }, 450);
  }} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={finish} onClick={() => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    onClick();
  }} className={`flex items-center justify-center gap-2 rounded-2xl bg-slate-800/90 text-slate-100 shadow-lg shadow-black/20 transition active:scale-95 active:bg-indigo-500 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>{icon}</button>;
}
