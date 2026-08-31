import React, { useState, useEffect, useRef } from 'react'
import { FileText, Save, Eye, Edit3, Sparkles, Tag, HelpCircle, User } from 'lucide-react'
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

  // Handle Drag & Drop of Visual Entity onto Editor
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
        const newText = content + `\n\n- Odwołanie do obiektu: ${backlinkTag}\n`
        setContent(newText)
        onContentChanged(newText)
        onActivity()
      }
    } catch (err) {
      console.warn('Drop error:', err)
    }
  }

  // Render AST tokens
  const renderASTPreview = (rawText: string) => {
    const lines = rawText.split('\n')

    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold text-white mb-3 mt-1 pb-2 border-b border-synapse-border/40">{line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-semibold text-emerald-400 mb-2 mt-4">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-semibold text-sky-400 mb-1 mt-3">{line.slice(4)}</h3>
      }

      // #test [Question] | [Answer]
      if (line.trim().startsWith('#test')) {
        const testMatch = /#test\s*\[(.*?)\]\s*\|\s*\[(.*?)\]/.exec(line)
        if (testMatch) {
          return (
            <div key={idx} className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-300">Active Recall (#test):</div>
                <div className="text-white my-0.5">{testMatch[1]}</div>
                <div className="text-synapse-muted text-[11px]">Odpowiedź: <span className="font-mono text-emerald-400">{testMatch[2]}</span></div>
              </div>
            </div>
          )
        }
      }

      // Inline parsing for [[@entity...]], [[Note]], #tags
      const parts = line.split(/(\[\[@[a-zA-Z0-9_\-\|]+\]\]|\[\[[a-zA-Z0-9_\-\s\/\|]+\]\]|#[a-zA-Z0-9_\-]+)/g)

      return (
        <p key={idx} className="min-h-[1.2rem] my-1 text-xs text-synapse-text/90 leading-relaxed">
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-medium cursor-pointer hover:bg-purple-500/30 transition-colors"
                >
                  <User className="w-3 h-3 text-purple-400" />
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-medium cursor-pointer hover:bg-sky-500/30 transition-colors"
                >
                  <FileText className="w-3 h-3 text-sky-400" />
                  <span>{label || targetNote}</span>
                </span>
              )
            }

            if (part.startsWith('#') && part.length > 1) {
              return (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono"
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
      className="h-full flex flex-col bg-synapse-bg relative select-text"
    >
      {/* Editor Toolbar */}
      <div className="h-10 bg-synapse-card/60 border-b border-synapse-border flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-2 text-xs">
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-white">{relativePath}</span>
          {isSaving && <span className="text-[10px] text-emerald-400 animate-pulse">Saving...</span>}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreviewMode('edit')}
            className={`p-1.5 rounded text-xs transition-colors ${previewMode === 'edit' ? 'bg-synapse-surface text-white' : 'text-synapse-muted hover:text-white'}`}
            title="Edit Mode"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewMode('split')}
            className={`p-1.5 rounded text-xs transition-colors ${previewMode === 'split' ? 'bg-synapse-surface text-white' : 'text-synapse-muted hover:text-white'}`}
            title="Split Mode"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewMode('preview')}
            className={`p-1.5 rounded text-xs transition-colors ${previewMode === 'preview' ? 'bg-synapse-surface text-white' : 'text-synapse-muted hover:text-white'}`}
            title="Preview Mode"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Source Textarea */}
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div className={`h-full ${previewMode === 'split' ? 'w-1/2 border-r border-synapse-border/40' : 'w-full'}`}>
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Type your notes in Markdown here... Use [[Note Title]], [[@entity_id|Label]], #tags, or #test [Q]|[A]..."
              className="w-full h-full p-4 bg-transparent text-synapse-text font-mono text-xs focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {/* Live AST Preview */}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className={`h-full p-6 overflow-y-auto ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            {renderASTPreview(content)}
          </div>
        )}
      </div>

      {/* Smart Hover Card for Visual Entities */}
      {hoverEntity && hoverEntity.entity && (
        <div
          style={{ top: `${hoverEntity.y}px`, left: `${hoverEntity.x}px` }}
          className="fixed z-50 w-64 frosted-glass rounded-xl border border-purple-500/40 p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white truncate">{hoverEntity.entity.title}</div>
              <div className="text-[10px] text-purple-400 font-mono">{hoverEntity.entity.entity_id}</div>
            </div>
          </div>
          <p className="text-[11px] text-synapse-muted line-clamp-3 leading-relaxed">
            {hoverEntity.entity.description_snippet || 'Visual Entity linked node'}
          </p>
        </div>
      )}
    </div>
  )
}
