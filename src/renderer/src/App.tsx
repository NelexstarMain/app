import React, { useState, useEffect, useRef } from 'react'
import { IpcChannel } from '../../shared/ipc/channels'
import { FileItem, WorkspaceStats } from '../../shared/types/workspace'
import { CanvasDocument } from '../../shared/types/canvas'
import { TaskTodoRecord } from '../../shared/types/database'
import { SessionManager } from './state/sessionStore'
import { ParsedCommand } from '../../shared/types/commands'
import { LayoutGrid, FileText, Share2, BookOpen, BarChart2, X, Plus } from 'lucide-react'

// Components
import { WorkspaceSelector } from './components/workspace/WorkspaceSelector'
import { FileSidebar } from './components/workspace/FileSidebar'
import { SessionHeader } from './components/session/SessionHeader'
import { SessionKickoffModal } from './components/session/SessionKickoffModal'
import { SessionEvaluationModal } from './components/session/SessionEvaluationModal'
import { SessionStatsHud } from './components/session/SessionStatsHud'
import { MarkdownEditor } from './components/editor/MarkdownEditor'
import { CanvasViewport } from './components/canvas/CanvasViewport'
import { KnowledgeGraphViewport } from './components/graph/KnowledgeGraphViewport'
import { CommandPalette } from './components/terminal/CommandPalette'
import { AssetDrawer } from './components/drawer/AssetDrawer'
import { SrsReviewRunner } from './components/review/SrsReviewRunner'
import { AnalyticsModal } from './components/analytics/AnalyticsModal'

interface OpenTab {
  id: string
  path: string
  title: string
  type: 'note' | 'canvas' | 'graph'
}

export const App: React.FC = () => {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileItem[]>([])
  const [tasks, setTasks] = useState<TaskTodoRecord[]>([])

  // Activity bar active mode
  const [activityMode, setActivityMode] = useState<'canvas' | 'notes' | 'graph' | 'review' | 'analytics'>('canvas')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Tabs state
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'tab_canvas_1', path: 'canvases/Rozbiory_Polski.canvas.json', title: 'Rozbiory Polski', type: 'canvas' }
  ])
  const [activeTabId, setActiveTabId] = useState<string>('tab_canvas_1')

  // Document contents cache
  const [activePath, setActivePath] = useState<string | null>('canvases/Rozbiory_Polski.canvas.json')
  const [activeType, setActiveType] = useState<'note' | 'canvas' | 'graph'>('canvas')
  const [noteContent, setNoteContent] = useState<string>('')
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument | null>(null)

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

  // 3. Heartbeat Loop (1000ms)
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

    // Open sample canvas
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

  const handleOpenFile = async (file: FileItem) => {
    const isCanvas = file.name.includes('.canvas.')
    const fileType = isCanvas ? 'canvas' : 'note'
    const tabId = `tab_${file.relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`

    // Check if tab already open
    const existing = openTabs.find((t) => t.path === file.relativePath)
    if (!existing) {
      const newTab: OpenTab = {
        id: tabId,
        path: file.relativePath,
        title: file.name.replace(/\.(md|canvas\.json|json)$/, ''),
        type: fileType
      }
      setOpenTabs((prev) => [...prev, newTab])
    }

    setActiveTabId(existing ? existing.id : tabId)
    setActivePath(file.relativePath)
    setActiveType(fileType)

    try {
      const res = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: file.relativePath })
      if (isCanvas && res.content) {
        setCanvasDoc(JSON.parse(res.content))
      } else {
        setNoteContent(res.content || '')
      }
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const remaining = openTabs.filter((t) => t.id !== tabId)
    setOpenTabs(remaining)
    if (activeTabId === tabId && remaining.length > 0) {
      const next = remaining[remaining.length - 1]
      setActiveTabId(next.id)
      setActivePath(next.path)
      setActiveType(next.type)
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
          topicId: 'Historia Polski',
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
    sessionManagerRef.current.registerTaskCompleted(taskId)
    syncSessionState()
    try {
      await window.electronAPI.invoke(IpcChannel.DB_UPDATE_TASK, {
        taskId,
        status: 'COMPLETED',
        completedAt: Date.now()
      })
      await loadTasks()
    } catch (err) {
      console.error('Task update failed:', err)
    }
  }

  // Command Execution
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
    } else if (commandName === 'session') {
      const sub = cmd.primaryArgument?.toLowerCase()
      if (sub === 'pause') sessionManagerRef.current.pauseManual()
      if (sub === 'resume') sessionManagerRef.current.resumeManual()
      if (sub === 'finish') {
        sessionManagerRef.current.promptFinish()
        setEvaluationOpen(true)
      }
      syncSessionState()
    } else if (commandName === 'note') {
      const title = cmd.primaryArgument || 'Nowa Notatka'
      const rel = `notes/${title.replace(/\s+/g, '_')}.md`
      await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
        relativePath: rel,
        content: `# ${title}\n\nWpisz treść notatki...`,
        createBackup: true
      })
      await refreshFiles()
      handleOpenFile({ name: `${title}.md`, relativePath: rel, type: 'file', updatedAt: Date.now() })
    } else if (commandName === 'canvas') {
      const title = cmd.primaryArgument || 'Nowa Tablica'
      const rel = `canvases/${title.replace(/\s+/g, '_')}.canvas.json`
      const newCanvas: CanvasDocument = {
        version: '1.3',
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
    }
  }

  if (!workspacePath) {
    return <WorkspaceSelector onWorkspaceSelected={handleWorkspaceLoaded} />
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0B0C0E] text-[#D8DAE0] overflow-hidden select-none">
      {/* Top Bar */}
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

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Far Left Activity Bar (thin column of tool icons) */}
        <aside className="w-10 h-full bg-[#101114] border-r border-[#22242b] flex flex-col items-center py-2 gap-1 z-20">
          <button
            onClick={() => {
              setActivityMode('canvas')
              setSidebarOpen(true)
            }}
            title="Tablice Whiteboard"
            className={`p-2 rounded-lg text-[#727683] transition-colors ${activityMode === 'canvas' ? 'bg-[#1b1c22] text-[#D8DAE0]' : 'hover:text-[#D8DAE0] hover:bg-[#15161a]'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActivityMode('notes')
              setSidebarOpen(true)
            }}
            title="Notatki Markdown"
            className={`p-2 rounded-lg text-[#727683] transition-colors ${activityMode === 'notes' ? 'bg-[#1b1c22] text-[#D8DAE0]' : 'hover:text-[#D8DAE0] hover:bg-[#15161a]'}`}
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveType('graph')}
            title="Graf Wiedzy"
            className={`p-2 rounded-lg text-[#727683] transition-colors ${activeType === 'graph' ? 'bg-[#1b1c22] text-[#D8DAE0]' : 'hover:text-[#D8DAE0] hover:bg-[#15161a]'}`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setReviewRunnerOpen(true)}
            title="Powtórki SRS"
            className="p-2 rounded-lg text-[#727683] hover:text-[#D8DAE0] hover:bg-[#15161a] transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAnalyticsModalOpen(true)}
            title="Analityka"
            className="p-2 rounded-lg text-[#727683] hover:text-[#D8DAE0] hover:bg-[#15161a] transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </aside>

        {/* File Sidebar (collapsible) */}
        {sidebarOpen && (
          <FileSidebar
            workspacePath={workspacePath}
            fileTree={fileTree}
            activePath={activePath}
            onOpenFile={handleOpenFile}
            onOpenGraph={() => setActiveType('graph')}
            onOpenReview={() => setReviewRunnerOpen(true)}
            onOpenAnalytics={() => setAnalyticsModalOpen(true)}
            onRefreshFiles={refreshFiles}
            onNewNote={() => handleExecuteCommand({ rawInput: '#note', prefix: '#', command: 'note', primaryArgument: 'Nowa Notatka', secondaryArgument: null, flags: {} })}
            onNewCanvas={() => handleExecuteCommand({ rawInput: '#canvas', prefix: '#', command: 'canvas', primaryArgument: 'Nowa Tablica', secondaryArgument: null, flags: {} })}
          />
        )}

        {/* Center Main Work Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0C0E] relative">
          {/* Document Tabs Bar */}
          <div className="h-8 bg-[#101114] border-b border-[#22242b] flex items-center px-1 overflow-x-auto no-scrollbar gap-1 text-xs">
            {openTabs.map((tab) => {
              const isActive = activePath === tab.path
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActivePath(tab.path)
                    setActiveType(tab.type)
                    setActiveTabId(tab.id)
                  }}
                  className={`h-7 px-2.5 rounded flex items-center gap-1.5 cursor-pointer text-[11px] transition-colors ${
                    isActive
                      ? 'bg-[#1b1c22] text-[#D8DAE0] border border-[#282932]'
                      : 'text-[#727683] hover:text-[#D8DAE0] hover:bg-[#15161a]'
                  }`}
                >
                  {tab.type === 'canvas' ? (
                    <LayoutGrid className="w-3 h-3 text-[#584C6B]" />
                  ) : (
                    <FileText className="w-3 h-3 text-[#4A6B8A]" />
                  )}
                  <span className="truncate max-w-[120px]">{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 rounded hover:bg-[#22242b] text-[#727683] hover:text-[#D8DAE0]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Viewport Render Area */}
          <main className="flex-1 h-full overflow-hidden relative">
            {activeType === 'graph' ? (
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
                onOpenNote={(notePath) => {
                  handleOpenFile({ name: notePath.split('/').pop() || 'note.md', relativePath: notePath, type: 'file', updatedAt: Date.now() })
                }}
              />
            ) : activePath ? (
              <MarkdownEditor
                relativePath={activePath}
                initialContent={noteContent}
                onContentChanged={(newText) => setNoteContent(newText)}
                onActivity={() => sessionManagerRef.current.registerActivity()}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[#727683] text-xs">
                Wybierz tablicę lub notatkę z paska bocznego.
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
