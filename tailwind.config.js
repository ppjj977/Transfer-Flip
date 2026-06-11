/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Transfer-deadline-day energy: Sky Sports yellow ticker accent on dark.
        ticker: '#ffe000',
        gain: '#2fe08a',
        loss: '#ff4d4d',
        ink: '#0a0e14',
        panel: '#121822',
        panel2: '#1a2230',
        edge: '#2a3548',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        flashGain: {
          '0%': { backgroundColor: 'rgba(47,224,138,0.0)' },
          '40%': { backgroundColor: 'rgba(47,224,138,0.25)' },
          '100%': { backgroundColor: 'rgba(47,224,138,0.0)' },
        },
        flashLoss: {
          '0%': { backgroundColor: 'rgba(255,77,77,0.0)' },
          '40%': { backgroundColor: 'rgba(255,77,77,0.3)' },
          '100%': { backgroundColor: 'rgba(255,77,77,0.0)' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        flashGain: 'flashGain 1.2s ease-out',
        flashLoss: 'flashLoss 1.2s ease-out',
        riseIn: 'riseIn 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
