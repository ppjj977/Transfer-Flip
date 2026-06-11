// Event phase: roll the held player's value movement for a window and pair it
// with consistent flavour text. Pure: all randomness from the passed RNG.
import { BLOWUP_MULT, BUST_TAIL_CHANCE, BUST_TAIL_MULT, EVENT_DISTS } from './config';
import { flavourFor } from './flavour';
import type { RNG } from './rng';
import type { EventKind, EventResult, Player } from './types';

/** Classify a realised multiplier into a narrative kind. */
function kindForMult(mult: number): EventKind {
  if (mult <= 0.15) return 'bust';
  if (mult <= 0.65) return 'injury';
  if (mult < 0.96) return 'dip';
  if (mult < 1.06) return 'flat';
  if (mult < 1.45) return 'gain';
  return 'breakout';
}

/**
 * Roll the raw event multiplier for a player (no insurance, no value applied).
 * Order: catastrophic tail -> discrete archetype events -> normal core.
 */
export function rollEventMult(player: Player, rng: RNG): { mult: number; kind: EventKind } {
  // Rare catastrophic tail at every level.
  if (rng.chance(BUST_TAIL_CHANCE)) {
    return { mult: BUST_TAIL_MULT, kind: 'bust' };
  }

  const dist = EVENT_DISTS[player.vol];

  // Volatility-scaled run-ending blowup (career-ending event). This is what
  // makes relentless punting ruinous — the core of the risk/reward design.
  if (dist.blowupChance > 0 && rng.chance(dist.blowupChance)) {
    return { mult: BLOWUP_MULT, kind: 'bust' };
  }

  // Discrete breakout event (HIGH only, per config).
  if (dist.breakoutChance > 0 && rng.chance(dist.breakoutChance)) {
    return { mult: dist.breakoutMult, kind: 'breakout' };
  }

  // Discrete injury event (MED/HIGH).
  if (dist.injuryChance > 0 && rng.chance(dist.injuryChance)) {
    return { mult: dist.injuryMult, kind: 'injury' };
  }

  // Normal core, clamped to the archetype's floor/cap.
  let mult = rng.gaussian(dist.mean, dist.sd);
  if (mult < dist.floor) mult = dist.floor;
  if (mult > dist.cap) mult = dist.cap;
  return { mult, kind: kindForMult(mult) };
}

/**
 * Run the full event phase for a window: roll, apply insurance, compute the new
 * value, and attach flavour text.
 */
export function runEvent(
  player: Player,
  valueBefore: number,
  insuranceArmed: boolean,
  rng: RNG,
): EventResult {
  const roll = rollEventMult(player, rng);
  let mult = roll.mult;
  let insured = false;

  // Insurance protects the next event roll from any downside.
  if (insuranceArmed && mult < 1.0) {
    mult = 1.0;
    insured = true;
  }

  const kind: EventKind = insured ? 'flat' : roll.kind;
  const valueAfter = valueBefore * mult;

  return {
    mult,
    kind,
    flavour: insured
      ? 'Insurance kicked in — a potential setback was absorbed.'
      : flavourFor(kind, player, rng),
    valueBefore,
    valueAfter,
    insured,
  };
}
