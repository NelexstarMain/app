import React, { useState, useEffect } from 'react'
import { X, Search, User, FileText, Plus, Move } from 'lucide-react'
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
    <div className="w-72 h-full bg-[#101114] border-l border-[#22242b] flex flex-col z-30 select-none text-xs">
      <div className="h-10 px-3 border-b border-[#22242b] flex items-center justify-between">
        <span className="font-semibold text-[#D8DAE0] text-xs">Panel Zasobów (#links)</span>
        <button onClick={onClose} className="p-1 rounded text-[#727683] hover:text-[#D8DAE0]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 border-b border-[#22242b]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#727683] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Szukaj w FTS5..."
            className="w-full pl-8 pr-2.5 py-1 rounded bg-[#141519] border border-[#22242b] text-xs text-[#D8DAE0] placeholder-[#727683] focus:outline-none focus:border-[#4A6B8A]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {searchResults.length > 0 ? (
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4B4E58] px-1 py-0.5">Wyniki wyszukiwania</div>
            {searchResults.map((r) => (
              <div
                key={r.item_id}
                onClick={() => {
                  if (r.item_type === 'note' && onOpenNote) onOpenNote(r.item_id)
                }}
                className="p-2 rounded bg-[#141519] border border-[#22242b] hover:border-[#4A6B8A] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D8DAE0] mb-0.5">
                  {r.item_type === 'note' ? (
                    <FileText className="w-3 h-3 text-[#4A6B8A]" />
                  ) : (
                    <User className="w-3 h-3 text-[#584C6B]" />
                  )}
                  <span className="truncate">{r.title}</span>
                </div>
                <div className="text-[10px] text-[#727683] line-clamp-1">{r.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4B4E58] px-1 py-0.5 mb-1">Obiekty wizualne</div>
            {entities.map((entity) => (
              <div
                key={entity.entity_id}
                draggable
                onDragStart={(e) => handleDragStart(e, entity)}
                className="p-2 rounded bg-[#141519] border border-[#22242b] hover:border-[#584C6B] cursor-grab active:cursor-grabbing transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3.5 h-3.5 text-[#584C6B]" />
                  <span className="font-semibold text-[#D8DAE0] truncate">{entity.title}</span>
                </div>
                <div className="text-[10px] text-[#727683] line-clamp-1">{entity.description_snippet}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-[#22242b] text-[10px] text-[#727683] bg-[#0b0c0e]">
        Przeciągnij obiekt na tablicę lub do edytora.
      </div>
    </div>
  )
}
