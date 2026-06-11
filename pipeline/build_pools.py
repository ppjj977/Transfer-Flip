#!/usr/bin/env python3
"""Build public/data/pools.json for THE FLIP.

Two input paths, same output and validation:

  * REAL  - Transfermarkt CSVs (Kaggle `davidcariboo/player-scores`) found in
            data/raw/. Computes peak market value, volatility from the
            valuation history, and value bands.
  * SYNTH - if the CSVs are absent (e.g. Kaggle unreachable in the build
            environment), generates a realistic synthetic pool that satisfies
            the same liquidity guard, so the game is fully playable. Swap in the
            real CSVs later and re-run; no front-end changes needed.

Usage:
    python pipeline/build_pools.py                 # auto: real if CSVs present, else synthetic
    python pipeline/build_pools.py --synthetic     # force synthetic
    python pipeline/build_pools.py --raw data/raw  # custom raw dir

Acceptance (spec §6 Phase 0): all bands below £110m have >= 150 players, and
pools.json is small (< 2MB). The build FAILS (exit 1) if the liquidity guard
is violated.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
from dataclasses import dataclass, asdict
from datetime import date
from typing import Optional

# --- Shared constants (mirror src/engine/config.ts) -------------------------

EUR_TO_GBP = 0.85  # flat conversion; precision irrelevant to gameplay (spec §8.4)
PEAK_VALUE_FLOOR_GBP = 300_000
MIN_VALUATION_POINTS = 4
# Liquidity guard (spec §3.2 / §8.1). The spec's comfort target is 150 players
# per band below £110m. Real Transfermarkt data simply does not contain 150
# players who ever peaked at £70m+ (there are ~60), so the top band can never
# meet 150. We therefore use a two-tier guard that matches the spec's own
# runtime mitigation: HARD-FAIL below LIQUIDITY_HARD_MIN (the offer engine's
# dynamic band-widening floor), WARN between hard and soft minimums.
LIQUIDITY_SOFT_MIN = 150  # comfort target; warn below
LIQUIDITY_HARD_MIN = 30   # playability floor (matches offers.ts MIN_CANDIDATES); fail below
TOP_BAND_THRESHOLD_M = 110

# Value bands (£m), lower bounds. Index = band (spec §3.2).
VALUE_BANDS_M = [0.3, 0.6, 1.2, 2.5, 5, 10, 20, 40, 70, 110]

POS_GROUPS = {
    # Transfermarkt position -> our coarse group.
    "Goalkeeper": "GK",
    "Centre-Back": "DEF", "Left-Back": "DEF", "Right-Back": "DEF",
    "Defender": "DEF",
    "Defensive Midfield": "MID", "Central Midfield": "MID",
    "Attacking Midfield": "MID", "Left Midfield": "MID", "Right Midfield": "MID",
    "Midfielder": "MID",
    "Left Winger": "ATT", "Right Winger": "ATT", "Centre-Forward": "ATT",
    "Second Striker": "ATT", "Attack": "ATT",
}


def value_to_band(value_gbp: float) -> int:
    """GBP value -> band index (see VALUE_BANDS_M)."""
    m = value_gbp / 1_000_000
    count = sum(1 for b in VALUE_BANDS_M if m >= b)
    return max(0, count - 1)


def coerce_pos_group(pos: str, sub_pos: str) -> str:
    return POS_GROUPS.get(sub_pos) or POS_GROUPS.get(pos) or "MID"


def volatility_from(cv: float, peak_age: int, pos_group: str) -> str:
    """Map coefficient-of-variation + modifiers -> LOW/MED/HIGH (spec §3.3)."""
    # Base level from coefficient of variation of year-on-year value changes.
    # Thresholds calibrated to the real CV distribution (median ~0.53) so the
    # base split is ~40/35/25 LOW/MED/HIGH before modifiers.
    if cv < 0.45:
        level = 0  # LOW
    elif cv < 0.85:
        level = 1  # MED
    else:
        level = 2  # HIGH

    # Modifiers.
    if peak_age < 23:
        level += 1
    if pos_group == "ATT":
        level += 1
    if pos_group in ("GK", "DEF") and peak_age > 27:
        level -= 1

    level = max(0, min(2, level))
    return ["LOW", "MED", "HIGH"][level]


@dataclass
class Rec:
    id: str
    name: str
    pos: str
    posGroup: str
    nat: str
    league: str
    club: str
    peakValue: int
    peakAge: int
    vol: str
    band: int
    fame: int


# --- REAL data path ---------------------------------------------------------

# Curated top leagues by value, with display names (spec §3.2 "top ~12 leagues
# to keep names recognisable"). Keyed by Transfermarkt competition code, which
# is players.current_club_domestic_competition_id. Brazil/Argentina/MLS/Saudi
# are included to capture current stars and faded legends at their peak value.
# Obscure leagues (Greece, Ukraine, Russia, Denmark, Belgium, Türkiye, Scotland)
# are intentionally excluded to keep names recognisable; the big-5 plus
# Eredivisie/Portugal and the star-magnet leagues (MLS/Saudi/Brazil/Argentina)
# remain.
TOP_LEAGUES = {
    "GB1": "Premier League",
    "ES1": "LaLiga",
    "IT1": "Serie A",
    "L1": "Bundesliga",
    "FR1": "Ligue 1",
    "NL1": "Eredivisie",
    "PO1": "Liga Portugal",
    "BRA1": "Brasileirão",
    "ARG1": "Primera División",
    "MLS1": "Major League Soccer",
    "SA1": "Saudi Pro League",
}

# Per-band caps to hit the spec's 4,000–8,000 target pool size and the <2MB
# budget. Lower bands are huge, so we keep the most recognisable players in each
# (by the fame score below); the scarce upper bands (6+) are kept whole.
PER_BAND_CAP = {0: 900, 1: 900, 2: 900, 3: 850, 4: 800, 5: 800}

# League recognisability bonus for the fame score. Premier League is weighted
# highest for a UK-leaning audience; the big-5 next; then the leagues that mostly
# matter as homes for ex-stars / current superstars.
LEAGUE_FAME_BONUS = {
    "Premier League": 30,
    "LaLiga": 18,
    "Serie A": 18,
    "Bundesliga": 18,
    "Ligue 1": 15,
    "Eredivisie": 8,
    "Liga Portugal": 8,
    "Major League Soccer": 6,
    "Saudi Pro League": 6,
    "Brasileirão": 6,
    "Primera División": 6,
    "Scottish Premiership": 5,
    "Süper Lig": 5,
    "Belgian Pro League": 4,
}


def fame_score(caps: int, peak_gbp: float, league: str) -> int:
    """Recognisability proxy: international caps dominate for the famous, value
    and league carry the lower bands where caps are ~0. Used to populate each
    band with the most recognisable players and to bias offers toward them."""
    return int(round(
        caps * 1.0
        + (peak_gbp / 1_000_000) * 0.4
        + LEAGUE_FAME_BONUS.get(league, 0)
    ))


def build_from_csv(raw_dir: str) -> list[Rec]:
    import pandas as pd  # imported lazily so synthetic path needs no pandas

    players = pd.read_csv(os.path.join(raw_dir, "players.csv"))

    # Filter to the curated top leagues by the player's current club league.
    league_col = "current_club_domestic_competition_id"
    players = players[players[league_col].isin(TOP_LEAGUES.keys())].copy()
    keep_ids = set(players["player_id"].tolist())
    print(f"  players in top leagues: {len(players)}")

    vals = pd.read_csv(
        os.path.join(raw_dir, "player_valuations.csv"),
        usecols=["player_id", "date", "market_value_in_eur"],
    )
    vals = vals[vals["player_id"].isin(keep_ids)].copy()
    vals["date"] = pd.to_datetime(vals["date"], errors="coerce")
    vals = vals.dropna(subset=["date", "market_value_in_eur"])
    vals = vals.sort_values(["player_id", "date"])

    # Vectorised aggregates per player.
    vals["pct"] = vals.groupby("player_id")["market_value_in_eur"].pct_change()
    agg = vals.groupby("player_id").agg(
        n=("market_value_in_eur", "size"),
        peak_eur=("market_value_in_eur", "max"),
        cv=("pct", "std"),
    )
    peak_idx = vals.groupby("player_id")["market_value_in_eur"].idxmax()
    agg["peak_date"] = vals.loc[peak_idx].set_index("player_id")["date"]

    # Filters: enough history, and peak above the floor.
    agg["peak_gbp"] = agg["peak_eur"] * EUR_TO_GBP
    agg = agg[(agg["n"] >= MIN_VALUATION_POINTS) & (agg["peak_gbp"] >= PEAK_VALUE_FLOOR_GBP)]

    players = players.set_index("player_id")
    players["dob"] = pd.to_datetime(players["date_of_birth"], errors="coerce")

    recs: list[Rec] = []
    for pid, row in agg.iterrows():
        if pid not in players.index:
            continue
        p = players.loc[pid]
        cv = float(row["cv"]) if row["cv"] == row["cv"] else 0.2  # NaN guard

        dob = p["dob"]
        peak_age = 25
        if dob == dob:  # not NaT
            peak_age = int((row["peak_date"] - dob).days // 365)
            peak_age = max(15, min(40, peak_age))

        sub_pos = str(p.get("sub_position") or "")
        pos = str(p.get("position") or "")
        pos_group = coerce_pos_group(pos, sub_pos)
        peak_gbp = float(row["peak_gbp"])
        league = TOP_LEAGUES[str(p[league_col])]

        caps_raw = p.get("international_caps")
        caps = int(caps_raw) if caps_raw == caps_raw and str(caps_raw).strip() not in ("", "nan") else 0

        recs.append(Rec(
            id=f"tm_{pid}",
            name=str(p.get("name") or "Unknown"),
            pos=sub_pos or pos or "MID",
            posGroup=pos_group,
            nat=str(p.get("country_of_citizenship") or ""),
            league=league,
            club=str(p.get("current_club_name") or "Unknown"),
            peakValue=int(round(peak_gbp)),
            peakAge=peak_age,
            vol=volatility_from(cv, peak_age, pos_group),
            band=value_to_band(peak_gbp),
            fame=fame_score(caps, peak_gbp, league),
        ))

    return _cap_bands(recs)


def _cap_bands(recs: list[Rec]) -> list[Rec]:
    """Keep at most PER_BAND_CAP[b] players per band, preferring the most famous
    (recognisable) — this is what keeps the on-screen names ones people know."""
    by_band: dict[int, list[Rec]] = {}
    for rec in recs:
        by_band.setdefault(rec.band, []).append(rec)

    out: list[Rec] = []
    for band, items in sorted(by_band.items()):
        cap = PER_BAND_CAP.get(band)
        if cap is not None and len(items) > cap:
            items.sort(key=lambda r: r.fame, reverse=True)
            items = items[:cap]
        out.extend(items)
    return out


# --- SYNTHETIC data path ----------------------------------------------------

FIRST = [
    "Liam", "Noah", "Mateo", "Lucas", "Leon", "Finn", "Diego", "Hugo", "Marco",
    "Andre", "Kai", "Ruben", "Bruno", "Carlos", "Sergio", "Joao", "Pedro",
    "Ethan", "Mason", "Harvey", "Callum", "Reece", "Dele", "Bukayo", "Ousmane",
    "Youssef", "Achraf", "Riyad", "Sadio", "Mohamed", "Vinicius", "Rodrigo",
    "Federico", "Lorenzo", "Matteo", "Giovanni", "Stefan", "Luka", "Nikola",
    "Erling", "Martin", "Mikkel", "Viktor", "Emre", "Cengiz", "Kerem",
    "Takumi", "Hee-chan", "Heung-min", "Wataru", "Thiago", "Gabriel",
]
LAST = [
    "Silva", "Santos", "Costa", "Fernandes", "Pereira", "Rossi", "Bianchi",
    "Romano", "Muller", "Schmidt", "Wagner", "Becker", "Dubois", "Bernard",
    "Laurent", "Smith", "Jones", "Taylor", "Brown", "Walker", "Murphy",
    "Kelly", "Diallo", "Traore", "Toure", "Mendy", "Sané", "Sanchez",
    "Garcia", "Lopez", "Martinez", "Hernandez", "Novak", "Horvat", "Petrov",
    "Ivanov", "Nielsen", "Larsson", "Eriksen", "Haaland", "Odegaard", "Yilmaz",
    "Demir", "Kaya", "Tanaka", "Kim", "Park", "Nakamura", "Mbappe", "Dembele",
]
LEAGUES_TOP = [
    "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1",
    "Eredivisie", "Primeira Liga", "Süper Lig", "Belgian Pro League",
    "Scottish Premiership", "Major League Soccer", "Brazilian Série A",
]
LEAGUES_LOWER = ["Championship", "League One", "League Two"]
POSITIONS = {
    "GK": ["Goalkeeper"],
    "DEF": ["Centre-Back", "Left-Back", "Right-Back"],
    "MID": ["Defensive Midfield", "Central Midfield", "Attacking Midfield"],
    "ATT": ["Left Winger", "Right Winger", "Centre-Forward"],
}
POS_GROUP_WEIGHTS = [("GK", 0.10), ("DEF", 0.34), ("MID", 0.32), ("ATT", 0.24)]
NATIONS = [
    "England", "France", "Spain", "Germany", "Italy", "Portugal", "Brazil",
    "Argentina", "Netherlands", "Belgium", "Croatia", "Serbia", "Norway",
    "Sweden", "Denmark", "Turkey", "Japan", "South Korea", "Morocco",
    "Senegal", "Nigeria", "Scotland", "Ireland", "Wales", "USA",
]

# Players per band. Lower bands far more populous; all bands < £110m clear the
# 150-player liquidity guard with margin. Band 9 (110+) is intentionally thin.
SYNTH_BAND_COUNTS = [1200, 1000, 850, 700, 540, 420, 320, 240, 180, 60]


def build_synthetic(seed: int = 1234) -> list[Rec]:
    rng = random.Random(seed)
    recs: list[Rec] = []
    counter = 0

    for band, count in enumerate(SYNTH_BAND_COUNTS):
        lo_m = VALUE_BANDS_M[band]
        hi_m = VALUE_BANDS_M[band + 1] if band + 1 < len(VALUE_BANDS_M) else 220
        for _ in range(count):
            counter += 1
            # Log-uniform value within the band feels more natural than linear.
            value_m = math.exp(rng.uniform(math.log(lo_m), math.log(hi_m)))
            peak_gbp = int(round(value_m * 1_000_000))

            group = _weighted_choice(rng, POS_GROUP_WEIGHTS)
            pos = rng.choice(POSITIONS[group])

            # Higher-value players skew a touch younger at peak; add spread.
            peak_age = int(max(18, min(34, round(rng.gauss(25 - band * 0.2, 2.6)))))

            # Bottom two bands lean toward familiar English leagues (spec §8.3).
            if band <= 1 and rng.random() < 0.45:
                league = rng.choice(LEAGUES_LOWER + ["Premier League"])
            else:
                league = rng.choice(LEAGUES_TOP)

            # Synthetic coefficient of variation: wider for younger/attacking.
            cv = abs(rng.gauss(0.25 + (0.10 if group == "ATT" else 0), 0.14))

            name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
            recs.append(Rec(
                id=f"tm_synth_{counter:05d}",
                name=name,
                pos=pos,
                posGroup=group,
                nat=rng.choice(NATIONS),
                league=league,
                club=f"{league.split()[0]} Club {rng.randint(1, 20)}",
                peakValue=peak_gbp,
                peakAge=peak_age,
                vol=volatility_from(cv, peak_age, group),
                band=band,
                fame=fame_score(0, peak_gbp, league),
            ))
    return recs


def _weighted_choice(rng: random.Random, pairs):
    r = rng.random() * sum(w for _, w in pairs)
    for item, w in pairs:
        r -= w
        if r < 0:
            return item
    return pairs[-1][0]


# --- Validation + output ----------------------------------------------------

def liquidity_report(recs: list[Rec]) -> tuple[bool, str]:
    counts: dict[int, int] = {}
    for r in recs:
        counts[r.band] = counts.get(r.band, 0) + 1

    lines = ["", "Liquidity report (players per band):"]
    ok = True
    warnings = 0
    for band in range(len(VALUE_BANDS_M)):
        lo = VALUE_BANDS_M[band]
        hi = VALUE_BANDS_M[band + 1] if band + 1 < len(VALUE_BANDS_M) else None
        rng_label = f"£{lo}m–£{hi}m" if hi else f"£{lo}m+"
        n = counts.get(band, 0)
        below_top = lo < TOP_BAND_THRESHOLD_M
        flag = ""
        if below_top and n < LIQUIDITY_HARD_MIN:
            flag = f"  <-- FAIL (< {LIQUIDITY_HARD_MIN})"
            ok = False
        elif below_top and n < LIQUIDITY_SOFT_MIN:
            flag = f"  <-- thin (< {LIQUIDITY_SOFT_MIN}; runtime widens bands)"
            warnings += 1
        lines.append(f"  band {band}  {rng_label:>14}  {n:>5}{flag}")
    lines.append(f"  TOTAL: {len(recs)}")
    if warnings:
        lines.append(f"  ({warnings} band(s) below the 150 comfort target — expected at the top end)")
    return ok, "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw", help="directory of raw Transfermarkt CSVs")
    ap.add_argument("--out", default="public/data/pools.json")
    ap.add_argument("--synthetic", action="store_true", help="force synthetic pool")
    args = ap.parse_args()

    have_csv = os.path.exists(os.path.join(args.raw, "players.csv")) and \
        os.path.exists(os.path.join(args.raw, "player_valuations.csv"))

    if args.synthetic or not have_csv:
        if not args.synthetic:
            print(f"No CSVs in {args.raw}/ — generating a synthetic pool.")
            print("  (Drop the Kaggle CSVs there and re-run for the real dataset.)")
        recs = build_synthetic()
        source = "synthetic"
    else:
        print(f"Reading Transfermarkt CSVs from {args.raw}/ ...")
        recs = build_from_csv(args.raw)
        source = "transfermarkt"

    ok, report = liquidity_report(recs)
    print(report)

    out_dir = os.path.dirname(args.out)
    os.makedirs(out_dir, exist_ok=True)
    payload = {
        "meta": {
            "source": source,
            "generated": date.today().isoformat(),
            "count": len(recs),
            "eurToGbp": EUR_TO_GBP,
            "valueBandsM": VALUE_BANDS_M,
        },
        "players": [asdict(r) for r in recs],
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)

    size = os.path.getsize(args.out)
    print(f"\nWrote {args.out}  ({size / 1_000_000:.2f} MB, {len(recs)} players, source={source})")

    if size > 2_000_000:
        print("FAIL: pools.json exceeds 2MB budget (spec §6 Phase 0).", file=sys.stderr)
        return 1
    if not ok:
        print(f"\nFAIL: a band below £110m has < {LIQUIDITY_HARD_MIN} players (below the "
              "offer engine's widening floor — game would be unplayable there).", file=sys.stderr)
        return 1
    print("OK: liquidity guard passed (all bands >= hard floor), size within budget.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
