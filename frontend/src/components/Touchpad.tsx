import { useRef } from 'react';
import type { Command } from '../types/tv';
export function Touchpad({ onCommand, disabled }: { onCommand: (command: Command) => void; disabled: boolean }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return <div role="button" tabIndex={0} aria-label="Touchpad: deslize para navegar ou toque para OK" onKeyDown={event => { if (event.key === 'Enter' && !disabled) onCommand('OK'); }} onPointerDown={event => {
    if (disabled) return;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerUp={event => {
    if (disabled || !start.current) return;
    const dx = event.clientX - start.current.x, dy = event.clientY - start.current.y;
    start.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) onCommand('OK');
    else if (Math.abs(dx) > Math.abs(dy)) onCommand(dx > 0 ? 'RIGHT' : 'LEFT');
    else onCommand(dy > 0 ? 'DOWN' : 'UP');
  }} onPointerCancel={() => { start.current = null; }} className={`flex h-44 touch-none select-none items-center justify-center rounded-3xl border border-slate-700 bg-slate-800/70 text-sm text-slate-400 ${disabled ? 'opacity-40' : 'active:bg-indigo-500/20'}`}>Deslize para navegar · toque para OK</div>;
}
