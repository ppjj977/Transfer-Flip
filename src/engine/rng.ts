// Seeded PRNG. All randomness in THE FLIP flows from one mulberry32 generator
// so that (seed, decisions[]) fully determines a run — reproducible, testable,
// shareable. The generator carries a single 32-bit integer of state.

export class RNG {
  state: number;

  constructor(seed: number) {
    // Force to uint32.
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). Advances state. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Uniform pick from an array. */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Weighted pick. weights must align with items and sum > 0. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Standard normal via Box–Muller (one draw, second discarded for purity). */
  gaussian(mean = 0, stdDev = 1): number {
    // Guard against log(0).
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }
}

/**
 * Hash an arbitrary seed string into a 32-bit integer (cyrb53-lite).
 * Lets human-friendly seeds like "ABX29K" map to a PRNG seed.
 */
export function hashSeed(str: string): number {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

/** Generate a short shareable seed string of `len` chars from a numeric source. */
export function makeSeedString(source: number, len = 6): string {
  const r = new RNG(source >>> 0);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += SEED_ALPHABET[r.int(0, SEED_ALPHABET.length - 1)];
  }
  return out;
}
