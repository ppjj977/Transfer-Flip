# THE FLIP 🔁

A browser-based football trading roguelite. Start each run with a random
journeyman footballer and use **12 transfer windows** to trade up — through
chains of real player swaps — toward a £100m+ superstar. Real players, real
peak market values, simulated market movement. Runs take 3–5 minutes and
restart instantly with a new seed.

> _"Paperclip to house, but you start with Glenn Murray and try to end with
> Mbappé."_

Static site, zero backend. The engine is a pure, deterministic, seeded module:
`(seed, decisions[]) → run state`, so any run is reproducible and shareable via
`?s=SEED`.

## Quick start

```bash
npm install
npm run dev          # play locally (Vite)
npm test             # engine unit tests (vitest)
npm run harness      # Monte Carlo balance harness (Phase 1 gate)
npm run build        # production build to dist/
```

## Data pipeline

The player pool is built from the Transfermarkt
[`davidcariboo/player-scores`](https://www.kaggle.com/datasets/davidcariboo/player-scores)
Kaggle dataset.

```bash
# With the real CSVs (preferred):
#   drop players.csv, player_valuations.csv into data/raw/  then:
python pipeline/build_pools.py          # -> public/data/pools.json

# Without the CSVs (e.g. Kaggle unreachable): a realistic synthetic pool
python pipeline/build_pools.py --synthetic
```

`build_pools.py` computes each player's peak career value (the anchor), a
volatility archetype from their valuation history, and a value band, then emits
`public/data/pools.json` with a liquidity report. It **fails the build** if any
band below £110m drops under the offer engine's widening floor.

> **Note on the top-end liquidity guard.** The spec's comfort target is 150
> players per band below £110m. Real Transfermarkt data contains only ~60
> players who ever peaked at £70m+, so the £70–110m band can never meet 150.
> The guard is therefore two-tier: a **hard fail** below 30 (the offer engine's
> dynamic band-widening floor) and a **warning** between 30 and 150. The top
> band is expected to warn.

## Architecture

```
pipeline/        Python: raw CSVs -> public/data/pools.json
public/data/     pools.json (committed; raw CSVs are gitignored)
src/engine/      PURE TypeScript, zero DOM/React — rng, events, offers, run, scoring
src/components/  React UI
tests/           vitest, engine only
```

The engine never imports React or the DOM. All randomness flows from one
seeded mulberry32 PRNG, so runs replay identically from `seed + decisions`.

## Balance

`npm run harness` simulates 100k runs under three bot policies and prints tier
distributions. The Phase 1 gate (spec §6): EV-maximiser reaches Galáctico
10–15% of runs, always-safe ~0%, always-punt mostly Bust. Tune
`src/engine/config.ts` until it passes.

## Legal

Independent fan project. Player names and publicly available market valuations
are facts used for entertainment. No club badges, logos, kits, or player
photos. Not affiliated with Transfermarkt or any club or league.
