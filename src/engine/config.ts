// All balance-critical tuning constants live here so the Monte Carlo harness
// (Phase 1) can iterate in one place. Values in GBP.
import type { OfferSlot, Vol } from './types';

export const TOTAL_WINDOWS = 12;
export const AGENT_FEE = 0.05; // 5% of incoming player value
export const BUST_FLOOR = 100_000; // value below this => BUST

// Starter band: £4m–£10m (recognisable established players; the climb to a
// £100m Galáctico is ~10–25x, so the growth below is dampened accordingly).
export const STARTER_MIN = 4_000_000;
export const STARTER_MAX = 10_000_000;

// --- Event-phase distributions (per window), by volatility archetype. ---
// Tuned via the harness against the balance target in spec §2.5:
//   EV-bot Galáctico 10–15%, always-safe ~0%, always-punt mostly Bust.
export interface EventDist {
  mean: number; // mean of the normal core (additive to 1.0, so 0.04 => +4%)
  sd: number; // std dev of the normal core
  floor: number; // hard lower bound on the normal core multiplier
  cap: number; // hard upper bound on the normal core multiplier
  injuryChance: number; // chance of a discrete (non-fatal) injury dip
  injuryMult: number; // multiplier applied on injury
  breakoutChance: number; // chance of a discrete breakout event
  breakoutMult: number; // multiplier applied on breakout
  blowupChance: number; // chance of a RUN-ENDING career event this window
}

export const EVENT_DISTS: Record<Vol, EventDist> = {
  LOW: {
    mean: 1.005,
    sd: 0.06,
    floor: 0.85,
    cap: 1.25,
    injuryChance: 0.0,
    injuryMult: 1.0,
    breakoutChance: 0.0,
    breakoutMult: 1.0,
    blowupChance: 0.0,
  },
  MED: {
    mean: 1.01,
    sd: 0.16,
    floor: 0.6,
    cap: 1.7,
    injuryChance: 0.02,
    injuryMult: 0.6,
    breakoutChance: 0.03,
    breakoutMult: 1.7,
    blowupChance: 0.01,
  },
  HIGH: {
    mean: 1.02,
    sd: 0.31,
    floor: 0.5,
    cap: 2.3,
    injuryChance: 0.05,
    injuryMult: 0.55,
    breakoutChance: 0.09,
    breakoutMult: 2.15,
    blowupChance: 0.1,
  },
};

// Rare catastrophic tail at every level (spec §3.3): the "retired to Marbella"
// story. Checked before the archetype roll. Per-archetype blowupChance models
// the volatility-scaled career-ending risk that punishes reckless punting.
export const BUST_TAIL_CHANCE = 0.004;
export const BUST_TAIL_MULT = 0.1; // -90%
export const BLOWUP_MULT = 0.03; // value remnant on a run-ending blowup

// --- Offer-phase multiplier bands (relative to current held value V). ---
export interface OfferBand {
  min: number;
  max: number;
  /** Volatility archetype this slot prefers when selecting a real player. */
  preferVol: Vol;
}

export const OFFER_BANDS: Record<OfferSlot, OfferBand> = {
  safe: { min: 0.98, max: 1.08, preferVol: 'LOW' },
  value: { min: 1.06, max: 1.26, preferVol: 'MED' },
  punt: { min: 1.2, max: 1.62, preferVol: 'HIGH' },
};

export const OFFER_SLOT_ORDER: OfferSlot[] = ['safe', 'value', 'punt'];

// Candidate search: tolerance windows around the target value, widened in steps
// when a band is thin (spec §8.1 liquidity mitigation).
export const CANDIDATE_BANDS: { lo: number; hi: number }[] = [
  { lo: 0.78, hi: 1.28 },
  { lo: 0.6, hi: 1.55 },
  { lo: 0.4, hi: 2.0 },
  { lo: 0.2, hi: 3.0 },
];
export const MIN_CANDIDATES = 30; // widen if fewer than this after constraints

// Selection-weight multipliers for offer biasing (spec §2.3).
export const SAME_LEAGUE_WEIGHT = 3.0; // ~60% bias toward held player's league
export const SAME_POSGROUP_WEIGHT = 2.0; // ~40% bias toward adjacent positions
export const PREFER_VOL_WEIGHT = 2.0; // nudge slot toward its archetype

// Leagues weighted up for starter selection so UK players recognise names
// (spec §8.3).
export const FAMILIAR_LEAGUES = new Set<string>([
  'Premier League',
  'Championship',
  'League One',
  'League Two',
  'EFL Championship',
]);
export const FAMILIAR_LEAGUE_WEIGHT = 4.0;

// Value bands (£m), log-scale buckets (spec §3.2). Index = band.
export const VALUE_BANDS_M: number[] = [0.3, 0.6, 1.2, 2.5, 5, 10, 20, 40, 70, 110];

/**
 * Map a GBP value to its band index. VALUE_BANDS_M holds the lower bound of
 * each band, so band = (count of bounds <= value) - 1, clamped to [0, n-1].
 * e.g. £0.4m -> band 0 (0.3–0.6), £110m+ -> band 9 (110+).
 */
export function valueToBand(valueGbp: number): number {
  const m = valueGbp / 1_000_000;
  let count = 0;
  for (const bound of VALUE_BANDS_M) {
    if (m >= bound) count++;
  }
  return Math.max(0, count - 1);
}
