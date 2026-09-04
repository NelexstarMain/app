import React, { useState } from 'react'
import { Terminal, Command, Database, Layers } from 'lucide-react'
import { parseCliCommand, ParsedCommand } from '../../../../shared/types/commands'

interface Props {
  activePath: string | null
  activeType: string
  onExecuteCommand: (parsed: ParsedCommand) => void
}

export const BottomStatusBar: React.FC<Props> = ({
  activePath,
  activeType,
  onExecuteCommand
}) => {
  const [cmdText, setCmdText] = useState('')

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
    <footer className="h-6 bg-[#0a0c16] border-t border-[#422066] flex items-center justify-between px-3 text-[10px] text-[#8b87a8] z-30 select-none shrink-0 font-mono">
      {/* Left: Interactive Mini CLI Input */}
      <div className="flex items-center gap-1.5 flex-1 max-w-lg">
        <Terminal className="w-3 h-3 text-[#a855f7] shrink-0" />
        <input
          type="text"
          value={cmdText}
          onChange={(e) => setCmdText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="CLI: #todo [nazwa], #test [P]|[O], #note, #canvas, #review..."
          className="w-full bg-transparent text-[#f4f4f5] placeholder-[#8b87a8]/50 text-[10px] focus:outline-none"
        />
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-3 shrink-0 text-[#8b87a8]">
        {activePath && (
          <div className="flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-[#a855f7]" />
            <span className="text-[#c084fc] truncate max-w-[180px]">{activePath}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Database className="w-2.5 h-2.5 text-[#10b981]" />
          <span>SQLite WAL</span>
        </div>

        <div className="flex items-center gap-1 text-[#c084fc] bg-[#15182a] px-1.5 py-0.5 rounded-[3px] border border-[#422066]">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>
    </footer>
  )
}
