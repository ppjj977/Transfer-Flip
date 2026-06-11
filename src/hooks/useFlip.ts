// React binding for the pure engine. The engine mutates a RunState object in
// place (it owns a live RNG and Sets); we hold it in a ref and bump a version
// counter to re-render. No game logic lives here — only orchestration of the
// event reveal, the value-ticker animation, and meta persistence.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PoolIndex } from '../engine/pool';
import { initRun, beginWindow, decide, armInsurance } from '../engine/run';
import { makeSeedString } from '../engine/rng';
import type { Decision, EventResult, Mode, RunState } from '../engine/types';
import { recordRun } from '../lib/storage';
import { clearSeedInUrl, setSeedInUrl } from '../lib/share';

// UI sub-phases within the engine's lifecycle.
//  await-event : window started, event not yet revealed (insurance can be armed)
//  revealing   : value ticker animating to the post-event value
//  decision    : offers shown, awaiting a swap/hold
//  ended       : run complete or busted
export type UiPhase = 'await-event' | 'revealing' | 'decision' | 'ended';

const REVEAL_MS = 1100;

function randomSeed(): string {
  return makeSeedString((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0, 6);
}

export interface FlipApi {
  run: RunState;
  uiPhase: UiPhase;
  displayValue: number;
  lastEvent: EventResult | null;
  armToggled: boolean;
  toggleArm: () => void;
  playWindow: () => void;
  choose: (choice: Decision['choice']) => void;
  restart: (mode?: Mode) => void;
  replaySeed: (seed: string, mode: Mode) => void;
}

export function useFlip(pool: PoolIndex, opts: { seed?: string | null; mode: Mode }): FlipApi {
  const runRef = useRef<RunState>(initRun(opts.seed ?? randomSeed(), opts.mode, pool));
  const [, setVersion] = useState(0);
  const [uiPhase, setUiPhase] = useState<UiPhase>('await-event');
  const [displayValue, setDisplayValue] = useState(runRef.current.value);
  const [lastEvent, setLastEvent] = useState<EventResult | null>(null);
  const [armToggled, setArmToggled] = useState(false);
  const recordedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const stopAnim = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  // Animate displayValue from -> to over REVEAL_MS, then run onDone.
  const animateValue = useCallback((from: number, to: number, onDone: () => void) => {
    stopAnim();
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / REVEAL_MS);
      // Ease-out cubic; gains soar, crashes plummet.
      const e = 1 - Math.pow(1 - t, 3);
      setDisplayValue(from + (to - from) * e);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setDisplayValue(to);
        onDone();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const finishRun = useCallback(() => {
    const run = runRef.current;
    if (recordedRef.current) return;
    recordedRef.current = true;
    recordRun({
      busted: run.status === 'busted',
      value: run.finalValue ?? run.value,
      tier: run.tier ?? 'Bosman',
      seed: run.seed,
      mode: run.mode,
      chain: run.chain.map((c) => c.player.name),
    });
  }, []);

  const playWindow = useCallback(() => {
    const run = runRef.current;
    if (uiPhase !== 'await-event' || run.status !== 'active') return;
    if (armToggled) armInsurance(run);
    const before = run.value;
    beginWindow(run, pool);
    const event = run.records[run.records.length - 1].event;
    setLastEvent(event);
    setArmToggled(false);
    setUiPhase('revealing');
    bump();
    animateValue(before, event.valueAfter, () => {
      if (run.status === 'busted') {
        setUiPhase('ended');
        finishRun();
      } else {
        setUiPhase('decision');
      }
      bump();
    });
  }, [uiPhase, armToggled, pool, animateValue, bump, finishRun]);

  const choose = useCallback(
    (choice: Decision['choice']) => {
      const run = runRef.current;
      if (uiPhase !== 'decision' || run.status !== 'active') return;
      decide(run, choice);
      setDisplayValue(run.value);
      if (run.status === 'active') {
        setUiPhase('await-event');
      } else {
        setUiPhase('ended');
        finishRun();
      }
      bump();
    },
    [uiPhase, bump, finishRun],
  );

  const start = useCallback(
    (seed: string, mode: Mode, updateUrl: 'replay' | 'fresh') => {
      stopAnim();
      runRef.current = initRun(seed, mode, pool);
      recordedRef.current = false;
      setDisplayValue(runRef.current.value);
      setLastEvent(null);
      setArmToggled(false);
      setUiPhase('await-event');
      if (updateUrl === 'replay') setSeedInUrl(seed);
      else clearSeedInUrl();
      bump();
    },
    [pool, bump],
  );

  const restart = useCallback(
    (mode?: Mode) => start(randomSeed(), mode ?? runRef.current.mode, 'fresh'),
    [start],
  );
  const replaySeed = useCallback((seed: string, mode: Mode) => start(seed, mode, 'replay'), [start]);

  useEffect(() => () => stopAnim(), []);

  return {
    run: runRef.current,
    uiPhase,
    displayValue,
    lastEvent,
    armToggled,
    toggleArm: () => setArmToggled((v) => !v),
    playWindow,
    choose,
    restart,
    replaySeed,
  };
}
