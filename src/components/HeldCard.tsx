// The held player card: name, position, club/league, flag, big animated value,
// and a sparkline of the run so far.
import { formatValue } from '../engine/scoring';
import type { Player } from '../engine/types';
import { flagFor } from '../lib/flag';
import { Sparkline } from './Sparkline';
import { VolBadge } from './VolBadge';

interface Props {
  player: Player;
  displayValue: number;
  history: number[];
  window: number;
  totalWindows: number;
  showVol: boolean;
  flashing: 'gain' | 'loss' | null;
}

export function HeldCard({ player, displayValue, history, window, totalWindows, showVol, flashing }: Props) {
  const flashClass = flashing === 'gain' ? 'animate-flashGain' : flashing === 'loss' ? 'animate-flashLoss' : '';
  return (
    <div className={`rounded-2xl bg-panel border border-edge p-4 ${flashClass}`}>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="uppercase tracking-wider">Your player</span>
        <span className="tabular">
          Window <span className="text-ticker font-semibold">{Math.min(window, totalWindows)}</span> / {totalWindows}
        </span>
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{flagFor(player.nat)}</span>
            <h2 className="truncate text-xl font-bold">{player.name}</h2>
          </div>
          <div className="mt-1 text-sm text-slate-300 truncate">
            {player.pos} · {player.club}
          </div>
          <div className="text-xs text-slate-500 truncate">{player.league}</div>
        </div>
        {showVol && <VolBadge vol={player.vol} />}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div
          className={`tabular text-4xl font-extrabold ${
            flashing === 'gain' ? 'text-gain' : flashing === 'loss' ? 'text-loss' : 'text-white'
          }`}
        >
          {formatValue(displayValue)}
        </div>
        <Sparkline values={history} />
      </div>
    </div>
  );
}
