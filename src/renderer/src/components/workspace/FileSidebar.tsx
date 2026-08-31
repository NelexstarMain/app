import React, { useState } from 'react'
import {
  FileText,
  LayoutGrid,
  Share2,
  BookOpen,
  BarChart2,
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
        alert(`Cold Reindex ukończony! Zindeksowano ${res.count} dokumentów w ${res.durationMs}ms.`)
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
            className="w-full flex items-center gap-1.5 py-1 px-2 rounded-md text-[11px] text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22] transition-colors text-left"
            style={{ paddingLeft: `${depth * 10 + 6}px` }}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 text-[#4B4E58]" /> : <ChevronRight className="w-3 h-3 text-[#4B4E58]" />}
            <Folder className="w-3.5 h-3.5 text-[#727683]" />
            <span className="truncate">{item.name}</span>
          </button>

          {isExpanded && item.children && (
            <div>{item.children.map((child) => renderItem(child, depth + 1))}</div>
          )}
        </div>
      )
    }

    const isCanvas = item.name.includes('.canvas.')

    return (
      <button
        key={item.relativePath}
        onClick={() => onOpenFile(item)}
        className={`w-full flex items-center gap-2 py-1 px-2 rounded-md text-[11px] transition-colors text-left ${
          isActive
            ? 'bg-[#1b1c22] text-[#D8DAE0] font-medium border-l-2 border-[#4A6B8A]'
            : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#15161a]'
        }`}
        style={{ paddingLeft: `${depth * 10 + 14}px` }}
      >
        {isCanvas ? (
          <LayoutGrid className="w-3.5 h-3.5 text-[#584C6B] shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-[#4A6B8A] shrink-0" />
        )}
        <span className="truncate">{item.name.replace(/\.(md|canvas\.json|json)$/, '')}</span>
      </button>
    )
  }

  return (
    <div className="w-56 h-full bg-[#101114] border-r border-[#22242b] flex flex-col select-none text-xs">
      {/* Workspace Title Header */}
      <div className="h-10 px-3 border-b border-[#22242b] flex items-center justify-between text-[#D8DAE0]">
        <span className="font-semibold text-xs truncate" title={workspacePath}>
          {workspacePath.split(/[\\/]/).pop() || 'Workspace'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewNote}
            title="Nowa notatka (#note)"
            className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefreshFiles}
            title="Odśwież"
            className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Navigation Modes */}
      <div className="p-2 space-y-0.5 border-b border-[#22242b]">
        <button
          onClick={onOpenGraph}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22] transition-colors text-left"
        >
          <Share2 className="w-3.5 h-3.5 text-[#4A6B8A]" />
          <span>Graf Wiedzy</span>
        </button>
        <button
          onClick={onOpenReview}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22] transition-colors text-left"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#8C6D37]" />
          <span>Fiszki SRS (#review)</span>
        </button>
        <button
          onClick={onOpenAnalytics}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22] transition-colors text-left"
        >
          <BarChart2 className="w-3.5 h-3.5 text-[#38664B]" />
          <span>Analityka Skupienia</span>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4B4E58] px-2 py-1">
          Eksplorator
        </div>
        {fileTree.map((item) => renderItem(item))}
      </div>

      {/* Footer Reindex */}
      <div className="h-8 px-3 border-t border-[#22242b] flex items-center justify-between text-[10px] text-[#727683] bg-[#0b0c0e]">
        <button
          onClick={handleColdReindex}
          disabled={isReindexing}
          className="flex items-center gap-1 hover:text-[#D8DAE0]"
        >
          <RefreshCw className={`w-3 h-3 ${isReindexing ? 'animate-spin text-[#38664B]' : ''}`} />
          <span>Cold Reindex</span>
        </button>
        <span className="opacity-50">FTS5</span>
      </div>
    </div>
  )
}
