export interface StickyPaletteColor {
  id: string
  name: string
  bg: string
  border: string
  text: string
}

export interface AppConfig {
  version: string
  editor: {
    defaultFontSize: 'small' | 'medium' | 'large' | 'heading'
    defaultFontFamily: string
    showGrid: boolean
    gridSize: number
    snapToGrid: boolean
  }
  stickyPalette: StickyPaletteColor[]
  penPalette: Array<{ label: string; value: string }>
  srs: {
    defaultStability: number
    defaultDifficulty: number
    maxReviewsPerSession: number
  }
  graph: {
    nodeColorNote: string
    nodeColorCanvas: string
    nodeColorAsset: string
    edgeColor: string
    repulsionForce: number
    springForce: number
  }
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  version: '1.0.0',
  editor: {
    defaultFontSize: 'medium',
    defaultFontFamily: 'Inter, sans-serif',
    showGrid: true,
    gridSize: 24,
    snapToGrid: false
  },
  stickyPalette: [
    { id: 'vibrant_yellow', name: 'Żółty', bg: 'bg-[#fef08a]', border: 'border-[#fde047]', text: 'text-[#713f12]' },
    { id: 'vibrant_pink', name: 'Różowy', bg: 'bg-[#fbcfe8]', border: 'border-[#f472b6]', text: 'text-[#831843]' },
    { id: 'vibrant_purple', name: 'Fioletowy', bg: 'bg-[#e9d5ff]', border: 'border-[#c084fc]', text: 'text-[#581c87]' },
    { id: 'vibrant_blue', name: 'Błękitny', bg: 'bg-[#bae6fd]', border: 'border-[#38bdf8]', text: 'text-[#0c4a6e]' },
    { id: 'vibrant_green', name: 'Limonka / Szmaragd', bg: 'bg-[#bbf7d0]', border: 'border-[#4ade80]', text: 'text-[#14532d]' },
    { id: 'vibrant_orange', name: 'Pomarańczowy', bg: 'bg-[#fed7aa]', border: 'border-[#fb923c]', text: 'text-[#7c2d12]' }
  ],
  penPalette: [
    { label: 'Biały', value: '#f4f4f5' },
    { label: 'Szary', value: '#a1a1aa' },
    { label: 'Błękitny', value: '#38bdf8' },
    { label: 'Szmaragdowy', value: '#10b981' },
    { label: 'Bursztynowy', value: '#f59e0b' },
    { label: 'Fioletowy', value: '#a855f7' },
    { label: 'Różowy', value: '#fb7185' }
  ],
  srs: {
    defaultStability: 1.0,
    defaultDifficulty: 5.0,
    maxReviewsPerSession: 50
  },
  graph: {
    nodeColorNote: '#10b981',
    nodeColorCanvas: '#38bdf8',
    nodeColorAsset: '#c084fc',
    edgeColor: '#3f3f46',
    repulsionForce: 700,
    springForce: 0.004
  }
}
