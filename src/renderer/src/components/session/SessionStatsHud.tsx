import React from 'react'
import { X, Clock, Share2, CheckCircle2, Award, Zap, Activity } from 'lucide-react'
import { SessionContext, SessionDeltaSummary } from '../../../../shared/types/session'

interface Props {
  sessionContext: SessionContext
  deltaSummary: SessionDeltaSummary
  onClose: () => void
}

export const SessionStatsHud: React.FC<Props> = ({ sessionContext, deltaSummary, onClose }) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="fixed top-16 right-4 z-40 w-72 frosted-glass rounded-2xl border border-synapse-border p-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-synapse-border/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live Session HUD</span>
        </div>
        <button onClick={onClose} className="text-synapse-muted hover:text-white p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2 rounded-lg bg-synapse-surface/60">
          <span className="text-synapse-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Effective Focus
          </span>
          <span className="font-mono font-bold text-emerald-300">
            {formatTime(sessionContext.effectiveFocusSeconds)}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-synapse-surface/60">
          <span className="text-synapse-muted flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Idle Accumulated
          </span>
          <span className="font-mono font-bold text-amber-300">
            {formatTime(sessionContext.idleSeconds)}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-synapse-surface/60">
          <span className="text-synapse-muted flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-sky-400" />
            Nodes / Edges Added
          </span>
          <span className="font-mono font-bold text-sky-300">
            +{deltaSummary.nodesAdded} / +{deltaSummary.edgesAdded}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-synapse-surface/60">
          <span className="text-synapse-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Completed Tasks
          </span>
          <span className="font-mono font-bold text-purple-300">{deltaSummary.tasksDone}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-synapse-border/40 text-[10px] text-synapse-muted/70 text-center">
        State: <span className="text-emerald-400 font-mono font-semibold">{sessionContext.state}</span>
      </div>
    </div>
  )
}
