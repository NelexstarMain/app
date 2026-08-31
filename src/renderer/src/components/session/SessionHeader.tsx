import React from 'react'
import { Play, Pause, Square, Zap, Sparkles, FolderTree, Terminal, BarChart2, CheckCircle2, Circle } from 'lucide-react'
import { SessionContext } from '../../../../shared/types/session'
import { TaskTodoRecord } from '../../../../shared/types/database'

interface Props {
  sessionContext: SessionContext
  tasks: TaskTodoRecord[]
  onOpenKickoff: () => void
  onPauseSession: () => void
  onResumeSession: () => void
  onFinishSession: () => void
  onToggleStatsHud: () => void
  onToggleDrawer: () => void
  onOpenCommandPalette: () => void
  onToggleTaskComplete: (taskId: string) => void
}

export const SessionHeader: React.FC<Props> = ({
  sessionContext,
  tasks,
  onOpenKickoff,
  onPauseSession,
  onResumeSession,
  onFinishSession,
  onToggleStatsHud,
  onToggleDrawer,
  onOpenCommandPalette,
  onToggleTaskComplete
}) => {
  const isIdle = sessionContext.state === 'IDLE' || sessionContext.state === 'COMMITTED' || sessionContext.state === 'TERMINATED_ABORT'
  const isActive = sessionContext.state === 'ACTIVE_FOCUS'
  const isPaused = sessionContext.state === 'MANUAL_PAUSED' || sessionContext.state === 'AUTO_PAUSED'

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const selectedTasks = tasks.filter((t) => sessionContext.selectedTaskIds.includes(t.task_id))

  return (
    <header className="h-14 bg-synapse-card border-b border-synapse-border flex items-center justify-between px-4 z-20 select-none">
      {/* Left: Brand & Focus Engine State */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-bold text-sm">
            CC
          </div>
          <span className="font-bold text-sm text-white tracking-wide">
            CogniCanvas <span className="text-emerald-400 font-mono text-xs">v1.3</span>
          </span>
        </div>

        {/* Focus Mode Pill */}
        <div className="h-5 w-px bg-synapse-border mx-1" />

        {isIdle ? (
          <button
            onClick={onOpenKickoff}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-all shadow-sm group"
          >
            <Play className="w-3.5 h-3.5 fill-current text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Start Focus Session</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {/* Timer Display */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-mono text-sm font-semibold tracking-wider ${
              isActive
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{formatTime(sessionContext.effectiveFocusSeconds)}</span>
              <span className="text-[10px] font-normal text-synapse-muted">/ {sessionContext.plannedMinutes}m</span>
            </div>

            {/* Session Controls */}
            <div className="flex items-center gap-1">
              {isActive ? (
                <button
                  onClick={onPauseSession}
                  title="Pause Session"
                  className="p-1.5 rounded-lg bg-synapse-surface hover:bg-synapse-border/80 text-synapse-muted hover:text-white transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onResumeSession}
                  title="Resume Session"
                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              <button
                onClick={onFinishSession}
                title="Finish & Review Session"
                className="p-1.5 rounded-lg bg-synapse-surface hover:bg-rose-500/20 text-synapse-muted hover:text-rose-400 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center: Things to Do Active Tasks */}
      <div className="flex items-center gap-2 max-w-md overflow-x-auto no-scrollbar py-1">
        {selectedTasks.length > 0 ? (
          selectedTasks.map((t) => {
            const isDone = sessionContext.completedTaskIds.includes(t.task_id)
            const prioColor = t.priority === 'P1' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : t.priority === 'P2' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            return (
              <button
                key={t.task_id}
                onClick={() => onToggleTaskComplete(t.task_id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all shrink-0 ${prioColor} ${
                  isDone ? 'opacity-40 line-through' : 'hover:scale-105'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3" />}
                <span className="truncate max-w-[140px]">{t.title}</span>
              </button>
            )
          })
        ) : (
          <span className="text-[11px] text-synapse-muted/60 italic hidden md:inline">
            No session tasks selected. Press <kbd className="px-1 py-0.5 rounded bg-synapse-surface text-synapse-muted font-mono">Ctrl+K</kbd> to execute commands.
          </span>
        )}
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-synapse-surface hover:bg-synapse-border/80 text-xs text-synapse-muted hover:text-white border border-synapse-border/50 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-[11px]">#command</span>
          <kbd className="text-[9px] bg-synapse-bg/80 px-1 rounded text-synapse-muted font-mono">Ctrl+K</kbd>
        </button>

        <button
          onClick={onToggleStatsHud}
          title="Session HUD (#stats)"
          className="p-2 rounded-lg bg-synapse-surface hover:bg-synapse-border/80 text-synapse-muted hover:text-emerald-400 transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleDrawer}
          title="Asset & Link Drawer (#links)"
          className="p-2 rounded-lg bg-synapse-surface hover:bg-synapse-border/80 text-synapse-muted hover:text-purple-400 transition-colors"
        >
          <FolderTree className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
