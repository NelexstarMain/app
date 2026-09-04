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
  { label: 'Jasny Fiolet', value: '#c084fc' },
  { label: 'Elektryczny Fiolet', value: '#a855f7' },
  { label: 'Głęboki Fiolet', value: '#7c3aed' },
  { label: 'Nocny Indygo', value: '#6366f1' },
  { label: 'Ciemny Fiolet', value: '#422066' },
  { label: 'Lawendowy', value: '#ddd6fe' },
  { label: 'Śnieżna Biel', value: '#f8fafc' }
]

export const ArrowEditModal: React.FC<Props> = ({
  isOpen,
  initialData,
  onClose,
  onConfirm
}) => {
  const [label, setLabel] = useState(initialData.label || '')
  const [color, setColor] = useState(initialData.color || '#c084fc')
  const [style, setStyle] = useState<EdgeStyle>(initialData.style || 'solid')
  const [bidirectional, setBidirectional] = useState(initialData.bidirectional || false)
  const [strokeWidth, setStrokeWidth] = useState(initialData.strokeWidth || 2)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLabel(initialData.label || '')
      setColor(initialData.color || '#c084fc')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="w-full max-w-md bg-[#101322] border border-[#422066] rounded-[7px] shadow-2xl overflow-hidden specular-border">
        <div className="h-11 px-4 border-b border-[#422066] flex items-center justify-between bg-[#0a0c16]">
          <div className="flex items-center gap-2 font-semibold text-xs text-[#f8fafc]">
            <ArrowUpRight className="w-4 h-4 text-[#c084fc]" />
            <span>Właściwości strzałki i relacji</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-[5px] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#25143a]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Etykieta */}
          <div>
            <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
              Nazwa relacji (etykieta):
            </label>
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="np. INICJATOR, ZAWIERA..."
              className="w-full px-3 py-2 rounded-[5px] bg-[#15182a] border border-[#422066] text-xs text-[#f8fafc] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#a855f7]"
            />
          </div>

          {/* Szybkie etykiety */}
          <div>
            <div className="text-[9px] text-[#94a3b8] font-semibold uppercase mb-1.5">Szybki wybór:</div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_RELATIONS.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setLabel(rel)}
                  className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono transition-colors ${
                    label === rel
                      ? 'bg-[#25143a] text-[#c084fc] border border-[#a855f7] font-bold'
                      : 'bg-[#15182a] text-[#94a3b8] hover:text-[#f8fafc] border border-[#422066]'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          {/* Kolor strzałki */}
          <div>
            <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
              Kolor linii:
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-6 h-6 rounded-[3px] border transition-transform ${
                    color === c.value ? 'scale-110 border-white ring-2 ring-[#a855f7]/60' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Styl linii & Kierunek */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
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
                    className={`py-1.5 px-2 rounded-[5px] text-[11px] font-medium border transition-colors ${
                      style === s.id
                        ? 'bg-[#25143a] border-[#a855f7] text-[#c084fc]'
                        : 'bg-[#15182a] border-[#422066] text-[#94a3b8] hover:text-[#f8fafc]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                Kierunek & Grubość:
              </label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setBidirectional(!bidirectional)}
                  className={`w-full py-1.5 px-2.5 rounded-[5px] text-[11px] font-medium border flex items-center justify-between transition-colors ${
                    bidirectional
                      ? 'bg-[#25143a] border-[#a855f7] text-[#c084fc]'
                      : 'bg-[#15182a] border-[#422066] text-[#94a3b8]'
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
                      className={`flex-1 py-1 rounded-[5px] text-[10px] font-mono border transition-colors ${
                        strokeWidth === w
                          ? 'bg-[#25143a] border-[#a855f7] text-[#c084fc] font-bold'
                          : 'bg-[#15182a] border-[#422066] text-[#94a3b8]'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#422066]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[5px] bg-[#15182a] hover:bg-[#25143a] text-xs text-[#94a3b8] font-medium border border-[#422066]"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-[5px] bg-[#a855f7] hover:bg-[#c084fc] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Zastosuj</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
