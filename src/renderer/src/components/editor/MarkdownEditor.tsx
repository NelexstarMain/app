import React, { useState, useEffect, useRef } from 'react'
import { FileText, Eye, Edit3, Sparkles, Tag, HelpCircle, User } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { VisualEntityRecord } from '../../../../shared/types/database'

interface Props {
  relativePath: string
  initialContent: string
  onContentChanged: (newContent: string) => void
  onActivity: () => void
}

export const MarkdownEditor: React.FC<Props> = ({
  relativePath,
  initialContent,
  onContentChanged,
  onActivity
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
        setIsSaving(false)
      }
    }, 400)
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

  const renderASTPreview = (rawText: string) => {
    const lines = rawText.split('\n')

    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-lg font-bold text-[#D8DAE0] mb-2 mt-1 pb-1 border-b border-[#22242b]">{line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-sm font-semibold text-[#4A6B8A] mb-1.5 mt-3">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs font-semibold text-[#8C6D37] mb-1 mt-2">{line.slice(4)}</h3>
      }

      if (line.trim().startsWith('#test')) {
        const testMatch = /#test\s*\[(.*?)\]\s*\|\s*\[(.*?)\]/.exec(line)
        if (testMatch) {
          return (
            <div key={idx} className="my-2 p-2.5 rounded-lg bg-[#141519] border border-[#8C6D37]/40 flex items-start gap-2 text-xs">
              <HelpCircle className="w-3.5 h-3.5 text-[#8C6D37] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#8C6D37]">Active Recall (#test):</div>
                <div className="text-[#D8DAE0] my-0.5">{testMatch[1]}</div>
                <div className="text-[#727683] text-[11px]">Odpowiedź: <span className="font-mono text-[#38664B]">{testMatch[2]}</span></div>
              </div>
            </div>
          )
        }
      }

      const parts = line.split(/(\[\[@[a-zA-Z0-9_\-\|]+\]\]|\[\[[a-zA-Z0-9_\-\s\/\|]+\]\]|#[a-zA-Z0-9_\-]+)/g)

      return (
        <p key={idx} className="min-h-[1.2rem] my-1 text-xs text-[#D8DAE0]/90 leading-relaxed">
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
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded bg-[#1b1c22] text-[#D8DAE0] border border-[#584C6B]/50 text-[11px] cursor-pointer hover:border-[#584C6B]"
                >
                  <User className="w-3 h-3 text-[#584C6B]" />
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
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded bg-[#1b1c22] text-[#D8DAE0] border border-[#4A6B8A]/50 text-[11px] cursor-pointer hover:border-[#4A6B8A]"
                >
                  <FileText className="w-3 h-3 text-[#4A6B8A]" />
                  <span>{label || targetNote}</span>
                </span>
              )
            }

            if (part.startsWith('#') && part.length > 1) {
              return (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-0.5 px-1 py-0.2 mx-0.5 rounded bg-[#1b1c22] text-[#38664B] text-[10px] font-mono border border-[#38664B]/30"
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
      className="h-full flex flex-col bg-[#0B0C0E] select-text"
    >
      {/* Editor Toolbar */}
      <div className="h-8 bg-[#101114] border-b border-[#22242b] flex items-center justify-between px-3 select-none text-xs">
        <div className="flex items-center gap-2 text-[#727683]">
          <FileText className="w-3.5 h-3.5 text-[#4A6B8A]" />
          <span className="font-medium text-[#D8DAE0]">{relativePath}</span>
          {isSaving && <span className="text-[10px] text-[#38664B]">Zapisano</span>}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setPreviewMode('edit')}
            className={`p-1 rounded text-xs ${previewMode === 'edit' ? 'bg-[#1b1c22] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0]'}`}
            title="Tylko edytor"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewMode('split')}
            className={`p-1 rounded text-xs ${previewMode === 'split' ? 'bg-[#1b1c22] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0]'}`}
            title="Widok podzielony"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewMode('preview')}
            className={`p-1 rounded text-xs ${previewMode === 'preview' ? 'bg-[#1b1c22] text-[#D8DAE0]' : 'text-[#727683] hover:text-[#D8DAE0]'}`}
            title="Tylko podgląd"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div className={`h-full ${previewMode === 'split' ? 'w-1/2 border-r border-[#22242b]' : 'w-full'}`}>
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Wpisz treść notatki Markdown... Użyj [[Tytuł Notatki]], [[@entity_id|Etykieta]], #tagi, #test [Pytanie]|[Odpowiedź]..."
              className="w-full h-full p-4 bg-transparent text-[#D8DAE0] font-mono text-xs focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className={`h-full p-6 overflow-y-auto ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            {renderASTPreview(content)}
          </div>
        )}
      </div>

      {hoverEntity && hoverEntity.entity && (
        <div
          style={{ top: `${hoverEntity.y}px`, left: `${hoverEntity.x}px` }}
          className="fixed z-50 w-64 p-3 rounded-lg bg-[#141519] border border-[#282932] shadow-xl text-xs"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <User className="w-3.5 h-3.5 text-[#584C6B]" />
            <span className="font-semibold text-[#D8DAE0]">{hoverEntity.entity.title}</span>
          </div>
          <p className="text-[11px] text-[#727683] leading-relaxed">
            {hoverEntity.entity.description_snippet || 'Obiekt wizualny'}
          </p>
        </div>
      )}
    </div>
  )
}
