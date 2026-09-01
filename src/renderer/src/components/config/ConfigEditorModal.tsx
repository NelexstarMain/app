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
  Sliders,
  Type,
  Maximize,
  Sparkles,
  Move
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { AppConfig, DEFAULT_APP_CONFIG } from '../../../../shared/types/config'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfigSaved?: (config: AppConfig) => void
}

type SettingsTab = 'appearance' | 'canvas' | 'graph' | 'srs' | 'json'

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
      } else if (res.rawJson) {
        setRawJson(res.rawJson)
        try {
          setConfig(JSON.parse(res.rawJson))
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
    if (!confirm('Czy na pewno chcesz przywrócić domyślną konfigurację aplikacji?')) return
    try {
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_RESET, undefined)
      if (res.success && res.config) {
        setConfig(res.config)
        setRawJson(JSON.stringify(res.config, null, 2))
        setJsonError(null)
        setSaveSuccess(true)
        if (onConfigSaved) onConfigSaved(res.config)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (err) {
      console.error('Reset failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-[#111114] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#27272a] flex items-center justify-between shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-2.5 font-semibold text-sm text-[#f4f4f5]">
            <div className="w-6 h-6 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-[#38bdf8]" />
            </div>
            <span>Ustawienia aplikacji (CogniCanvas)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-56 border-r border-[#27272a] bg-[#09090b] p-3 space-y-1 shrink-0 select-none">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'appearance'
                  ? 'bg-[#18181b] text-[#38bdf8] border border-[#38bdf8]/30 shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Wygląd & Motyw</span>
            </button>

            <button
              onClick={() => setActiveTab('canvas')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'canvas'
                  ? 'bg-[#18181b] text-[#f59e0b] border border-[#f59e0b]/30 shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Palety Canvasu</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'graph'
                  ? 'bg-[#18181b] text-[#a855f7] border border-[#a855f7]/30 shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Graf Wiedzy</span>
            </button>

            <button
              onClick={() => setActiveTab('srs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'srs'
                  ? 'bg-[#18181b] text-[#10b981] border border-[#10b981]/30 shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>SRS & Fiszki</span>
            </button>

            <div className="pt-2 border-t border-[#27272a]" />

            <button
              onClick={() => setActiveTab('json')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'json'
                  ? 'bg-[#18181b] text-[#f4f4f5] border border-[#3f3f46] shadow-sm font-semibold'
                  : 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Plik config.json</span>
            </button>
          </div>

          {/* Main Tab Viewport */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#0c0d10] text-xs">
            {/* 1. WYGLĄD & MOTYW */}
            {activeTab === 'appearance' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Kolor Akcentu UI</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Główny kolor podświetleń, aktywnych narzędzi i ramek</p>
                  <div className="flex items-center gap-2.5">
                    {[
                      { id: 'cyan', label: 'Błękit', bg: 'bg-[#38bdf8]', border: '#38bdf8' },
                      { id: 'emerald', label: 'Szmaragd', bg: 'bg-[#10b981]', border: '#10b981' },
                      { id: 'purple', label: 'Fiolet', bg: 'bg-[#a855f7]', border: '#a855f7' },
                      { id: 'amber', label: 'Bursztyn', bg: 'bg-[#f59e0b]', border: '#f59e0b' },
                      { id: 'rose', label: 'Róż', bg: 'bg-[#fb7185]', border: '#fb7185' }
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const updated = { ...config, theme: { ...config.theme, accentColor: c.id as any } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                          config.theme?.accentColor === c.id
                            ? 'bg-[#18181b] border-white text-white font-bold shadow-md'
                            : 'bg-[#141519] border-[#27272a] text-[#a1a1aa] hover:text-white'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#27272a]">
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Siatka Canvasu</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Dostosuj gęstość punktów siatki oraz przyciąganie</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Gęstość siatki ({config.editor?.gridSize || 24}px):</span>
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
                        className="w-44 accent-[#38bdf8]"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Przyciąganie do siatki (Snap to grid):</span>
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
                        className={`px-3 py-1 rounded-lg font-mono text-[11px] border transition-colors ${
                          config.editor?.snapToGrid
                            ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] font-bold'
                            : 'bg-[#18181b] border-[#27272a] text-[#71717a]'
                        }`}
                      >
                        {config.editor?.snapToGrid ? 'WŁĄCZONE' : 'WYŁĄCZONE'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#27272a]">
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Typografia Edytora Notatek</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Czcionka i czytelność w trybie Markdown</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Krój czcionki:</span>
                      <select
                        value={config.editor?.defaultFontFamily || 'Inter, sans-serif'}
                        onChange={(e) => {
                          const updated = { ...config, editor: { ...config.editor, defaultFontFamily: e.target.value } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="bg-[#18181b] border border-[#27272a] text-[#f4f4f5] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#38bdf8]"
                      >
                        <option value="Inter, sans-serif">Inter (Nowoczesny Sans)</option>
                        <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                        <option value="Fira Code, monospace">Fira Code</option>
                        <option value="system-ui, sans-serif">System UI</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Wysokość linii ({config.editor?.lineHeight || 1.6}):</span>
                      <div className="flex items-center gap-1.5">
                        {[1.4, 1.6, 1.8].map((lh) => (
                          <button
                            key={lh}
                            onClick={() => {
                              const updated = { ...config, editor: { ...config.editor, lineHeight: lh } }
                              setConfig(updated)
                              handleSave(updated)
                            }}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                              (config.editor?.lineHeight || 1.6) === lh
                                ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8] font-bold'
                                : 'bg-[#18181b] border-[#27272a] text-[#71717a]'
                            }`}
                          >
                            {lh}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Szerokość kolumny tekstu ({config.editor?.maxNoteWidth || 800}px):</span>
                      <input
                        type="range"
                        min="600"
                        max="1200"
                        step="50"
                        value={config.editor?.maxNoteWidth || 800}
                        onChange={(e) => {
                          const updated = {
                            ...config,
                            editor: { ...config.editor, maxNoteWidth: Number(e.target.value) }
                          }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-44 accent-[#38bdf8]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PALETY CANVASU */}
            {activeTab === 'canvas' && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Paleta Karteczek Sticky Note</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Kolory tła, obramowania i tekstu dla karteczek samoprzylepnych</p>
                  <div className="grid grid-cols-2 gap-3">
                    {config.stickyPalette?.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between h-28 ${item.bg} ${item.border} ${item.text}`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updatedPalette = [...config.stickyPalette]
                              updatedPalette[idx] = { ...item, name: e.target.value }
                              const updated = { ...config, stickyPalette: updatedPalette }
                              setConfig(updated)
                              handleSave(updated)
                            }}
                            className="bg-transparent font-bold text-xs focus:outline-none border-b border-black/20"
                          />
                          <span className="text-[10px] opacity-70 font-mono">#{idx + 1}</span>
                        </div>
                        <div className="text-[11px] opacity-80">Przykładowy tekst karteczki...</div>
                        <div className="text-[9px] opacity-60 self-end font-mono">Sticky Palette</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#27272a]">
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Kolory Pisaka (Pen Palette)</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Dostępne kolory do swobodnego rysowania na Canvasie</p>
                  <div className="flex flex-wrap gap-2">
                    {config.penPalette?.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-[#18181b] border border-[#27272a]"
                      >
                        <input
                          type="color"
                          value={p.value}
                          onChange={(e) => {
                            const updatedPen = [...config.penPalette]
                            updatedPen[idx] = { ...p, value: e.target.value }
                            const updated = { ...config, penPalette: updatedPen }
                            setConfig(updated)
                            handleSave(updated)
                          }}
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={p.label}
                          onChange={(e) => {
                            const updatedPen = [...config.penPalette]
                            updatedPen[idx] = { ...p, label: e.target.value }
                            const updated = { ...config, penPalette: updatedPen }
                            setConfig(updated)
                            handleSave(updated)
                          }}
                          className="w-20 bg-transparent text-xs text-[#f4f4f5] focus:outline-none border-b border-transparent focus:border-[#38bdf8]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. GRAF WIEDZY */}
            {activeTab === 'graph' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Kolory Węzłów i Krawędzi Grafu</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Wizualna identyfikacja typów elementów w grafie wiedzy</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <span className="text-[#f4f4f5] font-medium">Notatki (Notes):</span>
                      <input
                        type="color"
                        value={config.graph?.nodeColorNote || '#10b981'}
                        onChange={(e) => {
                          const updated = { ...config, graph: { ...config.graph, nodeColorNote: e.target.value } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <span className="text-[#f4f4f5] font-medium">Tablice (Canvases):</span>
                      <input
                        type="color"
                        value={config.graph?.nodeColorCanvas || '#38bdf8'}
                        onChange={(e) => {
                          const updated = { ...config, graph: { ...config.graph, nodeColorCanvas: e.target.value } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <span className="text-[#f4f4f5] font-medium">Zasoby / Obrazy:</span>
                      <input
                        type="color"
                        value={config.graph?.nodeColorAsset || '#c084fc'}
                        onChange={(e) => {
                          const updated = { ...config, graph: { ...config.graph, nodeColorAsset: e.target.value } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <span className="text-[#f4f4f5] font-medium">Krawędzie relacji:</span>
                      <input
                        type="color"
                        value={config.graph?.edgeColor || '#3f3f46'}
                        onChange={(e) => {
                          const updated = { ...config, graph: { ...config.graph, edgeColor: e.target.value } }
                          setConfig(updated)
                          handleSave(updated)
                        }}
                        className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#27272a]">
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Fizyka Symulacji Grafu (Force Layout)</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Zachowanie i rozszerzanie powiązań na ekranie</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Siła odpychania ({config.graph?.repulsionForce || 750}):</span>
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
                        className="w-44 accent-[#a855f7]"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#a1a1aa]">Sprężystość krawędzi ({config.graph?.springForce || 0.005}):</span>
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
                        className="w-44 accent-[#a855f7]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SRS & FISZKI */}
            {activeTab === 'srs' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">Parametry Algorytmu FSRS</h3>
                  <p className="text-[#71717a] text-[11px] mb-3">Dostosuj tempo powtórek fiszek Active Recall</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <div>
                        <div className="font-semibold text-[#f4f4f5]">Domyślna stabilność początkowa (Dni):</div>
                        <div className="text-[10px] text-[#71717a]">Okres do pierwszej powtórki nowej fiszki</div>
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
                        className="w-20 bg-[#27272a] border border-[#3f3f46] text-[#f4f4f5] rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <div>
                        <div className="font-semibold text-[#f4f4f5]">Domyślna trudność bazowa (1 - 10):</div>
                        <div className="text-[10px] text-[#71717a]">Wyższa wartość częściej planuje powtórki</div>
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
                        className="w-20 bg-[#27272a] border border-[#3f3f46] text-[#f4f4f5] rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <div>
                        <div className="font-semibold text-[#f4f4f5]">Limit powtórek na sesję:</div>
                        <div className="text-[10px] text-[#71717a]">Maksymalna liczba kart podczas jednej rundy</div>
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
                        className="w-20 bg-[#27272a] border border-[#3f3f46] text-[#f4f4f5] rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SUROWY PLIK CONFIG.JSON */}
            {activeTab === 'json' && (
              <div className="h-full flex flex-col space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#71717a]">
                  <div className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Bezpośrednia edycja surowego JSON (config.json)</span>
                  </div>
                  {jsonError ? (
                    <span className="text-[#fb7185] flex items-center gap-1 font-mono text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> Niepoprawny JSON
                    </span>
                  ) : (
                    <span className="text-[#10b981] flex items-center gap-1 font-mono text-[10px]">
                      <Check className="w-3 h-3" /> JSON Prawidłowy
                    </span>
                  )}
                </div>

                <textarea
                  value={rawJson}
                  onChange={(e) => handleRawJsonChange(e.target.value)}
                  spellCheck={false}
                  className={`w-full flex-1 p-3.5 rounded-xl bg-[#111114] border font-mono text-xs text-[#f4f4f5] resize-none focus:outline-none leading-relaxed transition-colors ${
                    jsonError
                      ? 'border-[#fb7185]/60 focus:border-[#fb7185]'
                      : 'border-[#27272a] focus:border-[#38bdf8]'
                  }`}
                />

                {jsonError && (
                  <div className="p-2 rounded-lg bg-[#fb7185]/10 border border-[#fb7185]/30 text-[11px] text-[#fb7185] font-mono">
                    {jsonError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-5 border-t border-[#27272a] flex items-center justify-between shrink-0 bg-[#09090b]">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-xs text-[#a1a1aa] hover:text-[#fb7185] font-medium flex items-center gap-1.5 border border-[#27272a] transition-colors"
            title="Przywróć domyślne ustawienia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Przywróć domyślne</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-xs text-[#a1a1aa] font-medium"
            >
              Zamknij
            </button>
            <button
              onClick={() => handleSave()}
              disabled={!!jsonError || isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#10b981] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-40"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'Zapisano!' : 'Zastosuj i zapisz'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

