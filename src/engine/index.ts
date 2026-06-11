// Public barrel for the pure engine. UI imports only from here.
export * from './types';
export * from './config';
export { RNG, hashSeed, makeSeedString } from './rng';
export { PoolIndex } from './pool';
export { initRun, beginWindow, decide, armInsurance, playRun } from './run';
export { generateOffers } from './offers';
export { runEvent, rollEventMult } from './events';
export { tierFor, formatValue, shareString, TIERS, BUST_TIER, type Tier } from './scoring';
