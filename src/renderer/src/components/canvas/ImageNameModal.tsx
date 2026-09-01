import React, { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Check, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  previewSrc: string | null
  defaultName: string
  onClose: () => void
  onConfirm: (name: string) => void
}

export const ImageNameModal: React.FC<Props> = ({
  isOpen,
  previewSrc,
  defaultName,
  onClose,
  onConfirm
}) => {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(defaultName)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, defaultName])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onConfirm(name.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="w-full max-w-md bg-[#141519] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#f4f4f5]">
            <ImageIcon className="w-4 h-4 text-[#c084fc]" />
            <span>Nazwa nowego obiektu graficznego</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {previewSrc && (
            <div className="w-full h-40 bg-[#09090b] rounded-xl border border-[#27272a] flex items-center justify-center overflow-hidden p-2">
              <img src={previewSrc} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Wpisz nazwę zdjęcia (wierzchołka w grafie):
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Portret Poniatowskiego, Schemat reform..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#52525b] focus:outline-none focus:border-[#c084fc]"
            />
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
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#c084fc] to-[#38bdf8] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>Dodaj do tablicy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
