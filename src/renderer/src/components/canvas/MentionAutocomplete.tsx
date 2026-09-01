import React, { useState, useEffect, useRef } from 'react'
import { LayoutGrid, FileText, Image as ImageIcon, Sparkles, Tag } from 'lucide-react'

export interface MentionCandidate {
  id: string
  title: string
  type: 'canvas_node' | 'note' | 'canvas' | 'asset' | 'tag'
  path?: string
  snippet?: string
}

interface Props {
  isOpen: boolean
  query: string
  candidates: MentionCandidate[]
  triggerChar?: '@' | '[[' | string
  position?: { top?: number; left?: number; bottom?: number; right?: number }
  onSelect: (candidate: MentionCandidate) => void
  onClose: () => void
}

export const MentionAutocomplete: React.FC<Props> = ({
  isOpen,
  query,
  candidates,
  triggerChar = '@',
  position,
  onSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const cleanQuery = query.toLowerCase().trim()

  const filtered = candidates
    .filter((c) => {
      if (!cleanQuery) return true
      return (
        c.title.toLowerCase().includes(cleanQuery) ||
        (c.snippet && c.snippet.toLowerCase().includes(cleanQuery))
      )
    })
    .slice(0, 10)

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, filtered, selectedIndex, onSelect, onClose])

  if (!isOpen || filtered.length === 0) return null

  // Helper to highlight matching text
  const renderHighlightedTitle = (title: string, highlight: string) => {
    if (!highlight) return <span>{title}</span>
    const idx = title.toLowerCase().indexOf(highlight)
    if (idx === -1) return <span>{title}</span>

    const before = title.slice(0, idx)
    const match = title.slice(idx, idx + highlight.length)
    const after = title.slice(idx + highlight.length)

    return (
      <span>
        {before}
        <span className="text-[#38bdf8] font-bold bg-[#38bdf8]/15 px-0.5 rounded">{match}</span>
        {after}
      </span>
    )
  }

  const getItemIcon = (type: MentionCandidate['type']) => {
    switch (type) {
      case 'canvas':
        return <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
      case 'asset':
        return <ImageIcon className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
      case 'tag':
        return <Tag className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
      default:
        return <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
    }
  }

  const getTypeLabel = (type: MentionCandidate['type']) => {
    switch (type) {
      case 'canvas':
        return 'Płótno'
      case 'asset':
        return 'Zasób'
      case 'tag':
        return 'Tag'
      case 'note':
        return 'Notatka'
      default:
        return 'Węzeł'
    }
  }

  return (
    <div
      ref={listRef}
      style={position ? { position: 'absolute', ...position } : undefined}
      className="z-50 max-h-64 w-72 overflow-y-auto rounded-xl bg-[#141519]/95 border border-[#27272a] shadow-2xl backdrop-blur-xl p-1.5 select-none text-xs animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="px-2.5 py-1 text-[10px] font-semibold text-[#71717a] uppercase flex items-center justify-between border-b border-[#27272a] mb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#38bdf8]" />
          <span>
            {triggerChar === '[[' ? 'Linkuj notatkę / wikilink' : 'Wzmianka (@)'}
          </span>
        </div>
        <span className="font-mono text-[9px] text-[#52525b]">↑↓ Enter</span>
      </div>

      {/* Candidate List */}
      <div className="space-y-0.5">
        {filtered.map((item, idx) => {
          const isSelected = idx === selectedIndex
          return (
            <div
              key={item.id}
              onMouseEnter={() => setSelectedIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect(item)
              }}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[#27272a] text-[#f4f4f5] border border-[#38bdf8]/40 shadow-sm'
                  : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#f4f4f5]'
              }`}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                {getItemIcon(item.type)}
                <span className="truncate font-medium">
                  {renderHighlightedTitle(item.title, cleanQuery)}
                </span>
              </div>

              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                  item.type === 'canvas'
                    ? 'bg-[#a855f7]/10 text-[#a855f7]'
                    : item.type === 'asset'
                    ? 'bg-[#c084fc]/10 text-[#c084fc]'
                    : item.type === 'tag'
                    ? 'bg-[#10b981]/10 text-[#10b981]'
                    : 'bg-[#38bdf8]/10 text-[#38bdf8]'
                }`}
              >
                {getTypeLabel(item.type)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
