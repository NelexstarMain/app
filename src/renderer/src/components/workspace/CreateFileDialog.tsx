import React, { useState, useEffect, useRef } from 'react'
import { X, LayoutGrid, FileText, AlignLeft, FolderPlus, Check } from 'lucide-react'

export type FileCreationType = 'canvas' | 'md' | 'txt' | 'folder'

interface Props {
  isOpen: boolean
  defaultType?: FileCreationType
  defaultFolder?: string
  onClose: () => void
  onCreate: (name: string, type: FileCreationType, folder: string) => void
}

export const CreateFileDialog: React.FC<Props> = ({
  isOpen,
  defaultType = 'canvas',
  defaultFolder = 'canvases',
  onClose,
  onCreate
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<FileCreationType>(defaultType)
  const [folder, setFolder] = useState(defaultFolder)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setType(defaultType)
      setFolder(defaultFolder)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, defaultType, defaultFolder])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim(), type, folder)
    onClose()
  }

  const getPlaceholder = () => {
    switch (type) {
      case 'canvas': return 'np. Sejm Wielki, Anatomia, Matematyka'
      case 'md': return 'np. Notatka z wykladu, Biografie'
      case 'txt': return 'np. Szybkie notatki, Lista zrodel'
      case 'folder': return 'np. Historia, Biologia, Projekty'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#141519] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#f4f4f5]">
            <FolderPlus className="w-4 h-4 text-[#38bdf8]" />
            <span>Utwórz nowy element</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-2 uppercase tracking-wider">
              Typ elementu:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('canvas')
                  if (folder === 'notes' || folder === '') setFolder('canvases')
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  type === 'canvas'
                    ? 'bg-[#27272a] border-[#a855f7] text-[#a855f7] ring-1 ring-[#a855f7]/40 shadow-sm'
                    : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-[#a855f7]" />
                <div className="text-left">
                  <div>Tablica Whiteboard</div>
                  <div className="text-[10px] text-[#71717a] font-normal">.canvas.json</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('md')
                  if (folder === 'canvases' || folder === '') setFolder('notes')
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  type === 'md'
                    ? 'bg-[#27272a] border-[#38bdf8] text-[#38bdf8] ring-1 ring-[#38bdf8]/40 shadow-sm'
                    : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#38bdf8]" />
                <div className="text-left">
                  <div>Notatka Markdown</div>
                  <div className="text-[10px] text-[#71717a] font-normal">.md</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('txt')
                  if (folder === 'canvases' || folder === '') setFolder('notes')
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  type === 'txt'
                    ? 'bg-[#27272a] border-[#10b981] text-[#10b981] ring-1 ring-[#10b981]/40 shadow-sm'
                    : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                <AlignLeft className="w-4 h-4 text-[#10b981]" />
                <div className="text-left">
                  <div>Czysty Tekst</div>
                  <div className="text-[10px] text-[#71717a] font-normal">.txt</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('folder')
                  if (folder === '') setFolder('notes')
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  type === 'folder'
                    ? 'bg-[#27272a] border-[#f59e0b] text-[#f59e0b] ring-1 ring-[#f59e0b]/40 shadow-sm'
                    : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                <FolderPlus className="w-4 h-4 text-[#f59e0b]" />
                <div className="text-left">
                  <div>Nowy Folder</div>
                  <div className="text-[10px] text-[#71717a] font-normal">katalog</div>
                </div>
              </button>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Nazwa {type === 'folder' ? 'folderu' : 'pliku'}:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Katalog docelowy:
            </label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#a1a1aa] font-mono focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#10b981] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>Utwórz</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
