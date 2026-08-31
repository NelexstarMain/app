import React, { useState } from 'react'
import {
  FileText,
  LayoutGrid,
  Share2,
  BookOpen,
  BarChart3,
  RefreshCw,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Compass
} from 'lucide-react'
import { FileItem } from '../../../../shared/types/workspace'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  workspacePath: string
  fileTree: FileItem[]
  activePath: string | null
  onOpenFile: (file: FileItem) => void
  onOpenGraph: () => void
  onOpenReview: () => void
  onOpenAnalytics: () => void
  onRefreshFiles: () => void
  onNewNote: () => void
  onNewCanvas: () => void
}

export const FileSidebar: React.FC<Props> = ({
  workspacePath,
  fileTree,
  activePath,
  onOpenFile,
  onOpenGraph,
  onOpenReview,
  onOpenAnalytics,
  onRefreshFiles,
  onNewNote,
  onNewCanvas
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    notes: true,
    canvases: true,
    'notes/Historia': true
  })
  const [isReindexing, setIsReindexing] = useState(false)

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }))
  }

  const handleColdReindex = async () => {
    setIsReindexing(true)
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_REINDEX_ALL, undefined)
      if (res.success) {
        alert(`Cold Reindex complete! Indexed ${res.count} documents in ${res.durationMs}ms.`)
      }
    } catch (err) {
      console.error('Reindex failed:', err)
    } finally {
      setIsReindexing(false)
      onRefreshFiles()
    }
  }

  const renderItem = (item: FileItem, depth = 0) => {
    const isDir = item.type === 'directory'
    const isExpanded = expandedDirs[item.relativePath] || false
    const isActive = activePath === item.relativePath

    if (isDir) {
      return (
        <div key={item.relativePath}>
          <button
            onClick={() => toggleDir(item.relativePath)}
            className="w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs text-synapse-muted hover:text-white hover:bg-synapse-surface/50 transition-colors text-left"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Folder className="w-3.5 h-3.5 text-sky-400/80" />
            <span className="truncate font-medium">{item.name}</span>
          </button>

          {isExpanded && item.children && (
            <div>{item.children.map((child) => renderItem(child, depth + 1))}</div>
          )}
        </div>
      )
    }

    const isNote = item.extension === '.md'
    const isCanvas = item.name.includes('.canvas.')

    return (
      <button
        key={item.relativePath}
        onClick={() => onOpenFile(item)}
        className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-all text-left ${
          isActive
            ? 'bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30'
            : 'text-synapse-muted hover:text-white hover:bg-synapse-surface/40'
        }`}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
      >
        {isCanvas ? (
          <LayoutGrid className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        ) : isNote ? (
          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-synapse-muted shrink-0" />
        )}
        <span className="truncate">{item.name.replace(/\.(md|canvas\.json|json)$/, '')}</span>
      </button>
    )
  }

  return (
    <div className="w-64 h-full bg-synapse-card/80 border-r border-synapse-border/60 flex flex-col select-none">
      {/* Workspace Header */}
      <div className="p-3 border-b border-synapse-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white truncate" title={workspacePath}>
            {workspacePath.split(/[\\/]/).pop() || 'Workspace'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewNote}
            title="New Note (#note)"
            className="p-1 rounded-md text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefreshFiles}
            title="Refresh Files"
            className="p-1 rounded-md text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Navigation Modes */}
      <div className="p-2 space-y-1 border-b border-synapse-border/40 text-xs">
        <button
          onClick={onOpenGraph}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-synapse-muted hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors text-left"
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
          <span>Knowledge Graph</span>
        </button>
        <button
          onClick={onOpenReview}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-synapse-muted hover:text-amber-300 hover:bg-amber-500/10 transition-colors text-left"
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>SRS Flashcards (#review)</span>
        </button>
        <button
          onClick={onOpenAnalytics}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-synapse-muted hover:text-sky-300 hover:bg-sky-500/10 transition-colors text-left"
        >
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span>Deep Analytics</span>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-synapse-muted/60 px-2 py-1 flex items-center justify-between">
          <span>Files & Canvases</span>
          <span className="text-[9px] font-normal">{fileTree.length} items</span>
        </div>
        {fileTree.map((item) => renderItem(item))}
      </div>

      {/* Footer / Cold Reindex */}
      <div className="p-2 border-t border-synapse-border/40 text-[11px] flex items-center justify-between text-synapse-muted bg-synapse-bg/40">
        <button
          onClick={handleColdReindex}
          disabled={isReindexing}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
          title="Rebuild SQLite FTS5 Index from files"
        >
          <RefreshCw className={`w-3 h-3 ${isReindexing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Cold Reindex</span>
        </button>
        <span className="text-[10px] text-synapse-muted/60">FTS5 Ready</span>
      </div>
    </div>
  )
}
