import React, { useState, useEffect, useRef } from 'react'
import { ArrowUpRight, Check, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  currentLabel: string
  onClose: () => void
  onConfirm: (label: string) => void
}

const COMMON_RELATIONS = [
  'POWIĄZANIE',
  'INICJATOR',
  'SKUTEK',
  'PRZYCZYNA',
  'ZAWIERA',
  'WPŁYW',
  'CZĘŚĆ',
  'KONTRAST'
]

export const ArrowLabelModal: React.FC<Props> = ({
  isOpen,
  currentLabel,
  onClose,
  onConfirm
}) => {
  const [label, setLabel] = useState(currentLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLabel(currentLabel || 'POWIĄZANIE')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, currentLabel])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(label.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="w-full max-w-sm bg-[#141519] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#f4f4f5]">
            <ArrowUpRight className="w-4 h-4 text-[#38bdf8]" />
            <span>Etykieta relacji / strzałki</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Nazwa relacji (np. SKUTEK, ZAWIERA):
            </label>
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Wpisz nazwę relacji..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          <div>
            <div className="text-[10px] text-[#71717a] font-semibold uppercase mb-1.5">Szybki wybór:</div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_RELATIONS.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setLabel(rel)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                    label === rel
                      ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 font-bold'
                      : 'bg-[#18181b] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a]'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-xs text-[#a1a1aa] font-medium"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#10b981] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90"
            >
              <Check className="w-4 h-4" />
              <span>Zapisz etykietę</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
