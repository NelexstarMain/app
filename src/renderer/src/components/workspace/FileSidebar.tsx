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
  CheckSquare,
  Settings
} from 'lucide-react'
import { FileItem } from '../../../../shared/types/workspace'
import { IpcChannel } from '../../../../shared/ipc/channels'
import { FileCreationType } from './CreateFileDialog'

interface Props {
  workspacePath: string
  fileTree: FileItem[]
  activePath: string | null
  onOpenFile: (file: FileItem) => void
  onOpenGraph: () => void
  onOpenTasks: () => void
  onOpenReview: () => void
  onOpenAnalytics: () => void
  onOpenConfig?: () => void
  onRefreshFiles: () => void
  onRequestCreate: (defaultType?: FileCreationType, folder?: string) => void
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
  onOpenConfig,
  onRefreshFiles,
  onRequestCreate,
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
    if (fileName.includes('.canvas.') || fileName.endsWith('.canvas') || fileName.endsWith('.json')) {
      return <LayoutGrid className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
    }
    if (fileName.endsWith('.md')) {
      return <FileText className="w-3.5 h-3.5 text-[#818cf8] shrink-0" />
    }
    return <AlignLeft className="w-3.5 h-3.5 text-[#a5b4fc] shrink-0" />
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
            onClick={() => toggleDir(item.relativePath)}
            className="group flex items-center justify-between py-1 px-2 rounded-lg text-xs text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors cursor-pointer"
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
          >
            <div className="flex items-center gap-2 flex-1 text-left truncate">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
              )}
              <Folder className="w-4 h-4 text-[#a855f7] shrink-0 fill-[#a855f7]/15" />
              <span className="truncate font-medium text-[11px]">{item.name}</span>
            </div>

            {hoveredItem === item.relativePath && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRequestCreate('canvas', item.relativePath)
                  }}
                  title="Nowy plik w folderze"
                  className="p-1 rounded hover:bg-[#28254c] text-[#94a3b8] hover:text-[#c084fc]"
                >
                  <Plus className="w-3 h-3" />
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
                    className="p-1 rounded hover:bg-[#28254c] text-[#94a3b8] hover:text-[#fb7185]"
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
        onClick={() => onOpenFile(item)}
        className={`group flex items-center justify-between py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
          isActive
            ? 'bg-[#16142e] text-[#f8fafc] font-semibold border-l-2 border-[#a855f7] shadow-sm'
            : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
      >
        <div className="flex items-center gap-2 flex-1 text-left truncate">
          {getFileIcon(item.name)}
          <span className="truncate text-[11px]">{item.name.replace(/\.(canvas\.json|json|md|txt)$/, '')}</span>
        </div>

        {hoveredItem === item.relativePath && (
          <div className="flex items-center gap-0.5">
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
                className="p-1 rounded hover:bg-[#28254c] text-[#94a3b8] hover:text-[#f8fafc]"
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
                className="p-1 rounded hover:bg-[#28254c] text-[#94a3b8] hover:text-[#fb7185]"
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
    <div className="h-full w-full bg-[#070913] border-r border-[#28254c] flex flex-col select-none text-xs">
      {/* Header */}
      <div className="h-10 px-3 border-b border-[#28254c] flex items-center justify-between shrink-0 bg-[#070913]">
        <div className="flex items-center gap-2 font-bold text-xs text-[#f8fafc]">
          <Folder className="w-4 h-4 text-[#a855f7]" />
          <span className="truncate max-w-[130px]">{cleanWorkspaceName(workspacePath)}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onRequestCreate('md')}
            title="Nowa notatka (Ctrl+N)"
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRequestCreate('folder')}
            title="Nowy folder"
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleColdReindex}
            title="Odśwież i reindeksuj (Cold Reindex)"
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-[#c084fc]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Navigation Modes */}
      <div className="p-2 space-y-1 border-b border-[#28254c]">
        <button
          onClick={onOpenTasks}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors text-left font-medium"
        >
          <CheckSquare className="w-4 h-4 text-[#c084fc]" />
          <span>Zadania & Checklist</span>
        </button>
        <button
          onClick={onOpenGraph}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors text-left font-medium"
        >
          <Share2 className="w-4 h-4 text-[#818cf8]" />
          <span>Graf Wiedzy</span>
        </button>
        <button
          onClick={onOpenReview}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors text-left font-medium"
        >
          <BookOpen className="w-4 h-4 text-[#a855f7]" />
          <span>Fiszki SRS (#review)</span>
        </button>
        <button
          onClick={onOpenAnalytics}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors text-left font-medium"
        >
          <BarChart2 className="w-4 h-4 text-[#c084fc]" />
          <span>Analityka Skupienia</span>
        </button>
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16142e] transition-colors text-left font-medium"
          >
            <Settings className="w-4 h-4 text-[#a855f7]" />
            <span>Ustawienia aplikacji</span>
          </button>
        )}
      </div>

      {/* File Tree Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
            Pliki & Notatki
          </span>
          <span className="text-[10px] text-[#94a3b8] font-mono">.canvas / .md / .txt</span>
        </div>
        {fileTree.map((item) => renderItem(item))}
      </div>

      {/* Footer Info */}
      <div className="h-8 px-3 border-t border-[#28254c] flex items-center justify-between text-[10px] text-[#94a3b8] bg-[#070913]">
        <button
          onClick={handleColdReindex}
          disabled={isReindexing}
          className="flex items-center gap-1.5 hover:text-[#f8fafc]"
        >
          <RefreshCw className={`w-3 h-3 ${isReindexing ? 'animate-spin text-[#c084fc]' : ''}`} />
          <span>{isReindexing ? 'Indeksowanie...' : 'Cold Reindex'}</span>
        </button>
        <span className="font-mono text-[#64748b]">FTS5 Index</span>
      </div>
    </div>
  )
}
