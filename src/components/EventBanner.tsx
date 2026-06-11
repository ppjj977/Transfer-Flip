// The event-phase flavour line + delta, shown while/after the value ticks.
import { formatValue } from '../engine/scoring';
import type { EventResult } from '../engine/types';

export function EventBanner({ event }: { event: EventResult }) {
  const pct = Math.round((event.mult - 1) * 100);
  const up = pct >= 0;
  const busted = event.kind === 'bust';
  const delta = busted ? 'BUST' : `${up ? '+' : ''}${pct}%`;
  const color = busted ? 'text-loss' : up ? 'text-gain' : 'text-loss';
  return (
    <div className="rounded-xl border border-edge bg-panel2 px-4 py-3 animate-riseIn">
      <div className="flex items-center gap-2">
        <span className={`tabular text-lg font-extrabold ${color}`}>{delta}</span>
        {event.insured && <span className="text-xs text-sky-300">🛡 insured</span>}
        <span className="ml-auto text-xs text-slate-500">{formatValue(event.valueAfter)}</span>
      </div>
      <p className="mt-1 text-sm text-slate-200">{event.flavour}</p>
    </div>
  );
}
