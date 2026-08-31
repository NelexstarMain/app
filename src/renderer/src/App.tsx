import React, { useState, useEffect, useRef } from 'react'
import { IpcChannel } from '../../shared/ipc/channels'
import { FileItem, WorkspaceStats } from '../../shared/types/workspace'
import { CanvasDocument } from '../../shared/types/canvas'
import { TaskTodoRecord } from '../../shared/types/database'
import { SessionManager } from './state/sessionStore'
import { ParsedCommand } from '../../shared/types/commands'
import { ReviewGrade } from '../../shared/types/fsrs'

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

export const App: React.FC = () => {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [stats, setStats] = useState<WorkspaceStats>({ notesCount: 0, canvasesCount: 0, entitiesCount: 0, cardsCount: 0, tasksCount: 0 })
  const [fileTree, setFileTree] = useState<FileItem[]>([])
  const [tasks, setTasks] = useState<TaskTodoRecord[]>([])

  // Active View State
  const [activePath, setActivePath] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'note' | 'canvas' | 'graph'>('note')
  const [noteContent, setNoteContent] = useState<string>('')
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument | null>(null)

  // Modals and Drawers
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [statsHudOpen, setStatsHudOpen] = useState(false)
  const [reviewRunnerOpen, setReviewRunnerOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [kickoffOpen, setKickoffOpen] = useState(false)
  const [evaluationOpen, setEvaluationOpen] = useState(false)
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('')

  // Session Manager Instance
  const sessionManagerRef = useRef<SessionManager>(new SessionManager())
  const [sessionCtx, setSessionCtx] = useState(sessionManagerRef.current.getContext())

  // Refresh Session UI Helper
  const syncSessionState = () => {
    setSessionCtx(sessionManagerRef.current.getContext())
  }

  // 1. Initial Load & Crash Recovery Check
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

  // 2. Global Keyboard Shortcuts (Ctrl+K) & Activity Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
      sessionManagerRef.current.registerActivity()
      syncSessionState()
    }

    const handlePointer = () => {
      sessionManagerRef.current.registerActivity()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointer)
    window.addEventListener('wheel', handlePointer)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('wheel', handlePointer)
    }
  }, [])

  // 3. Heartbeat Loop (1000ms) & Crash Snapshot (10s)
  useEffect(() => {
    let tickCount = 0
    const interval = setInterval(async () => {
      const { stateChanged } = sessionManagerRef.current.onHeartbeatTick()
      syncSessionState()

      // Save crash snapshot every 10 ticks if active
      tickCount++
      if (tickCount % 10 === 0 && sessionManagerRef.current.getState() === 'ACTIVE_FOCUS') {
        const snap = sessionManagerRef.current.getContext()
        try {
          await window.electronAPI.invoke(IpcChannel.RECOVERY_SAVE_SNAPSHOT, {
            snapshotJson: JSON.stringify(snap)
          })
        } catch (err) {
          console.warn('Snapshot error:', err)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleWorkspaceLoaded = async (wsPath: string) => {
    setWorkspacePath(wsPath)
    await refreshFiles()
    await loadTasks()

    // Check crash snapshot
    try {
      const snapRes = await window.electronAPI.invoke(IpcChannel.RECOVERY_CHECK_SNAPSHOT, undefined)
      if (snapRes.hasSnapshot && snapRes.snapshot) {
        const resume = confirm(`Wykryto przerwaną sesję nauki (${Math.round(snapRes.snapshot.effectiveFocusSeconds / 60)} min). Czy chcesz ją dokończyć?`)
        if (resume) {
          sessionManagerRef.current.startSession(snapRes.snapshot.plannedMinutes, snapRes.snapshot.selectedTaskIds || [])
          syncSessionState()
        } else {
          await window.electronAPI.invoke(IpcChannel.RECOVERY_CLEAR_SNAPSHOT, undefined)
        }
      }
    } catch (err) {
      console.warn('Crash check error:', err)
    }

    // Auto-open first note
    setTimeout(async () => {
      const samplePath = 'notes/Historia/Poniatowski.md'
      try {
        const fileRes = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: samplePath })
        if (fileRes.content) {
          setActivePath(samplePath)
          setActiveType('note')
          setNoteContent(fileRes.content)
        }
      } catch {
        // Ignore
      }
    }, 100)
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
    setActivePath(file.relativePath)
    try {
      if (file.name.includes('.canvas.')) {
        setActiveType('canvas')
        const res = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: file.relativePath })
        if (res.content) {
          setCanvasDoc(JSON.parse(res.content))
        }
      } else {
        setActiveType('note')
        const res = await window.electronAPI.invoke(IpcChannel.FILE_READ, { relativePath: file.relativePath })
        setNoteContent(res.content || '')
      }
    } catch (err) {
      console.error('Failed to open file:', err)
    }
  }

  // Session Handlers
  const handleStartSession = (plannedMins: number, selectedTaskIds: string[]) => {
    sessionManagerRef.current.startSession(plannedMins, selectedTaskIds)
    syncSessionState()
    setKickoffOpen(false)
  }

  const handlePauseSession = () => {
    sessionManagerRef.current.pauseManual()
    syncSessionState()
  }

  const handleResumeSession = () => {
    sessionManagerRef.current.resumeManual()
    syncSessionState()
  }

  const handleFinishSessionPrompt = () => {
    sessionManagerRef.current.promptFinish()
    syncSessionState()
    setEvaluationOpen(true)
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

  // Task Completed in Header
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

  // CLI Command Execution Router
  const handleExecuteCommand = async (cmd: ParsedCommand) => {
    const commandName = cmd.command.toLowerCase()

    if (commandName === 'links' || commandName === 'asset') {
      setDrawerSearchQuery(cmd.primaryArgument || '')
      setDrawerOpen(true)
    } else if (commandName === 'test' || commandName === 'quiz') {
      if (cmd.primaryArgument && cmd.secondaryArgument && activePath) {
        const testBlock = `\n#test [${cmd.primaryArgument}] | [${cmd.secondaryArgument}]\n`
        const newText = noteContent + testBlock
        setNoteContent(newText)
        await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
          relativePath: activePath,
          content: newText,
          createBackup: true
        })
      }
    } else if (commandName === 'todo' || commandName === 'task') {
      if (cmd.primaryArgument) {
        const prio = (cmd.flags.priority?.toUpperCase() as any) || 'P1'
        const res = await window.electronAPI.invoke(IpcChannel.DB_CREATE_TASK, {
          title: cmd.primaryArgument,
          priority: prio,
          timeEstimateMin: cmd.flags.timeEstimateMin || 25
        })
        if (res.task) {
          sessionManagerRef.current.registerTaskCompleted(res.task.task_id)
          await loadTasks()
        }
      }
    } else if (commandName === 'review' || commandName === 'learn') {
      setReviewRunnerOpen(true)
    } else if (commandName === 'stats' || commandName === 'hud') {
      setStatsHudOpen((p) => !p)
    } else if (commandName === 'graph' || commandName === 'subgraph') {
      setActiveType('graph')
    } else if (commandName === 'session') {
      const sub = cmd.primaryArgument?.toLowerCase()
      if (sub === 'pause') handlePauseSession()
      if (sub === 'resume') handleResumeSession()
      if (sub === 'finish') handleFinishSessionPrompt()
      if (sub === 'abort') sessionManagerRef.current.abortSession()
      syncSessionState()
    } else if (commandName === 'note' || commandName === 'doc') {
      const title = cmd.primaryArgument || 'Nowa Notatka'
      const rel = `notes/${title.replace(/\s+/g, '_')}.md`
      await window.electronAPI.invoke(IpcChannel.FILE_WRITE_ATOMIC, {
        relativePath: rel,
        content: `# ${title}\n\nWpisz treść notatki...`,
        createBackup: true
      })
      await refreshFiles()
      setActivePath(rel)
      setActiveType('note')
      setNoteContent(`# ${title}\n\nWpisz treść notatki...`)
    } else if (commandName === 'canvas' || commandName === 'board') {
      const title = cmd.primaryArgument || 'Nowe Płótno'
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
      setActivePath(rel)
      setActiveType('canvas')
      setCanvasDoc(newCanvas)
    }
  }

  // If no workspace is selected yet, show WorkspaceSelector
  if (!workspacePath) {
    return <WorkspaceSelector onWorkspaceSelected={handleWorkspaceLoaded} />
  }

  return (
    <div className="h-full w-full flex flex-col bg-synapse-bg text-synapse-text overflow-hidden">
      {/* Session Top Header */}
      <SessionHeader
        sessionContext={sessionCtx}
        tasks={tasks}
        onOpenKickoff={() => setKickoffOpen(true)}
        onPauseSession={handlePauseSession}
        onResumeSession={handleResumeSession}
        onFinishSession={handleFinishSessionPrompt}
        onToggleStatsHud={() => setStatsHudOpen((p) => !p)}
        onToggleDrawer={() => setDrawerOpen((p) => !p)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onToggleTaskComplete={handleToggleTaskComplete}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
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
          onNewCanvas={() => handleExecuteCommand({ rawInput: '#canvas', prefix: '#', command: 'canvas', primaryArgument: 'Nowe Płótno', secondaryArgument: null, flags: {} })}
        />

        {/* Center Content Viewport */}
        <main className="flex-1 h-full overflow-hidden bg-synapse-bg relative">
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
            />
          ) : activePath ? (
            <MarkdownEditor
              relativePath={activePath}
              initialContent={noteContent}
              onContentChanged={(newText) => setNoteContent(newText)}
              onActivity={() => sessionManagerRef.current.registerActivity()}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-synapse-muted text-xs">
              Select a note or canvas from the sidebar to begin.
            </div>
          )}
        </main>

        {/* Right Asset Drawer */}
        <AssetDrawer
          isOpen={drawerOpen}
          initialQuery={drawerSearchQuery}
          onClose={() => setDrawerOpen(false)}
          onOpenNote={(path) => {
            setActivePath(path)
            setActiveType('note')
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

      {/* Step 1: Session Kickoff Modal */}
      {kickoffOpen && (
        <SessionKickoffModal
          tasks={tasks}
          onClose={() => setKickoffOpen(false)}
          onStart={handleStartSession}
        />
      )}

      {/* Step 3: Session Evaluation Modal */}
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
