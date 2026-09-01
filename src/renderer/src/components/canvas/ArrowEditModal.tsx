import React, { useState, useEffect, useRef } from 'react'
import { ArrowUpRight, Check, X, MoveHorizontal, Minus } from 'lucide-react'
import { EdgeStyle } from '../../../../shared/types/canvas'

export interface ArrowConfigData {
  label: string
  color: string
  style: EdgeStyle
  bidirectional: boolean
  strokeWidth: number
}

interface Props {
  isOpen: boolean
  initialData: ArrowConfigData
  onClose: () => void
  onConfirm: (data: ArrowConfigData) => void
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

const COLOR_OPTIONS = [
  { label: 'Błękitny', value: '#38bdf8' },
  { label: 'Szmaragdowy', value: '#10b981' },
  { label: 'Bursztynowy', value: '#f59e0b' },
  { label: 'Fioletowy', value: '#a855f7' },
  { label: 'Różowy', value: '#fb7185' },
  { label: 'Biały', value: '#f4f4f5' },
  { label: 'Szary', value: '#71717a' }
]

export const ArrowEditModal: React.FC<Props> = ({
  isOpen,
  initialData,
  onClose,
  onConfirm
}) => {
  const [label, setLabel] = useState(initialData.label || '')
  const [color, setColor] = useState(initialData.color || '#38bdf8')
  const [style, setStyle] = useState<EdgeStyle>(initialData.style || 'solid')
  const [bidirectional, setBidirectional] = useState(initialData.bidirectional || false)
  const [strokeWidth, setStrokeWidth] = useState(initialData.strokeWidth || 2)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLabel(initialData.label || '')
      setColor(initialData.color || '#38bdf8')
      setStyle(initialData.style || 'solid')
      setBidirectional(initialData.bidirectional || false)
      setStrokeWidth(initialData.strokeWidth || 2)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      label: label.trim(),
      color,
      style,
      bidirectional,
      strokeWidth
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="w-full max-w-md bg-[#141519] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#f4f4f5]">
            <ArrowUpRight className="w-4 h-4 text-[#38bdf8]" />
            <span>Właściwości strzałki i relacji</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Etykieta */}
          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Nazwa relacji (etykieta):
            </label>
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="np. INICJATOR, ZAWIERA..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          {/* Szybkie etykiety */}
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

          {/* Kolor strzałki */}
          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Kolor linii:
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    color === c.value ? 'scale-125 border-white ring-2 ring-[#38bdf8]/40' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Styl linii & Kierunek */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
                Typ linii:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'solid', label: 'Ciągła' },
                  { id: 'dashed', label: 'Kreskowana' },
                  { id: 'dotted', label: 'Kropkowana' },
                  { id: 'soft_link', label: 'Subtelna' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id as EdgeStyle)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      style === s.id
                        ? 'bg-[#27272a] border-[#38bdf8] text-[#38bdf8]'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
                Kierunek & Grubość:
              </label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setBidirectional(!bidirectional)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-medium border flex items-center justify-between transition-colors ${
                    bidirectional
                      ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
                      : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MoveHorizontal className="w-3.5 h-3.5" />
                    <span>Dwukierunkowa</span>
                  </span>
                  <span className="text-[10px] font-mono">{bidirectional ? 'TAK' : 'NIE'}</span>
                </button>

                <div className="flex items-center gap-1">
                  {[1.5, 2.5, 4].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setStrokeWidth(w)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                        strokeWidth === w
                          ? 'bg-[#27272a] border-[#38bdf8] text-[#38bdf8] font-bold'
                          : 'bg-[#18181b] border-[#27272a] text-[#71717a]'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>
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
              <span>Zastosuj</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
