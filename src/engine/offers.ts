// Offer phase: generate three swap offers (safe / value / punt) relative to the
// current held value. Pure: randomness from the passed RNG.
import {
  AGENT_FEE,
  CANDIDATE_BANDS,
  MIN_CANDIDATES,
  OFFER_BANDS,
  OFFER_SLOT_ORDER,
  PREFER_VOL_WEIGHT,
  SAME_LEAGUE_WEIGHT,
  SAME_POSGROUP_WEIGHT,
} from './config';
import type { PoolIndex } from './pool';
import type { RNG } from './rng';
import type { Offer, OfferSlot, Player } from './types';

/**
 * Find candidate players around a target value, widening the tolerance band in
 * steps when the pool is thin (spec §8.1). Falls back to the nearest players by
 * value if every band is empty.
 */
function findCandidates(
  pool: PoolIndex,
  target: number,
  taken: Set<string>,
): Player[] {
  for (const band of CANDIDATE_BANDS) {
    const cands = pool.inValueRange(target * band.lo, target * band.hi, taken);
    if (cands.length >= MIN_CANDIDATES) return cands;
    // Keep the widest non-empty set as we go in case nothing hits the minimum.
    if (band === CANDIDATE_BANDS[CANDIDATE_BANDS.length - 1] && cands.length > 0) {
      return cands;
    }
  }
  // Last resort: nearest-by-value across the whole pool.
  const nearest = pool.byValue
    .filter((p) => !taken.has(p.id))
    .sort((a, b) => Math.abs(a.peakValue - target) - Math.abs(b.peakValue - target))
    .slice(0, MIN_CANDIDATES);
  return nearest;
}

/** Selection weight for a candidate given the held player and the slot. */
function candidateWeight(
  cand: Player,
  held: Player,
  slot: OfferSlot,
  target: number,
): number {
  let w = 1;
  if (cand.league === held.league) w *= SAME_LEAGUE_WEIGHT;
  if (cand.posGroup === held.posGroup) w *= SAME_POSGROUP_WEIGHT;
  if (cand.vol === OFFER_BANDS[slot].preferVol) w *= PREFER_VOL_WEIGHT;
  // Closeness to the target value: a soft triangular falloff so the realised
  // multiplier stays near the slot's intent.
  const rel = Math.abs(cand.peakValue - target) / target;
  w *= 1 / (1 + rel);
  return w;
}

function buildOffer(slot: OfferSlot, value: number, player: Player): Offer {
  const fee = player.peakValue * AGENT_FEE;
  return {
    slot,
    player,
    value: player.peakValue,
    fee,
    netValue: player.peakValue - fee,
    mult: player.peakValue / value,
  };
}

/**
 * Generate the three offers for a window. `value` is the current held value,
 * `used` the set of player ids already seen this run (offers never repeat a
 * player, within the window or across the run).
 */
export function generateOffers(
  pool: PoolIndex,
  held: Player,
  value: number,
  used: Set<string>,
  rng: RNG,
): Offer[] {
  const taken = new Set(used);
  const offers: Offer[] = [];

  for (const slot of OFFER_SLOT_ORDER) {
    const band = OFFER_BANDS[slot];
    const targetMult = rng.range(band.min, band.max);
    const target = value * targetMult;

    const cands = findCandidates(pool, target, taken);
    if (cands.length === 0) continue; // pool exhausted; emit fewer offers

    const weights = cands.map((c) => candidateWeight(c, held, slot, target));
    const chosen = rng.weighted(cands, weights);

    taken.add(chosen.id);
    offers.push(buildOffer(slot, value, chosen));
  }

  return offers;
}
