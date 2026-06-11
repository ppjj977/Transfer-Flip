// Shared engine types. Pure data — no DOM, no React.

export type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';
export type Vol = 'LOW' | 'MED' | 'HIGH';
export type Mode = 'normal' | 'hard';

/** A player record as emitted by the data pipeline into pools.json. */
export interface Player {
  id: string;
  name: string;
  pos: string;
  posGroup: PosGroup;
  nat: string;
  league: string;
  club: string;
  peakValue: number; // GBP
  peakAge: number;
  vol: Vol;
  band: number;
  /** Recognisability score (caps + value + league), for surfacing known names. */
  fame?: number;
}

export type OfferSlot = 'safe' | 'value' | 'punt';

/** A swap offer presented in the offer phase. */
export interface Offer {
  slot: OfferSlot;
  player: Player;
  /** The offered player's market value for this offer (== player.peakValue). */
  value: number;
  /** Agent fee that would be charged on accepting (GBP). */
  fee: number;
  /** Effective held value after accepting (value - fee). */
  netValue: number;
  /** value / heldValueBeforeOffer, for display. */
  mult: number;
}

export type EventKind = 'breakout' | 'gain' | 'flat' | 'dip' | 'injury' | 'bust';

/** Result of an event-phase roll. */
export interface EventResult {
  mult: number; // multiplier applied to held value
  kind: EventKind;
  flavour: string;
  valueBefore: number;
  valueAfter: number;
  insured: boolean; // insurance absorbed downside this window
}

/** A decision the player makes in a window. */
export interface Decision {
  /** Arm the insurance token before this window's event (Normal mode only). */
  arm?: boolean;
  /** 'hold', or the index (0..2) of the chosen offer. */
  choice: 'hold' | number;
}

/** One link in the narrative chain of players held. */
export interface ChainLink {
  player: Player;
  /** Effective held value at the moment this player was acquired. */
  valueAtAcquire: number;
}

export type RunPhase = 'event' | 'decision' | 'ended';
export type RunStatus = 'active' | 'busted' | 'complete';

export interface WindowRecord {
  window: number;
  event: EventResult;
  offers: Offer[];
  decision?: Decision;
}

export interface RunState {
  seed: string;
  mode: Mode;
  rng: RNG;

  /** 1-based index of the window currently in progress; 13 when finished. */
  window: number;
  totalWindows: number;
  phase: RunPhase;
  status: RunStatus;

  held: Player;
  /** Effective current market value of held player (GBP). */
  value: number;
  /** value sampled at the end of each window for the sparkline. */
  valueHistory: number[];

  chain: ChainLink[];
  usedPlayerIds: Set<string>;
  records: WindowRecord[];

  /** Offers awaiting a decision (empty unless phase === 'decision'). */
  currentOffers: Offer[];

  insuranceAvailable: boolean;
  insuranceArmed: boolean;

  finalValue: number | null;
  tier: string | null;
}

// RNG is imported lazily to avoid a circular type import at module load.
import type { RNG } from './rng';
