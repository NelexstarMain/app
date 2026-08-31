import React, { useState, useEffect, useRef } from 'react'
import { Terminal, ArrowRight } from 'lucide-react'
import { parseCliCommand, ParsedCommand } from '../../../../shared/types/commands'

interface Props {
  isOpen: boolean
  onClose: () => void
  onExecuteCommand: (parsed: ParsedCommand) => void
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, onExecuteCommand }) => {
  const [input, setInput] = useState('')
  const [previewHelp, setPreviewHelp] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setInput('')
      setPreviewHelp(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      const parsed = parseCliCommand(input)
      if (parsed) {
        onExecuteCommand(parsed)
        onClose()
      }
    }
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    const lower = val.toLowerCase().trim()
    if (lower.startsWith('#links') || lower.startsWith('/links')) {
      setPreviewHelp('#links [fraza] — Otwiera panel Asset Drawer')
    } else if (lower.startsWith('#test') || lower.startsWith('/test')) {
      setPreviewHelp('#test [Pytanie] | [Odpowiedź] — Tworzy fiszkę Active Recall')
    } else if (lower.startsWith('#todo') || lower.startsWith('/todo')) {
      setPreviewHelp('#todo [Treść] [!p1|!p2|!p3] [~min] — Dodaje zadanie do sesji')
    } else if (lower.startsWith('#session')) {
      setPreviewHelp('#session [pause | resume | finish | abort] — Stan sesji')
    } else if (lower.startsWith('#note')) {
      setPreviewHelp('#note [tytuł] — Tworzy nową notatkę')
    } else if (lower.startsWith('#canvas')) {
      setPreviewHelp('#canvas [nazwa] — Tworzy nowe płótno')
    } else if (lower.startsWith('#review')) {
      setPreviewHelp('#review — Uruchamia powtórki FSRS')
    } else if (lower.startsWith('#stats')) {
      setPreviewHelp('#stats — Pokazuje HUD skupienia')
    } else {
      setPreviewHelp(null)
    }
  }

  const quickCommands = [
    { cmd: '#links Poniatowski', desc: 'Wyszukaj encje i notatki w panelu' },
    { cmd: '#test Kiedy powstał Sejm Czteroletni? | 1788 rok', desc: 'Utwórz fiszkę Active Recall' },
    { cmd: '#todo Przygotować schemat !p1 ~25m', desc: 'Dodaj zadanie o priorytecie P1' },
    { cmd: '#review', desc: 'Uruchom powtórki FSRS due dzisiaj' },
    { cmd: '#stats', desc: 'Pokaż HUD skupienia' },
    { cmd: '#session finish', desc: 'Zakończ sesję i oceń zrozumienie' }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="max-w-xl w-full rounded-xl bg-[#141519] border border-[#282932] shadow-2xl overflow-hidden text-xs">
        {/* Command Input Bar */}
        <div className="p-3 flex items-center gap-2.5 border-b border-[#22242b] bg-[#101114]">
          <Terminal className="w-4 h-4 text-[#4A6B8A] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz komendę: #links, #test [Pytanie]|[Odp], #todo, #review, #session, #note..."
            className="w-full bg-transparent text-xs font-mono text-[#D8DAE0] placeholder-[#727683] focus:outline-none"
          />
          <kbd className="text-[10px] bg-[#1b1c22] text-[#727683] px-1.5 py-0.5 rounded border border-[#282932] font-mono">
            ESC
          </kbd>
        </div>

        {/* Command Help */}
        {previewHelp ? (
          <div className="p-2.5 bg-[#1b1c22] border-b border-[#22242b] text-[11px] text-[#4A6B8A] font-mono flex items-center gap-2">
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span>{previewHelp}</span>
          </div>
        ) : null}

        {/* Quick Command Suggestions */}
        <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4B4E58] px-2 py-1">
            Rejestr Komend
          </div>
          {quickCommands.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q.cmd)
                handleInputChange(q.cmd)
                inputRef.current?.focus()
              }}
              className="w-full p-2 rounded-lg flex items-center justify-between text-left hover:bg-[#1b1c22] transition-colors"
            >
              <span className="font-mono text-xs text-[#D8DAE0]">{q.cmd}</span>
              <span className="text-[10px] text-[#727683]">{q.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
