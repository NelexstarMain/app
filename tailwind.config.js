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
          bg: '#0B0C0E',
          sidebar: '#101114',
          card: '#15161A',
          surface: '#1B1C22',
          border: '#22242B',
          borderSubtle: '#18191E',
          text: '#D8DAE0',
          muted: '#727683',
          dim: '#484B55',
          accent: '#3E5C76',
          accentMuted: '#2D3A47',
          amberMuted: '#8C6D37',
          emeraldMuted: '#38664B',
          purpleMuted: '#584C6B',
          roseMuted: '#7A3E48'
        }
      }
    }
  },
  plugins: []
}
