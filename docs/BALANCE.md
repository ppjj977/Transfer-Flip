# Balance (Phase 1)

The single most important tuning target (spec §2.5): a skilled player hits
**Galáctico on ~10–15%** of runs; a random-clicker under 2%. Validated by Monte
Carlo (`npm run harness`, 100,000 runs per policy on the real 6,269-player
pool).

## Bot policies

- **always-safe** — always takes the SAFE offer. Naive consolidation: pays the
  5% agent fee every window without climbing.
- **always-punt** — always takes the PUNT (HIGH-vol). Maximal aggression.
- **ev-maximiser** — the "skilled" reference policy. Myopic expected-log-value
  maximiser: each window it weighs the certain step-up of a swap against the
  *next* window's ruin risk for the archetype it would land in, treating a
  run-ending blowup as ending at the floor. It embraces HIGH-vol punts while
  value is cheap to lose, holds winners fee-free, banks once it has a lead, and
  exploits the fact that the **final-window swap takes no subsequent event** —
  a free end-game punt.

## Result (100k runs each)

| Tier         | always-safe | ev-maximiser | always-punt |
|--------------|------------:|-------------:|------------:|
| ☠️ Bosman    |       30.3% |        29.4% |       55.4% |
| 🍺 Sunday    |       54.5% |         0.0% |        0.0% |
| 🧳 Journeyman|       14.7% |         1.2% |        0.9% |
| 🎯 Solid Pro |        0.5% |        14.1% |        5.0% |
| ⭐ Star      |        0.0% |        22.8% |        8.6% |
| 💎 Marquee   |        0.0% |        19.0% |       19.8% |
| 🏆 Galáctico |        0.0% |        13.4% |       10.1% |
| median final |       £565k |       £36.3m |        £2.2m |

**Gate:** EV-bot Galáctico 13.4% (in 10–15% ✅), always-safe ~0% ✅, always-punt
mostly Bust ✅.

The skill signal is clear: the EV bot reaches the top tiers far more often than
relentless punting **while busting much less** (29% vs ~55%) — it survives to
compound. Mindless safe-clicking stagnates and the agent fee slowly bleeds it
out.

## Where the knobs live

All distributions are in `src/engine/config.ts`:

- `EVENT_DISTS` — per-archetype event-roll mean/σ/floor/cap, plus discrete
  injury, breakout, and the run-ending `blowupChance` (LOW 0, MED 1%, HIGH
  10%). The blowup is what makes relentless punting ruinous; the HIGH breakout
  is the Galáctico engine.
- `OFFER_BANDS` — the multiplier bands for safe / value / punt.
- `BUST_TAIL_CHANCE` — the rare "retired to Marbella" tail at every level.

Re-run `npm run harness` after any change.
