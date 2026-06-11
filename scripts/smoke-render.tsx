// Headless smoke test: server-render the real component tree with the real
// pool to catch render-time crashes (no browser needed). Run: tsx scripts/smoke-render.tsx
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Game } from '../src/components/Game';
import { loadPoolFromFile } from '../src/engine/loadPool';
import type { Stats } from '../src/lib/storage';

const emptyStats: Stats = {
  runs: 0,
  tierCounts: {},
  streak: 0,
  bestStreak: 0,
  best: null,
  hardUnlocked: false,
};

const pool = loadPoolFromFile('public/data/pools.json');

const html = renderToString(
  createElement(Game, { pool, initialSeed: 'ABX29K', initialMode: 'normal', initialStats: emptyStats }),
);

if (!html.includes('Play window')) {
  console.error('FAIL: rendered tree missing the Play button');
  console.error(html.slice(0, 500));
  process.exit(1);
}
if (!html.includes('Window')) {
  console.error('FAIL: held card did not render');
  process.exit(1);
}
console.log('OK: Game renders. First held player & window header present.');
console.log('  contains tier/value markup:', html.includes('£'));
