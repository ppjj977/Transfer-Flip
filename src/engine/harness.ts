// Monte Carlo balance harness (spec §6 Phase 1). Simulates many runs under each
// bot policy and prints tier distributions. The Phase 1 gate:
//   EV-bot Galáctico 10–15%, always-safe ~0%, always-punt mostly Bust.
//
// Run: npm run harness  [-- --runs 100000]
import { armInsurance, beginWindow, decide, initRun } from './run';
import { alwaysPunt, alwaysSafe, evMaximiser, type Bot } from './bots';
import { loadPoolFromFile } from './loadPool';
import { tierFor, TIERS, BUST_TIER, formatValue } from './scoring';
import { makeSeedString } from './rng';
import type { PoolIndex } from './pool';
import type { Mode } from './types';

const TIER_ORDER = [BUST_TIER, ...[...TIERS].reverse()]; // Bust .. Galáctico

interface Stats {
  n: number;
  tierCounts: Map<string, number>;
  finals: number[];
}

function playWithBot(seed: string, mode: Mode, pool: PoolIndex, bot: Bot) {
  const state = initRun(seed, mode, pool);
  for (let w = 0; w < state.totalWindows; w++) {
    if (state.status !== 'active') break;
    // Bots never use the insurance token in the harness (kept simple/neutral).
    void armInsurance;
    beginWindow(state, pool);
    if (state.status !== 'active') break;
    const choice = bot.decide(state);
    decide(state, choice);
  }
  return state;
}

function simulate(bot: Bot, runs: number, mode: Mode, pool: PoolIndex): Stats {
  const tierCounts = new Map<string, number>();
  const finals: number[] = [];
  for (let i = 0; i < runs; i++) {
    const seed = makeSeedString((i * 2654435761) >>> 0, 6);
    const state = playWithBot(seed, mode, pool, bot);
    const final = state.finalValue ?? state.value;
    const tier = tierFor(final, state.status === 'busted');
    tierCounts.set(tier.name, (tierCounts.get(tier.name) ?? 0) + 1);
    finals.push(final);
  }
  return { n: runs, tierCounts, finals };
}

function pct(n: number, total: number): string {
  return `${((100 * n) / total).toFixed(1)}%`;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function report(bot: Bot, stats: Stats): void {
  console.log(`\n=== ${bot.name}  (${stats.n} runs) ===`);
  for (const t of TIER_ORDER) {
    const c = stats.tierCounts.get(t.name) ?? 0;
    const bar = '█'.repeat(Math.round((50 * c) / stats.n));
    console.log(
      `  ${t.emoji} ${t.name.padEnd(14)} ${pct(c, stats.n).padStart(6)}  ${bar}`,
    );
  }
  console.log(`  median final: ${formatValue(median(stats.finals))}`);
  const galactico = stats.tierCounts.get('Galáctico') ?? 0;
  console.log(`  Galáctico rate: ${pct(galactico, stats.n)}`);
}

function main() {
  const args = process.argv.slice(2);
  const runsArg = args.indexOf('--runs');
  const runs = runsArg >= 0 ? parseInt(args[runsArg + 1], 10) : 100_000;
  const mode: Mode = 'normal';

  const poolPath = process.env.POOL_PATH ?? 'public/data/pools.json';
  const pool = loadPoolFromFile(poolPath);
  console.log(`Pool: ${pool.size} players (${poolPath})`);
  console.log(`Runs per policy: ${runs}`);

  const bots = [alwaysSafe, evMaximiser, alwaysPunt];
  const results: { bot: Bot; stats: Stats }[] = [];
  for (const bot of bots) {
    const t0 = Date.now();
    const stats = simulate(bot, runs, mode, pool);
    results.push({ bot, stats });
    report(bot, stats);
    console.log(`  (${Date.now() - t0}ms)`);
  }

  // Gate check.
  console.log('\n--- Phase 1 gate ---');
  const ev = results.find((r) => r.bot.name === 'ev-maximiser')!.stats;
  const safe = results.find((r) => r.bot.name === 'always-safe')!.stats;
  const punt = results.find((r) => r.bot.name === 'always-punt')!.stats;
  const evGal = (ev.tierCounts.get('Galáctico') ?? 0) / ev.n;
  const safeGal = (safe.tierCounts.get('Galáctico') ?? 0) / safe.n;
  const puntBust = (punt.tierCounts.get('Bosman') ?? 0) / punt.n;

  const checks = [
    ['EV-bot Galáctico in 10–15%', evGal >= 0.1 && evGal <= 0.15, `${(evGal * 100).toFixed(1)}%`],
    ['Always-safe Galáctico ~0% (<1%)', safeGal < 0.01, `${(safeGal * 100).toFixed(2)}%`],
    ['Always-punt mostly Bust (>50%)', puntBust > 0.5, `${(puntBust * 100).toFixed(1)}%`],
  ] as const;
  let allPass = true;
  for (const [label, ok, val] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${val}`);
    if (!ok) allPass = false;
  }
  console.log(allPass ? '\nGATE PASSED ✅' : '\nGATE NOT YET MET — tune src/engine/config.ts');
  process.exit(allPass ? 0 : 1);
}

main();
