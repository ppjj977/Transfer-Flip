// Pool loading helpers. Browser uses fetch (see App); these are for Node
// contexts (harness, tests) that read pools.json off disk.
import { readFileSync } from 'node:fs';
import { PoolIndex } from './pool';
import type { Player } from './types';

export interface PoolFile {
  meta: Record<string, unknown>;
  players: Player[];
}

export function loadPoolFromFile(path: string): PoolIndex {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as PoolFile;
  return new PoolIndex(raw.players);
}
