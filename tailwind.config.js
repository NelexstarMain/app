/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        synapse: {
          bg: '#09090b',         // Layer 1 (Sidebar, Navigation)
          canvas: '#0c0c0e',     // Layer 2 (Canvas / Editor workspace)
          editor: '#0d0d10',     // Layer 2b (Editor text area)
          card: '#18181b',       // Layer 3 (Cards, Floating bars, Modals)
          surface: '#27272a',    // Layer 4 (Hover, active pill backgrounds)
          border: '#27272a',     // Subtle dividers
          borderSubtle: '#18181b',
          text: '#f4f4f5',       // Primary text
          muted: '#a1a1aa',      // Secondary text
          dim: '#71717a',        // Low-contrast details
          emerald: '#10b981',
          emeraldGlow: 'rgba(16, 185, 129, 0.25)',
          sky: '#38bdf8',
          amber: '#f59e0b',
          purple: '#a855f7'
        }
      }
    }
  },
  plugins: []
}
