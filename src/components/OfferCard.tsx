// One swap offer. Two-tap confirm: first tap reveals the agent fee, second
// confirms the swap.
import { formatValue } from '../engine/scoring';
import type { Offer, OfferSlot } from '../engine/types';
import { flagFor } from '../lib/flag';
import { VolBadge } from './VolBadge';

const SLOT_META: Record<OfferSlot, { label: string; accent: string }> = {
  safe: { label: 'SAFE', accent: 'text-emerald-300' },
  value: { label: 'VALUE', accent: 'text-amber-300' },
  punt: { label: 'PUNT', accent: 'text-rose-300' },
};

interface Props {
  offer: Offer;
  showVol: boolean;
  armed: boolean; // first tap done -> show confirm
  onArm: () => void;
  onConfirm: () => void;
}

export function OfferCard({ offer, showVol, armed, onArm, onConfirm }: Props) {
  const meta = SLOT_META[offer.slot];
  const up = offer.mult >= 1;
  return (
    <button
      onClick={armed ? onConfirm : onArm}
      className={`w-full rounded-xl border p-3 text-left transition active:scale-[0.99] ${
        armed ? 'border-ticker bg-ticker/10' : 'border-edge bg-panel hover:bg-panel2'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold tracking-widest ${meta.accent}`}>{meta.label}</span>
        <span className="tabular text-xs text-slate-400">
          {up ? '↑' : '↓'} {(offer.mult * 100 - 100).toFixed(0)}%
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-lg leading-none">{flagFor(offer.player.nat)}</span>
        <span className="truncate font-semibold">{offer.player.name}</span>
        {showVol && <VolBadge vol={offer.player.vol} />}
      </div>
      <div className="text-xs text-slate-500 truncate">
        {offer.player.pos} · {offer.player.league}
      </div>

      <div className="mt-2 flex items-end justify-between">
        <span className="tabular text-xl font-extrabold text-white">{formatValue(offer.value)}</span>
        {armed ? (
          <span className="text-xs font-semibold text-ticker">
            Tap to confirm · fee {formatValue(offer.fee)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">net {formatValue(offer.netValue)}</span>
        )}
      </div>
    </button>
  );
}
