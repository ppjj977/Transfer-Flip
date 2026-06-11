import type { Vol } from '../engine/types';

const STYLES: Record<Vol, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  MED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  HIGH: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const LABEL: Record<Vol, string> = { LOW: 'Low risk', MED: 'Med risk', HIGH: 'High risk' };

export function VolBadge({ vol }: { vol: Vol }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[vol]}`}>
      {LABEL[vol]}
    </span>
  );
}
