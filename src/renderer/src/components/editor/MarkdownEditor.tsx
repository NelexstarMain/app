import React, { useState, useEffect, useRef } from 'react'
import { FileText, Eye, Edit3, Sparkles, Tag, HelpCircle, User, ChevronRight, Check } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { VisualEntityRecord } from '../../../../shared/types/database'

interface Props {
  relativePath: string
  initialContent: string
  onContentChanged: (newContent: string) => void
  onActivity: () => void
  onNavigatePath?: (path: string) => void
}

export const MarkdownEditor: React.FC<Props> = ({
  relativePath,
  initialContent,
  onContentChanged,
  onActivity,
  onNavigatePath
}) => {
  const [content, setContent] = useState(initialContent)
  const [previewMode, setPreviewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [hoverEntity, setHoverEntity] = useState<{ entity: VisualEntityRecord | null; x: number; y: number } | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setContent(initialContent)
  }, [relativePath, initialContent])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setContent(newText)
    onActivity()

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
          relativePath,
          content: newText,
          createBackup: true
        })
        onContentChanged(newText)
      } catch (err) {
        console.error('Failed to auto-save file:', err)
      } finally {
        setTimeout(() => setIsSaving(false), 500)
      }
    }, 300)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const rawData = e.dataTransfer.getData('application/x-cogni-entity')
      if (rawData) {
        const payload = JSON.parse(rawData)
        const backlinkTag = `[[${payload.entityId}|${payload.title}]]`
        const newText = content + `\n\n- Powiązany obiekt: ${backlinkTag}\n`
        setContent(newText)
        onContentChanged(newText)
        onActivity()
      }
    } catch (err) {
      console.warn('Drop error:', err)
    }
  }

  // Parse path into clickable breadcrumbs
  const pathParts = relativePath.split('/')

  const renderASTPreview = (rawText: string) => {
    const lines = rawText.split('\n')

    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-bold text-[#f4f4f5] tracking-tight mb-4 mt-2 pb-2 border-b border-[#27272a]">
            {line.slice(2)}
          </h1>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-semibold text-[#38bdf8] mb-2 mt-5 tracking-tight">
            {line.slice(3)}
          </h2>
        )
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-semibold text-[#f59e0b] mb-1.5 mt-3">
            {line.slice(4)}
          </h3>
        )
      }

      if (line.trim().startsWith('#test')) {
        const testMatch = /#test\s*\[(.*?)\]\s*\|\s*\[(.*?)\]/.exec(line)
        if (testMatch) {
          return (
            <div key={idx} className="my-3 p-3.5 rounded-xl bg-[#18181b] border border-[#f59e0b]/30 flex items-start gap-3 text-xs shadow-md">
              <HelpCircle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-[#f59e0b] text-[11px] uppercase tracking-wider mb-1">Active Recall (#test)</div>
                <div className="text-[#f4f4f5] font-medium text-xs mb-1.5">{testMatch[1]}</div>
                <div className="text-[#a1a1aa] text-[11px] pt-1.5 border-t border-[#27272a] flex items-center gap-1.5">
                  <span>Odpowiedź:</span>
                  <span className="font-mono text-[#10b981] font-semibold bg-[#27272a]/60 px-1.5 py-0.5 rounded">{testMatch[2]}</span>
                </div>
              </div>
            </div>
          )
        }
      }

      const parts = line.split(/(\[\[@[a-zA-Z0-9_\-\|]+\]\]|\[\[[a-zA-Z0-9_\-\s\/\|]+\]\]|#[a-zA-Z0-9_\-]+)/g)

      return (
        <p key={idx} className="min-h-[1.4rem] my-1.5 text-xs text-[#d4d4d8] leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith('[[@entity_')) {
              const clean = part.slice(2, -2)
              const [entId, label] = clean.split('|')
              return (
                <span
                  key={pIdx}
                  onMouseEnter={async (e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const res = await window.electronAPI.invoke(IpcChannel.ASSET_GET_ENTITY, { entityId: entId })
                    setHoverEntity({ entity: res.entity, x: rect.left, y: rect.bottom + 6 })
                  }}
                  onMouseLeave={() => setHoverEntity(null)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#27272a] text-[#c084fc] border border-[#a855f7]/30 text-[11px] font-medium cursor-pointer hover:border-[#a855f7] hover:bg-[#3f3f46] transition-all"
                >
                  <User className="w-3 h-3 text-[#c084fc]" />
                  <span>{label || entId}</span>
                </span>
              )
            }

            if (part.startsWith('[[') && part.endsWith(']]')) {
              const clean = part.slice(2, -2)
              const [targetNote, label] = clean.split('|')
              return (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#27272a] text-[#38bdf8] border border-[#38bdf8]/30 text-[11px] font-medium cursor-pointer hover:border-[#38bdf8] hover:bg-[#3f3f46] transition-all"
                >
                  <FileText className="w-3 h-3 text-[#38bdf8]" />
                  <span>{label || targetNote}</span>
                </span>
              )
            }

            if (part.startsWith('#') && part.length > 1) {
              return (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#18181b] text-[#10b981] text-[10px] font-mono border border-[#10b981]/30 font-medium"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{part.slice(1)}</span>
                </span>
              )
            }

            return <span key={pIdx}>{part}</span>
          })}
        </p>
      )
    })
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="h-full flex flex-col bg-[#09090b] select-text"
    >
      {/* Top Breadcrumbs & View Switcher Bar */}
      <div className="h-9 bg-[#111114] border-b border-[#27272a] flex items-center justify-between px-4 select-none text-xs">
        {/* Clickable Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
          <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0 mr-0.5" />
          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1
            return (
              <React.Fragment key={index}>
                <span
                  onClick={() => onNavigatePath && onNavigatePath(pathParts.slice(0, index + 1).join('/'))}
                  className={`hover:text-[#f4f4f5] transition-colors cursor-pointer ${
                    isLast ? 'text-[#f4f4f5] font-semibold' : 'text-[#a1a1aa]'
                  }`}
                >
                  {part}
                </span>
                {!isLast && <ChevronRight className="w-3 h-3 text-[#52525b] shrink-0" />}
              </React.Fragment>
            )
          })}

          {isSaving ? (
            <span className="ml-3 text-[10px] text-[#10b981] flex items-center gap-1 font-mono">
              <Check className="w-3 h-3" /> Zapisano
            </span>
          ) : null}
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a]">
          <button
            onClick={() => setPreviewMode('edit')}
            className={`px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 transition-colors ${
              previewMode === 'edit' ? 'bg-[#27272a] text-[#f4f4f5] font-medium shadow-sm' : 'text-[#71717a] hover:text-[#f4f4f5]'
            }`}
            title="Tylko edytor"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edytor</span>
          </button>
          <button
            onClick={() => setPreviewMode('split')}
            className={`px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 transition-colors ${
              previewMode === 'split' ? 'bg-[#27272a] text-[#f4f4f5] font-medium shadow-sm' : 'text-[#71717a] hover:text-[#f4f4f5]'
            }`}
            title="Widok podzielony"
          >
            <Sparkles className="w-3 h-3" />
            <span>Podgląd Live</span>
          </button>
          <button
            onClick={() => setPreviewMode('preview')}
            className={`px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 transition-colors ${
              previewMode === 'preview' ? 'bg-[#27272a] text-[#f4f4f5] font-medium shadow-sm' : 'text-[#71717a] hover:text-[#f4f4f5]'
            }`}
            title="Tylko podgląd"
          >
            <Eye className="w-3 h-3" />
            <span>Czytanie</span>
          </button>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area (Left in Split) */}
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div className={`h-full bg-[#0c0d10] overflow-y-auto ${previewMode === 'split' ? 'w-1/2 border-r border-[#27272a]/80' : 'w-full'}`}>
            <div className="max-w-3xl mx-auto w-full h-full p-6 md:p-8">
              <textarea
                value={content}
                onChange={handleChange}
                placeholder="Zacznij pisać... Użyj nagłówków # Tytuł, linków [[Notatka]], encji [[@entity_id|Nazwa]], tagów #tag oraz fiszek #test [Pytanie]|[Odpowiedź]..."
                className="w-full h-full bg-transparent text-[#f4f4f5] font-mono text-xs focus:outline-none resize-none leading-relaxed placeholder-[#52525b]"
              />
            </div>
          </div>
        )}

        {/* Live Preview Area (Right in Split) */}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className={`h-full bg-[#111216] overflow-y-auto ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="max-w-3xl mx-auto w-full p-6 md:p-8">
              {renderASTPreview(content)}
            </div>
          </div>
        )}
      </div>

      {/* Hover Card for Entities */}
      {hoverEntity && hoverEntity.entity && (
        <div
          style={{ top: `${hoverEntity.y}px`, left: `${hoverEntity.x}px` }}
          className="fixed z-50 w-72 p-3.5 rounded-xl bg-[#18181b] border border-[#3f3f46] shadow-2xl text-xs backdrop-blur-md"
        >
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[#27272a]">
            <User className="w-4 h-4 text-[#c084fc]" />
            <span className="font-semibold text-[#f4f4f5]">{hoverEntity.entity.title}</span>
          </div>
          <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
            {hoverEntity.entity.description_snippet || 'Obiekt bazy wiedzy'}
          </p>
        </div>
      )}
    </div>
  )
}
