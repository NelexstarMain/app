import React, { useState, useEffect, useRef } from 'react'
import { IpcChannel } from '../../shared/ipc/channels'
import { FileItem } from '../../shared/types/workspace'
import { CanvasDocument } from '../../shared/types/canvas'
import { TaskTodoRecord } from '../../shared/types/database'
import { SessionManager } from './state/sessionStore'
import { parseCliCommand, ParsedCommand } from '../../shared/types/commands'
import { LayoutGrid, Share2, CheckSquare, BookOpen, BarChart2, X, Plus, FileText, AlignLeft, Terminal, CornerDownLeft } from 'lucide-react'

// Components
import { WorkspaceSelector } from './components/workspace/WorkspaceSelector'
import { FileSidebar } from './components/workspace/FileSidebar'
import { SessionHeader } from './components/session/SessionHeader'
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

  // Clean Bottom CLI Input
  const [cliInput, setCliInput] = useState('')

  // Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [statsHudOpen, setStatsHudOpen] = useState(false)
  const [reviewRunnerOpen, setReviewRunnerOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
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
    const remaining = openTabs.filter((t) => t.id !== tabId)
    setOpenTabs(remaining)
    if (activeTabId === tabId && remaining.length > 0) {
      const next = remaining[remaining.length - 1]
      handleSelectTab(next)
    }
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

  // File Creation Handlers for the 3 Formats
  const handleNewCanvas = async (folderPath = 'canvases') => {
    const title = prompt('Podaj nazwę nowej tablicy:', 'Nowa Tablica')
    if (!title) return
    const filename = `${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')}.canvas.json`
    const relativePath = `${folderPath}/${filename}`

    const newCanvas: CanvasDocument = {
      version: '1.4',
      canvas_id: relativePath,
      title,
      viewport: { x: 0, y: 0, zoom: 1.0 },
      nodes: [],
      edges: []
    }

    await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
      relativePath,
      content: JSON.stringify(newCanvas, null, 2),
      createBackup: true
    })
    await refreshFiles()
    handleOpenFile({ name: filename, relativePath, type: 'file', updatedAt: Date.now() })
  }

  const handleNewMarkdown = async (folderPath = 'notes') => {
    const title = prompt('Podaj tytuł nowej notatki Markdown:', 'Notatka')
    if (!title) return
    const filename = `${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')}.md`
    const relativePath = `${folderPath}/${filename}`

    await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
      relativePath,
      content: `# ${title}\n\nZacznij pisać treść notatki...`,
      createBackup: true
    })
    await refreshFiles()
    handleOpenFile({ name: filename, relativePath, type: 'file', updatedAt: Date.now() })
  }

  const handleNewPlainText = async (folderPath = 'notes') => {
    const title = prompt('Podaj nazwę pliku tekstowego:', 'Tekst')
    if (!title) return
    const filename = `${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')}.txt`
    const relativePath = `${folderPath}/${filename}`

    await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
      relativePath,
      content: `${title}\n\nWpisz treść...`,
      createBackup: true
    })
    await refreshFiles()
    handleOpenFile({ name: filename, relativePath, type: 'file', updatedAt: Date.now() })
  }

  const handleCreateFolder = async (parentPath = 'notes') => {
    const folderName = prompt('Podaj nazwę nowego folderu:', 'Nowy Folder')
    if (!folderName) return
    const cleanName = folderName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')
    const relativePath = `${parentPath}/${cleanName}`

    await window.electronAPI.invoke(IpcChannel.FILE_CREATE_FOLDER, { relativePath })
    await refreshFiles()
  }

  const handleRenamePath = async (oldPath: string, newName: string) => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.FILE_RENAME, { oldPath, newName })
      if (res.success && res.newPath) {
        await refreshFiles()
      }
    } catch (err) {
      console.error('Rename failed:', err)
    }
  }

  const handleDeletePath = async (relativePath: string) => {
    try {
      await window.electronAPI.invoke(IpcChannel.FILE_DELETE, { relativePath })
      setOpenTabs((prev) => prev.filter((t) => t.path !== relativePath))
      if (activePath === relativePath) {
        setActivePath(null)
      }
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

  // CLI Command Execution (Clean, no spam)
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
      const title = cmd.primaryArgument || 'Nowa Tablica'
      const rel = `canvases/${title.replace(/\s+/g, '_')}.canvas.json`
      const newCanvas: CanvasDocument = {
        version: '1.4',
        canvas_id: rel,
        title,
        viewport: { x: 0, y: 0, zoom: 1.0 },
        nodes: [],
        edges: []
      }
      await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
        relativePath: rel,
        content: JSON.stringify(newCanvas, null, 2),
        createBackup: true
      })
      await refreshFiles()
      handleOpenFile({ name: `${title}.canvas.json`, relativePath: rel, type: 'file', updatedAt: Date.now() })
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

  const handleCliKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && cliInput.trim()) {
      const parsed = parseCliCommand(cliInput.trim())
      if (parsed) {
        handleExecuteCommand(parsed)
        setCliInput('')
      }
    }
  }

  if (!workspacePath) {
    return <WorkspaceSelector onWorkspaceSelected={handleWorkspaceLoaded} />
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none font-sans">
      {/* Top Header */}
      <SessionHeader
        sessionContext={sessionCtx}
        tasks={tasks}
        onOpenKickoff={() => setKickoffOpen(true)}
        onPauseSession={() => {
          sessionManagerRef.current.pauseManual()
          syncSessionState()
        }}
        onResumeSession={() => {
          sessionManagerRef.current.resumeManual()
          syncSessionState()
        }}
        onFinishSession={() => {
          sessionManagerRef.current.promptFinish()
          syncSessionState()
          setEvaluationOpen(true)
        }}
        onToggleStatsHud={() => setStatsHudOpen((p) => !p)}
        onToggleDrawer={() => setDrawerOpen((p) => !p)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onToggleTaskComplete={handleToggleTaskComplete}
      />

      {/* Main Work Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Far Left Activity Bar */}
        <aside className="w-12 h-full bg-[#09090b] border-r border-[#27272a] flex flex-col items-center py-3 gap-2 z-20 shrink-0">
          <button
            onClick={() => {
              setActiveType('canvas')
              setSidebarOpen(true)
            }}
            title="Tablice Canvas (Siatka)"
            className={`p-2.5 rounded-xl transition-all ${
              activeType === 'canvas'
                ? 'bg-[#27272a] text-[#a855f7] shadow-md ring-1 ring-[#a855f7]/40'
                : 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveType('graph')}
            title="Graf Wiedzy (Graph View)"
            className={`p-2.5 rounded-xl transition-all ${
              activeType === 'graph'
                ? 'bg-[#27272a] text-[#38bdf8] shadow-md ring-1 ring-[#38bdf8]/40'
                : 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveType('tasks')}
            title="Zadania & Checklist (To-Do)"
            className={`p-2.5 rounded-xl transition-all ${
              activeType === 'tasks'
                ? 'bg-[#27272a] text-[#10b981] shadow-md ring-1 ring-[#10b981]/40'
                : 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-[#27272a] my-1" />

          <button
            onClick={() => setReviewRunnerOpen(true)}
            title="Powtórki SRS (#review)"
            className="p-2.5 rounded-xl text-[#71717a] hover:text-[#f59e0b] hover:bg-[#18181b] transition-all"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAnalyticsModalOpen(true)}
            title="Analityka Skupienia (#stats)"
            className="p-2.5 rounded-xl text-[#71717a] hover:text-[#10b981] hover:bg-[#18181b] transition-all"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </aside>

        {/* File Sidebar (collapsible & resizable) */}
        {sidebarOpen && (
          <div style={{ width: `${sidebarWidth}px` }} className="h-full relative shrink-0">
            <FileSidebar
              workspacePath={workspacePath}
              fileTree={fileTree}
              activePath={activePath}
              onOpenFile={handleOpenFile}
              onOpenGraph={() => setActiveType('graph')}
              onOpenTasks={() => setActiveType('tasks')}
              onOpenReview={() => setReviewRunnerOpen(true)}
              onOpenAnalytics={() => setAnalyticsModalOpen(true)}
              onRefreshFiles={refreshFiles}
              onNewCanvas={(folder) => handleNewCanvas(folder)}
              onNewMarkdown={(folder) => handleNewMarkdown(folder)}
              onNewPlainText={(folder) => handleNewPlainText(folder)}
              onCreateFolder={(parent) => handleCreateFolder(parent)}
              onDeletePath={handleDeletePath}
              onRenamePath={handleRenamePath}
            />

            {/* Sidebar Resizer Splitter */}
            <div
              onMouseDown={handleSidebarMouseDown}
              className="w-1.5 h-full bg-transparent hover:bg-[#38bdf8]/40 cursor-ew-resize absolute top-0 right-0 z-30 transition-colors"
              title="Przeciągnij, aby zmienić szerokość"
            />
          </div>
        )}

        {/* Center Main Work Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0c0e] relative">
          {/* Tabs Bar */}
          <div className="h-9 bg-[#111114] border-b border-[#27272a] flex items-center px-1.5 overflow-x-auto no-scrollbar gap-1 text-xs shrink-0">
            {openTabs.map((tab) => {
              const isActive = activeTabId === tab.id
              return (
                <div
                  key={tab.id}
                  onClick={() => handleSelectTab(tab)}
                  className={`h-7 px-3 rounded-lg flex items-center gap-2 cursor-pointer text-[11px] transition-all ${
                    isActive
                      ? 'bg-[#18181b] text-[#f4f4f5] font-semibold border border-[#3f3f46] shadow-sm'
                      : 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]'
                  }`}
                >
                  {tab.type === 'canvas' ? (
                    <LayoutGrid className="w-3.5 h-3.5 text-[#a855f7]" />
                  ) : tab.type === 'md' ? (
                    <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                  ) : (
                    <AlignLeft className="w-3.5 h-3.5 text-[#10b981]" />
                  )}
                  <span className="truncate max-w-[140px]">{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}

            {activeType === 'tasks' && (
              <div className="h-7 px-3 rounded-lg flex items-center gap-2 text-[11px] bg-[#18181b] text-[#10b981] font-semibold border border-[#10b981]/40">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Zadania & Checklist</span>
              </div>
            )}

            {activeType === 'graph' && (
              <div className="h-7 px-3 rounded-lg flex items-center gap-2 text-[11px] bg-[#18181b] text-[#38bdf8] font-semibold border border-[#38bdf8]/40">
                <Share2 className="w-3.5 h-3.5" />
                <span>Graf Wiedzy</span>
              </div>
            )}
          </div>

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
              />
            ) : activeType === 'md' && activePath ? (
              <MarkdownEditor
                relativePath={activePath}
                initialContent={textContent}
                onContentChanged={(newText) => setTextContent(newText)}
                onActivity={() => sessionManagerRef.current.registerActivity()}
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

          {/* Ultra-Clean Bottom CLI Input Bar (No spammy notifications/logs) */}
          <footer className="h-7 bg-[#09090b] border-t border-[#27272a] flex items-center px-3 gap-2 text-xs font-mono select-none shrink-0 z-30">
            <Terminal className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <span className="text-[#38bdf8] font-bold text-[11px] shrink-0">cli&gt;</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={handleCliKeyDown}
              placeholder="Wpisz komendę (#todo Zadanie, #canvas Tablica, #test [P]|[O], #review)..."
              className="flex-1 bg-transparent text-[#f4f4f5] placeholder-[#52525b] text-[11px] font-mono focus:outline-none"
            />
            {cliInput.trim() && (
              <button
                onClick={() => {
                  const parsed = parseCliCommand(cliInput.trim())
                  if (parsed) {
                    handleExecuteCommand(parsed)
                    setCliInput('')
                  }
                }}
                className="p-0.5 rounded text-[#38bdf8] hover:bg-[#27272a]"
              >
                <CornerDownLeft className="w-3 h-3" />
              </button>
            )}
          </footer>
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
