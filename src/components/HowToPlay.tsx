// First-time "How to play" overlay. Explains the core idea that the UI can't
// convey on its own — most importantly that there is no calendar/year: every
// player is frozen at their peak career value and market swings are simulated.
interface Props {
  onClose: () => void;
}

export function HowToPlay({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-edge bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">
            How to play <span className="text-ticker">🔁</span>
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-edge px-3 py-1 text-sm font-semibold text-slate-300 active:scale-95"
          >
            Got it
          </button>
        </div>

        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            <span className="font-bold text-white">🎯 The goal:</span> turn one cheap journeyman into a
            <span className="font-semibold text-ticker"> £100m+ Galáctico</span> in{' '}
            <span className="font-semibold text-white">12 transfer windows</span>.
          </p>

          <div className="rounded-xl border border-ticker/30 bg-ticker/5 p-3">
            <p className="font-semibold text-ticker">There’s no year or calendar.</p>
            <p className="mt-1 text-slate-300">
              A “window” is just a <span className="font-semibold">turn</span> (you get 12). Every player is
              frozen at their <span className="font-semibold text-white">peak career value</span> — so prime
              Ronaldinho and today’s Haaland both show up. The price swings between windows are{' '}
              <span className="font-semibold">simulated</span> form, hype and injuries, not real history.
            </p>
          </div>

          <div>
            <p className="font-semibold text-white">Each window:</p>
            <p className="mt-1">
              1️⃣ A market event moves your player’s value (the ticker jumps). 2️⃣ You get three swap offers, or
              you can hold:
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-semibold text-emerald-300">🟢 Safe</span> — small, steady step up.
              </li>
              <li>
                <span className="font-semibold text-amber-300">🟡 Value</span> — solid climb, medium risk.
              </li>
              <li>
                <span className="font-semibold text-rose-300">🔴 Punt</span> — big jump, big downside. The only
                real path to the top.
              </li>
              <li>
                <span className="font-semibold text-slate-200">✋ Hold</span> — keep your player for free and
                ride their next swing.
              </li>
            </ul>
          </div>

          <p>
            <span className="font-semibold text-white">💸 Every swap</span> costs a 5% agent fee, so don’t
            churn for nothing. <span className="font-semibold text-loss">☠️ Drop below £100k</span> and you’re
            Bust — run over.
          </p>

          <p className="text-slate-400">
            The skill: judge each player’s risk (the volatility badge, or in Hard mode their age/position),
            bank your gains, and take a punt only when you can afford to lose it.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-ticker py-3 text-base font-black text-ink active:scale-[0.99]"
        >
          Start flipping
        </button>
      </div>
    </div>
  );
}
