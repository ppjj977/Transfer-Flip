// Scoring tiers and the shareable run string (spec §2.5, §4).
import type { Mode, RunState } from './types';

export interface Tier {
  name: string;
  emoji: string;
  /** Inclusive lower bound in GBP (Infinity-safe ordering). */
  min: number;
}

// Ordered high -> low. "Bust" handled separately.
export const TIERS: Tier[] = [
  { name: 'Galáctico', emoji: '🏆', min: 100_000_000 },
  { name: 'Marquee', emoji: '💎', min: 60_000_000 },
  { name: 'Star', emoji: '⭐', min: 30_000_000 },
  { name: 'Solid Pro', emoji: '🎯', min: 10_000_000 },
  { name: 'Journeyman', emoji: '🧳', min: 2_000_000 },
  { name: 'Sunday League', emoji: '🍺', min: 0 },
];

export const BUST_TIER: Tier = { name: 'Bosman', emoji: '☠️', min: 0 };

/** Map a final value to a tier name. `busted` overrides to Bosman. */
export function tierFor(value: number, busted: boolean): Tier {
  if (busted) return BUST_TIER;
  for (const t of TIERS) {
    if (value >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

/** Format a GBP value compactly, e.g. £74.2m, £950k, £100. */
export function formatValue(gbp: number): string {
  if (gbp >= 1_000_000) {
    const m = gbp / 1_000_000;
    return `£${m >= 100 ? m.toFixed(0) : m.toFixed(1)}m`;
  }
  if (gbp >= 1_000) return `£${Math.round(gbp / 1_000)}k`;
  return `£${Math.round(gbp)}`;
}

function modeLabel(mode: Mode): string {
  return mode === 'hard' ? 'Hard' : 'Normal';
}

/**
 * Build the shareable run string (spec §4). `origin` is the site origin used
 * for the replay link.
 */
export function shareString(run: RunState, origin = 'theflip.game'): string {
  const tier = tierFor(run.finalValue ?? run.value, run.status === 'busted');
  const names = run.chain.map((c) => c.player.name).join(' → ');
  const value = formatValue(run.finalValue ?? run.value);
  const windows = run.status === 'busted' ? `busted W${run.window}` : `${run.totalWindows} windows`;
  const tierLine = `${tier.emoji} ${value} · ${tier.name.toUpperCase()} · ${windows} · ${modeLabel(run.mode)}`;
  return [
    `THE FLIP 🔁 seed ${run.seed}`,
    names,
    tierLine,
    `${origin}/?s=${run.seed}`,
  ].join('\n');
}
