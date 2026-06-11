// Run state machine. Pure & deterministic: (seed, mode, pool, decisions[])
// fully determines the run. The UI drives this incrementally; the harness and
// tests drive it in batch via playRun().
//
// Per-window order (spec §2): [optional arm insurance] -> EVENT -> OFFERS ->
// DECISION (swap or hold). Functions mutate and return the same state object;
// the React layer wraps this in a ref + version counter (RNG and Sets are
// mutable, so cloning per step would be wasteful and error-prone).
import { BUST_FLOOR, TOTAL_WINDOWS } from './config';
import { runEvent } from './events';
import { generateOffers } from './offers';
import type { PoolIndex } from './pool';
import { RNG, hashSeed } from './rng';
import { tierFor } from './scoring';
import type { Decision, Mode, RunState } from './types';

/** Create a fresh run: pick the starter, ready for window 1's event. */
export function initRun(seed: string, mode: Mode, pool: PoolIndex): RunState {
  const rng = new RNG(hashSeed(seed));
  const starter = pool.pickStarter(rng);
  return {
    seed,
    mode,
    rng,
    window: 1,
    totalWindows: TOTAL_WINDOWS,
    phase: 'event',
    status: 'active',
    held: starter,
    value: starter.peakValue,
    valueHistory: [starter.peakValue],
    chain: [{ player: starter, valueAtAcquire: starter.peakValue }],
    usedPlayerIds: new Set([starter.id]),
    records: [],
    currentOffers: [],
    insuranceAvailable: mode === 'normal',
    insuranceArmed: false,
    finalValue: null,
    tier: null,
  };
}

/** Arm the insurance token before the current window's event (Normal only). */
export function armInsurance(state: RunState): RunState {
  if (state.phase === 'event' && state.insuranceAvailable && !state.insuranceArmed) {
    state.insuranceArmed = true;
    state.insuranceAvailable = false;
  }
  return state;
}

function finalize(state: RunState): RunState {
  state.finalValue = state.value;
  state.tier = tierFor(state.value, state.status === 'busted').name;
  state.phase = 'ended';
  return state;
}

/**
 * Run the event phase for the current window and generate its offers. Advances
 * phase to 'decision', or ends the run on a BUST.
 */
export function beginWindow(state: RunState, pool: PoolIndex): RunState {
  if (state.phase !== 'event' || state.status !== 'active') return state;

  const event = runEvent(state.held, state.value, state.insuranceArmed, state.rng);
  state.insuranceArmed = false;
  state.value = event.valueAfter;

  // BUST: the catastrophic "retired" tail, or simply dropping below the floor.
  const busted = event.kind === 'bust' || state.value < BUST_FLOOR;
  if (busted) {
    state.status = 'busted';
    state.records.push({ window: state.window, event, offers: [] });
    state.valueHistory.push(state.value);
    return finalize(state);
  }

  const offers = generateOffers(pool, state.held, state.value, state.usedPlayerIds, state.rng);
  state.currentOffers = offers;
  state.records.push({ window: state.window, event, offers });
  state.phase = 'decision';
  return state;
}

/** Apply the player's decision for the current window: hold or swap an offer. */
export function decide(state: RunState, choice: Decision['choice']): RunState {
  if (state.phase !== 'decision' || state.status !== 'active') return state;

  const record = state.records[state.records.length - 1];
  record.decision = { choice };

  if (choice !== 'hold') {
    const offer = state.currentOffers[choice];
    if (!offer) throw new Error(`Invalid offer index: ${choice}`);
    state.value = offer.netValue;
    state.held = offer.player;
    state.usedPlayerIds.add(offer.player.id);
    state.chain.push({ player: offer.player, valueAtAcquire: state.value });
  }

  state.currentOffers = [];

  // A swap could in principle dip below the floor at the very bottom.
  if (state.value < BUST_FLOOR) {
    state.status = 'busted';
    state.valueHistory.push(state.value);
    return finalize(state);
  }

  state.window += 1;
  state.valueHistory.push(state.value);

  if (state.window > state.totalWindows) {
    state.status = 'complete';
    return finalize(state);
  }

  state.phase = 'event';
  return state;
}

/**
 * Batch-play a full run from a decision list (used by harness/tests and seed
 * replay). Each decision: optional pre-event `arm`, then the offer `choice`.
 */
export function playRun(
  seed: string,
  mode: Mode,
  pool: PoolIndex,
  decisions: Decision[],
): RunState {
  const state = initRun(seed, mode, pool);
  for (const d of decisions) {
    if (state.status !== 'active') break;
    if (d.arm) armInsurance(state);
    beginWindow(state, pool);
    if (state.status !== 'active') break;
    decide(state, d.choice);
  }
  // If decisions run short of 12 windows, the run simply ends where it is;
  // callers that need a full run supply 12 decisions.
  return state;
}
