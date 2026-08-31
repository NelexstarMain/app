import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Search, HelpCircle, CheckSquare, Plus, ArrowRight, Play, Eye, Share2, BarChart2 } from 'lucide-react'
import { parseCliCommand, ParsedCommand } from '../../../../shared/types/commands'
import { IpcChannel } from '../../../../shared/ipc/channels'

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
      setPreviewHelp('#links [fraza] [--type:img|note|all] — Otwiera boczny panel Asset Drawer z rankingiem BM25')
    } else if (lower.startsWith('#test') || lower.startsWith('/test')) {
      setPreviewHelp('#test [Pytanie] | [Odpowiedź] — Tworzy kartę Active Recall i indeksuje w SRS')
    } else if (lower.startsWith('#todo') || lower.startsWith('/todo')) {
      setPreviewHelp('#todo [Treść] [!p1|!p2|!p3] [~minuty] — Dodaje zadanie do kolejki bieżącej sesji')
    } else if (lower.startsWith('#session')) {
      setPreviewHelp('#session [pause | resume | finish | abort] — Zmienia stan maszyny sesji')
    } else if (lower.startsWith('#note')) {
      setPreviewHelp('#note [tytuł] [--folder:ścieżka] — Tworzy nowy plik Markdown w notes/')
    } else if (lower.startsWith('#canvas')) {
      setPreviewHelp('#canvas [nazwa] — Tworzy nowe płótno wizualne .canvas.json')
    } else if (lower.startsWith('#review')) {
      setPreviewHelp('#review — Uruchamia pełnoekranowy tryb powtórek FSRS Flashcards')
    } else if (lower.startsWith('#stats')) {
      setPreviewHelp('#stats — Wyświetla pływający panel HUD z metrykami skupienia')
    } else if (lower.startsWith('#orphan')) {
      setPreviewHelp('#orphan [--auto-link] — Wykrywa węzły o stopniu 0 i pozwala je powiązać')
    } else {
      setPreviewHelp(null)
    }
  }

  const quickCommands = [
    { cmd: '#links Poniatowski', desc: 'Wyszukaj encje i notatki w Asset Drawer' },
    { cmd: '#test Kiedy powstał Sejm Czteroletni? | 1788 rok', desc: 'Utwórz fiszkę Active Recall' },
    { cmd: '#todo Przygotować schemat Sejmu !p1 ~25m', desc: 'Dodaj zadanie o priorytecie P1' },
    { cmd: '#review', desc: 'Uruchom powtórki FSRS due dzisiaj' },
    { cmd: '#stats', desc: 'Pokaż HUD skupienia w czasie rzeczywistym' },
    { cmd: '#session finish', desc: 'Zakończ sesję i otwórz modal oceny' }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-24 p-4">
      <div className="max-w-2xl w-full frosted-glass rounded-2xl border border-synapse-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Command Input Bar */}
        <div className="p-4 flex items-center gap-3 border-b border-synapse-border/60 bg-synapse-card/80">
          <Terminal className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command: #links, #test [Q]|[A], #todo, #review, #session, #note..."
            className="w-full bg-transparent text-sm font-mono text-white placeholder-synapse-muted focus:outline-none"
          />
          <kbd className="text-[10px] bg-synapse-surface text-synapse-muted px-2 py-0.5 rounded border border-synapse-border font-mono">
            ESC
          </kbd>
        </div>

        {/* Command Help / Hints */}
        {previewHelp ? (
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 font-mono flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            <span>{previewHelp}</span>
          </div>
        ) : (
          <div className="p-3 bg-synapse-bg/50 border-b border-synapse-border/30 text-[11px] text-synapse-muted">
            Tip: Commands start with <code className="text-emerald-400 font-mono">#</code> or <code className="text-sky-400 font-mono">/</code>. Press Enter to execute.
          </div>
        )}

        {/* Quick Command Suggestions */}
        <div className="p-2 max-h-64 overflow-y-auto space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-synapse-muted/60 px-3 py-1">
            System Commands Registry
          </div>
          {quickCommands.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q.cmd)
                handleInputChange(q.cmd)
                inputRef.current?.focus()
              }}
              className="w-full p-2.5 rounded-xl flex items-center justify-between text-left hover:bg-synapse-surface/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-emerald-400 font-semibold group-hover:text-emerald-300">
                  {q.cmd}
                </span>
              </div>
              <span className="text-[11px] text-synapse-muted">{q.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
