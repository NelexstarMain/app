import React, { useState } from 'react'
import { Terminal, Command, Zap, Layers } from 'lucide-react'
import { parseCliCommand, ParsedCommand } from '../../../../shared/types/commands'

interface Props {
  activePath: string | null
  activeType: 'note' | 'canvas' | 'graph'
  onExecuteCommand: (parsed: ParsedCommand) => void
}

export const BottomStatusBar: React.FC<Props> = ({
  activePath,
  activeType,
  onExecuteCommand
}) => {
  const [cmdText, setCmdText] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && cmdText.trim()) {
      const parsed = parseCliCommand(cmdText.trim())
      if (parsed) {
        onExecuteCommand(parsed)
        setCmdText('')
      }
    } else if (e.key === 'Escape') {
      setCmdText('')
      e.currentTarget.blur()
    }
  }

  return (
    <footer className="h-7 bg-[#09090b] border-t border-[#27272a] flex items-center justify-between px-3 text-[11px] text-[#a1a1aa] z-30 select-none">
      {/* Left: Interactive Mini CLI Input */}
      <div className="flex items-center gap-2 flex-1 max-w-lg">
        <Terminal className="w-3 h-3 text-[#38bdf8] shrink-0" />
        <input
          type="text"
          value={cmdText}
          onChange={(e) => setCmdText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Wpisz komendę CLI (#todo, #test [P]|[O], #note, #canvas, #review)..."
          className="w-full bg-transparent text-[#f4f4f5] placeholder-[#52525b] font-mono text-[11px] focus:outline-none"
        />
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-3 shrink-0 text-[#71717a] font-mono text-[10px]">
        {activePath && (
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] truncate max-w-[180px]">{activePath}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          <span>Local-First WAL</span>
        </div>

        <div className="flex items-center gap-1 text-[#a1a1aa]">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>
    </footer>
  )
}
