import React, { useState, useEffect } from 'react'
import { Settings, Save, RotateCcw, X, Check, AlertTriangle, Code } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfigSaved?: () => void
}

export const ConfigEditorModal: React.FC<Props> = ({ isOpen, onClose, onConfigSaved }) => {
  const [jsonText, setJsonText] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadConfig()
      setValidationError(null)
      setSaveSuccess(false)
    }
  }, [isOpen])

  const loadConfig = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_GET, undefined)
      if (res.rawJson) {
        setJsonText(res.rawJson)
      } else if (res.config) {
        setJsonText(JSON.stringify(res.config, null, 2))
      }
    } catch (err: any) {
      console.error('Failed to load config:', err)
    }
  }

  if (!isOpen) return null

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setJsonText(val)
    try {
      JSON.parse(val)
      setValidationError(null)
    } catch (err: any) {
      setValidationError(err.message)
    }
  }

  const handleSave = async () => {
    try {
      JSON.parse(jsonText)
    } catch (err: any) {
      setValidationError(`Błąd składni JSON: ${err.message}`)
      return
    }

    setIsSaving(true)
    try {
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_UPDATE, { configJson: jsonText })
      if (res.success) {
        setSaveSuccess(true)
        if (onConfigSaved) onConfigSaved()
        setTimeout(() => setSaveSuccess(false), 2000)
      } else {
        setValidationError(res.error || 'Nie udało się zapisać konfiguracji')
      }
    } catch (err: any) {
      setValidationError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Czy na pewno chcesz przywrócić domyślną konfigurację config.json?')) return
    try {
      const res = await window.electronAPI.invoke(IpcChannel.CONFIG_RESET, undefined)
      if (res.success && res.rawJson) {
        setJsonText(res.rawJson)
        setValidationError(null)
        setSaveSuccess(true)
        if (onConfigSaved) onConfigSaved()
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (err: any) {
      console.error('Reset failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#141519] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#f4f4f5]">
            <Settings className="w-4 h-4 text-[#38bdf8]" />
            <span>Konfiguracja aplikacji (config.json)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Editor Body */}
        <div className="p-4 flex-1 flex flex-col overflow-hidden bg-[#0c0d10]">
          <div className="flex items-center justify-between mb-2 text-[11px] text-[#71717a]">
            <div className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Edytor surowego pliku JSON (palety, style, FSRS)</span>
            </div>
            {validationError ? (
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
            value={jsonText}
            onChange={handleTextChange}
            spellCheck={false}
            className={`w-full flex-1 p-3.5 rounded-xl bg-[#111114] border font-mono text-xs text-[#f4f4f5] resize-none focus:outline-none leading-relaxed transition-colors ${
              validationError ? 'border-[#fb7185]/60 focus:border-[#fb7185]' : 'border-[#27272a] focus:border-[#38bdf8]'
            }`}
          />

          {validationError && (
            <div className="mt-2 p-2 rounded-lg bg-[#fb7185]/10 border border-[#fb7185]/30 text-[11px] text-[#fb7185] font-mono">
              {validationError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-4 border-t border-[#27272a] flex items-center justify-between shrink-0 bg-[#09090b]">
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
              onClick={handleSave}
              disabled={!!validationError || isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#10b981] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-40"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'Zapisano!' : 'Zapisz config.json'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
