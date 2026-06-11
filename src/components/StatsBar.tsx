// Compact meta panel: best run, current non-bust streak, run count.
import { formatValue } from '../engine/scoring';
import type { Stats } from '../lib/storage';

export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-edge bg-panel/60 px-3 py-2 text-xs text-slate-400">
      <span>
        Best{' '}
        <span className="font-semibold text-slate-200">
          {stats.best ? `${formatValue(stats.best.value)} · ${stats.best.tier}` : '—'}
        </span>
      </span>
      <span>
        🔥 streak <span className="font-semibold text-ticker">{stats.streak}</span>
      </span>
      <span>
        runs <span className="font-semibold text-slate-200">{stats.runs}</span>
      </span>
    </div>
  );
}
