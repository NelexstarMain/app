import React, { useState, useRef, useEffect } from 'react'
import { Terminal, ChevronUp, ChevronDown, Trash2, Zap, Send, CornerDownLeft } from 'lucide-react'
import { parseCliCommand, ParsedCommand } from '../../../../shared/types/commands'

export interface LogEntry {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'command' | 'warn'
  message: string
}

interface Props {
  height: number
  onHeightChange: (newHeight: number) => void
  onExecuteCommand: (parsed: ParsedCommand) => void
  logs: LogEntry[]
  onClearLogs: () => void
}

export const BottomConsolePanel: React.FC<Props> = ({
  height,
  onHeightChange,
  onExecuteCommand,
  logs,
  onClearLogs
}) => {
  const [cmdInput, setCmdInput] = useState('')
  const [isResizing, setIsResizing] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Drag Resizing Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startY = e.clientY
    const startHeight = height

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY
      const newHeight = Math.max(80, Math.min(360, startHeight + deltaY))
      onHeightChange(newHeight)
    }

    const onMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && cmdInput.trim()) {
      const parsed = parseCliCommand(cmdInput.trim())
      if (parsed) {
        onExecuteCommand(parsed)
        setCmdInput('')
      }
    }
  }

  const handleQuickChip = (text: string) => {
    setCmdInput(text)
    inputRef.current?.focus()
  }

  return (
    <div
      style={{ height: `${height}px` }}
      className="w-full bg-[#09090b] border-t border-[#27272a] flex flex-col z-30 select-none font-mono text-xs shadow-2xl relative"
    >
      {/* Resizable Top Splitter Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full bg-transparent hover:bg-[#38bdf8]/40 cursor-ns-resize absolute -top-1 left-0 z-40 transition-colors"
        title="Przeciągnij, aby zmienić wysokość konsoli"
      />

      {/* Console Header Bar */}
      <div className="h-8 bg-[#111114] border-b border-[#27272a] flex items-center justify-between px-3 text-[11px] text-[#a1a1aa] shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span className="font-semibold text-[#f4f4f5] text-[11px]">Terminal CLI & Logi Systemowe</span>
        </div>

        {/* Quick Command Chips */}
        <div className="hidden md:flex items-center gap-1.5">
          {[
            { label: '#todo [tekst]', cmd: '#todo Nowe zadanie !p1 ~25m' },
            { label: '#canvas [nazwa]', cmd: '#canvas Nowa Tablica' },
            { label: '#test [Q]|[A]', cmd: '#test Pytanie | Odpowiedź' },
            { label: '#review', cmd: '#review' },
            { label: '#session finish', cmd: '#session finish' }
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleQuickChip(chip.cmd)}
              className="px-2 py-0.5 rounded bg-[#18181b] hover:bg-[#27272a] text-[10px] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a] transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClearLogs}
            title="Wyczyść logi"
            className="p-1 rounded hover:bg-[#18181b] text-[#71717a] hover:text-[#f4f4f5]"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Console Output Log Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1 font-mono text-[11px] bg-[#0c0d10] leading-relaxed select-text">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <span className="text-[#52525b] text-[10px] shrink-0">{log.timestamp}</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                log.type === 'command'
                  ? 'bg-[#38bdf8]/20 text-[#38bdf8]'
                  : log.type === 'success'
                  ? 'bg-[#10b981]/20 text-[#10b981]'
                  : log.type === 'warn'
                  ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                  : 'bg-[#27272a] text-[#a1a1aa]'
              }`}
            >
              {log.type}
            </span>
            <span
              className={`flex-1 break-words ${
                log.type === 'command'
                  ? 'text-[#f4f4f5] font-semibold'
                  : log.type === 'success'
                  ? 'text-[#10b981]'
                  : log.type === 'warn'
                  ? 'text-[#f59e0b]'
                  : 'text-[#a1a1aa]'
              }`}
            >
              {log.message}
            </span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Interactive Command Input Prompt Line */}
      <div className="h-8 bg-[#111114] border-t border-[#27272a] flex items-center px-3 gap-2 shrink-0">
        <span className="text-[#38bdf8] font-bold text-xs select-none">synapse-cli&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Wpisz polecenie CLI (np. #todo Moniuszko !p1, #canvas Oświecenie, #review, #test [P]|[O])..."
          className="flex-1 bg-transparent text-[#f4f4f5] placeholder-[#52525b] font-mono text-xs focus:outline-none"
        />
        <button
          onClick={() => {
            if (cmdInput.trim()) {
              const parsed = parseCliCommand(cmdInput.trim())
              if (parsed) {
                onExecuteCommand(parsed)
                setCmdInput('')
              }
            }
          }}
          className="p-1 rounded bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#38bdf8] border border-[#27272a]"
          title="Wykonaj polecenie (Enter)"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
