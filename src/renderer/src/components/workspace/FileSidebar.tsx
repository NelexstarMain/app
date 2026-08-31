import React, { useState } from 'react'
import {
  FileText,
  LayoutGrid,
  Share2,
  BookOpen,
  BarChart2,
  RefreshCw,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  MoreVertical
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
  onNewNote: (folderPath?: string) => void
  onNewCanvas: (folderPath?: string) => void
  onDeleteFile?: (relativePath: string) => void
  onRenameFile?: (oldPath: string, newName: string) => void
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
  onNewCanvas,
  onDeleteFile,
  onRenameFile
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    notes: true,
    canvases: true,
    'notes/Historia': true
  })
  const [isReindexing, setIsReindexing] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }))
  }

  const handleColdReindex = async () => {
    setIsReindexing(true)
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_REINDEX_ALL, undefined)
      await onRefreshFiles()
      alert(`Cold Reindex ukończony! Zindeksowano ${res.count || 0} dokumentów.`)
    } catch (err) {
      console.error('Reindex failed:', err)
    } finally {
      setIsReindexing(false)
    }
  }

  const cleanWorkspaceName = (p: string) => {
    const raw = p.split(/[\\/]/).pop() || 'Workspace'
    if (raw === 'hgf' || raw === 'App' || raw === 'app') return 'Baza Wiedzy'
    return raw
  }

  const renderItem = (item: FileItem, depth = 0) => {
    const isDir = item.type === 'directory'
    const isExpanded = expandedDirs[item.relativePath] || false
    const isActive = activePath === item.relativePath

    if (isDir) {
      return (
        <div key={item.relativePath}>
          <div
            onMouseEnter={() => setHoveredItem(item.relativePath)}
            onMouseLeave={() => setHoveredItem(null)}
            className="group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors cursor-pointer"
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
          >
            <button
              onClick={() => toggleDir(item.relativePath)}
              className="flex items-center gap-2 flex-1 text-left truncate"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
              )}
              <Folder className="w-4 h-4 text-[#f59e0b] shrink-0" />
              <span className="truncate font-medium text-[11px]">{item.name}</span>
            </button>

            {hoveredItem === item.relativePath && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onNewNote(item.relativePath)
                  }}
                  title="Nowa notatka w tym folderze"
                  className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5]"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {isExpanded && item.children && (
            <div className="space-y-0.5">{item.children.map((child) => renderItem(child, depth + 1))}</div>
          )}
        </div>
      )
    }

    const isCanvas = item.name.includes('.canvas.')

    return (
      <div
        key={item.relativePath}
        onMouseEnter={() => setHoveredItem(item.relativePath)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
          isActive
            ? 'bg-[#18181b] text-[#f4f4f5] font-semibold border-l-2 border-[#38bdf8]'
            : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#111114]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
      >
        <button
          onClick={() => onOpenFile(item)}
          className="flex items-center gap-2 flex-1 text-left truncate"
        >
          {isCanvas ? (
            <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
          )}
          <span className="truncate text-[11px]">{item.name.replace(/\.(md|canvas\.json|json)$/, '')}</span>
        </button>

        {hoveredItem === item.relativePath && onDeleteFile && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Czy na pewno usunąć plik ${item.name}?`)) {
                onDeleteFile(item.relativePath)
              }
            }}
            title="Usuń plik"
            className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#fb7185] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-60 h-full bg-[#09090b] border-r border-[#27272a] flex flex-col select-none text-xs">
      {/* Workspace Header */}
      <div className="h-10 px-3.5 border-b border-[#27272a] flex items-center justify-between text-[#f4f4f5]">
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[10px] font-bold text-[#38bdf8]">
            K
          </div>
          <span className="font-semibold text-xs truncate" title={workspacePath}>
            {cleanWorkspaceName(workspacePath)}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onNewNote()}
            title="Nowa notatka (.md)"
            className="p-1 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
          </button>
          <button
            onClick={() => onNewCanvas()}
            title="Nowa tablica (.canvas.json)"
            className="p-1 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7]" />
          </button>
          <button
            onClick={handleColdReindex}
            title="Odśwież i reindeksuj (Cold Reindex)"
            className="p-1 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-[#10b981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Navigation Modes */}
      <div className="p-2 space-y-1 border-b border-[#27272a]">
        <button
          onClick={onOpenGraph}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left font-medium"
        >
          <Share2 className="w-4 h-4 text-[#38bdf8]" />
          <span>Graf Wiedzy</span>
        </button>
        <button
          onClick={onOpenReview}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left font-medium"
        >
          <BookOpen className="w-4 h-4 text-[#f59e0b]" />
          <span>Fiszki SRS (#review)</span>
        </button>
        <button
          onClick={onOpenAnalytics}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left font-medium"
        >
          <BarChart2 className="w-4 h-4 text-[#10b981]" />
          <span>Analityka Skupienia</span>
        </button>
      </div>

      {/* File Tree Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#52525b]">
            Eksplorator Plików
          </span>
          <button
            onClick={() => onNewNote()}
            className="text-[10px] text-[#38bdf8] hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>Dodaj</span>
          </button>
        </div>
        {fileTree.map((item) => renderItem(item))}
      </div>

      {/* Footer Info */}
      <div className="h-8 px-3 border-t border-[#27272a] flex items-center justify-between text-[10px] text-[#71717a] bg-[#09090b]">
        <button
          onClick={handleColdReindex}
          disabled={isReindexing}
          className="flex items-center gap-1.5 hover:text-[#f4f4f5]"
        >
          <RefreshCw className={`w-3 h-3 ${isReindexing ? 'animate-spin text-[#10b981]' : ''}`} />
          <span>{isReindexing ? 'Indeksowanie...' : 'Cold Reindex'}</span>
        </button>
        <span className="font-mono text-[#52525b]">SQLite FTS5</span>
      </div>
    </div>
  )
}
