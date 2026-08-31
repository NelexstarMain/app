import React from 'react'
import { X, Clock, Share2, CheckCircle2 } from 'lucide-react'
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
    <div className="fixed top-12 right-4 z-40 w-64 rounded-xl bg-[#141519]/95 border border-[#282932] p-3 shadow-2xl text-xs select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#22242b]">
        <span className="font-semibold text-[#D8DAE0] text-[11px]">HUD Skupienia</span>
        <button onClick={onClose} className="text-[#727683] hover:text-[#D8DAE0]">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between p-1.5 rounded bg-[#101114]">
          <span className="text-[#727683]">Czas skupienia</span>
          <span className="font-mono text-[#D8DAE0] font-medium">{formatTime(sessionContext.effectiveFocusSeconds)}</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-[#101114]">
          <span className="text-[#727683]">Nowe węzły/relacje</span>
          <span className="font-mono text-[#D8DAE0] font-medium">+{deltaSummary.nodesAdded} / +{deltaSummary.edgesAdded}</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-[#101114]">
          <span className="text-[#727683]">Ukończone zadania</span>
          <span className="font-mono text-[#D8DAE0] font-medium">{deltaSummary.tasksDone}</span>
        </div>
      </div>
    </div>
  )
}
