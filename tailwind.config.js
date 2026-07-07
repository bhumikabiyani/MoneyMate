/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Include App.tsx/ts and all files in src/
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e', // green-500
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        brand: {
          emerald: '#10b981',
          indigo: '#6366f1',
          rose: '#f43f5e',
          amber: '#f59e0b',
        }
      },
    },
  },
  plugins: [],
};
