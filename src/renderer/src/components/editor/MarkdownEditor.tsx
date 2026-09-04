import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Eye,
  Edit3,
  Columns,
  Tag,
  HelpCircle,
  User,
  ChevronRight,
  Check,
  AtSign,
  List,
  Link2,
  PanelRight
} from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { VisualEntityRecord } from '../../../../shared/types/database'
import { MentionAutocomplete, MentionCandidate } from '../canvas/MentionAutocomplete'

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
  
  // 3-Column Architecture State
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const gutterRef = useRef<HTMLDivElement>(null)

  // Autocomplete state
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const [triggerType, setTriggerType] = useState<'[[' | '@'>('[[')
  const [candidates, setCandidates] = useState<MentionCandidate[]>([])
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setContent(initialContent)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [relativePath, initialContent])

  // Load workspace candidates for autocomplete
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const res = await window.electronAPI.invoke(IpcChannel.DB_GET_GRAPH_DATA, {})
        if (res.nodes) {
          const list: MentionCandidate[] = res.nodes.map((n: any) => ({
            id: n.id,
            title: n.title,
            type: n.type === 'canvas' ? 'canvas' : n.type === 'visual_entity' ? 'asset' : 'note',
            path: n.file_path || n.id
          }))
          setCandidates(list)
        }
      } catch {
        // Ignore
      }
    }
    loadCandidates()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setContent(newText)
    onActivity()

    // Autocomplete detection
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newText.slice(0, cursorPos)
    
    // Check for [[ wikilink trigger
    const wikiMatch = textBeforeCursor.match(/\[\[([^\]]*)$/)
    if (wikiMatch) {
      setTriggerType('[[')
      setAutocompleteQuery(wikiMatch[1])
      setAutocompleteOpen(true)
    } else {
      // Check for @ mention trigger
      const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\u00C0-\u024F]*)$/)
      if (atMatch) {
        setTriggerType('@')
        setAutocompleteQuery(atMatch[1])
        setAutocompleteOpen(true)
      } else {
        setAutocompleteOpen(false)
      }
    }

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

  const handleSelectCandidate = (candidate: MentionCandidate) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart
    const textBefore = content.slice(0, cursorPos)
    const textAfter = content.slice(cursorPos)

    let replacement = ''
    let triggerLength = 0

    if (triggerType === '[[') {
      const match = textBefore.match(/\[\[([^\]]*)$/)
      if (match) {
        triggerLength = match[0].length
        if (candidate.type === 'asset') {
          replacement = `[[@${candidate.id}|${candidate.title}]]`
        } else {
          replacement = `[[${candidate.title}]]`
        }
      }
    } else {
      const match = textBefore.match(/@([a-zA-Z0-9_\-\u00C0-\u024F]*)$/)
      if (match) {
        triggerLength = match[0].length
        replacement = `@${candidate.title} `
      }
    }

    const newContent = textBefore.slice(0, textBefore.length - triggerLength) + replacement + textAfter
    setContent(newContent)
    onContentChanged(newContent)
    setAutocompleteOpen(false)

    // Re-focus and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newPos = textBefore.length - triggerLength + replacement.length
      textarea.setSelectionRange(newPos, newPos)
    }, 10)
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
        const backlinkTag = `[[@${payload.entityId}|${payload.title}]]`
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

  // Live Table of Contents
  const tocItems = React.useMemo(() => {
    const items: Array<{ level: number; text: string; lineIndex: number }> = []
    content.split('\n').forEach((line, idx) => {
      if (line.startsWith('### ')) {
        items.push({ level: 3, text: line.slice(4).trim(), lineIndex: idx })
      } else if (line.startsWith('## ')) {
        items.push({ level: 2, text: line.slice(3).trim(), lineIndex: idx })
      } else if (line.startsWith('# ')) {
        items.push({ level: 1, text: line.slice(2).trim(), lineIndex: idx })
      }
    })
    return items
  }, [content])

  // Document Backlinks and outgoing links
  const documentLinks = React.useMemo(() => {
    const wikiMatches = Array.from(content.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)).map((m) => m[1])
    const atMatches = Array.from(content.matchAll(/@([a-zA-Z0-9_\-\u00C0-\u024F]+)/g)).map((m) => m[1])
    return {
      outgoing: Array.from(new Set([...wikiMatches, ...atMatches])),
      incoming: candidates.filter((c) => c.title !== relativePath && c.path !== relativePath)
    }
  }, [content, relativePath, candidates])

  const handleEditorScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const jumpToLine = (lineIndex: number) => {
    if (!textareaRef.current) return
    const lines = content.split('\n')
    let charPos = 0
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      charPos += lines[i].length + 1
    }
    textareaRef.current.focus()
    textareaRef.current.setSelectionRange(charPos, charPos)
    const lineHeight = 19.5
    textareaRef.current.scrollTop = Math.max(0, lineIndex * lineHeight - 40)
  }

  const renderASTPreview = (rawText: string) => {
    const lines = rawText.split('\n')

    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-bold text-[#f4f4f5] tracking-tight mb-4 mt-2 pb-2 border-b border-[#422066]">
            {line.slice(2)}
          </h1>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-semibold text-[#c084fc] mb-2 mt-5 tracking-tight">
            {line.slice(3)}
          </h2>
        )
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-semibold text-[#a855f7] mb-1.5 mt-3">
            {line.slice(4)}
          </h3>
        )
      }

      if (line.trim().startsWith('#test')) {
        const testMatch = /#test\s*\[(.*?)\]\s*\|\s*\[(.*?)\]/.exec(line)
        if (testMatch) {
          return (
            <div key={idx} className="my-3 p-3.5 rounded-[7px] bg-[#101322] border border-[#422066] flex items-start gap-3 text-xs shadow-md specular-border">
              <HelpCircle className="w-4 h-4 text-[#a855f7] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-[#c084fc] text-[11px] uppercase tracking-wider mb-1">Active Recall (#test)</div>
                <div className="text-[#f4f4f5] font-medium text-xs mb-1.5">{testMatch[1]}</div>
                <div className="text-[#8b87a8] text-[11px] pt-1.5 border-t border-[#422066] flex items-center gap-1.5">
                  <span>Odpowiedź:</span>
                  <span className="font-mono text-[#c084fc] font-semibold bg-[#15182a] px-1.5 py-0.5 rounded-[3px] border border-[#422066]">{testMatch[2]}</span>
                </div>
              </div>
            </div>
          )
        }
      }

      const parts = line.split(/(\[\[@[a-zA-Z0-9_\-\|]+\]\]|\[\[[a-zA-Z0-9_\-\s\/\|]+\]\]|#[a-zA-Z0-9_\-]+|@[a-zA-Z0-9_\-\u00C0-\u024F]+)/g)

      return (
        <p key={idx} className="min-h-[1.4rem] my-1.5 text-xs text-[#d4d4d8] leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith('[[@entity_') || (part.startsWith('[[@') && part.endsWith(']]'))) {
              const clean = part.slice(2, -2)
              const [entId, label] = clean.split('|')
              const cleanId = entId.startsWith('@') ? entId.slice(1) : entId
              return (
                <span
                  key={pIdx}
                  onClick={() => onNavigatePath && onNavigatePath(cleanId)}
                  onMouseEnter={async (e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    try {
                      const res = await window.electronAPI.invoke(IpcChannel.ASSET_GET_ENTITY, { entityId: cleanId })
                      setHoverEntity({ entity: res.entity, x: rect.left, y: rect.bottom + 6 })
                    } catch {
                      // Ignore
                    }
                  }}
                  onMouseLeave={() => setHoverEntity(null)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-[3px] bg-[#15182a] text-[#c084fc] border border-[#422066] text-[11px] font-medium cursor-pointer hover:border-[#a855f7] hover:bg-[#25143a] transition-all"
                  title={`Zasób: ${label || cleanId}`}
                >
                  <User className="w-3 h-3 text-[#c084fc]" />
                  <span>{label || cleanId}</span>
                </span>
              )
            }

            if (part.startsWith('[[') && part.endsWith(']]')) {
              const clean = part.slice(2, -2)
              const [targetNote, label] = clean.split('|')
              return (
                <span
                  key={pIdx}
                  onClick={() => onNavigatePath && onNavigatePath(targetNote)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-[3px] bg-[#25143a] text-[#c084fc] border border-[#422066] text-[11px] font-semibold cursor-pointer hover:border-[#a855f7] hover:bg-[#341b52] transition-all shadow-sm"
                  title={`Przejdź do: ${targetNote}`}
                >
                  <FileText className="w-3 h-3 text-[#c084fc]" />
                  <span>{label || targetNote}</span>
                </span>
              )
            }

            if (part.startsWith('@') && part.length > 1) {
              const cleanMention = part.slice(1)
              return (
                <span
                  key={pIdx}
                  onClick={() => onNavigatePath && onNavigatePath(cleanMention)}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-[3px] bg-[#25143a] text-[#c084fc] border border-[#422066] text-[11px] font-medium cursor-pointer hover:border-[#a855f7] transition-all"
                  title={`Wzmianka: ${cleanMention}`}
                >
                  <AtSign className="w-2.5 h-2.5" />
                  <span>{cleanMention}</span>
                </span>
              )
            }

            if (part.startsWith('#') && part.length > 1) {
              return (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-[3px] bg-[#15182a] text-[#c084fc] text-[10px] font-mono border border-[#422066] font-medium"
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
      className="h-full flex flex-col bg-[#06070d] select-text"
    >
      {/* Top Breadcrumbs & View Switcher Bar (34px) */}
      <div className="h-[34px] bg-[#0a0c16] border-b border-[#422066] flex items-center justify-between px-3 select-none text-xs">
        {/* Clickable Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-[#8b87a8]">
          <FileText className="w-3.5 h-3.5 text-[#c084fc] shrink-0 mr-0.5" />
          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1
            return (
              <React.Fragment key={index}>
                <span
                  onClick={() => onNavigatePath && onNavigatePath(pathParts.slice(0, index + 1).join('/'))}
                  className={`hover:text-[#f4f4f5] transition-colors cursor-pointer ${
                    isLast ? 'text-[#f4f4f5] font-semibold' : 'text-[#8b87a8]'
                  }`}
                >
                  {part}
                </span>
                {!isLast && <ChevronRight className="w-3 h-3 text-[#443e68] shrink-0" />}
              </React.Fragment>
            )
          })}

          {isSaving ? (
            <span className="ml-3 text-[10px] text-[#c084fc] flex items-center gap-1 font-mono">
              <Check className="w-3 h-3" /> Zapisano
            </span>
          ) : null}
        </div>

        {/* Mode Toggles & Inspector Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#15182a] p-0.5 rounded-[5px] border border-[#422066]">
            <button
              onClick={() => setPreviewMode('edit')}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] flex items-center gap-1 transition-colors ${
                previewMode === 'edit'
                  ? 'bg-[#25143a] text-[#c084fc] font-semibold shadow-sm border border-[#422066]'
                  : 'text-[#8b87a8] hover:text-[#f4f4f5]'
              }`}
              title="Tylko edytor"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edytor</span>
            </button>
            <button
              onClick={() => setPreviewMode('split')}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] flex items-center gap-1 transition-colors ${
                previewMode === 'split'
                  ? 'bg-[#25143a] text-[#c084fc] font-semibold shadow-sm border border-[#422066]'
                  : 'text-[#8b87a8] hover:text-[#f4f4f5]'
              }`}
              title="Widok podzielony"
            >
              <Columns className="w-3 h-3" />
              <span>Live Split</span>
            </button>
            <button
              onClick={() => setPreviewMode('preview')}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] flex items-center gap-1 transition-colors ${
                previewMode === 'preview'
                  ? 'bg-[#25143a] text-[#c084fc] font-semibold shadow-sm border border-[#422066]'
                  : 'text-[#8b87a8] hover:text-[#f4f4f5]'
              }`}
              title="Tylko podgląd czytania"
            >
              <Eye className="w-3 h-3" />
              <span>Czytanie</span>
            </button>
          </div>

          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={`px-2 py-0.5 rounded-[5px] text-[11px] flex items-center gap-1 border transition-colors ${
              inspectorOpen
                ? 'bg-[#25143a] border-[#422066] text-[#c084fc]'
                : 'bg-[#15182a] border-[#422066] text-[#8b87a8] hover:text-[#f4f4f5]'
            }`}
            title="Przełącz Inspektor Dokumentu"
          >
            <PanelRight className="w-3 h-3" />
            <span>Inspektor</span>
          </button>
        </div>
      </div>

      {/* Editor Main 3-Column Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Column 1 & 2: Editor (Gutter + Textarea) and/or Split Preview */}
        <div className={`flex-1 flex overflow-hidden ${inspectorOpen ? 'border-r border-[#422066]' : ''}`}>
          {/* Editor Area (Left in Split) */}
          {(previewMode === 'edit' || previewMode === 'split') && (
            <div className={`h-full bg-[#06070d] flex relative overflow-hidden ${previewMode === 'split' ? 'w-1/2 border-r border-[#422066]' : 'w-full'}`}>
              {/* Col 1: Gutter 40px mono line numbers */}
              <div
                ref={gutterRef}
                className="w-10 shrink-0 bg-[#0a0c16] border-r border-[#422066] py-6 md:py-8 select-none text-right pr-2 text-xs font-mono text-[#443e68] overflow-hidden leading-relaxed"
              >
                {Array.from({ length: Math.max(1, content.split('\n').length) }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Col 2 Textarea */}
              <div className="flex-1 h-full relative overflow-hidden">
                <textarea
                  ref={textareaRef}
                  data-editor="true"
                  autoFocus
                  value={content}
                  onChange={handleChange}
                  onScroll={handleEditorScroll}
                  placeholder="Zacznij pisać... Użyj wikilinków [[Notatka]], encji [[@entity_id|Nazwa]], @wzmianek, tagów #tag oraz fiszek #test [Pytanie]|[Odpowiedź]..."
                  className="w-full h-full p-6 md:p-8 bg-transparent text-[#f4f4f5] font-mono text-xs focus:outline-none resize-none leading-relaxed placeholder-[#8b87a8]/50"
                />

                {/* Autocomplete Popover */}
                {autocompleteOpen && (
                  <MentionAutocomplete
                    isOpen={autocompleteOpen}
                    query={autocompleteQuery}
                    triggerChar={triggerType}
                    candidates={candidates}
                    position={{ top: 60, left: 40 }}
                    onSelect={handleSelectCandidate}
                    onClose={() => setAutocompleteOpen(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Live Preview Area (Right in Split) */}
          {(previewMode === 'preview' || previewMode === 'split') && (
            <div className={`h-full bg-[#101322] overflow-y-auto ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
              <div className="max-w-3xl mx-auto w-full p-6 md:p-8">
                {renderASTPreview(content)}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Document Inspector (TOC & Backlinks Drawer) */}
        {inspectorOpen && (
          <div className="w-64 shrink-0 bg-[#0a0c16] h-full flex flex-col text-xs overflow-hidden select-none">
            {/* TOC Section */}
            <div className="p-3 border-b border-[#422066] flex items-center gap-1.5 font-semibold text-[#f4f4f5]">
              <List className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Spis treści (TOC)</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {tocItems.length === 0 ? (
                <div className="text-[11px] text-[#8b87a8] italic p-2">
                  Brak nagłówków. Użyj #, ## lub ### aby dodać sekcję.
                </div>
              ) : (
                tocItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToLine(item.lineIndex)}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 6}px` }}
                    className="w-full text-left py-1 pr-2 rounded-[3px] text-[11px] text-[#8b87a8] hover:text-[#c084fc] hover:bg-[#15182a] truncate transition-colors flex items-center gap-1"
                  >
                    <span className="text-[9px] font-mono text-[#443e68]">H{item.level}</span>
                    <span className="truncate">{item.text}</span>
                  </button>
                ))
              )}
            </div>

            {/* Backlinks Section */}
            <div className="p-3 border-t border-b border-[#422066] flex items-center gap-1.5 font-semibold text-[#f4f4f5]">
              <Link2 className="w-3.5 h-3.5 text-[#c084fc]" />
              <span>Powiązania i linki ({documentLinks.outgoing.length})</span>
            </div>
            <div className="h-44 overflow-y-auto p-2 space-y-1">
              {documentLinks.outgoing.length === 0 ? (
                <div className="text-[11px] text-[#8b87a8] italic p-2">
                  Brak wychodzących linków. Użyj [[Nazwa]] lub @wzmianka!
                </div>
              ) : (
                documentLinks.outgoing.map((link, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigatePath && onNavigatePath(link)}
                    className="p-1.5 rounded-[3px] bg-[#15182a] border border-[#422066] text-[#c084fc] hover:border-[#a855f7] cursor-pointer text-[11px] truncate flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3 h-3 text-[#a855f7] shrink-0" />
                    <span className="truncate">{link}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hover Card for Entities */}
      {hoverEntity && hoverEntity.entity && (
        <div
          style={{ top: `${hoverEntity.y}px`, left: `${hoverEntity.x}px` }}
          className="fixed z-50 w-72 p-3.5 rounded-[7px] bg-[#101322] border border-[#422066] shadow-2xl text-xs backdrop-blur-md specular-border"
        >
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[#422066]">
            <User className="w-4 h-4 text-[#c084fc]" />
            <span className="font-semibold text-[#f4f4f5]">{hoverEntity.entity.title}</span>
          </div>
          <p className="text-[11px] text-[#8b87a8] leading-relaxed">
            {hoverEntity.entity.description_snippet || 'Obiekt bazy wiedzy'}
          </p>
        </div>
      )}
    </div>
  )
}

