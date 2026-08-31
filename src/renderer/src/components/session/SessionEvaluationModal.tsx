import React, { useState } from 'react'
import { Award, CheckCircle2, Clock, Share2, Star, X, ArrowRight, Zap } from 'lucide-react'
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

  const getPriorityExplanation = (val: number) => {
    if (val <= 2.5) {
      return {
        label: 'Needs Immediate Review (P1)',
        color: 'text-rose-400',
        interval: 'Scheduled for tomorrow morning'
      }
    } else if (val <= 4.0) {
      return {
        label: 'Solid Retention (P2)',
        color: 'text-amber-400',
        interval: 'Scheduled in 3 to 5 days'
      }
    } else {
      return {
        label: 'High Mastery (P3)',
        color: 'text-emerald-400',
        interval: 'Archived to 14-day cycle'
      }
    }
  }

  const explanation = getPriorityExplanation(score)

  const handleSave = () => {
    onCommit(score)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-lg w-full frosted-glass rounded-2xl border border-synapse-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-synapse-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Session Summary & Evaluation (Step 3)</h2>
              <p className="text-xs text-synapse-muted">Instant RAM aggregation in &lt;1 ms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Delta Metrics Grid */}
        <div className="my-5 grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 bg-synapse-surface/70 rounded-xl border border-synapse-border/40">
            <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white">{formatMinSec(sessionContext.effectiveFocusSeconds)}</div>
            <div className="text-[10px] text-synapse-muted">Effective Focus</div>
          </div>

          <div className="p-3 bg-synapse-surface/70 rounded-xl border border-synapse-border/40">
            <Share2 className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white">+{deltaSummary.nodesAdded} / +{deltaSummary.edgesAdded}</div>
            <div className="text-[10px] text-synapse-muted">Nodes / Edges</div>
          </div>

          <div className="p-3 bg-synapse-surface/70 rounded-xl border border-synapse-border/40">
            <CheckCircle2 className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white">{deltaSummary.tasksDone} Tasks</div>
            <div className="text-[10px] text-synapse-muted">{deltaSummary.reviewsDone} Reviews</div>
          </div>
        </div>

        {/* Self-Evaluation Rating Slider */}
        <div className="mb-6 p-4 bg-synapse-surface/40 rounded-xl border border-synapse-border/40">
          <div className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
            <span>Self-Evaluation: Understanding Score</span>
            <span className="font-mono text-amber-400 font-bold text-sm">{score.toFixed(1)} / 5.0</span>
          </div>

          <div className="flex items-center justify-between gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setScore(star)}
                className={`flex-1 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  score >= star
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-synapse-bg/40 border-synapse-border/50 text-synapse-muted hover:text-white'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${score >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{star}</span>
              </button>
            ))}
          </div>

          {/* Feedback Loop Explanation */}
          <div className="p-2.5 rounded-lg bg-synapse-bg/70 border border-synapse-border/30 text-[11px] flex items-center gap-2">
            <Zap className={`w-4 h-4 shrink-0 ${explanation.color}`} />
            <div>
              <span className={`font-semibold ${explanation.color}`}>{explanation.label}: </span>
              <span className="text-synapse-muted">{explanation.interval}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-synapse-border/60">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
          >
            Resume Session
          </button>
          <button
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <span>Commit & Save Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
