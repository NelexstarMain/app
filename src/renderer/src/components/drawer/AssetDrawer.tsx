import React, { useState, useEffect } from 'react'
import { X, Search, User, FileText, HelpCircle, Upload, Plus, Sparkles, Move } from 'lucide-react'
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
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadEntities()
    }
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
      const res = await window.electronAPI.invoke(IpcChannel.DB_QUERY_FTS, { query: val, limit: 30 })
      if (res.results) setSearchResults(res.results)
    } catch (err) {
      console.error('FTS search failed:', err)
    }
  }

  const handleDragStart = (e: React.DragEvent, entity: VisualEntityRecord, isQuiz = false) => {
    const payload: DragEntityPayload & { isQuizMode?: boolean } = {
      mimeType: 'application/x-cogni-entity',
      entityId: entity.entity_id,
      title: entity.title,
      mediaThumbPath: '',
      linkedNoteId: entity.linked_note_id,
      tags: [],
      defaultQuestionSnippet: `Informacje o ${entity.title}`,
      isQuizMode: isQuiz
    }
    e.dataTransfer.setData('application/x-cogni-entity', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleCreateEntityPrompt = async () => {
    const title = prompt('Podaj nazwę nowego obiektu wizualnego (np. Konstytucja 3 Maja, Tadeusz Kościuszko):')
    if (!title) return
    try {
      const res = await window.electronAPI.invoke(IpcChannel.ASSET_INGEST, {
        fileName: `${title}.png`,
        title,
        base64Data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        archetype: 'concept'
      })
      if (res.entity) {
        setEntities((prev) => [res.entity, ...prev])
      }
    } catch (err) {
      console.error('Failed to ingest entity:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-80 h-full bg-synapse-card/95 border-l border-synapse-border/80 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right-4 duration-200 select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-synapse-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Asset & Link Drawer (#links)</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-synapse-muted hover:text-white hover:bg-synapse-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-synapse-border/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-synapse-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search FTS5 BM25 index..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-synapse-surface/80 border border-synapse-border/50 text-xs text-white placeholder-synapse-muted focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Ingestion Action */}
      <div className="p-3 border-b border-synapse-border/40 bg-synapse-surface/20 flex items-center justify-between">
        <span className="text-[11px] text-synapse-muted">Visual Entities</span>
        <button
          onClick={handleCreateEntityPrompt}
          className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>New Entity</span>
        </button>
      </div>

      {/* Content Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* If query has FTS results */}
        {searchResults.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-synapse-muted/70">FTS5 Search Results</div>
            {searchResults.map((r) => (
              <div
                key={r.item_id}
                onClick={() => {
                  if (r.item_type === 'note' && onOpenNote) onOpenNote(r.item_id)
                }}
                className="p-2.5 rounded-xl bg-synapse-surface/60 border border-synapse-border/40 hover:border-purple-500/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1">
                  {r.item_type === 'note' ? (
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                  ) : r.item_type === 'visual_entity' ? (
                    <User className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="truncate">{r.title}</span>
                </div>
                <div className="text-[11px] text-synapse-muted line-clamp-2">{r.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {entities.map((entity) => (
              <div
                key={entity.entity_id}
                draggable
                onDragStart={(e) => handleDragStart(e, entity, false)}
                className="p-3 rounded-xl bg-synapse-surface/60 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 cursor-grab active:cursor-grabbing transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{entity.title}</div>
                    <div className="text-[10px] text-purple-400 font-mono">{entity.entity_id}</div>
                  </div>
                </div>

                <div className="text-[11px] text-synapse-muted line-clamp-2 leading-relaxed mb-2">
                  {entity.description_snippet || 'Visual Entity Object'}
                </div>

                <div className="flex items-center justify-between text-[10px] text-synapse-muted/70 pt-2 border-t border-synapse-border/30">
                  <span className="flex items-center gap-1 text-purple-300">
                    <Move className="w-3 h-3" />
                    Drag to Canvas / Editor
                  </span>
                  <span className="capitalize">{entity.entity_type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Instructions for 3-Mode Drop */}
      <div className="p-3 border-t border-synapse-border/60 text-[10px] text-synapse-muted/70 bg-synapse-bg/50">
        <div>💡 <b>3-Mode Drag & Drop:</b></div>
        <div>• Drop on Canvas $\rightarrow$ Visual Node</div>
        <div>• Drop in Markdown $\rightarrow$ Inline Backlink</div>
        <div>• Hold <kbd className="px-1 py-0.5 rounded bg-synapse-surface text-synapse-muted font-mono">Alt</kbd> + Drop $\rightarrow$ Quiz Card</div>
      </div>
    </div>
  )
}
