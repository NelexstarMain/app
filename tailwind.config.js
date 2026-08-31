/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        synapse: {
          bg: '#0B0F19',
          card: '#111827',
          surface: '#1E293B',
          border: '#334155',
          text: '#F8FAFC',
          muted: '#94A3B8',
          accent: '#3B82F6',
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.4)',
          cyanGlow: 'rgba(56, 189, 248, 0.4)',
          purple: '#8B5CF6',
          amber: '#F59E0B',
          rose: '#F43F5E'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.2s ease-in-out infinite',
        'flowing-particle': 'particleFlow 2s linear infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px 2px rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 24px 6px rgba(16, 185, 129, 0.8)' }
        }
      }
    }
  },
  plugins: []
}
