import React, { useState } from 'react'
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Clock,
  Tag,
  Flame,
  CheckCircle2,
  AlertCircle,
  Filter,
  Check
} from 'lucide-react'
import { TaskTodoRecord, TaskPriority } from '../../../../shared/types/database'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  tasks: TaskTodoRecord[]
  onRefreshTasks: () => void
  onToggleComplete: (taskId: string) => void
}

export const TaskManagementView: React.FC<Props> = ({
  tasks,
  onRefreshTasks,
  onToggleComplete
}) => {
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('P2')
  const [newTimeEst, setNewTimeEst] = useState(25)
  const [newTopic, setNewTopic] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'P1' | 'P2' | 'P3'>('ALL')
  const [isAdding, setIsAdding] = useState(false)

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length
  const remainingTasks = totalTasks - completedTasks
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsAdding(true)
    try {
      await window.electronAPI.invoke(IpcChannel.DB_CREATE_TASK, {
        title: newTitle.trim(),
        priority: newPriority,
        timeEstimateMin: newTimeEst,
        topicId: newTopic.trim() || undefined
      })
      setNewTitle('')
      setNewTopic('')
      onRefreshTasks()
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await window.electronAPI.invoke(IpcChannel.DB_DELETE_TASK, { taskId })
      onRefreshTasks()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ACTIVE') return t.status !== 'COMPLETED'
    if (filter === 'COMPLETED') return t.status === 'COMPLETED'
    if (filter === 'P1') return t.priority === 'P1'
    if (filter === 'P2') return t.priority === 'P2'
    if (filter === 'P3') return t.priority === 'P3'
    return true
  })

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'P1':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4c0519] text-[#fecdd3] border border-[#9f1239]/50 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-[#fb7185]" />
            <span>P1 - Wysoki</span>
          </span>
        )
      case 'P2':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3d3416] text-[#fef08a] border border-[#854d0e]/50 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-[#facc15]" />
            <span>P2 - Średni</span>
          </span>
        )
      case 'P3':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#143322] text-[#bbf7d0] border border-[#15803d]/50 flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-[#4ade80]" />
            <span>P3 - Niski</span>
          </span>
        )
    }
  }

  return (
    <div className="h-full w-full bg-[#09090b] text-[#f4f4f5] overflow-y-auto p-6 md:p-8 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header & Stats Card */}
        <div className="p-6 rounded-2xl bg-[#141519] border border-[#27272a] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#f4f4f5] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#38bdf8]" />
                <span>Moduł Zadań & Postęp Nauki</span>
              </h1>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Zarządzaj celami i mikro-zadaniami sesji nauki.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] text-center">
                <div className="text-sm font-bold font-mono text-[#f4f4f5]">
                  {completedTasks} / {totalTasks}
                </div>
                <div className="text-[10px] text-[#71717a]">Ukończone</div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] text-center">
                <div className="text-sm font-bold font-mono text-[#38bdf8]">{progressPercent}%</div>
                <div className="text-[10px] text-[#71717a]">Postęp</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#18181b] h-2.5 rounded-full overflow-hidden border border-[#27272a]">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-[#10b981] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Add New Task Form */}
        <form
          onSubmit={handleAddTask}
          className="p-4 rounded-2xl bg-[#141519] border border-[#27272a] shadow-xl space-y-3"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Wpisz nowe zadanie (np. Dowiedz się o Moniuszce, Przeanalizuj Sejm Wielki)..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#71717a] focus:outline-none focus:border-[#38bdf8]"
            />

            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Temat / Tagi (opcjonalnie)"
              className="w-full md:w-48 px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] placeholder-[#71717a] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#71717a]">Priorytet:</span>
              <div className="flex items-center gap-1">
                {(['P1', 'P2', 'P3'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      newPriority === p
                        ? p === 'P1'
                          ? 'bg-[#9f1239] text-white ring-2 ring-[#fb7185]/40'
                          : p === 'P2'
                          ? 'bg-[#854d0e] text-white ring-2 ring-[#facc15]/40'
                          : 'bg-[#15803d] text-white ring-2 ring-[#4ade80]/40'
                        : 'bg-[#18181b] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a]'
                    }`}
                  >
                    {p === 'P1' ? 'P1 - Wysoki' : p === 'P2' ? 'P2 - Średni' : 'P3 - Niski'}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-[#71717a] ml-2">Czas:</span>
              <select
                value={newTimeEst}
                onChange={(e) => setNewTimeEst(Number(e.target.value))}
                className="bg-[#18181b] border border-[#27272a] rounded-lg px-2 py-1 text-xs text-[#f4f4f5] focus:outline-none"
              >
                <option value={15}>15 min</option>
                <option value={25}>25 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isAdding || !newTitle.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#10b981] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj zadanie</span>
            </button>
          </div>
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-[#71717a] mr-1" />
          {[
            { id: 'ALL', label: 'Wszystkie' },
            { id: 'ACTIVE', label: `Do zrobienia (${remainingTasks})` },
            { id: 'COMPLETED', label: `Ukończone (${completedTasks})` },
            { id: 'P1', label: 'P1 - Wysoki' },
            { id: 'P2', label: 'P2 - Średni' },
            { id: 'P3', label: 'P3 - Niski' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                filter === f.id
                  ? 'bg-[#27272a] text-[#f4f4f5] border border-[#3f3f46] shadow-sm'
                  : 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#141519]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((t) => {
              const isDone = t.status === 'COMPLETED'
              return (
                <div
                  key={t.task_id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isDone
                      ? 'bg-[#141519]/50 border-[#27272a]/60 text-[#71717a]'
                      : 'bg-[#141519] border-[#27272a] hover:border-[#3f3f46] text-[#f4f4f5]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleComplete(t.task_id)}
                      className={`p-1 rounded-lg transition-colors ${
                        isDone ? 'text-[#10b981]' : 'text-[#71717a] hover:text-[#f4f4f5]'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-medium truncate ${
                          isDone ? 'line-through text-[#71717a]' : 'text-[#f4f4f5]'
                        }`}
                      >
                        {t.title}
                      </div>

                      {t.topic_id && (
                        <div className="text-[10px] text-[#71717a] flex items-center gap-1 mt-0.5 font-mono">
                          <Tag className="w-2.5 h-2.5 text-[#38bdf8]" />
                          <span>{t.topic_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getPriorityBadge(t.priority)}

                    <span className="text-[10px] text-[#71717a] font-mono flex items-center gap-1 bg-[#18181b] px-2 py-0.5 rounded-lg border border-[#27272a]">
                      <Clock className="w-3 h-3 text-[#a1a1aa]" />
                      <span>{t.time_estimate_minutes}m</span>
                    </span>

                    <button
                      onClick={() => handleDeleteTask(t.task_id)}
                      className="p-1.5 rounded-lg text-[#71717a] hover:text-[#fb7185] hover:bg-[#27272a] transition-colors"
                      title="Usuń zadanie"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[#141519] border border-[#27272a]">
              <CheckCircle2 className="w-8 h-8 text-[#71717a] mx-auto mb-2 opacity-40" />
              <div className="text-xs text-[#a1a1aa] font-medium">Brak zadań w wybranym filtrze.</div>
              <div className="text-[10px] text-[#71717a] mt-0.5">Dodaj nowe zadanie powyżej!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
