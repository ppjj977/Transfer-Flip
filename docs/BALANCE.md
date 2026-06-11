# Balance (Phase 1)

The single most important tuning target (spec §2.5): a skilled player hits
**Galáctico on ~10–15%** of runs; a random-clicker under 2%. Validated by Monte
Carlo (`npm run harness`) on the real pool.

Runs start in the **£4m–£10m** band (recognisable established players) and aim
for a £100m+ Galáctico, so the climb is ~10–25x and the per-window growth is
dampened accordingly.

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

## Result (20k runs each, £4–10m start)

|              | always-safe | ev-maximiser | always-punt |
|--------------|------------:|-------------:|------------:|
| 🏆 Galáctico |        0.1% |        13.6% |        7.8% |
| ☠️ Bosman    |        ~low |     moderate |       61.2% |
| median final |       £1.4m |       £44.4m |        £2.2m |

**Gate:** EV-bot Galáctico 13.6% (in 10–15% ✅), always-safe 0.05% ✅,
always-punt 61.2% Bust ✅.

The skill signal is clear: the EV bot reaches the top tiers far more often than
relentless punting **while busting much less** — it survives to compound.
Mindless safe-clicking stagnates and the agent fee slowly bleeds it out.

## Where the knobs live

All distributions are in `src/engine/config.ts`:

- `EVENT_DISTS` — per-archetype event-roll mean/σ/floor/cap, plus discrete
  injury, breakout, and the run-ending `blowupChance` (LOW 0, MED 1%, HIGH
  10%). The blowup is what makes relentless punting ruinous; the HIGH breakout
  is the Galáctico engine.
- `OFFER_BANDS` — the multiplier bands for safe / value / punt.
- `BUST_TAIL_CHANCE` — the rare "retired to Marbella" tail at every level.

Re-run `npm run harness` after any change.
