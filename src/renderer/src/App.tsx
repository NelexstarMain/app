import React, { useState, useEffect, useRef } from 'react'
import { IpcChannel } from '../../shared/ipc/channels'
import { FileItem } from '../../shared/types/workspace'
import { CanvasDocument } from '../../shared/types/canvas'
import { TaskTodoRecord } from '../../shared/types/database'
import { SessionManager } from './state/sessionStore'
import { parseCliCommand, ParsedCommand } from '../../shared/types/commands'
import {
  LayoutGrid,
  Share2,
  CheckSquare,
  BookOpen,
  BarChart2,
  X,
  Plus,
  FileText,
  AlignLeft,
  FolderTree,
  Play,
  Pause,
  Square,
  Command,
  Layers,
  Settings
} from 'lucide-react'

// Theme & Components
import { applyTheme } from './theme/themeManager'
import { WorkspaceSelector } from './components/workspace/WorkspaceSelector'
import { FileSidebar } from './components/workspace/FileSidebar'
import { CreateFileDialog, FileCreationType } from './components/workspace/CreateFileDialog'
import { SessionKickoffModal } from './components/session/SessionKickoffModal'
import { SessionEvaluationModal } from './components/session/SessionEvaluationModal'
import { SessionStatsHud } from './components/session/SessionStatsHud'
import { CanvasViewport } from './components/canvas/CanvasViewport'
import { MarkdownEditor } from './components/editor/MarkdownEditor'
import { KnowledgeGraphViewport } from './components/graph/KnowledgeGraphViewport'
import { TaskManagementView } from './components/tasks/TaskManagementView'
import { CommandPalette } from './components/terminal/CommandPalette'
import { AssetDrawer } from './components/drawer/AssetDrawer'
import { SrsReviewRunner } from './components/review/SrsReviewRunner'
import { AnalyticsModal } from './components/analytics/AnalyticsModal'
import { SettingsModal } from './components/config/ConfigEditorModal'
import { BottomStatusBar } from './components/terminal/BottomStatusBar'

interface OpenTab {
  id: string
  path: string
  title: string
  type: 'canvas' | 'md' | 'txt' | 'graph' | 'tasks'
}

export const App: React.FC = () => {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileItem[]>([])
  const [tasks, setTasks] = useState<TaskTodoRecord[]>([])

  // Layout & Resizable Splitter
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Active view mode
  const [activeType, setActiveType] = useState<'canvas' | 'md' | 'txt' | 'graph' | 'tasks'>('canvas')

  // Tabs state
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'tab_canvas_1', path: 'canvases/Rozbiory_Polski.canvas.json', title: 'Rozbiory Polski', type: 'canvas' },
    { id: 'tab_note_1', path: 'notes/Historia/Poniatowski.md', title: 'Poniatowski', type: 'md' }
  ])
  const [activeTabId, setActiveTabId] = useState<string>('tab_canvas_1')
  const [activePath, setActivePath] = useState<string | null>('canvases/Rozbiory_Polski.canvas.json')
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument | null>(null)
  const [textContent, setTextContent] = useState<string>('')

  // Create Item In-App Modal Dialog
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalDefaultType, setCreateModalDefaultType] = useState<FileCreationType>('canvas')
  const [createModalDefaultFolder, setCreateModalDefaultFolder] = useState('canvases')

  // Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [statsHudOpen, setStatsHudOpen] = useState(false)
  const [reviewRunnerOpen, setReviewRunnerOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [kickoffOpen, setKickoffOpen] = useState(false)
  const [evaluationOpen, setEvaluationOpen] = useState(false)
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('')

  // Session Manager
  const sessionManagerRef = useRef<SessionManager>(new SessionManager())
  const [sessionCtx, setSessionCtx] = useState(sessionManagerRef.current.getContext())

  const syncSessionState = () => {
    setSessionCtx(sessionManagerRef.current.getContext())
  }

  // 1. Initial Load
  useEffect(() => {
    applyTheme()
    const checkInit = async () => {
      try {
        const current = await window.electronAPI.invoke(IpcChannel.WORKSPACE_GET_CURRENT, undefined)
        if (current.path) {
          handleWorkspaceLoaded(current.path)
        }
      } catch (err) {
        console.warn('Init check failed:', err)
      }
    }
    checkInit()
  }, [])

  // 2. Global Shortcuts & Activity Tracker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = window.document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarOpen((prev) => !prev)
      }
      sessionManagerRef.current.registerActivity()
      syncSessionState()
    }

    const handlePointer = () => sessionManagerRef.current.registerActivity()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointer)
    window.addEventListener('wheel', handlePointer)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('wheel', handlePointer)
    }
  }, [])

  // 3. Heartbeat Loop
  useEffect(() => {
    const interval = setInterval(() => {
      sessionManagerRef.current.onHeartbeatTick()
      syncSessionState()
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleWorkspaceLoaded = async (wsPath: string) => {
    setWorkspacePath(wsPath)
    await refreshFiles()
    await loadTasks()

    // Default open canvas
    const sampleCanvasPath = 'canvases/Rozbiory_Polski.canvas.json'
    try {
      const res = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: sampleCanvasPath })
      if (res.content) {
        const parsed = JSON.parse(res.content)
        setCanvasDoc(parsed)
        setActivePath(sampleCanvasPath)
        setActiveType('canvas')
      }
    } catch {
      // Ignore
    }
  }

  const refreshFiles = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.FILE_LIST, {})
      if (res.items) setFileTree(res.items)
    } catch (err) {
      console.error('Failed to list files:', err)
    }
  }

  const loadTasks = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_GET_TASKS, {})
      if (res.tasks) setTasks(res.tasks)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }

  // Open file with format detection (.canvas, .md, .txt)
  const handleOpenFile = async (file: FileItem) => {
    let fileType: 'canvas' | 'md' | 'txt' = 'txt'
    if (file.name.includes('.canvas.') || file.name.endsWith('.canvas.json')) {
      fileType = 'canvas'
    } else if (file.name.endsWith('.md')) {
      fileType = 'md'
    } else {
      fileType = 'txt'
    }

    const tabId = `tab_${file.relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`

    const existing = openTabs.find((t) => t.path === file.relativePath)
    if (!existing) {
      const newTab: OpenTab = {
        id: tabId,
        path: file.relativePath,
        title: file.name.replace(/\.(canvas\.json|json|md|txt)$/, ''),
        type: fileType
      }
      setOpenTabs((prev) => [...prev, newTab])
    }

    setActiveTabId(existing ? existing.id : tabId)
    setActivePath(file.relativePath)
    setActiveType(fileType)

    try {
      const res = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: file.relativePath })
      if (fileType === 'canvas' && res.content) {
        setCanvasDoc(JSON.parse(res.content))
      } else {
        setTextContent(res.content || '')
      }
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }

  // Tab switching on the top bar
  const handleSelectTab = async (tab: OpenTab) => {
    setActiveTabId(tab.id)
    setActivePath(tab.path)
    setActiveType(tab.type)

    if (tab.type === 'canvas' || tab.type === 'md' || tab.type === 'txt') {
      try {
        const res = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: tab.path })
        if (tab.type === 'canvas' && res.content) {
          setCanvasDoc(JSON.parse(res.content))
        } else {
          setTextContent(res.content || '')
        }
      } catch (err) {
        console.error('Failed to read file for tab:', err)
      }
    }
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const targetTab = openTabs.find((t) => t.id === tabId)
    if (!targetTab) return

    const remaining = openTabs.filter((t) => t.id !== tabId)
    setOpenTabs(remaining)

    if (activeTabId === tabId) {
      if (remaining.length > 0) {
        const currentIndex = openTabs.findIndex((t) => t.id === tabId)
        const nextIndex = Math.max(0, Math.min(currentIndex, remaining.length - 1))
        handleSelectTab(remaining[nextIndex])
      } else {
        setActiveTabId('')
        setActivePath(null)
        setCanvasDoc(null)
        setTextContent('')
      }
    }

    requestAnimationFrame(() => {
      const editor = window.document.querySelector('textarea[data-editor="true"]') as HTMLElement | null
      if (editor) {
        editor.focus()
      } else {
        const canvasGrid = window.document.querySelector('.canvas-grid') as HTMLElement | null
        if (canvasGrid) {
          canvasGrid.focus()
        }
      }
    })
  }

  const safeCloseOrDeletePath = (targetPath: string) => {
    const normalizedTarget = targetPath.replace(/\\/g, '/')
    const targetFolderPrefix = normalizedTarget.endsWith('/') ? normalizedTarget : normalizedTarget + '/'

    const remaining = openTabs.filter(
      (t) => t.path !== normalizedTarget && !t.path.startsWith(targetFolderPrefix)
    )

    const isCurrentActiveClosed =
      activePath === normalizedTarget ||
      (activePath ? activePath.startsWith(targetFolderPrefix) : false)

    setOpenTabs(remaining)

    if (isCurrentActiveClosed) {
      if (remaining.length > 0) {
        const prevIndex = openTabs.findIndex((t) => t.id === activeTabId)
        const nextIndex = Math.max(0, Math.min(prevIndex, remaining.length - 1))
        handleSelectTab(remaining[nextIndex])
      } else {
        setActiveTabId('')
        setActivePath(null)
        setCanvasDoc(null)
        setTextContent('')
      }
    }

    requestAnimationFrame(() => {
      const editor = window.document.querySelector('textarea[data-editor="true"]') as HTMLElement | null
      if (editor) {
        editor.focus()
      } else {
        const canvasGrid = window.document.querySelector('.canvas-grid') as HTMLElement | null
        if (canvasGrid) {
          canvasGrid.focus()
        }
      }
    })
  }

  // Sidebar Resize Handler
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingSidebar(true)

    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(180, Math.min(420, startWidth + deltaX))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      setIsResizingSidebar(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Reliable In-App File & Folder Creation
  const handleRequestCreate = (defaultType: FileCreationType = 'canvas', folder?: string) => {
    const targetFolder = folder || (defaultType === 'canvas' ? 'canvases' : 'notes')
    setCreateModalDefaultType(defaultType)
    setCreateModalDefaultFolder(targetFolder)
    setCreateModalOpen(true)
  }

  const handleCreateFileOrFolder = async (name: string, type: FileCreationType, folder: string) => {
    // Keep Polish diacritics and all valid Unicode filename characters, strip only OS-forbidden characters
    const cleanName = name.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || `Nowy_${Date.now()}`
    const targetFolder = folder?.trim() || (type === 'canvas' ? 'canvases' : 'notes')

    if (type === 'folder') {
      const relativePath = `${targetFolder}/${cleanName}`
      await window.electronAPI.invoke(IpcChannel.FILE_CREATE_FOLDER, { relativePath })
      await refreshFiles()
      return
    }

    let filename = cleanName
    let initialContent = ''
    if (type === 'canvas') {
      filename = cleanName.endsWith('.canvas.json') ? cleanName : `${cleanName}.canvas.json`
      const newCanvas: CanvasDocument = {
        version: '1.4',
        canvas_id: `${targetFolder}/${filename}`,
        title: name.trim(),
        viewport: { x: 0, y: 0, zoom: 1.0 },
        nodes: [],
        edges: []
      }
      initialContent = JSON.stringify(newCanvas, null, 2)
    } else if (type === 'md') {
      filename = cleanName.endsWith('.md') ? cleanName : `${cleanName}.md`
      initialContent = `# ${name.trim()}\n\nZacznij pisać treść notatki...`
    } else {
      filename = cleanName.endsWith('.txt') ? cleanName : `${cleanName}.txt`
      initialContent = `${name.trim()}\n\nWpisz treść...`
    }

    const relativePath = `${targetFolder}/${filename}`
    await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
      relativePath,
      content: initialContent,
      createBackup: true
    })
    await refreshFiles()
    await handleOpenFile({ name: filename, relativePath, type: 'file', updatedAt: Date.now() })
  }

  const handleRenamePath = async (oldPath: string, newName: string) => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.FILE_RENAME, { oldPath, newName })
      if (res.success && res.newPath) {
        const confirmedNewPath = res.newPath
        setOpenTabs((prev) =>
          prev.map((t) => {
            if (t.path === oldPath) {
              return {
                ...t,
                path: confirmedNewPath,
                title: newName.replace(/\.(canvas\.json|json|md|txt)$/, '')
              }
            }
            return t
          })
        )
        if (activePath === oldPath) {
          setActivePath(confirmedNewPath)
        }
        await refreshFiles()
      }
    } catch (err) {
      console.error('Rename failed:', err)
    }
  }

  const handleDeletePath = async (relativePath: string) => {
    try {
      await window.electronAPI.invoke(IpcChannel.FILE_DELETE, { relativePath })
      safeCloseOrDeletePath(relativePath)
      await refreshFiles()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // Session Handlers
  const handleStartSession = (plannedMins: number, selectedTaskIds: string[]) => {
    sessionManagerRef.current.startSession(plannedMins, selectedTaskIds)
    syncSessionState()
    setKickoffOpen(false)
  }

  const handleCommitSession = async (evalScore: number) => {
    const finalContext = sessionManagerRef.current.commitSession()
    syncSessionState()
    setEvaluationOpen(false)

    try {
      await window.electronAPI.invoke(IpcChannel.DB_SAVE_SESSION_HISTORY, {
        session: {
          started_at: finalContext.startedAt || Date.now() - finalContext.effectiveFocusSeconds * 1000,
          ended_at: Date.now(),
          planned_duration_minutes: finalContext.plannedMinutes,
          effective_focus_seconds: finalContext.effectiveFocusSeconds,
          idle_seconds: finalContext.idleSeconds,
          pauses_count: finalContext.pausesCount,
          tasks_completed_count: finalContext.completedTaskIds.length,
          nodes_created_count: finalContext.createdNodeIds.length,
          edges_created_count: finalContext.createdEdgeIds.length,
          notes_written_count: 1,
          user_self_eval_score: evalScore,
          streak_day_count: 1
        },
        topicFeedback: {
          topicId: 'Baza Wiedzy',
          score: evalScore,
          lapses: 0
        }
      })
      await window.electronAPI.invoke(IpcChannel.RECOVERY_CLEAR_SNAPSHOT, undefined)
      await loadTasks()
    } catch (err) {
      console.error('Failed to save session history:', err)
    }
  }

  const handleToggleTaskComplete = async (taskId: string) => {
    const current = tasks.find((t) => t.task_id === taskId)
    const newStatus = current?.status === 'COMPLETED' ? 'BACKLOG' : 'COMPLETED'
    sessionManagerRef.current.registerTaskCompleted(taskId)
    syncSessionState()
    try {
      await window.electronAPI.invoke(IpcChannel.DB_UPDATE_TASK, {
        taskId,
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? Date.now() : null
      })
      await loadTasks()
    } catch (err) {
      console.error('Task update failed:', err)
    }
  }

  // CLI Command Palette Execution
  const handleExecuteCommand = async (cmd: ParsedCommand) => {
    const commandName = cmd.command.toLowerCase()

    if (commandName === 'links' || commandName === 'asset') {
      setDrawerSearchQuery(cmd.primaryArgument || '')
      setDrawerOpen(true)
    } else if (commandName === 'review') {
      setReviewRunnerOpen(true)
    } else if (commandName === 'stats') {
      setStatsHudOpen((p) => !p)
    } else if (commandName === 'graph') {
      setActiveType('graph')
    } else if (commandName === 'tasks' || commandName === 'todo_view') {
      setActiveType('tasks')
    } else if (commandName === 'session') {
      const sub = cmd.primaryArgument?.toLowerCase()
      if (sub === 'pause') sessionManagerRef.current.pauseManual()
      if (sub === 'resume') sessionManagerRef.current.resumeManual()
      if (sub === 'finish') {
        sessionManagerRef.current.promptFinish()
        setEvaluationOpen(true)
      }
      syncSessionState()
    } else if (commandName === 'canvas') {
      handleRequestCreate('canvas', 'canvases')
    } else if (commandName === 'todo') {
      const title = cmd.primaryArgument || 'Nowe zadanie'
      const prio = (cmd.flags.priority?.toUpperCase() as 'P1' | 'P2' | 'P3') || 'P2'
      await window.electronAPI.invoke(IpcChannel.DB_CREATE_TASK, {
        title,
        priority: prio === 'P1' || prio === 'P2' || prio === 'P3' ? prio : 'P2',
        timeEstimateMin: cmd.flags.timeEstimateMin || 25,
        topicId: cmd.flags.targetCanvas
      })
      await loadTasks()
    }
  }

  const isIdle =
    sessionCtx.state === 'IDLE' ||
    sessionCtx.state === 'COMMITTED' ||
    sessionCtx.state === 'TERMINATED_ABORT'
  const isActive = sessionCtx.state === 'ACTIVE_FOCUS'

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  if (!workspacePath) {
    return <WorkspaceSelector onWorkspaceSelected={handleWorkspaceLoaded} />
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#06070d] text-[#f4f4f5] overflow-hidden select-none font-sans">
      {/* 34px Industrial Titlebar (Window Shell with Integrated Tabs & Session) */}
      <header
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="h-[34px] bg-[#0a0c16] border-b border-[#422066] flex items-center justify-between px-2.5 z-30 select-none text-xs shrink-0 font-mono"
      >
        {/* Left: Branding & Session Status Chip */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="font-semibold text-[#f4f4f5] flex items-center gap-1.5 pr-1">
            <div className="w-4 h-4 rounded-[4px] bg-[#25143a] border border-[#422066] flex items-center justify-center text-[10px] font-black text-[#c084fc] shadow-sm">
              C
            </div>
            <span className="text-[11px] font-bold tracking-tight text-[#f4f4f5]">CogniCanvas</span>
          </div>

          <div className="h-3.5 w-px bg-[#422066]" />

          {/* Session Chip */}
          {isIdle ? (
            <button
              onClick={() => setKickoffOpen(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#101322] hover:bg-[#15182a] text-[#8b87a8] hover:text-[#c084fc] text-[10px] border border-[#422066] transition-all group"
              title="Rozpocznij nową sesję skupienia"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span>Sesja Skupienia</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#101322] border border-[#422066] text-[10px] text-[#f4f4f5]">
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#10b981] animate-pulse' : 'bg-[#eab308]'}`} />
                <span className="font-bold text-[#c084fc]">{formatSessionTime(sessionCtx.effectiveFocusSeconds)}</span>
                <span className="text-[9px] text-[#8b87a8]">/ {sessionCtx.plannedMinutes}m</span>
              </div>

              {isActive ? (
                <button
                  onClick={() => {
                    sessionManagerRef.current.pauseManual()
                    syncSessionState()
                  }}
                  className="p-1 rounded-[3px] hover:bg-[#15182a] text-[#8b87a8] hover:text-[#f4f4f5] transition-colors"
                  title="Pauza"
                >
                  <Pause className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    sessionManagerRef.current.resumeManual()
                    syncSessionState()
                  }}
                  className="p-1 rounded-[3px] hover:bg-[#15182a] text-[#10b981] transition-colors"
                  title="Wznów"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>
              )}

              <button
                onClick={() => {
                  sessionManagerRef.current.promptFinish()
                  syncSessionState()
                  setEvaluationOpen(true)
                }}
                className="p-1 rounded-[3px] hover:bg-[#15182a] text-[#8b87a8] hover:text-[#fb7185] transition-colors"
                title="Zakończ sesję"
              >
                <Square className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Center: Open Tabs */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex-1 flex items-center gap-1 mx-2 overflow-x-auto no-scrollbar"
        >
          {openTabs.map((tab) => {
            const isActive = activeTabId === tab.id
            return (
              <div
                key={tab.id}
                onClick={() => handleSelectTab(tab)}
                className={`h-[24px] px-2.5 rounded-[5px] flex items-center gap-1.5 cursor-pointer text-[10px] transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#25143a] text-[#f8fafc] font-semibold border border-[#a855f7]/40 shadow-sm'
                    : 'bg-[#101322] text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#15182a] border border-[#422066]'
                }`}
              >
                {tab.type === 'canvas' ? (
                  <LayoutGrid className="w-3 h-3 text-[#c084fc]" />
                ) : tab.type === 'md' ? (
                  <FileText className="w-3 h-3 text-[#a855f7]" />
                ) : (
                  <AlignLeft className="w-3 h-3 text-[#8b87a8]" />
                )}
                <span className="truncate max-w-[120px]">{tab.title}</span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="p-0.5 rounded-[3px] hover:bg-[#422066] text-[#8b87a8] hover:text-[#f8fafc] ml-0.5"
                  title="Zamknij kartę"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )
          })}

          {activeType === 'tasks' && (
            <div className="h-[24px] px-2.5 rounded-[5px] flex items-center gap-1.5 text-[10px] bg-[#25143a] text-[#c084fc] font-semibold border border-[#a855f7]/40 shrink-0">
              <CheckSquare className="w-3 h-3" />
              <span>Zadania & Checklist</span>
            </div>
          )}

          {activeType === 'graph' && (
            <div className="h-[24px] px-2.5 rounded-[5px] flex items-center gap-1.5 text-[10px] bg-[#25143a] text-[#c084fc] font-semibold border border-[#a855f7]/40 shrink-0">
              <Share2 className="w-3 h-3" />
              <span>Graf Wiedzy</span>
            </div>
          )}

          <button
            onClick={() => handleRequestCreate('canvas')}
            className="w-5 h-5 rounded-[4px] bg-[#101322] hover:bg-[#15182a] border border-[#422066] text-[#8b87a8] hover:text-[#c084fc] flex items-center justify-center transition-colors shrink-0 ml-0.5"
            title="Utwórz nowy plik..."
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Actions & Tools */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1.5 shrink-0"
        >
          <button
            onClick={() => setStatsHudOpen((p) => !p)}
            className={`p-1 rounded-[4px] border transition-colors ${
              statsHudOpen
                ? 'bg-[#25143a] text-[#c084fc] border-[#a855f7]/40'
                : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322] border-transparent'
            }`}
            title="Statystyki sesji (HUD)"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDrawerOpen((p) => !p)}
            className={`p-1 rounded-[4px] border transition-colors ${
              drawerOpen
                ? 'bg-[#25143a] text-[#c084fc] border-[#a855f7]/40'
                : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322] border-transparent'
            }`}
            title="Panel zasobów & Backlinki"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#101322] border border-[#422066] text-[9px] text-[#8b87a8] hover:text-[#c084fc] hover:border-[#a855f7]/40 transition-colors"
            title="Paleta poleceń (Ctrl+K)"
          >
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </button>

          <button
            onClick={() => setConfigModalOpen(true)}
            className="p-1 rounded-[4px] text-[#8b87a8] hover:text-[#c084fc] hover:bg-[#101322] transition-colors"
            title="Ustawienia & Kolory (config.json)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main App Workspace Shell */}
      <div className="flex-1 flex overflow-hidden relative bg-[#06070d]">
        {/* Extreme Left Activity Bar */}
        <aside className="w-12 bg-[#06070d] border-r border-[#422066] flex flex-col items-center py-2.5 gap-2 shrink-0 z-10 select-none">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Drzewo plików (Ctrl+B)"
            className={`p-2 rounded-[5px] transition-all ${
              sidebarOpen
                ? 'bg-[#25143a] text-[#c084fc] shadow-sm border border-[#422066]'
                : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
            }`}
          >
            <FolderTree className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-[#422066] my-0.5" />

          <button
            onClick={() => {
              if (activeType !== 'canvas') {
                const firstCanvas = fileTree.find((f) => f.name.endsWith('.canvas') || f.name.endsWith('.json'))
                if (firstCanvas) handleOpenFile(firstCanvas)
              }
              setSidebarOpen(true)
            }}
            title="Tablice Canvas (Siatka)"
            className={`p-2 rounded-[5px] transition-all ${
              activeType === 'canvas'
                ? 'bg-[#25143a] text-[#c084fc] shadow-sm border border-[#422066]'
                : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveType('graph')}
            title="Graf Wiedzy (Graph View)"
            className={`p-2 rounded-[5px] transition-all ${
              activeType === 'graph'
                ? 'bg-[#25143a] text-[#c084fc] shadow-sm border border-[#422066]'
                : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveType('tasks')}
            title="Zadania & Checklist (To-Do)"
            className={`p-2 rounded-[5px] transition-all ${
              activeType === 'tasks'
                ? 'bg-[#25143a] text-[#c084fc] shadow-sm border border-[#422066]'
                : 'text-[#8b87a8] hover:text-[#f8fafc] hover:bg-[#101322]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-[#422066] my-0.5" />

          <button
            onClick={() => setReviewRunnerOpen(true)}
            title="Powtórki SRS (#review)"
            className="p-2 rounded-[5px] text-[#8b87a8] hover:text-[#c084fc] hover:bg-[#101322] transition-all"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAnalyticsModalOpen(true)}
            title="Analityka Skupienia (#stats)"
            className="p-2 rounded-[5px] text-[#8b87a8] hover:text-[#c084fc] hover:bg-[#101322] transition-all"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </aside>

        {/* File Sidebar (collapsible & resizable) */}
        {sidebarOpen && (
          <div style={{ width: `${sidebarWidth}px` }} className="h-full relative shrink-0 border-r border-[#422066]">
            <FileSidebar
              workspacePath={workspacePath}
              fileTree={fileTree}
              activePath={activePath}
              onOpenFile={handleOpenFile}
              onOpenGraph={() => setActiveType('graph')}
              onOpenTasks={() => setActiveType('tasks')}
              onOpenReview={() => setReviewRunnerOpen(true)}
              onOpenAnalytics={() => setAnalyticsModalOpen(true)}
              onOpenConfig={() => setConfigModalOpen(true)}
              onRefreshFiles={refreshFiles}
              onRequestCreate={handleRequestCreate}
              onDeletePath={handleDeletePath}
              onRenamePath={handleRenamePath}
            />

            {/* Sidebar Resizer Splitter */}
            <div
              onMouseDown={handleSidebarMouseDown}
              className="w-1.5 h-full bg-transparent hover:bg-[#a855f7]/50 cursor-ew-resize absolute top-0 right-0 z-30 transition-colors"
              title="Przeciągnij, aby zmienić szerokość"
            />
          </div>
        )}

        {/* Center Main Work Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#06070d] relative">
          {/* Main Viewport Content Area */}
          <main className="flex-1 h-full overflow-hidden relative">
            {activeType === 'tasks' ? (
              <TaskManagementView
                tasks={tasks}
                onRefreshTasks={loadTasks}
                onToggleComplete={handleToggleTaskComplete}
              />
            ) : activeType === 'graph' ? (
              <KnowledgeGraphViewport
                sessionCreatedNodeIds={sessionCtx.createdNodeIds}
                sessionCreatedEdgeIds={sessionCtx.createdEdgeIds}
                onNodeClick={(nodeId) => {
                  const cleanId = nodeId.includes('#') ? nodeId.split('#')[0] : nodeId
                  const resolvedPath = cleanId.includes('.') ? cleanId : `${cleanId}.md`
                  handleOpenFile({
                    name: resolvedPath.split('/').pop() || resolvedPath,
                    relativePath: resolvedPath,
                    type: 'file',
                    updatedAt: Date.now()
                  })
                }}
                onActivity={() => sessionManagerRef.current.registerActivity()}
              />
            ) : activeType === 'canvas' && canvasDoc ? (
              <CanvasViewport
                document={canvasDoc}
                sessionCreatedNodeIds={sessionCtx.createdNodeIds}
                onDocumentChanged={async (updated) => {
                  setCanvasDoc(updated)
                  if (activePath) {
                    await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
                      relativePath: activePath,
                      content: JSON.stringify(updated, null, 2),
                      createBackup: false
                    })
                  }
                }}
                onNodeAdded={(nodeId) => {
                  sessionManagerRef.current.registerNodeCreated(nodeId)
                  syncSessionState()
                }}
                onActivity={() => sessionManagerRef.current.registerActivity()}
                onOpenCanvas={(canvasPath) => {
                  handleOpenFile({ name: canvasPath.split('/').pop() || 'canvas.json', relativePath: canvasPath, type: 'file', updatedAt: Date.now() })
                }}
                onOpenNote={(notePath) => {
                  handleOpenFile({ name: notePath.split('/').pop() || 'note.md', relativePath: notePath, type: 'file', updatedAt: Date.now() })
                }}
              />
            ) : activeType === 'md' && activePath ? (
              <MarkdownEditor
                relativePath={activePath}
                initialContent={textContent}
                onContentChanged={(newText) => setTextContent(newText)}
                onActivity={() => sessionManagerRef.current.registerActivity()}
                onNavigatePath={(targetPath) => {
                  const resolvedPath = targetPath.endsWith('.md') || targetPath.endsWith('.json') || targetPath.endsWith('.canvas')
                    ? targetPath
                    : `${targetPath}.md`
                  handleOpenFile({
                    name: resolvedPath.split('/').pop() || resolvedPath,
                    relativePath: resolvedPath,
                    type: 'file',
                    updatedAt: Date.now()
                  })
                }}
              />
            ) : activeType === 'txt' && activePath ? (
              <div className="h-full w-full bg-[#0c0d10] p-6 md:p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto h-full flex flex-col">
                  <textarea
                    value={textContent}
                    onChange={async (e) => {
                      const newText = e.target.value
                      setTextContent(newText)
                      if (activePath) {
                        await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
                          relativePath: activePath,
                          content: newText,
                          createBackup: false
                        })
                      }
                    }}
                    placeholder="Zacznij pisać..."
                    className="w-full flex-1 bg-transparent text-[#f4f4f5] font-mono text-xs focus:outline-none resize-none leading-relaxed placeholder-[#52525b]"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[#71717a] text-xs">
                Wybierz plik z drzewa lub kliknij + aby utworzyć notatkę.
              </div>
            )}
          </main>
        </div>

        {/* Right Asset Drawer */}
        <AssetDrawer
          isOpen={drawerOpen}
          initialQuery={drawerSearchQuery}
          onClose={() => setDrawerOpen(false)}
          onOpenNote={(path) => {
            handleOpenFile({ name: path.split('/').pop() || 'note.md', relativePath: path, type: 'file', updatedAt: Date.now() })
          }}
        />
      </div>

      {/* 24px Bottom Status Bar */}
      <BottomStatusBar
        activePath={activePath}
        activeType={activeType}
        onExecuteCommand={handleExecuteCommand}
      />

      {/* In-App Create File / Folder Dialog */}
      <CreateFileDialog
        isOpen={createModalOpen}
        defaultType={createModalDefaultType}
        defaultFolder={createModalDefaultFolder}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateFileOrFolder}
      />

      {/* Configuration & Settings Modal (config.json) */}
      <SettingsModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onConfigSaved={() => {
          // Re-sync if needed
        }}
      />

      {/* Floating HUD Widget */}
      {statsHudOpen && (
        <SessionStatsHud
          sessionContext={sessionCtx}
          deltaSummary={sessionManagerRef.current.getDeltaSummary()}
          onClose={() => setStatsHudOpen(false)}
        />
      )}

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onExecuteCommand={handleExecuteCommand}
      />

      {/* Step 1 Kickoff Modal */}
      {kickoffOpen && (
        <SessionKickoffModal
          tasks={tasks}
          onClose={() => setKickoffOpen(false)}
          onStart={handleStartSession}
        />
      )}

      {/* Step 3 Evaluation Modal */}
      {evaluationOpen && (
        <SessionEvaluationModal
          sessionContext={sessionCtx}
          deltaSummary={sessionManagerRef.current.getDeltaSummary()}
          onClose={() => setEvaluationOpen(false)}
          onCommit={handleCommitSession}
        />
      )}

      {/* SRS Flashcard Runner */}
      <SrsReviewRunner
        isOpen={reviewRunnerOpen}
        onClose={() => setReviewRunnerOpen(false)}
        onReviewRecorded={(cardId, grade, latency) => {
          sessionManagerRef.current.registerSrsReview(cardId, grade, latency)
          syncSessionState()
        }}
      />

      {/* Deep Analytics Modal */}
      <AnalyticsModal
        isOpen={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
      />
    </div>
  )
}
