import React from 'react'
import { FolderOpen, Sparkles, Database, ShieldCheck, Zap } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  onWorkspaceSelected: (path: string) => void
}

export const WorkspaceSelector: React.FC<Props> = ({ onWorkspaceSelected }) => {
  const handleOpenFolder = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.WORKSPACE_SELECT, undefined)
      if (res.path) {
        onWorkspaceSelected(res.path)
      }
    } catch (err) {
      console.error('Failed to select workspace:', err)
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-synapse-bg relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="max-w-xl w-full mx-4 frosted-glass p-8 rounded-2xl border border-synapse-border shadow-2xl relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-6 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <Sparkles className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          CogniCanvas <span className="text-emerald-400">v1.3</span>
        </h1>
        <p className="text-synapse-muted text-sm mb-8 leading-relaxed">
          Master Knowledge & Visual Thinking Desktop System. Local-First hybrid data model, Spaced Repetition (FSRS), and Force-Directed Graph Engine.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8 text-left">
          <div className="p-3 bg-synapse-surface/60 rounded-xl border border-synapse-border/40">
            <Database className="w-5 h-5 text-sky-400 mb-2" />
            <div className="text-xs font-semibold text-white">Local-First</div>
            <div className="text-[10px] text-synapse-muted">Pure Markdown & SQLite WAL</div>
          </div>
          <div className="p-3 bg-synapse-surface/60 rounded-xl border border-synapse-border/40">
            <Zap className="w-5 h-5 text-amber-400 mb-2" />
            <div className="text-xs font-semibold text-white">Focus Engine</div>
            <div className="text-[10px] text-synapse-muted">Anti-Idle & Session Glow</div>
          </div>
          <div className="p-3 bg-synapse-surface/60 rounded-xl border border-synapse-border/40">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="text-xs font-semibold text-white">Zero-Trust</div>
            <div className="text-[10px] text-synapse-muted">Context-Isolated Sandbox</div>
          </div>
        </div>

        <button
          onClick={handleOpenFolder}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
        >
          <FolderOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>Open Knowledge Workspace Folder</span>
        </button>

        <div className="mt-4 text-[11px] text-synapse-muted/70">
          Select any folder on your computer. An isolated <code className="text-emerald-400">.workspace/</code> database will be initialized automatically.
        </div>
      </div>
    </div>
  )
}
