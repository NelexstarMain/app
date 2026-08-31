import React, { useState, useEffect } from 'react'
import { X, BarChart3, Zap, Flame, Share2, Award, Clock, BookOpen, Shield } from 'lucide-react'
import { AnalyticsSummary } from '../../../../shared/types/analytics'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const AnalyticsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
  }, [isOpen])

  const loadStats = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_GET_ANALYTICS, undefined)
      if (res.analytics) {
        setAnalytics(res.analytics)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="max-w-2xl w-full frosted-glass rounded-2xl border border-synapse-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-synapse-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Deep Learning Analytics</h2>
              <p className="text-xs text-synapse-muted">Cognitive metrics, Flow Index, and Streak Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-synapse-muted hover:text-white hover:bg-synapse-surface">
            <X className="w-4 h-4" />
          </button>
        </div>

        {analytics && (
          <div className="my-6 space-y-4">
            {/* Primary KPI Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Flow Index */}
              <div className="p-4 rounded-xl bg-synapse-surface/60 border border-emerald-500/30">
                <div className="flex items-center justify-between text-xs text-synapse-muted mb-1">
                  <span>Flow Index (FI)</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{analytics.flowIndex.toFixed(2)}</div>
                <div className="text-[10px] text-emerald-300/80 mt-1">
                  {analytics.flowIndex >= 0.85 ? '🌟 Deep Thinker State' : 'Good Focus Flow'}
                </div>
              </div>

              {/* Streak */}
              <div className="p-4 rounded-xl bg-synapse-surface/60 border border-amber-500/30">
                <div className="flex items-center justify-between text-xs text-synapse-muted mb-1">
                  <span>Learning Streak</span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-amber-400">{analytics.currentStreakDays} Days</div>
                <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>1 Freeze Available</span>
                </div>
              </div>

              {/* Graph Growth Rate */}
              <div className="p-4 rounded-xl bg-synapse-surface/60 border border-sky-500/30">
                <div className="flex items-center justify-between text-xs text-synapse-muted mb-1">
                  <span>Growth Rate (GGR)</span>
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-sky-400">{analytics.graphGrowthRate}</div>
                <div className="text-[10px] text-sky-300/80 mt-1">Nodes & Edges / Hour</div>
              </div>
            </div>

            {/* Secondary Stats Breakdown */}
            <div className="p-4 rounded-xl bg-synapse-surface/40 border border-synapse-border/40 grid grid-cols-4 gap-3 text-center text-xs">
              <div>
                <Clock className="w-4 h-4 text-synapse-muted mx-auto mb-1" />
                <div className="font-bold text-white text-sm">{analytics.totalFocusHours}h</div>
                <div className="text-[10px] text-synapse-muted">Total Focus</div>
              </div>

              <div>
                <Share2 className="w-4 h-4 text-synapse-muted mx-auto mb-1" />
                <div className="font-bold text-white text-sm">{analytics.totalNodes}</div>
                <div className="text-[10px] text-synapse-muted">Total Nodes</div>
              </div>

              <div>
                <Award className="w-4 h-4 text-synapse-muted mx-auto mb-1" />
                <div className="font-bold text-white text-sm">{analytics.retentionRatePercent}%</div>
                <div className="text-[10px] text-synapse-muted">SRS Retention</div>
              </div>

              <div>
                <BookOpen className="w-4 h-4 text-synapse-muted mx-auto mb-1" />
                <div className="font-bold text-white text-sm">{analytics.totalCardsReviewed}</div>
                <div className="text-[10px] text-synapse-muted">Reviews Done</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-synapse-border/60">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-synapse-surface hover:bg-synapse-border text-xs font-semibold text-white transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
