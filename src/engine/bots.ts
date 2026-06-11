// Bot policies for the Monte Carlo balance harness (spec §6 Phase 1).
// A bot chooses a decision given the current run state and its offers.
import { BUST_FLOOR, EVENT_DISTS } from './config';
import { rollEventMult } from './events';
import { RNG } from './rng';
import type { Decision, Offer, RunState, Vol } from './types';

export interface Bot {
  name: string;
  decide(state: RunState): Decision['choice'];
}

/** Always take the safe offer; hold if none available. */
export const alwaysSafe: Bot = {
  name: 'always-safe',
  decide(state) {
    const i = state.currentOffers.findIndex((o) => o.slot === 'safe');
    return i >= 0 ? i : 'hold';
  },
};

/** Always take the punt; fall back to value, then hold. */
export const alwaysPunt: Bot = {
  name: 'always-punt',
  decide(state) {
    const punt = state.currentOffers.findIndex((o) => o.slot === 'punt');
    if (punt >= 0) return punt;
    const value = state.currentOffers.findIndex((o) => o.slot === 'value');
    if (value >= 0) return value;
    return state.currentOffers.length ? 0 : 'hold';
  },
};

/**
 * Per-archetype event statistics, sampled once: survival probability (not a
 * run-ending event) and conditional expected log-multiplier among survivors.
 */
interface VolStats {
  survival: number;
  gLog: number; // E[log mult | survives]
}

function sampleVolStats(samples = 500_000): Record<Vol, VolStats> {
  const rng = new RNG(0x5eed1234);
  const out = {} as Record<Vol, VolStats>;
  for (const vol of Object.keys(EVENT_DISTS) as Vol[]) {
    const player = { vol } as Parameters<typeof rollEventMult>[0];
    let survived = 0;
    let logSum = 0;
    for (let i = 0; i < samples; i++) {
      const { mult, kind } = rollEventMult(player, rng);
      if (kind === 'bust') continue; // run-ending; handled via floor term
      survived++;
      logSum += Math.log(mult);
    }
    out[vol] = { survival: survived / samples, gLog: survived ? logSum / survived : 0 };
  }
  return out;
}

const VOL_STATS = sampleVolStats();
const LOG_FLOOR = Math.log(BUST_FLOOR);

/**
 * Expected-log-value maximiser — the intended "skilled" policy. Myopic: it
 * re-decides every window, so only the *next* window's event risk is weighed
 * against the certain step-up of a swap (the continuation value is a constant
 * across options under multiplicative growth and so drops out of the argmax).
 * A run-ending blowup is treated as ending at the floor:
 *
 *   score = survival(vol) * (log value + gLog(vol)) + (1 - survival(vol)) * log(floor)
 *
 * On the final window there is no subsequent event (the swapped player faces no
 * event), so it simply takes the highest net value — the free end-game punt.
 *
 * Because the floor penalty bites harder the richer you are, the bot embraces
 * HIGH-vol punts while value is low/cheap to lose, holds winners fee-free, and
 * banks into steadier archetypes once it has a lead to protect.
 */
export function makeEvBot(): Bot {
  return {
    name: 'ev-maximiser',
    decide(state) {
      const lastWindow = state.window >= state.totalWindows; // no event after this swap
      const score = (value: number, vol: Vol): number => {
        const logV = Math.log(Math.max(value, 1));
        if (lastWindow) return logV;
        const { survival, gLog } = VOL_STATS[vol];
        return survival * (logV + gLog) + (1 - survival) * LOG_FLOOR;
      };

      let best: Decision['choice'] = 'hold';
      let bestScore = score(state.value, state.held.vol);

      state.currentOffers.forEach((o: Offer, i) => {
        const s = score(o.netValue, o.player.vol);
        if (s > bestScore) {
          bestScore = s;
          best = i;
        }
      });

      return best;
    },
  };
}

export const evMaximiser = makeEvBot();
