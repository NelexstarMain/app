import React, { useState } from 'react'
import {
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
  FileText,
  AlignLeft,
  CheckSquare
} from 'lucide-react'
import { FileItem } from '../../../../shared/types/workspace'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  workspacePath: string
  fileTree: FileItem[]
  activePath: string | null
  onOpenFile: (file: FileItem) => void
  onOpenGraph: () => void
  onOpenTasks: () => void
  onOpenReview: () => void
  onOpenAnalytics: () => void
  onRefreshFiles: () => void
  onNewCanvas: (folderPath?: string) => void
  onNewMarkdown: (folderPath?: string) => void
  onNewPlainText: (folderPath?: string) => void
  onCreateFolder?: (parentPath?: string) => void
  onDeletePath?: (relativePath: string) => void
  onRenamePath?: (oldPath: string, newName: string) => void
}

export const FileSidebar: React.FC<Props> = ({
  workspacePath,
  fileTree,
  activePath,
  onOpenFile,
  onOpenGraph,
  onOpenTasks,
  onOpenReview,
  onOpenAnalytics,
  onRefreshFiles,
  onNewCanvas,
  onNewMarkdown,
  onNewPlainText,
  onCreateFolder,
  onDeletePath,
  onRenamePath
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    canvases: true,
    notes: true,
    'notes/Historia': true
  })
  const [isReindexing, setIsReindexing] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [newMenuOpen, setNewMenuOpen] = useState(false)

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

  const getFileIcon = (fileName: string) => {
    if (fileName.includes('.canvas.')) {
      return <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
    }
    if (fileName.endsWith('.md')) {
      return <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
    }
    return <AlignLeft className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
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
            className="group flex items-center justify-between py-1 px-2 rounded-lg text-xs text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors cursor-pointer"
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
                    onNewCanvas(item.relativePath)
                  }}
                  title="Nowa tablica w folderze"
                  className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#a855f7]"
                >
                  <LayoutGrid className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onNewMarkdown(item.relativePath)
                  }}
                  title="Nowa notatka .md w folderze"
                  className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#38bdf8]"
                >
                  <FileText className="w-3 h-3" />
                </button>
                {onDeletePath && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Czy na pewno usunąć folder ${item.name} wraz z zawartością?`)) {
                        onDeletePath(item.relativePath)
                      }
                    }}
                    title="Usuń folder"
                    className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#fb7185]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {isExpanded && item.children && (
            <div className="space-y-0.5">{item.children.map((child) => renderItem(child, depth + 1))}</div>
          )}
        </div>
      )
    }

    return (
      <div
        key={item.relativePath}
        onMouseEnter={() => setHoveredItem(item.relativePath)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`group flex items-center justify-between py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
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
          {getFileIcon(item.name)}
          <span className="truncate text-[11px]">{item.name.replace(/\.(canvas\.json|json|md|txt)$/, '')}</span>
        </button>

        {hoveredItem === item.relativePath && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRenamePath && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newName = prompt('Nowa nazwa pliku:', item.name)
                  if (newName && newName !== item.name) {
                    onRenamePath(item.relativePath, newName)
                  }
                }}
                title="Zmień nazwę"
                className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5]"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            {onDeletePath && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Czy na pewno usunąć plik ${item.name}?`)) {
                    onDeletePath(item.relativePath)
                  }
                }}
                title="Usuń plik"
                className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#fb7185]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full bg-[#09090b] border-r border-[#27272a] flex flex-col select-none text-xs">
      {/* Workspace Header */}
      <div className="h-10 px-3.5 border-b border-[#27272a] flex items-center justify-between text-[#f4f4f5]">
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[10px] font-bold text-[#38bdf8]">
            C
          </div>
          <span className="font-semibold text-xs truncate" title={workspacePath}>
            {cleanWorkspaceName(workspacePath)}
          </span>
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            title="Nowy plik / folder"
            className="p-1 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          >
            <Plus className="w-4 h-4 text-[#38bdf8]" />
          </button>

          {newMenuOpen && (
            <div className="absolute right-0 top-8 w-44 p-1 rounded-xl bg-[#18181b] border border-[#3f3f46] shadow-2xl z-50 flex flex-col gap-0.5 text-xs">
              <button
                onClick={() => {
                  setNewMenuOpen(false)
                  onNewCanvas()
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#27272a] text-[#f4f4f5] text-left"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>Nowa Tablica (.canvas)</span>
              </button>
              <button
                onClick={() => {
                  setNewMenuOpen(false)
                  onNewMarkdown()
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#27272a] text-[#f4f4f5] text-left"
              >
                <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Notatka (.md)</span>
              </button>
              <button
                onClick={() => {
                  setNewMenuOpen(false)
                  onNewPlainText()
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#27272a] text-[#f4f4f5] text-left"
              >
                <AlignLeft className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Czysty Tekst (.txt)</span>
              </button>
              {onCreateFolder && (
                <button
                  onClick={() => {
                    setNewMenuOpen(false)
                    onCreateFolder()
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#27272a] text-[#f4f4f5] text-left border-t border-[#27272a]"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Nowy Folder</span>
                </button>
              )}
            </div>
          )}

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
          onClick={onOpenTasks}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left font-medium"
        >
          <CheckSquare className="w-4 h-4 text-[#38bdf8]" />
          <span>Zadania & Checklist</span>
        </button>
        <button
          onClick={onOpenGraph}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left font-medium"
        >
          <Share2 className="w-4 h-4 text-[#a855f7]" />
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
            Pliki & Notatki
          </span>
          <span className="text-[10px] text-[#71717a] font-mono">.canvas / .md / .txt</span>
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
        <span className="font-mono text-[#52525b]">FTS5 Index</span>
      </div>
    </div>
  )
}
