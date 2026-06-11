import { describe, it, expect } from 'vitest';
import { initRun, beginWindow, decide, playRun, armInsurance } from '../src/engine/run';
import { generateOffers } from '../src/engine/offers';
import { rollEventMult } from '../src/engine/events';
import { RNG } from '../src/engine/rng';
import { makeTestPool } from './fixtures';
import type { Decision } from '../src/engine/types';

const pool = makeTestPool();

function randomDecisions(seed: number, n = 12): Decision[] {
  const r = new RNG(seed);
  return Array.from({ length: n }, () => ({
    choice: r.chance(0.25) ? ('hold' as const) : r.int(0, 2),
  }));
}

describe('determinism (Phase 1 acceptance)', () => {
  it('same seed + decisions produces identical runs', () => {
    const decisions = randomDecisions(1);
    const a = playRun('SEED01', 'normal', pool, decisions);
    const b = playRun('SEED01', 'normal', pool, decisions);
    expect(a.finalValue).toBe(b.finalValue);
    expect(a.status).toBe(b.status);
    expect(a.chain.map((c) => c.player.id)).toEqual(b.chain.map((c) => c.player.id));
    expect(a.records.map((r) => r.event.mult)).toEqual(b.records.map((r) => r.event.mult));
  });

  it('same seed reproduces identical starter and first offers', () => {
    const a = beginWindow(initRun('XYZ123', 'normal', pool), pool);
    const b = beginWindow(initRun('XYZ123', 'normal', pool), pool);
    expect(a.held.id).toBe(b.held.id);
    expect(a.currentOffers.map((o) => o.player.id)).toEqual(b.currentOffers.map((o) => o.player.id));
  });

  it('different seeds usually differ', () => {
    const a = playRun('AAA', 'normal', pool, randomDecisions(1));
    const b = playRun('BBB', 'normal', pool, randomDecisions(1));
    expect(a.chain[0].player.id === b.chain[0].player.id && a.finalValue === b.finalValue).toBe(false);
  });
});

describe('run state machine', () => {
  it('starter is within the £300k–£1m band', () => {
    const s = initRun('STARTER', 'normal', pool);
    expect(s.value).toBeGreaterThanOrEqual(300_000);
    expect(s.value).toBeLessThanOrEqual(1_000_000);
    expect(s.chain).toHaveLength(1);
    expect(s.window).toBe(1);
  });

  it('completes exactly 12 windows when holding throughout', () => {
    const decisions: Decision[] = Array.from({ length: 12 }, () => ({ choice: 'hold' as const }));
    const s = playRun('HOLD12', 'normal', pool, decisions);
    // Either completed all windows or busted along the way.
    if (s.status === 'complete') {
      expect(s.window).toBe(13);
      expect(s.records).toHaveLength(12);
    } else {
      expect(s.status).toBe('busted');
    }
    expect(s.finalValue).not.toBeNull();
  });

  it('charges a 5% agent fee on swaps', () => {
    const s = beginWindow(initRun('FEE', 'normal', pool), pool);
    if (s.status !== 'active') return;
    const offer = s.currentOffers[0];
    decide(s, 0);
    expect(s.value).toBeCloseTo(offer.player.peakValue * 0.95, 0);
    expect(s.held.id).toBe(offer.player.id);
  });

  it('never offers the held player or repeats acquired players', () => {
    const decisions = randomDecisions(5);
    const s = playRun('NODUP', 'normal', pool, decisions);
    const ids = s.chain.map((c) => c.player.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks a run busted and ends it when value crosses the floor', () => {
    // Drive many runs; at least confirm busts are terminal and scored.
    for (let i = 0; i < 50; i++) {
      const s = playRun(`B${i}`, 'normal', pool, randomDecisions(i, 12));
      if (s.status === 'busted') {
        expect(s.phase).toBe('ended');
        expect(s.finalValue).not.toBeNull();
        expect(s.tier).toBe('Bosman');
      }
    }
  });
});

describe('insurance token', () => {
  it('is available in normal mode and consumed once armed', () => {
    const s = initRun('INS', 'normal', pool);
    expect(s.insuranceAvailable).toBe(true);
    armInsurance(s);
    expect(s.insuranceArmed).toBe(true);
    expect(s.insuranceAvailable).toBe(false);
  });

  it('is not available in hard mode', () => {
    const s = initRun('INS', 'hard', pool);
    expect(s.insuranceAvailable).toBe(false);
  });

  it('absorbs downside on the armed window', () => {
    const s = initRun('INS2', 'normal', pool);
    armInsurance(s);
    const before = s.value;
    beginWindow(s, pool);
    const ev = s.records[0].event;
    if (ev.insured) {
      expect(ev.mult).toBe(1.0);
      expect(s.value).toBeCloseTo(before, 0);
    }
  });
});

describe('offers', () => {
  it('generates up to three distinct offers in slot order', () => {
    const rng = new RNG(123);
    const held = pool.starters[0];
    const offers = generateOffers(pool, held, held.peakValue, new Set([held.id]), rng);
    expect(offers.length).toBeGreaterThan(0);
    const ids = offers.map((o) => o.player.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(offers.map((o) => o.slot)).toEqual(['safe', 'value', 'punt'].slice(0, offers.length));
  });

  it('punt offers target higher multipliers than safe offers', () => {
    const rng = new RNG(7);
    const held = pool.byValue[Math.floor(pool.byValue.length / 2)];
    let safeSum = 0, puntSum = 0, n = 0;
    for (let i = 0; i < 200; i++) {
      const offers = generateOffers(pool, held, held.peakValue, new Set([held.id]), new RNG(i));
      const safe = offers.find((o) => o.slot === 'safe');
      const punt = offers.find((o) => o.slot === 'punt');
      if (safe && punt) { safeSum += safe.mult; puntSum += punt.mult; n++; }
    }
    void rng;
    expect(puntSum / n).toBeGreaterThan(safeSum / n);
  });
});

describe('events', () => {
  it('respects archetype floors/caps and produces bust kinds rarely', () => {
    const rng = new RNG(55);
    let busts = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const { mult, kind } = rollEventMult({ vol: 'LOW' } as never, rng);
      expect(mult).toBeGreaterThan(0);
      if (kind === 'bust') busts++;
    }
    // LOW has no blowup; only the rare global tail (~0.4%).
    expect(busts / n).toBeLessThan(0.02);
  });
});
