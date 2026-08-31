import React, { useState } from 'react'
import { X, Play, Clock, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { TaskTodoRecord } from '../../../../shared/types/database'

interface Props {
  tasks: TaskTodoRecord[]
  onClose: () => void
  onStart: (plannedMinutes: number, selectedTaskIds: string[]) => void
}

export const SessionKickoffModal: React.FC<Props> = ({ tasks, onClose, onStart }) => {
  const [plannedMinutes, setPlannedMinutes] = useState(25)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    tasks.filter((t) => t.priority === 'P1').map((t) => t.task_id)
  )

  const toggleTask = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const p1Tasks = tasks.filter((t) => t.priority === 'P1' && t.status !== 'COMPLETED')
  const p2Tasks = tasks.filter((t) => t.priority === 'P2' && t.status !== 'COMPLETED')
  const p3Tasks = tasks.filter((t) => t.priority === 'P3' && t.status !== 'COMPLETED')

  const handleStart = () => {
    onStart(plannedMinutes, selectedIds)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-xl w-full frosted-glass rounded-2xl border border-synapse-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-synapse-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configure Focus Session (Step 1)</h2>
              <p className="text-xs text-synapse-muted">Select high-priority topics to freeze into session backlog</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Time Selector */}
        <div className="my-5 p-4 rounded-xl bg-synapse-surface/60 border border-synapse-border/40">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Planned Duration
            </span>
            <span className="font-mono text-emerald-400 font-bold">{plannedMinutes} minutes</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[15, 25, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => setPlannedMinutes(mins)}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  plannedMinutes === mins
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-synapse-bg/60 border-synapse-border/60 text-synapse-muted hover:text-white'
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Task Selection */}
        <div className="mb-6 space-y-3 max-h-60 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-white flex items-center justify-between">
            <span>Topics to Learn & Tasks</span>
            <span className="text-[11px] text-synapse-muted">{selectedIds.length} selected</span>
          </div>

          {/* P1 Section */}
          {p1Tasks.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                P1 Critical Topics (Urgent / Exams)
              </div>
              <div className="space-y-1">
                {p1Tasks.map((t) => (
                  <label
                    key={t.task_id}
                    onClick={() => toggleTask(t.task_id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.task_id)}
                      readOnly
                      className="rounded border-rose-500/40 text-rose-500 focus:ring-0"
                    />
                    <span className="text-synapse-text truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] text-rose-400/80 font-mono">~{t.time_estimate_minutes}m</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* P2 Section */}
          {p2Tasks.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1">
                P2 Standard Topics
              </div>
              <div className="space-y-1">
                {p2Tasks.map((t) => (
                  <label
                    key={t.task_id}
                    onClick={() => toggleTask(t.task_id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.task_id)}
                      readOnly
                      className="rounded border-amber-500/40 text-amber-500 focus:ring-0"
                    />
                    <span className="text-synapse-text truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] text-amber-400/80 font-mono">~{t.time_estimate_minutes}m</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* P3 Section */}
          {p3Tasks.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1">
                P3 Supplemental Topics
              </div>
              <div className="space-y-1">
                {p3Tasks.map((t) => (
                  <label
                    key={t.task_id}
                    onClick={() => toggleTask(t.task_id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.task_id)}
                      readOnly
                      className="rounded border-emerald-500/40 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-synapse-text truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] text-emerald-400/80 font-mono">~{t.time_estimate_minutes}m</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-synapse-border/60">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Session ({plannedMinutes} min)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
