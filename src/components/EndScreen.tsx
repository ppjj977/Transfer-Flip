// Run-end screen: tier reveal, the full chain top-to-bottom, share + restart.
import { useState } from 'react';
import { formatValue, tierFor } from '../engine/scoring';
import type { RunState } from '../engine/types';
import { flagFor } from '../lib/flag';
import { buildShare, copyToClipboard } from '../lib/share';

interface Props {
  run: RunState;
  onRestart: () => void;
}

export function EndScreen({ run, onRestart }: Props) {
  const [copied, setCopied] = useState(false);
  const busted = run.status === 'busted';
  const finalValue = run.finalValue ?? run.value;
  const tier = tierFor(finalValue, busted);

  const share = async () => {
    const ok = await copyToClipboard(buildShare(run));
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-riseIn">
      <div
        className={`rounded-2xl border p-5 text-center ${
          busted ? 'border-loss/40 bg-loss/10' : 'border-ticker/40 bg-ticker/10'
        }`}
      >
        <div className="text-5xl">{tier.emoji}</div>
        <div className="mt-1 text-2xl font-extrabold uppercase tracking-wider">{tier.name}</div>
        <div className="tabular mt-1 text-4xl font-black text-white">{formatValue(finalValue)}</div>
        <div className="mt-1 text-xs text-slate-400">
          {busted ? `Busted in window ${run.window}` : `${run.totalWindows} windows`} · {run.mode === 'hard' ? 'Hard' : 'Normal'} · seed {run.seed}
        </div>
      </div>

      <ol className="mt-4 space-y-1">
        {run.chain.map((link, i) => (
          <li key={link.player.id} className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2">
            <span className="w-5 text-right text-xs text-slate-500">{i + 1}</span>
            <span className="text-base leading-none">{flagFor(link.player.nat)}</span>
            <span className="truncate text-sm font-medium">{link.player.name}</span>
            <span className="tabular ml-auto text-xs text-slate-400">{formatValue(link.valueAtAcquire)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={share}
          className="rounded-xl border border-edge bg-panel2 py-3 font-semibold active:scale-[0.99]"
        >
          {copied ? 'Copied! ✅' : 'Share 🔗'}
        </button>
        <button
          onClick={onRestart}
          className="rounded-xl bg-ticker py-3 font-extrabold text-ink active:scale-[0.99]"
        >
          RESTART ▶
        </button>
      </div>
    </div>
  );
}
