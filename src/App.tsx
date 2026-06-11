import { useEffect, useMemo, useState } from 'react';
import { PoolIndex } from './engine/pool';
import type { Mode, Player } from './engine/types';
import { seedFromUrl } from './lib/share';
import { loadStats } from './lib/storage';
import { Game } from './components/Game';

interface PoolFile {
  meta: { source?: string; generated?: string };
  players: Player[];
}

export default function App() {
  const [pool, setPool] = useState<PoolIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}data/pools.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`pools.json ${r.status}`);
        return r.json() as Promise<PoolFile>;
      })
      .then((data) => {
        if (alive) setPool(new PoolIndex(data.players));
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const initialSeed = useMemo(() => seedFromUrl(), []);
  const stats = useMemo(() => loadStats(), []);
  const initialMode: Mode = 'normal';

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-6 pt-4">
      <header className="mb-3">
        <h1 className="text-2xl font-black tracking-tight">
          THE FLIP <span className="text-ticker">🔁</span>
        </h1>
        <p className="text-xs text-slate-500">
          12 windows. One journeyman. Flip your way to a Galáctico.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-loss/40 bg-loss/10 p-4 text-sm">
          Couldn’t load the player pool ({error}). Run{' '}
          <code className="text-ticker">python pipeline/build_pools.py</code> and reload.
        </div>
      )}

      {!pool && !error && (
        <div className="mt-10 text-center text-slate-500 animate-pulse">Loading the transfer market…</div>
      )}

      {pool && (
        <Game pool={pool} initialSeed={initialSeed} initialMode={initialMode} initialStats={stats} />
      )}

      <footer className="mt-auto pt-6 text-center text-[10px] leading-relaxed text-slate-600">
        Independent fan project. Player names and publicly available market valuations are facts used
        for entertainment. No club badges, logos, kits, or photos. Not affiliated with Transfermarkt,
        any club, or league.
      </footer>
    </div>
  );
}
