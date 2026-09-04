import { AppConfig, DEFAULT_APP_CONFIG } from '../../../shared/types/config'

/**
 * Obsidian Velvet Color Triad & 5 Elevation Layers:
 * Layer 0 (Canvas Base): #06070d
 * Layer 1 (Chrome - Titlebar, Sidebar, Status bar): #0a0c16
 * Layer 2 (Panels & Cards - Cards, Modals, Drawers): #101322
 * Layer 3 (Interactive - Text inputs, Buttons, Rows): #15182a
 * Layer 4 (Active Selections - Card focus, Active tab): #25143a with border #422066
 * System Accents: Electric Violet #a855f7, Light Glow #c084fc
 */

export const OBSIDIAN_VELVET_THEME = {
  bgApp: '#06070d',       // Layer 0 Canvas Base
  bgChrome: '#0a0c16',    // Layer 1 Titlebar, Sidebar, Status bar
  bgPanel: '#101322',     // Layer 2 Panels, Cards, Modals
  bgInteractive: '#15182a', // Layer 3 Text fields, buttons
  bgActive: '#25143a',    // Layer 4 Selected/active
  borderColor: '#422066', // 1px Precision Border
  borderSubtle: '#25143a',
  accentColor: '#a855f7', // Electric Violet Accent
  accentGlow: '#c084fc',  // Light Violet / Glow
  iconColor: '#94a3b8',   // Text & Icon muted
  iconActive: '#c084fc',
  dotGrid: '#1e1b38'      // Canvas Dot Grid
}

/**
 * Injects CSS variables into :root for instant runtime updates without page refresh.
 */
export function applyTheme(config?: AppConfig): void {
  const theme = config?.theme || DEFAULT_APP_CONFIG.theme
  const root = document.documentElement

  const bgApp = theme.bgApp || OBSIDIAN_VELVET_THEME.bgApp
  const bgPanel = theme.bgPanel || OBSIDIAN_VELVET_THEME.bgChrome
  const bgCard = theme.bgCard || OBSIDIAN_VELVET_THEME.bgPanel
  const borderColor = theme.borderColor || OBSIDIAN_VELVET_THEME.borderColor
  const accentColor = theme.accentColor || OBSIDIAN_VELVET_THEME.accentColor
  const accentGlow = theme.accentGlow || OBSIDIAN_VELVET_THEME.accentGlow
  const iconColor = theme.iconColor || OBSIDIAN_VELVET_THEME.iconColor

  root.style.setProperty('--surface-canvas', bgApp)
  root.style.setProperty('--surface-chrome', bgPanel)
  root.style.setProperty('--surface-panel', bgCard)
  root.style.setProperty('--surface-interactive', '#15182a')
  root.style.setProperty('--surface-active', '#25143a')
  root.style.setProperty('--violet-border', borderColor)
  root.style.setProperty('--accent-electric', accentColor)
  root.style.setProperty('--accent-light', accentGlow)
  root.style.setProperty('--text-muted', iconColor)
  root.style.setProperty('--dot-grid', '#1e1b38')
}
