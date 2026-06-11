// localStorage-backed meta state (spec §4): best run, tier counts, current
// non-bust streak, hard-mode unlock. No accounts, no backend.
import type { Mode } from '../engine/types';

const KEY = 'theflip:v1';

export interface BestRun {
  value: number;
  tier: string;
  seed: string;
  mode: Mode;
  chain: string[];
}

export interface Stats {
  runs: number;
  tierCounts: Record<string, number>;
  streak: number; // consecutive non-bust runs
  bestStreak: number;
  best: BestRun | null;
  hardUnlocked: boolean;
}

const EMPTY: Stats = {
  runs: 0,
  tierCounts: {},
  streak: 0,
  bestStreak: 0,
  best: null,
  hardUnlocked: false,
};

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function save(stats: Stats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* storage unavailable (private mode); meta is best-effort only */
  }
}

/** Record a finished run, updating streak/best/unlock. Returns the new stats. */
export function recordRun(args: {
  busted: boolean;
  value: number;
  tier: string;
  seed: string;
  mode: Mode;
  chain: string[];
}): Stats {
  const stats = loadStats();
  stats.runs += 1;
  stats.tierCounts[args.tier] = (stats.tierCounts[args.tier] ?? 0) + 1;

  stats.streak = args.busted ? 0 : stats.streak + 1;
  if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;

  if (!args.busted && (!stats.best || args.value > stats.best.value)) {
    stats.best = {
      value: args.value,
      tier: args.tier,
      seed: args.seed,
      mode: args.mode,
      chain: args.chain,
    };
  }

  // Unlock Hard mode once the player reaches Solid Pro or better (a real climb).
  if (!args.busted && args.value >= 10_000_000) stats.hardUnlocked = true;

  save(stats);
  return stats;
}
