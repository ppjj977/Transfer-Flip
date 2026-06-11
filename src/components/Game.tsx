// The one-screen game: held card on top, event text, offers + Hold, or the
// run-end screen. No engine logic here — only presentation and input wiring.
import { useEffect, useState } from 'react';
import { PoolIndex } from '../engine/pool';
import type { Mode } from '../engine/types';
import { useFlip } from '../hooks/useFlip';
import { loadStats, type Stats } from '../lib/storage';
import { HeldCard } from './HeldCard';
import { EventBanner } from './EventBanner';
import { OfferCard } from './OfferCard';
import { EndScreen } from './EndScreen';
import { StatsBar } from './StatsBar';

interface Props {
  pool: PoolIndex;
  initialSeed: string | null;
  initialMode: Mode;
  initialStats: Stats;
}

export function Game({ pool, initialSeed, initialMode, initialStats }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [armedOffer, setArmedOffer] = useState<number | null>(null);

  const flip = useFlip(pool, { seed: initialSeed, mode });
  const { run, uiPhase, displayValue, lastEvent } = flip;

  const showVol = mode === 'normal';
  const flashing =
    (uiPhase === 'revealing' || uiPhase === 'decision') && lastEvent
      ? lastEvent.mult >= 1
        ? ('gain' as const)
        : ('loss' as const)
      : null;

  const refreshStats = () => setStats(loadStats());

  const restart = (m?: Mode) => {
    flip.restart(m);
    setArmedOffer(null);
    refreshStats();
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    flip.restart(m);
    setArmedOffer(null);
  };

  const choose = (choice: 'hold' | number) => {
    flip.choose(choice);
    setArmedOffer(null);
  };

  // When a run ends, the engine has just persisted the result; pull the fresh
  // stats so best-run, streak, and the Hard-mode unlock reflect immediately.
  useEffect(() => {
    if (uiPhase === 'ended') setStats(loadStats());
  }, [uiPhase]);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <StatsBar stats={stats} />
      </div>
      <div className="flex gap-2">
        <ModePill active={mode === 'normal'} onClick={() => switchMode('normal')} label="Normal" />
        <ModePill
          active={mode === 'hard'}
          onClick={() => (stats.hardUnlocked ? switchMode('hard') : undefined)}
          label={stats.hardUnlocked ? 'Hard' : 'Hard 🔒'}
          disabled={!stats.hardUnlocked}
          title={stats.hardUnlocked ? 'Volatility hidden — read the risk yourself' : 'Reach Solid Pro (£10m) to unlock'}
        />
      </div>

      {uiPhase === 'ended' ? (
        <EndScreen run={run} onRestart={() => restart()} />
      ) : (
        <>
          <HeldCard
            player={run.held}
            displayValue={displayValue}
            history={run.valueHistory}
            window={run.window}
            totalWindows={run.totalWindows}
            showVol={showVol}
            flashing={flashing}
          />

          {lastEvent && uiPhase !== 'await-event' && <EventBanner event={lastEvent} />}

          {uiPhase === 'await-event' && (
            <div className="flex flex-col gap-2">
              {mode === 'normal' && run.insuranceAvailable && (
                <button
                  onClick={flip.toggleArm}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                    flip.armToggled
                      ? 'border-sky-400 bg-sky-400/15 text-sky-200'
                      : 'border-edge bg-panel text-slate-300'
                  }`}
                >
                  🛡 Insurance {flip.armToggled ? 'ARMED for this window' : '— protect this window’s downside'}
                </button>
              )}
              <button
                onClick={flip.playWindow}
                className="rounded-2xl bg-ticker py-4 text-lg font-black text-ink active:scale-[0.99]"
              >
                ▶ Play window {run.window}
              </button>
            </div>
          )}

          {uiPhase === 'decision' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                <span>Choose your move</span>
                <span>{armedOffer === null ? 'tap an offer' : 'tap again to confirm'}</span>
              </div>
              {run.currentOffers.map((offer, i) => (
                <OfferCard
                  key={offer.player.id}
                  offer={offer}
                  showVol={showVol}
                  armed={armedOffer === i}
                  onArm={() => setArmedOffer(i)}
                  onConfirm={() => choose(i)}
                />
              ))}
              <button
                onClick={() => choose('hold')}
                className="mt-1 rounded-xl border border-edge bg-panel2 py-3 font-semibold text-slate-200 active:scale-[0.99]"
              >
                ✋ Hold {run.held.name.split(' ').slice(-1)[0]} (no fee)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ModePill({
  active,
  onClick,
  label,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
        active
          ? 'border-ticker bg-ticker/15 text-ticker'
          : disabled
            ? 'border-edge/50 bg-panel/40 text-slate-600'
            : 'border-edge bg-panel text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
