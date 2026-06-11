// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { Game } from '../src/components/Game';
import { makeTestPool } from './fixtures';
import type { Stats } from '../src/lib/storage';

// Make the value-ticker animation resolve synchronously: each rAF callback is
// invoked immediately with a timestamp far past the reveal duration.
let now = 0;
beforeEach(() => {
  cleanup();
  localStorage.clear();
  now = 0;
  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    now += 5000;
    cb(now);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

const emptyStats: Stats = {
  runs: 0, tierCounts: {}, streak: 0, bestStreak: 0, best: null, hardUnlocked: false,
};

function renderGame() {
  const pool = makeTestPool();
  return render(
    createElement(Game, { pool, initialSeed: 'TESTUI', initialMode: 'normal', initialStats: emptyStats }),
  );
}

describe('Game interaction (jsdom)', () => {
  it('plays a full run by holding through to the end screen', () => {
    renderGame();
    expect(screen.getByText(/Play window 1/)).toBeTruthy();

    // Drive up to 12 windows: reveal the event, then hold.
    for (let i = 0; i < 40; i++) {
      const play = screen.queryByText(/Play window/);
      if (play) {
        fireEvent.click(play);
        continue;
      }
      const hold = screen.queryByText(/^✋ Hold/);
      if (hold) {
        fireEvent.click(hold);
        continue;
      }
      break; // ended
    }

    // The run has ended: the end screen shows a RESTART button.
    expect(screen.getByText(/RESTART/)).toBeTruthy();
    // A final value (£) is shown.
    expect(screen.getAllByText(/£/).length).toBeGreaterThan(0);
  });

  it('swaps via two-tap confirm', () => {
    renderGame();
    fireEvent.click(screen.getByText(/Play window 1/));

    // If the run survived window 1, offers are shown.
    const safe = screen.queryByText('SAFE');
    if (!safe) {
      // Busted on window 1 (rare); just assert the end screen.
      expect(screen.getByText(/RESTART/)).toBeTruthy();
      return;
    }
    // First tap on the SAFE offer arms it (shows confirm hint).
    fireEvent.click(safe.closest('button')!);
    expect(screen.getByText(/Tap to confirm/)).toBeTruthy();
    // Second tap confirms; we should advance to the next window's Play button.
    fireEvent.click(safe.closest('button')!);
    expect(screen.queryByText(/Play window 2/)).toBeTruthy();
  });

  it('records the run to localStorage when it ends', () => {
    renderGame();
    for (let i = 0; i < 40; i++) {
      const play = screen.queryByText(/Play window/);
      if (play) { fireEvent.click(play); continue; }
      const hold = screen.queryByText(/^✋ Hold/);
      if (hold) { fireEvent.click(hold); continue; }
      break;
    }
    const stats = JSON.parse(localStorage.getItem('theflip:v1') || '{}');
    expect(stats.runs).toBe(1);
  });
});
