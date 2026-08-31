import React from 'react'
import { Play, Pause, Square, Terminal, BarChart2, FolderTree, CheckCircle, Circle } from 'lucide-react'
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
  const isIdle =
    sessionContext.state === 'IDLE' ||
    sessionContext.state === 'COMMITTED' ||
    sessionContext.state === 'TERMINATED_ABORT'
  const isActive = sessionContext.state === 'ACTIVE_FOCUS'

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const selectedTasks = tasks.filter((t) => sessionContext.selectedTaskIds.includes(t.task_id))

  return (
    <header className="h-10 bg-[#101114] border-b border-[#22242b] flex items-center justify-between px-3 z-20 select-none text-xs">
      {/* Left: App Title & Focus Timer */}
      <div className="flex items-center gap-3">
        <div className="font-semibold text-[#D8DAE0] flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#22242b] border border-[#2d2f38] flex items-center justify-center text-[10px] font-bold text-[#D8DAE0]">
            C
          </div>
          <span className="text-[12px] font-medium tracking-tight">CogniCanvas</span>
        </div>

        <div className="h-4 w-px bg-[#22242b]" />

        {isIdle ? (
          <button
            onClick={onOpenKickoff}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1b1c22] hover:bg-[#22242b] text-[#D8DAE0] text-[11px] font-medium border border-[#282932] transition-colors"
          >
            <Play className="w-3 h-3 fill-current text-[#38664B]" />
            <span>Sesja Skupienia</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1c22] border border-[#282932] font-mono text-[11px] text-[#D8DAE0]">
              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#38664B]' : 'bg-[#8C6D37]'}`} />
              <span>{formatTime(sessionContext.effectiveFocusSeconds)}</span>
              <span className="text-[10px] text-[#727683]">/ {sessionContext.plannedMinutes}m</span>
            </div>

            {isActive ? (
              <button
                onClick={onPauseSession}
                className="p-1 rounded hover:bg-[#1b1c22] text-[#727683] hover:text-[#D8DAE0]"
                title="Pauza"
              >
                <Pause className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={onResumeSession}
                className="p-1 rounded hover:bg-[#1b1c22] text-[#38664B]"
                title="Wznów"
              >
                <Play className="w-3 h-3 fill-current" />
              </button>
            )}

            <button
              onClick={onFinishSession}
              className="p-1 rounded hover:bg-[#1b1c22] text-[#727683] hover:text-[#7A3E48]"
              title="Zakończ"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Center: Active Tasks Pill */}
      <div className="flex items-center gap-1.5 max-w-sm overflow-x-auto no-scrollbar">
        {selectedTasks.map((t) => {
          const isDone = sessionContext.completedTaskIds.includes(t.task_id)
          return (
            <button
              key={t.task_id}
              onClick={() => onToggleTaskComplete(t.task_id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                isDone
                  ? 'bg-[#1b1c22] border-[#22242b] text-[#4B4E58] line-through'
                  : 'bg-[#15161a] border-[#282932] text-[#D8DAE0] hover:border-[#4A6B8A]'
              }`}
            >
              {isDone ? <CheckCircle className="w-2.5 h-2.5 text-[#38664B]" /> : <Circle className="w-2.5 h-2.5 text-[#727683]" />}
              <span className="truncate max-w-[120px]">{t.title}</span>
            </button>
          )
        })}
      </div>

      {/* Right: Quick Tools */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1b1c22] hover:bg-[#22242b] text-[11px] text-[#727683] hover:text-[#D8DAE0] border border-[#22242b]"
        >
          <Terminal className="w-3 h-3 text-[#4A6B8A]" />
          <span>Komendy</span>
          <kbd className="text-[9px] bg-[#101114] px-1 rounded text-[#4B4E58] font-mono">Ctrl+K</kbd>
        </button>

        <button
          onClick={onToggleStatsHud}
          title="HUD Skupienia (#stats)"
          className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleDrawer}
          title="Panel Zasobów (#links)"
          className="p-1 rounded text-[#727683] hover:text-[#D8DAE0] hover:bg-[#1b1c22]"
        >
          <FolderTree className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}
