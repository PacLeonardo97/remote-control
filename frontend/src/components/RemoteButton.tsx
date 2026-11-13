import type { ReactNode } from 'react';
export function RemoteButton({ icon, label, onClick, disabled = false, className = '' }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; className?: string }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-2xl bg-slate-800/90 text-slate-100 shadow-lg shadow-black/20 transition active:scale-95 active:bg-indigo-500 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>{icon}</button>;
}
