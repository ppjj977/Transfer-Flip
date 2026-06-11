import { describe, it, expect } from 'vitest';
import { RNG, hashSeed, makeSeedString } from '../src/engine/rng';

describe('RNG', () => {
  it('is deterministic for a given seed', () => {
    const a = new RNG(12345);
    const b = new RNG(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0,1)', () => {
    const r = new RNG(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds diverge', () => {
    const a = new RNG(1);
    const b = new RNG(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('int respects inclusive bounds', () => {
    const r = new RNG(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('weighted picks honour weights (deterministically)', () => {
    const r = new RNG(42);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 10000; i++) {
      counts[r.weighted(['a', 'b'] as const, [9, 1])]++;
    }
    expect(counts.a).toBeGreaterThan(counts.b * 5);
  });

  it('hashSeed is stable and unsigned', () => {
    expect(hashSeed('ABX29K')).toBe(hashSeed('ABX29K'));
    expect(hashSeed('ABX29K')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('makeSeedString is deterministic and uses the safe alphabet', () => {
    const s = makeSeedString(123456);
    expect(s).toBe(makeSeedString(123456));
    expect(s).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
