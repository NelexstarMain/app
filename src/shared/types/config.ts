export interface StickyPaletteColor {
  id: string
  name: string
  bg: string // hex code or tailwind
  border: string // hex code or tailwind
  text: string // hex code or tailwind
}

export interface AppConfig {
  version: string
  theme: {
    // System colors (Dark Navy, Dark Purple, Light Violet)
    bgApp: string // e.g. '#070913' (Ciemny granat)
    bgPanel: string // e.g. '#0f1123' (Ciemny granatowo-fioletowy)
    bgCard: string // e.g. '#16142e' (Ciemny fiolet)
    borderColor: string // e.g. '#28254c'
    accentColor: string // e.g. '#a855f7' (Jasny fiolet)
    accentGlow: string // e.g. '#c084fc' (Jasna lawenda)
    iconColor: string // e.g. '#94a3b8'
    iconActiveColor: string // e.g. '#c084fc' (Jasny fiolet)
    uiScale: number
    borderRadius: 'small' | 'medium' | 'large'
  }
  editor: {
    defaultFontSize: 'small' | 'medium' | 'large' | 'heading'
    defaultFontFamily: string
    lineHeight: number
    maxNoteWidth: number
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
    nodeColorTag: string
    edgeColor: string
    repulsionForce: number
    springForce: number
    collisionRadius: number
  }
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  version: '1.2.0',
  theme: {
    bgApp: '#06070d', // Warstwa 0: Ciemny granat baza
    bgPanel: '#0a0c16', // Warstwa 1: Ciemny granat chrome (Titlebar, Sidebar, Status bar)
    bgCard: '#101322', // Warstwa 2: Ciemny fiolet (Panele, Karty, Modale)
    borderColor: '#422066', // Precyzyjna ramka 1px
    accentColor: '#a855f7', // Jasny fiolet akcent
    accentGlow: '#c084fc', // Jasny fiolet neon / groty / focus
    iconColor: '#94a3b8', // Stonowany tekst i ikony
    iconActiveColor: '#c084fc', // Jasny fiolet aktywny
    uiScale: 1.0,
    borderRadius: 'small'
  },
  editor: {
    defaultFontSize: 'medium',
    defaultFontFamily: 'Inter, sans-serif',
    lineHeight: 1.6,
    maxNoteWidth: 800,
    showGrid: true,
    gridSize: 24,
    snapToGrid: false
  },
  stickyPalette: [
    { id: 'sticky_violet', name: 'Jasny Fiolet', bg: '#25123e', border: '#a855f7', text: '#e9d5ff' },
    { id: 'sticky_deep_purple', name: 'Ciemny Fiolet', bg: '#170c28', border: '#7c3aed', text: '#ddd6fe' },
    { id: 'sticky_navy', name: 'Ciemny Granat', bg: '#0b112c', border: '#3b82f6', text: '#bfdbfe' },
    { id: 'sticky_midnight', name: 'Nocny Indygo', bg: '#101438', border: '#6366f1', text: '#c7d2fe' },
    { id: 'sticky_lavender', name: 'Lawenda', bg: '#2c1b4d', border: '#c084fc', text: '#f3e8ff' },
    { id: 'sticky_electric', name: 'Elektryczny Fiolet', bg: '#1e0d36', border: '#9333ea', text: '#fae8ff' }
  ],
  penPalette: [
    { label: 'Jasny Fiolet', value: '#c084fc' },
    { label: 'Elektryczny Fiolet', value: '#a855f7' },
    { label: 'Głęboki Fiolet', value: '#7c3aed' },
    { label: 'Nocny Granat', value: '#38bdf8' },
    { label: 'Błękit Indygo', value: '#818cf8' },
    { label: 'Śnieżna Biel', value: '#f8fafc' },
    { label: 'Popielaty Lawenda', value: '#94a3b8' }
  ],
  srs: {
    defaultStability: 1.2,
    defaultDifficulty: 4.8,
    maxReviewsPerSession: 50
  },
  graph: {
    nodeColorNote: '#a855f7', // Jasny fiolet
    nodeColorCanvas: '#818cf8', // Granatowo-fioletowy
    nodeColorAsset: '#c084fc', // Jasny lawendowy
    nodeColorTag: '#6366f1', // Indygo
    edgeColor: '#3b3874', // Ciemny fiolet
    repulsionForce: 750,
    springForce: 0.005,
    collisionRadius: 28
  }
}
