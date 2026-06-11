// Pool indexing and starter selection. The pool is a flat array of Player
// records (from pools.json); this builds the lookups the engine needs.
import {
  FAMILIAR_LEAGUE_WEIGHT,
  FAMILIAR_LEAGUES,
  STARTER_MAX,
  STARTER_MIN,
} from './config';
import type { RNG } from './rng';
import type { Player } from './types';

export class PoolIndex {
  readonly all: Player[];
  /** Players sorted ascending by peakValue, for range queries. */
  readonly byValue: Player[];
  private readonly values: number[];
  readonly starters: Player[];

  constructor(players: Player[]) {
    this.all = players;
    this.byValue = [...players].sort((a, b) => a.peakValue - b.peakValue);
    this.values = this.byValue.map((p) => p.peakValue);
    this.starters = players.filter(
      (p) => p.peakValue >= STARTER_MIN && p.peakValue <= STARTER_MAX,
    );
    if (this.starters.length === 0) {
      throw new Error('Pool has no players in the starter band (£300k–£1m).');
    }
  }

  get size(): number {
    return this.all.length;
  }

  /** First index in byValue with peakValue >= v (lower_bound). */
  private lowerBound(v: number): number {
    let lo = 0;
    let hi = this.values.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.values[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Players with peakValue in [lo, hi], excluding `used` ids. Returns a fresh
   * array; callers filter/weight further.
   */
  inValueRange(lo: number, hi: number, used: Set<string>): Player[] {
    const start = this.lowerBound(lo);
    const out: Player[] = [];
    for (let i = start; i < this.byValue.length; i++) {
      const p = this.byValue[i];
      if (p.peakValue > hi) break;
      if (!used.has(p.id)) out.push(p);
    }
    return out;
  }

  /** Pick a starter, weighting familiar (English) leagues up for recognisability. */
  pickStarter(rng: RNG): Player {
    const weights = this.starters.map((p) =>
      FAMILIAR_LEAGUES.has(p.league) ? FAMILIAR_LEAGUE_WEIGHT : 1,
    );
    return rng.weighted(this.starters, weights);
  }
}
