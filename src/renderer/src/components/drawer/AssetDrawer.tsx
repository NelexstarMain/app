import React, { useState, useEffect } from 'react'
import { X, Search, User, FileText, GripVertical } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { VisualEntityRecord } from '../../../../shared/types/database'
import { DragEntityPayload } from '../../../../shared/types/session'

interface Props {
  isOpen: boolean
  initialQuery?: string
  onClose: () => void
  onOpenNote?: (path: string) => void
}

export const AssetDrawer: React.FC<Props> = ({ isOpen, initialQuery = '', onClose, onOpenNote }) => {
  const [query, setQuery] = useState(initialQuery)
  const [entities, setEntities] = useState<VisualEntityRecord[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) loadEntities()
  }, [isOpen])

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const loadEntities = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.ASSET_GET_ALL, undefined)
      if (res.entities) setEntities(res.entities)
    } catch (err) {
      console.error('Failed to load entities:', err)
    }
  }

  const handleSearch = async (val: string) => {
    setQuery(val)
    if (!val.trim()) {
      setSearchResults([])
      return
    }
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_QUERY_FTS, { query: val, limit: 20 })
      if (res.results) setSearchResults(res.results)
    } catch (err) {
      console.error('FTS search failed:', err)
    }
  }

  const handleDragStart = (e: React.DragEvent, entity: VisualEntityRecord) => {
    const payload: DragEntityPayload = {
      mimeType: 'application/x-cogni-entity',
      entityId: entity.entity_id,
      title: entity.title,
      mediaThumbPath: '',
      linkedNoteId: entity.linked_note_id,
      tags: [],
      defaultQuestionSnippet: `Informacje o ${entity.title}`
    }
    e.dataTransfer.setData('application/x-cogni-entity', JSON.stringify(payload))
  }

  if (!isOpen) return null

  return (
    <div className="w-72 h-full bg-[#09090b] border-l border-[#27272a] flex flex-col z-30 select-none text-xs">
      {/* Header */}
      <div className="h-10 px-3.5 border-b border-[#27272a] flex items-center justify-between">
        <span className="font-semibold text-[#f4f4f5] text-xs">Panel Zasobów (#links)</span>
        <button onClick={onClose} className="p-1 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Field */}
      <div className="p-2.5 border-b border-[#27272a]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Szukaj w FTS5..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#71717a] focus:outline-none focus:border-[#38bdf8]"
          />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {searchResults.length > 0 ? (
          <div>
            <div className="text-[10px] uppercase font-bold text-[#52525b] px-1 py-0.5 mb-1.5">Wyniki wyszukiwania</div>
            {searchResults.map((r) => (
              <div
                key={r.item_id}
                onClick={() => {
                  if (r.item_type === 'note' && onOpenNote) onOpenNote(r.item_id)
                }}
                className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#38bdf8] hover:translate-y-[-1px] cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f4f4f5] mb-0.5">
                  {r.item_type === 'note' ? (
                    <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[#c084fc]" />
                  )}
                  <span className="truncate">{r.title}</span>
                </div>
                <div className="text-[11px] text-[#a1a1aa] line-clamp-1">{r.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase font-bold text-[#52525b] px-1 py-0.5 mb-1.5">Obiekty wizualne</div>
            {entities.map((entity) => (
              <div
                key={entity.entity_id}
                draggable
                onDragStart={(e) => handleDragStart(e, entity)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#52525b] hover:translate-y-[-1px] cursor-grab active:cursor-grabbing transition-all shadow-sm group"
              >
                <GripVertical className="w-3.5 h-3.5 text-[#52525b] group-hover:text-[#a1a1aa] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <User className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
                    <span className="font-semibold text-[#f4f4f5] truncate text-xs">{entity.title}</span>
                  </div>
                  <div className="text-[10px] text-[#71717a] line-clamp-1">{entity.description_snippet}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-[#27272a] text-[10px] text-[#71717a] bg-[#09090b] flex items-center gap-1.5">
        <GripVertical className="w-3 h-3 text-[#52525b]" />
        <span>Przeciągnij kartę na tablicę lub do edytora.</span>
      </div>
    </div>
  )
}
