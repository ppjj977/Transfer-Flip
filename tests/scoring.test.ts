import { describe, it, expect } from 'vitest';
import { tierFor, formatValue, shareString } from '../src/engine/scoring';
import type { RunState } from '../src/engine/types';

describe('tiers', () => {
  it('maps values to the right tier', () => {
    expect(tierFor(50_000, false).name).toBe('Sunday League');
    expect(tierFor(1_000_000, false).name).toBe('Sunday League');
    expect(tierFor(5_000_000, false).name).toBe('Journeyman');
    expect(tierFor(20_000_000, false).name).toBe('Solid Pro');
    expect(tierFor(45_000_000, false).name).toBe('Star');
    expect(tierFor(80_000_000, false).name).toBe('Marquee');
    expect(tierFor(120_000_000, false).name).toBe('Galáctico');
  });

  it('busted overrides to Bosman', () => {
    expect(tierFor(120_000_000, true).name).toBe('Bosman');
  });

  it('boundaries are inclusive lower bounds', () => {
    expect(tierFor(2_000_000, false).name).toBe('Journeyman');
    expect(tierFor(100_000_000, false).name).toBe('Galáctico');
  });
});

describe('formatValue', () => {
  it('formats millions, thousands and pounds', () => {
    expect(formatValue(74_200_000)).toBe('£74.2m');
    expect(formatValue(120_000_000)).toBe('£120m');
    expect(formatValue(950_000)).toBe('£950k');
    expect(formatValue(500)).toBe('£500');
  });
});

describe('shareString', () => {
  it('renders the spec format', () => {
    const run = {
      seed: 'ABX29K',
      mode: 'hard',
      totalWindows: 12,
      status: 'complete',
      value: 74_200_000,
      finalValue: 74_200_000,
      chain: [
        { player: { name: 'Glenn Murray' }, valueAtAcquire: 1 },
        { player: { name: 'Ousmane Dembélé' }, valueAtAcquire: 1 },
      ],
    } as unknown as RunState;
    const s = shareString(run);
    expect(s).toContain('THE FLIP 🔁 seed ABX29K');
    expect(s).toContain('Glenn Murray → Ousmane Dembélé');
    expect(s).toContain('MARQUEE');
    expect(s).toContain('Hard');
    expect(s).toContain('/?s=ABX29K');
  });
});
