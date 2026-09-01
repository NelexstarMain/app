import React from 'react'
import { Play, Pause, Square, Search, BarChart2, FolderTree, CheckCircle2, Circle, Clock } from 'lucide-react'
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
    <header className="h-10 bg-[#09090b] border-b border-[#27272a] flex items-center justify-between px-3 z-20 select-none text-xs">
      {/* Left: App Brand & Discrete Focus Session Button */}
      <div className="flex items-center gap-3">
        <div className="font-semibold text-[#f4f4f5] flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#38bdf8] to-[#10b981] flex items-center justify-center text-[11px] font-black text-black shadow-sm">
            C
          </div>
          <span className="text-[12px] font-semibold tracking-tight text-[#f4f4f5]">CogniCanvas</span>
        </div>

        <div className="h-4 w-px bg-[#27272a]" />

        {isIdle ? (
          <button
            onClick={onOpenKickoff}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141519] hover:bg-[#1f2128] text-[#e4e4e7] text-[11px] font-medium border border-[#27272a] hover:border-[#3f3f46] transition-all shadow-sm group"
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>Sesja Skupienia</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#141519] border border-[#27272a] font-mono text-[11px] text-[#f4f4f5] shadow-sm">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#10b981] animate-pulse' : 'bg-[#f59e0b]'}`} />
              <span className="font-semibold">{formatTime(sessionContext.effectiveFocusSeconds)}</span>
              <span className="text-[10px] text-[#71717a]">/ {sessionContext.plannedMinutes}m</span>
            </div>

            {isActive ? (
              <button
                onClick={onPauseSession}
                className="p-1.5 rounded-md hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]"
                title="Pauza"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onResumeSession}
                className="p-1.5 rounded-md hover:bg-[#27272a] text-[#10b981]"
                title="Wznów"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            <button
              onClick={onFinishSession}
              className="p-1.5 rounded-md hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fb7185]"
              title="Zakończ sesję"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Center: Active Tasks Pill List */}
      <div className="flex items-center gap-1.5 max-w-sm overflow-x-auto no-scrollbar">
        {selectedTasks.map((t) => {
          const isDone = sessionContext.completedTaskIds.includes(t.task_id)
          return (
            <button
              key={t.task_id}
              onClick={() => onToggleTaskComplete(t.task_id)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
                isDone
                  ? 'bg-[#141519] border-[#27272a] text-[#52525b] line-through'
                  : 'bg-[#141519] border-[#27272a] text-[#f4f4f5] hover:border-[#38bdf8]'
              }`}
            >
              {isDone ? <CheckCircle2 className="w-3 h-3 text-[#10b981]" /> : <Circle className="w-3 h-3 text-[#71717a]" />}
              <span className="truncate max-w-[130px] font-medium">{t.title}</span>
            </button>
          )
        })}
      </div>

      {/* Right: Quick Tools */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#141519] hover:bg-[#1f2128] text-[11px] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a] transition-all shadow-sm group"
          title="Szybkie wyszukiwanie i komendy (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#38bdf8] group-hover:scale-105 transition-transform" />
          <span className="font-mono text-[10px] text-[#71717a] group-hover:text-[#a1a1aa]">⌘K</span>
        </button>

        <button
          onClick={onToggleStatsHud}
          title="HUD Skupienia (#stats)"
          className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
        >
          <BarChart2 className="w-4 h-4 text-[#10b981]" />
        </button>

        <button
          onClick={onToggleDrawer}
          title="Panel Zasobów (#links)"
          className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
        >
          <FolderTree className="w-4 h-4 text-[#a855f7]" />
        </button>
      </div>
    </header>
  )
}

