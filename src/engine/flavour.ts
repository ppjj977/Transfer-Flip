// Template-based flavour text for the event phase. Slots are filled from small
// static lists. No LLM calls at runtime (spec §2.2).
import type { RNG } from './rng';
import type { EventKind, Player } from './types';

const OPPONENTS = [
  'the league leaders',
  'their title rivals',
  'a relegation scrap',
  'the cup holders',
  'a top-four side',
  'the old enemy',
  'a newly promoted outfit',
];

const MANAGERS = [
  'the new manager',
  'the interim boss',
  'a returning club legend',
  'the incoming head coach',
];

const COMPETITIONS = [
  'the Champions League',
  'a domestic cup run',
  'the league campaign',
  'a European tie',
  'the derby',
];

const BREAKOUT = [
  'Hat-trick against {opp}. Agents are circling.',
  'Player of the Month after tearing {opp} apart. Europe is watching.',
  'A wonder goal in {comp} just went viral. The phone is ringing.',
  'Carried the side single-handedly in {comp}. Valuation exploding.',
];

const GAIN = [
  'Solid run of form, three goal contributions in five.',
  'Named in the team of the week after a controlled display.',
  'Quietly excellent in {comp}. Scouts are taking notes.',
  'Stepped up against {opp} and impressed.',
  'A new contract and a settled run in the side.',
];

const FLAT = [
  'Ticking along. Nothing the scouts didn’t already know.',
  'A steady, unremarkable few weeks.',
  'In and out of the side, but holding station.',
  'Market’s waiting to see more before it moves.',
];

const DIP = [
  'Rotation player since {mgr} arrived.',
  'A quiet spell — dropped for the trip to face {opp}.',
  'Whispers of a falling-out with {mgr}.',
  'Off the boil in {comp}, and the market noticed.',
  'A niggling knock has limited minutes.',
];

const INJURY = [
  'Ruptured ACL in training. Out for eight months.',
  'Stretchered off against {opp}. Long lay-off confirmed.',
  'Surgery required after a heavy challenge. Season likely done.',
  'Recurring hamstring trouble. The medical staff are worried.',
];

const BUST = [
  'Retired without warning to run a beach bar in Marbella.',
  'Walked away from football to focus on a podcast career.',
  'A shock scandal ends the career overnight.',
  'Vanished to a vanity league for one last payday. Value gone.',
];

const TABLE: Record<EventKind, string[]> = {
  breakout: BREAKOUT,
  gain: GAIN,
  flat: FLAT,
  dip: DIP,
  injury: INJURY,
  bust: BUST,
};

function fill(template: string, rng: RNG): string {
  return template
    .replace('{opp}', rng.pick(OPPONENTS))
    .replace('{mgr}', rng.pick(MANAGERS))
    .replace('{comp}', rng.pick(COMPETITIONS));
}

/** Pick flavour text for an event of the given kind, filling its slots. */
export function flavourFor(kind: EventKind, _player: Player, rng: RNG): string {
  const template = rng.pick(TABLE[kind]);
  return fill(template, rng);
}
