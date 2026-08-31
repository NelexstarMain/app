import React, { useState } from 'react'
import { X, Play, Clock } from 'lucide-react'
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="max-w-lg w-full rounded-xl bg-[#141519] border border-[#282932] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#22242b]">
          <span className="font-semibold text-[#D8DAE0]">Rozpocznij Sesję Skupienia (Krok 1)</span>
          <button onClick={onClose} className="p-1 rounded text-[#727683] hover:text-[#D8DAE0]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Time Selector */}
        <div className="my-4 p-3 rounded-lg bg-[#101114] border border-[#22242b]">
          <div className="flex items-center justify-between mb-2 text-[11px]">
            <span className="text-[#727683] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#38664B]" />
              Czas trwania
            </span>
            <span className="font-mono text-[#D8DAE0] font-bold">{plannedMinutes} min</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[15, 25, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => setPlannedMinutes(mins)}
                className={`py-1.5 rounded text-xs border transition-colors ${
                  plannedMinutes === mins
                    ? 'bg-[#1b1c22] border-[#4A6B8A] text-[#D8DAE0] font-medium'
                    : 'bg-[#141519] border-[#22242b] text-[#727683] hover:text-[#D8DAE0]'
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Task Selection */}
        <div className="mb-4 space-y-2 max-h-48 overflow-y-auto pr-1">
          <div className="text-[10px] font-semibold text-[#4B4E58] uppercase tracking-wider">
            Zadania do zrealizowania
          </div>

          {p1Tasks.length > 0 && (
            <div className="space-y-1">
              {p1Tasks.map((t) => (
                <label
                  key={t.task_id}
                  onClick={() => toggleTask(t.task_id)}
                  className="flex items-center gap-2 p-2 rounded bg-[#101114] border border-[#22242b] hover:border-[#7A3E48]/60 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.task_id)}
                    readOnly
                    className="rounded border-[#22242b] bg-[#141519]"
                  />
                  <span className="text-[#D8DAE0] truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] text-[#727683] font-mono">P1 (~{t.time_estimate_minutes}m)</span>
                </label>
              ))}
            </div>
          )}

          {p2Tasks.length > 0 && (
            <div className="space-y-1">
              {p2Tasks.map((t) => (
                <label
                  key={t.task_id}
                  onClick={() => toggleTask(t.task_id)}
                  className="flex items-center gap-2 p-2 rounded bg-[#101114] border border-[#22242b] hover:border-[#8C6D37]/60 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.task_id)}
                    readOnly
                    className="rounded border-[#22242b] bg-[#141519]"
                  />
                  <span className="text-[#D8DAE0] truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] text-[#727683] font-mono">P2</span>
                </label>
              ))}
            </div>
          )}

          {p3Tasks.length > 0 && (
            <div className="space-y-1">
              {p3Tasks.map((t) => (
                <label
                  key={t.task_id}
                  onClick={() => toggleTask(t.task_id)}
                  className="flex items-center gap-2 p-2 rounded bg-[#101114] border border-[#22242b] hover:border-[#38664B]/60 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.task_id)}
                    readOnly
                    className="rounded border-[#22242b] bg-[#141519]"
                  />
                  <span className="text-[#D8DAE0] truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] text-[#727683] font-mono">P3</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#22242b]">
          <button onClick={onClose} className="py-1.5 px-3 rounded text-[11px] text-[#727683] hover:text-[#D8DAE0]">
            Anuluj
          </button>
          <button
            onClick={() => onStart(plannedMinutes, selectedIds)}
            className="py-1.5 px-4 rounded bg-[#1b1c22] hover:bg-[#22242b] border border-[#282932] text-[#D8DAE0] text-[11px] font-medium flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-current text-[#38664B]" />
            <span>Rozpocznij ({plannedMinutes} min)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
