// Seed-in-URL and share-string helpers (spec §4).
import { shareString } from '../engine/scoring';
import type { RunState } from '../engine/types';

/** Read the seed from ?s= (uppercased, sanitised), or null. */
export function seedFromUrl(): string | null {
  const s = new URLSearchParams(window.location.search).get('s');
  if (!s) return null;
  const clean = s.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 10);
  return clean || null;
}

/** Replace the ?s= param without reloading. */
export function setSeedInUrl(seed: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('s', seed);
  window.history.replaceState({}, '', url.toString());
}

export function clearSeedInUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('s');
  window.history.replaceState({}, '', url.toString());
}

/** Build the share string using the live site origin for the replay link. */
export function buildShare(run: RunState): string {
  const origin = window.location.host || 'theflip.game';
  return shareString(run, origin);
}

/** Copy text to the clipboard, with a legacy fallback. Resolves to success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
