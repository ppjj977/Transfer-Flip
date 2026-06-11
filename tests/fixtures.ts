// A small deterministic synthetic pool for engine unit tests, so tests don't
// depend on the generated pools.json. Spans all bands with a vol mix.
import { PoolIndex } from '../src/engine/pool';
import { valueToBand } from '../src/engine/config';
import type { Player, PosGroup, Vol } from '../src/engine/types';
import { RNG } from '../src/engine/rng';

const POS: Record<PosGroup, string> = { GK: 'Goalkeeper', DEF: 'Centre-Back', MID: 'Central Midfield', ATT: 'Centre-Forward' };
const GROUPS: PosGroup[] = ['GK', 'DEF', 'MID', 'ATT'];
const VOLS: Vol[] = ['LOW', 'MED', 'HIGH'];
const LEAGUES = ['Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1'];

export function makeTestPool(seed = 1, perBand = 200): PoolIndex {
  const rng = new RNG(seed);
  const bandsM = [0.3, 0.6, 1.2, 2.5, 5, 10, 20, 40, 70, 110, 220];
  const players: Player[] = [];
  let id = 0;
  for (let b = 0; b < 10; b++) {
    const lo = bandsM[b] * 1e6;
    const hi = bandsM[b + 1] * 1e6;
    for (let i = 0; i < perBand; i++) {
      id++;
      const value = Math.round(rng.range(lo, hi));
      const group = GROUPS[rng.int(0, 3)];
      players.push({
        id: `t_${id}`,
        name: `Player ${id}`,
        pos: POS[group],
        posGroup: group,
        nat: 'Testland',
        league: LEAGUES[rng.int(0, LEAGUES.length - 1)],
        club: `Club ${rng.int(1, 20)}`,
        peakValue: value,
        peakAge: rng.int(19, 32),
        vol: VOLS[rng.int(0, 2)],
        band: valueToBand(value),
      });
    }
  }
  return new PoolIndex(players);
}
