import React, { useState } from 'react'
import { X, Award, Star, ArrowRight } from 'lucide-react'
import { SessionContext, SessionDeltaSummary } from '../../../../shared/types/session'

interface Props {
  sessionContext: SessionContext
  deltaSummary: SessionDeltaSummary
  onClose: () => void
  onCommit: (evalScore: number, feedbackTopicId?: string) => void
}

export const SessionEvaluationModal: React.FC<Props> = ({
  sessionContext,
  deltaSummary,
  onClose,
  onCommit
}) => {
  const [score, setScore] = useState<number>(4.0)

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="max-w-md w-full rounded-xl bg-[#141519] border border-[#282932] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#22242b]">
          <span className="font-semibold text-[#D8DAE0]">Podsumowanie i Ocena Sesji (Krok 3)</span>
          <button onClick={onClose} className="p-1 rounded text-[#727683] hover:text-[#D8DAE0]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Delta Metrics */}
        <div className="my-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 bg-[#101114] rounded-lg border border-[#22242b]">
            <div className="text-xs font-bold text-[#D8DAE0]">{formatMinSec(sessionContext.effectiveFocusSeconds)}</div>
            <div className="text-[9px] text-[#727683]">Czas skupienia</div>
          </div>

          <div className="p-2.5 bg-[#101114] rounded-lg border border-[#22242b]">
            <div className="text-xs font-bold text-[#D8DAE0]">+{deltaSummary.nodesAdded} / +{deltaSummary.edgesAdded}</div>
            <div className="text-[9px] text-[#727683]">Węzły / Relacje</div>
          </div>

          <div className="p-2.5 bg-[#101114] rounded-lg border border-[#22242b]">
            <div className="text-xs font-bold text-[#D8DAE0]">{deltaSummary.tasksDone}</div>
            <div className="text-[9px] text-[#727683]">Zadania ukończone</div>
          </div>
        </div>

        {/* Self-Evaluation */}
        <div className="mb-4 p-3 bg-[#101114] rounded-lg border border-[#22242b]">
          <div className="text-[11px] text-[#727683] mb-2 flex items-center justify-between">
            <span>Ocena zrozumienia materiału:</span>
            <span className="font-mono font-bold text-[#D8DAE0]">{score.toFixed(1)} / 5.0</span>
          </div>

          <div className="flex items-center justify-between gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setScore(star)}
                className={`flex-1 py-1.5 rounded border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  score >= star
                    ? 'bg-[#1b1c22] border-[#8C6D37] text-[#D8DAE0]'
                    : 'bg-[#141519] border-[#22242b] text-[#727683]'
                }`}
              >
                <Star className={`w-3 h-3 ${score >= star ? 'fill-[#8C6D37] text-[#8C6D37]' : ''}`} />
                <span>{star}</span>
              </button>
            ))}
          </div>

          <div className="text-[10px] text-[#727683]">
            {score <= 2.5 ? '⚠️ Priorytet P1: Powtórka jutro rano' : score <= 4.0 ? '✓ Priorytet P2: Powtórka za 3-4 dni' : '🌟 Priorytet P3: Opanowane'}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#22242b]">
          <button onClick={onClose} className="py-1.5 px-3 rounded text-[11px] text-[#727683] hover:text-[#D8DAE0]">
            Wznów
          </button>
          <button
            onClick={() => onCommit(score)}
            className="py-1.5 px-4 rounded bg-[#1b1c22] hover:bg-[#22242b] border border-[#282932] text-[#D8DAE0] text-[11px] font-medium flex items-center gap-1"
          >
            <span>Zapisz sesję</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
