import React, { useState, useEffect } from 'react'
import {
  Settings,
  Palette,
  LayoutGrid,
  Share2,
  BookOpen,
  Code,
  Save,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  PenTool,
  Sliders,
  Type,
  Maximize2
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { AppConfig, DEFAULT_APP_CONFIG, StickyPaletteColor } from '../../../../shared/types/config'
import { applyTheme } from '../../theme/themeManager'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfigSaved?: (config: AppConfig) => void
}

type SettingsTab = 'appearance' | 'sticky' | 'pen' | 'graph' | 'srs' | 'json'

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  if (isNaN(num)) return { r: 168, g: 85, b: 247 }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

// Helper to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Rich Interactive RGB Color Picker Control
const RgbColorControl: React.FC<{
  label: string
  value: string
  onChange: (hex: string) => void
  description?: string
}> = ({ label, value, onChange, description }) => {
  const safeHex = value.startsWith('#') ? value : `#${value}`
  const rgb = hexToRgb(safeHex)

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const updated = { ...rgb, [channel]: val }
    onChange(rgbToHex(updated.r, updated.g, updated.b))
  }

  const PRESETS = [
    '#06070d', '#0a0c16', '#101322', '#15182a', '#25143a',
    '#422066', '#a855f7', '#c084fc', '#f8fafc'
  ]

  return (
    <div className="p-3 rounded-[7px] bg-[#101322] border border-[#422066] space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-xs text-[#f8fafc]">{label}</div>
          {description && <div className="text-[10px] text-[#8b87a8]">{description}</div>}
        </div>

        {/* Color Swatch & Hex Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={safeHex}
              onChange={(e) => onChange(e.target.value)}
              className="w-7 h-7 rounded-[4px] border border-[#422066] cursor-pointer bg-transparent shadow-sm"
            />
          </div>
          <input
            type="text"
            value={safeHex.toUpperCase()}
            onChange={(e) => {
              if (e.target.value.startsWith('#')) {
                onChange(e.target.value)
              } else {
                onChange(`#${e.target.value}`)
              }
            }}
            className="w-20 px-2 py-0.5 rounded-[4px] bg-[#15182a] border border-[#422066] font-mono text-xs text-[#c084fc] font-bold focus:outline-none focus:border-[#a855f7]"
          />
        </div>
      </div>

      {/* RGB Sliders */}
      <div className="grid grid-cols-3 gap-2 pt-0.5">
        {/* Red */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#fb7185] font-bold">R:</span>
            <span className="text-[#8b87a8]">{rgb.r}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={rgb.r}
            onChange={(e) => handleRgbChange('r', Number(e.target.value))}
            className="w-full h-1 bg-[#15182a] rounded-[2px] appearance-none cursor-pointer accent-[#fb7185]"
          />
        </div>

        {/* Green */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#4ade80] font-bold">G:</span>
            <span className="text-[#8b87a8]">{rgb.g}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={rgb.g}
            onChange={(e) => handleRgbChange('g', Number(e.target.value))}
            className="w-full h-1 bg-[#15182a] rounded-[2px] appearance-none cursor-pointer accent-[#4ade80]"
          />
        </div>

        {/* Blue */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#38bdf8] font-bold">B:</span>
            <span className="text-[#8b87a8]">{rgb.b}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={rgb.b}
            onChange={(e) => handleRgbChange('b', Number(e.target.value))}
            className="w-full h-1 bg-[#15182a] rounded-[2px] appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>
      </div>

      {/* Quick Swatches */}
      <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
        {PRESETS.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            style={{ backgroundColor: hex }}
            className={`w-3.5 h-3.5 rounded-[3px] border transition-transform shrink-0 ${
              safeHex.toLowerCase() === hex.toLowerCase() ? 'scale-125 border-white ring-1 ring-[#a855f7]' : 'border-[#422066] opacity-70 hover:opacity-100'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onConfigSaved }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
  const [rawJson, setRawJson] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadConfig()
      setJsonError(null)
      setSaveSuccess(false)
    }
  }, [isOpen])

  const loadConfig = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_GET, undefined)
      if (res.config) {
        setConfig(res.config)
        setRawJson(JSON.stringify(res.config, null, 2))
        applyTheme(res.config)
      } else if (res.rawJson) {
        setRawJson(res.rawJson)
        try {
          const parsed = JSON.parse(res.rawJson)
          setConfig(parsed)
          applyTheme(parsed)
        } catch {
          // Keep default
        }
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  if (!isOpen) return null

  const handleSave = async (configToSave = config) => {
    setIsSaving(true)
    try {
      const jsonStr = JSON.stringify(configToSave, null, 2)
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_UPDATE, { configJson: jsonStr })
      if (res.success) {
        setSaveSuccess(true)
        setRawJson(jsonStr)
        applyTheme(configToSave)
        if (onConfigSaved) onConfigSaved(configToSave)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (err: any) {
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRawJsonChange = (text: string) => {
    setRawJson(text)
    try {
      const parsed = JSON.parse(text)
      setConfig(parsed)
      setJsonError(null)
    } catch (err: any) {
      setJsonError(err.message)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Czy na pewno chcesz przywrócić domyślne kolory i ustawienia (Obsidian Velvet)?')) return
    try {
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_RESET, undefined)
      if (res.success && res.config) {
        setConfig(res.config)
        setRawJson(JSON.stringify(res.config, null, 2))
        setJsonError(null)
        setSaveSuccess(true)
        applyTheme(res.config)
        if (onConfigSaved) onConfigSaved(res.config)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (err) {
      console.error('Reset failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0a0c16] border border-[#422066] rounded-[8px] shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Top Header */}
        <div className="h-12 px-5 border-b border-[#422066] flex items-center justify-between shrink-0 bg-[#0a0c16]">
          <div className="flex items-center gap-3 font-semibold text-sm text-[#f8fafc]">
            <div className="w-6 h-6 rounded-[5px] bg-[#25143a] border border-[#422066] flex items-center justify-center shadow-sm">
              <Settings className="w-3.5 h-3.5 text-[#c084fc]" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-[#f8fafc] text-xs">Centrum Ustawień & RGB Palet</div>
              <div className="text-[10px] text-[#8b87a8] font-normal">Motyw Obsidian Velvet: Ciemny Granat + Ciemny Fiolet + Jasny Fiolet</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[5px] text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#15182a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-60 border-r border-[#422066] bg-[#0a0c16] p-2.5 space-y-1 shrink-0 select-none font-mono">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-all ${
                activeTab === 'appearance'
                  ? 'bg-[#25143a] text-[#c084fc] border border-[#422066] font-bold'
                  : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Wygląd & Kolory UI</span>
            </button>

            <button
              onClick={() => setActiveTab('sticky')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-all ${
                activeTab === 'sticky'
                  ? 'bg-[#25143a] text-[#c084fc] border border-[#422066] font-bold'
                  : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#c084fc]" />
              <span>Karteczki Sticky (RGB)</span>
            </button>

            <button
              onClick={() => setActiveTab('pen')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-all ${
                activeTab === 'pen'
                  ? 'bg-[#25143a] text-[#c084fc] border border-[#422066] font-bold'
                  : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-[#c084fc]" />
              <span>Kolory Pisaka (RGB)</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-all ${
                activeTab === 'graph'
                  ? 'bg-[#25143a] text-[#c084fc] border border-[#422066] font-bold'
                  : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Graf Wiedzy (Fizyka & RGB)</span>
            </button>

            <button
              onClick={() => setActiveTab('srs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-all ${
                activeTab === 'srs'
                  ? 'bg-[#25143a] text-[#c084fc] border border-[#422066] font-bold'
                  : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>SRS & Fiszki</span>
            </button>

            <div className="pt-1 border-t border-[#422066]" />

            <button
              onClick={() => setActiveTab('json')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-all ${
                activeTab === 'json'
                  ? 'bg-[#25143a] text-[#f8fafc] border border-[#422066] font-bold'
                  : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Plik config.json</span>
            </button>
          </div>

          {/* Main Tab Content Viewport */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#070913] text-xs">
            {/* 1. WYGLĄD & KOLORY UI */}
            {activeTab === 'appearance' && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Systemowe Kolory Interfejsu (RGB)</h3>
                  <p className="text-[#94a3b8] text-[11px] mb-4">
                    Edytuj dowolny element interfejsu za pomocą precyzyjnych suwaków RGB lub próbnika kolorów.
                  </p>

                  <div className="grid grid-cols-2 gap-3.5">
                    <RgbColorControl
                      label="Tło Aplikacji (Background)"
                      description="Główne tło okna"
                      value={config.theme?.bgApp || '#070913'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, bgApp: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Tło Paneli & Bocznego Menu"
                      description="Boczne menu i nagłówek"
                      value={config.theme?.bgPanel || '#0f1123'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, bgPanel: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Tło Kart & Obszaru Notatek"
                      description="Wnętrza kart i edytora"
                      value={config.theme?.bgCard || '#16142e'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, bgCard: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Kolor Obramowań (Borders)"
                      description="Linie podziału i ramki"
                      value={config.theme?.borderColor || '#28254c'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, borderColor: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Główny Akcent (Jasny Fiolet)"
                      description="Podświetlenia i aktywne elementy"
                      value={config.theme?.accentColor || '#a855f7'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, accentColor: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Poświata Akcentu (Glow / Neon)"
                      description="Efekt neonu wokół zaznaczeń"
                      value={config.theme?.accentGlow || '#c084fc'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, accentGlow: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Domyślny Kolor Ikon"
                      description="Nieaktywne ikony w menu"
                      value={config.theme?.iconColor || '#a5b4fc'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, iconColor: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Aktywny Kolor Ikon"
                      description="Zaznaczona ikona narzędzia"
                      value={config.theme?.iconActiveColor || '#c084fc'}
                      onChange={(hex) => {
                        const updated = { ...config, theme: { ...config.theme, iconActiveColor: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />
                  </div>
                </div>

                {/* Siatka & Typografia */}
                <div className="pt-4 border-t border-[#28254c] space-y-4">
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Siatka Canvasu & Typografia</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#f8fafc] font-semibold">Gęstość siatki:</span>
                        <span className="font-mono text-[#c084fc] font-bold">{config.editor?.gridSize || 24}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="48"
                        step="4"
                        value={config.editor?.gridSize || 24}
                        onChange={(e) => {
                          const updated = { ...config, editor: { ...config.editor, gridSize: Number(e.target.value) } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-full accent-[#a855f7]"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c] flex items-center justify-between">
                      <div>
                        <div className="text-[#f8fafc] font-semibold">Przyciąganie do siatki:</div>
                        <div className="text-[10px] text-[#94a3b8]">Snap-to-grid dla kart</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...config,
                            editor: { ...config.editor, snapToGrid: !config.editor?.snapToGrid }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className={`px-3 py-1.5 rounded-xl font-mono text-[11px] border transition-colors ${
                          config.editor?.snapToGrid
                            ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#c084fc] font-bold'
                            : 'bg-[#16142e] border-[#28254c] text-[#64748b]'
                        }`}
                      >
                        {config.editor?.snapToGrid ? 'WŁĄCZONE' : 'WYŁĄCZONE'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. KARTECZKI STICKY NOTE (RGB) */}
            {activeTab === 'sticky' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Paleta Karteczek Sticky Note (Pełne RGB)</h3>
                  <p className="text-[#94a3b8] text-[11px] mb-4">
                    Dla każdego stylu karteczki możesz niezależnie ustawić RGB tła, RGB ramki oraz RGB tekstu z podglądem na żywo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {config.stickyPalette?.map((item, idx) => {
                    const bgSafe = item.bg?.startsWith('#') ? item.bg : '#170c28'
                    const borderSafe = item.border?.startsWith('#') ? item.border : '#a855f7'
                    const textSafe = item.text?.startsWith('#') ? item.text : '#f8fafc'

                    return (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-2xl bg-[#0f1123] border border-[#28254c] space-y-3.5 shadow-lg"
                      >
                        {/* Live Sticky Preview Card */}
                        <div
                          style={{
                            backgroundColor: bgSafe,
                            borderColor: borderSafe,
                            color: textSafe
                          }}
                          className="p-3.5 rounded-xl border-2 shadow-md flex flex-col justify-between h-28 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const copy = [...config.stickyPalette]
                                copy[idx] = { ...item, name: e.target.value }
                                const updated = { ...config, stickyPalette: copy }
                                setConfig(updated)
                                handleSave(updated)
                              }}
                              className="bg-transparent font-bold text-xs focus:outline-none border-b border-white/20 pb-0.5"
                            />
                            <span className="text-[10px] opacity-70 font-mono">#{idx + 1}</span>
                          </div>
                          <div className="text-[11px] opacity-90 leading-relaxed font-medium">
                            Podgląd karteczki z wybranymi kolorami RGB...
                          </div>
                          <div className="text-[9px] opacity-60 self-end font-mono">Sticky Note Preview</div>
                        </div>

                        {/* 3 RGB Color Controls for this Sticky Note */}
                        <div className="space-y-2">
                          <RgbColorControl
                            label="Kolor Tła (RGB)"
                            value={bgSafe}
                            onChange={(hex) => {
                              const copy = [...config.stickyPalette]
                              copy[idx] = { ...item, bg: hex }
                              const updated = { ...config, stickyPalette: copy }
                              setConfig(updated)
                              handleSave(updated)
                            }}
                          />

                          <RgbColorControl
                            label="Kolor Ramki / Border (RGB)"
                            value={borderSafe}
                            onChange={(hex) => {
                              const copy = [...config.stickyPalette]
                              copy[idx] = { ...item, border: hex }
                              const updated = { ...config, stickyPalette: copy }
                              setConfig(updated)
                              handleSave(updated)
                            }}
                          />

                          <RgbColorControl
                            label="Kolor Tekstu (RGB)"
                            value={textSafe}
                            onChange={(hex) => {
                              const copy = [...config.stickyPalette]
                              copy[idx] = { ...item, text: hex }
                              const updated = { ...config, stickyPalette: copy }
                              setConfig(updated)
                              handleSave(updated)
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 3. KOLORY PISAKA (PEN PALETTE RGB) */}
            {activeTab === 'pen' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Kolory Pisaka na Canvasie (RGB)</h3>
                    <p className="text-[#94a3b8] text-[11px]">
                      Dostosuj paletę pisaka do swobodnego rysowania za pomocą suwaków RGB.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newColor = { label: 'Nowy Kolor', value: '#c084fc' }
                      const updated = { ...config, penPalette: [...config.penPalette, newColor] }
                      setConfig(updated)
                      handleSave(updated)
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#c084fc] border border-[#a855f7]/40 flex items-center gap-1.5 font-bold text-xs shadow-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj kolor</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.penPalette?.map((pen, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#0f1123] border border-[#28254c] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={pen.label}
                          onChange={(e) => {
                            const copy = [...config.penPalette]
                            copy[idx] = { ...pen, label: e.target.value }
                            const updated = { ...config, penPalette: copy }
                            setConfig(updated)
                            handleSave(updated)
                          }}
                          className="bg-transparent font-bold text-xs text-[#f8fafc] focus:outline-none border-b border-[#28254c] focus:border-[#a855f7] pb-0.5"
                        />

                        {config.penPalette.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = config.penPalette.filter((_, i) => i !== idx)
                              const updated = { ...config, penPalette: copy }
                              setConfig(updated)
                              handleSave(updated)
                            }}
                            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#fb7185] transition-colors"
                            title="Usuń ten kolor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <RgbColorControl
                        label="Wartość Koloru Pisaka (RGB)"
                        value={pen.value}
                        onChange={(hex) => {
                          const copy = [...config.penPalette]
                          copy[idx] = { ...pen, value: hex }
                          const updated = { ...config, penPalette: copy }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. GRAF WIEDZY */}
            {activeTab === 'graph' && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Kolory Węzłów i Krawędzi Grafu (RGB)</h3>
                  <p className="text-[#94a3b8] text-[11px] mb-4">
                    Wizualna identyfikacja typów elementów w grafie wiedzy za pomocą RGB.
                  </p>

                  <div className="grid grid-cols-2 gap-3.5">
                    <RgbColorControl
                      label="Węzły Notatek (Notes)"
                      description="Jasny fiolet / akcent"
                      value={config.graph?.nodeColorNote || '#a855f7'}
                      onChange={(hex) => {
                        const updated = { ...config, graph: { ...config.graph, nodeColorNote: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Węzły Tablic (Canvases)"
                      description="Granatowo-fioletowy"
                      value={config.graph?.nodeColorCanvas || '#818cf8'}
                      onChange={(hex) => {
                        const updated = { ...config, graph: { ...config.graph, nodeColorCanvas: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Węzły Zasobów / Obrazów"
                      description="Jasny lawendowy"
                      value={config.graph?.nodeColorAsset || '#c084fc'}
                      onChange={(hex) => {
                        const updated = { ...config, graph: { ...config.graph, nodeColorAsset: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />

                    <RgbColorControl
                      label="Krawędzie Relacji (Edges)"
                      description="Ciemny fiolet / granat"
                      value={config.graph?.edgeColor || '#3b3874'}
                      onChange={(hex) => {
                        const updated = { ...config, graph: { ...config.graph, edgeColor: hex } }
                        setConfig(updated)
                        handleSave(updated)
                      }}
                    />
                  </div>
                </div>

                {/* Fizyka Symulacji */}
                <div className="pt-4 border-t border-[#28254c] space-y-4">
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Fizyka Symulacji Grafu (Force Layout)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#f8fafc] font-semibold">Siła odpychania:</span>
                        <span className="font-mono text-[#c084fc] font-bold">{config.graph?.repulsionForce || 750}</span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="2000"
                        step="50"
                        value={config.graph?.repulsionForce || 750}
                        onChange={(e) => {
                          const updated = {
                            ...config,
                            graph: { ...config.graph, repulsionForce: Number(e.target.value) }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-full accent-[#a855f7]"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#f8fafc] font-semibold">Sprężystość krawędzi:</span>
                        <span className="font-mono text-[#c084fc] font-bold">{config.graph?.springForce || 0.005}</span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="0.02"
                        step="0.001"
                        value={config.graph?.springForce || 0.005}
                        onChange={(e) => {
                          const updated = {
                            ...config,
                            graph: { ...config.graph, springForce: Number(e.target.value) }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-full accent-[#a855f7]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SRS & FISZKI */}
            {activeTab === 'srs' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Parametry Algorytmu FSRS</h3>
                  <p className="text-[#94a3b8] text-[11px] mb-4">Dostosuj tempo powtórek fiszek Active Recall</p>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c]">
                      <div>
                        <div className="font-semibold text-[#f8fafc]">Domyślna stabilność początkowa (Dni):</div>
                        <div className="text-[10px] text-[#94a3b8]">Okres do pierwszej powtórki nowej fiszki</div>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="5.0"
                        value={config.srs?.defaultStability || 1.2}
                        onChange={(e) => {
                          const updated = {
                            ...config,
                            srs: { ...config.srs, defaultStability: Number(e.target.value) }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-20 bg-[#16142e] border border-[#28254c] text-[#c084fc] font-bold rounded-xl px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#a855f7]"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c]">
                      <div>
                        <div className="font-semibold text-[#f8fafc]">Domyślna trudność bazowa (1 - 10):</div>
                        <div className="text-[10px] text-[#94a3b8]">Wyższa wartość częściej planuje powtórki</div>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="10.0"
                        value={config.srs?.defaultDifficulty || 4.8}
                        onChange={(e) => {
                          const updated = {
                            ...config,
                            srs: { ...config.srs, defaultDifficulty: Number(e.target.value) }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-20 bg-[#16142e] border border-[#28254c] text-[#c084fc] font-bold rounded-xl px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#a855f7]"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f1123] border border-[#28254c]">
                      <div>
                        <div className="font-semibold text-[#f8fafc]">Limit powtórek na sesję:</div>
                        <div className="text-[10px] text-[#94a3b8]">Maksymalna liczba kart podczas jednej sesji</div>
                      </div>
                      <input
                        type="number"
                        step="5"
                        min="5"
                        max="200"
                        value={config.srs?.maxReviewsPerSession || 50}
                        onChange={(e) => {
                          const updated = {
                            ...config,
                            srs: { ...config.srs, maxReviewsPerSession: Number(e.target.value) }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-20 bg-[#16142e] border border-[#28254c] text-[#c084fc] font-bold rounded-xl px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#a855f7]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. SUROWY PLIK CONFIG.JSON */}
            {activeTab === 'json' && (
              <div className="h-full flex flex-col space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
                  <div className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span>Bezpośrednia edycja surowego pliku JSON (config.json)</span>
                  </div>
                  {jsonError ? (
                    <span className="text-[#fb7185] flex items-center gap-1 font-mono text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> Niepoprawny JSON
                    </span>
                  ) : (
                    <span className="text-[#4ade80] flex items-center gap-1 font-mono text-[10px]">
                      <Check className="w-3 h-3" /> JSON Prawidłowy
                    </span>
                  )}
                </div>

                <textarea
                  value={rawJson}
                  onChange={(e) => handleRawJsonChange(e.target.value)}
                  spellCheck={false}
                  className={`w-full flex-1 p-3.5 rounded-2xl bg-[#0f1123] border font-mono text-xs text-[#f8fafc] resize-none focus:outline-none leading-relaxed transition-colors ${
                    jsonError
                      ? 'border-[#fb7185]/60 focus:border-[#fb7185]'
                      : 'border-[#28254c] focus:border-[#a855f7]'
                  }`}
                />

                {jsonError && (
                  <div className="p-2.5 rounded-xl bg-[#fb7185]/10 border border-[#fb7185]/30 text-[11px] text-[#fb7185] font-mono">
                    {jsonError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-12 px-5 border-t border-[#422066] flex items-center justify-between shrink-0 bg-[#0a0c16] font-mono">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-[5px] bg-[#101322] hover:bg-[#15182a] text-xs text-[#8b87a8] hover:text-[#fb7185] font-medium flex items-center gap-2 border border-[#422066] transition-colors"
            title="Przywróć domyślne kolory (Obsidian Velvet)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Przywróć domyślne</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[5px] bg-[#101322] hover:bg-[#15182a] text-xs text-[#8b87a8] hover:text-[#f8fafc] border border-[#422066] font-medium transition-colors"
            >
              Zamknij
            </button>
            <button
              onClick={() => handleSave()}
              disabled={!!jsonError || isSaving}
              className="px-5 py-1.5 rounded-[5px] bg-[#25143a] hover:bg-[#341b52] text-[#c084fc] hover:text-white font-bold text-xs flex items-center gap-2 border border-[#a855f7]/40 shadow-sm disabled:opacity-40 transition-colors"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Zapisano!' : 'Zastosuj i zapisz'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

