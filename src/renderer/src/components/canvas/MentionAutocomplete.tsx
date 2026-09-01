import React from 'react'
import { LayoutGrid, FileText, Image as ImageIcon, Sparkles } from 'lucide-react'

export interface MentionCandidate {
  id: string
  title: string
  type: 'canvas_node' | 'note' | 'canvas' | 'asset'
  path?: string
}

interface Props {
  isOpen: boolean
  query: string
  candidates: MentionCandidate[]
  onSelect: (candidate: MentionCandidate) => void
  onClose: () => void
}

export const MentionAutocomplete: React.FC<Props> = ({
  isOpen,
  query,
  candidates,
  onSelect
}) => {
  if (!isOpen) return null

  const filtered = candidates.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  if (filtered.length === 0) return null

  return (
    <div className="absolute z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-xl bg-[#141519]/95 border border-[#38bdf8]/50 shadow-2xl backdrop-blur-md p-1 select-none text-xs">
      <div className="px-2 py-1 text-[10px] font-semibold text-[#71717a] uppercase flex items-center gap-1 border-b border-[#27272a] mb-1">
        <Sparkles className="w-3 h-3 text-[#38bdf8]" />
        <span>Wierzchołki do podlinkowania (@):</span>
      </div>
      {filtered.map((item) => (
        <div
          key={item.id}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSelect(item)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#18181b] text-[#f4f4f5] cursor-pointer transition-colors"
        >
          {item.type === 'canvas' ? (
            <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
          ) : item.type === 'asset' ? (
            <ImageIcon className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
          )}
          <span className="truncate flex-1 font-medium">{item.title}</span>
        </div>
      ))}
    </div>
  )
}
