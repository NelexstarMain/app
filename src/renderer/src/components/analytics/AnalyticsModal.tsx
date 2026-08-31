import React, { useState, useEffect } from 'react'
import { X, BarChart2, Zap, Flame, Share2, Award, Clock, BookOpen } from 'lucide-react'
import { AnalyticsSummary } from '../../../../shared/types/analytics'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const AnalyticsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    if (isOpen) loadStats()
  }, [isOpen])

  const loadStats = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_GET_ANALYTICS, undefined)
      if (res.analytics) setAnalytics(res.analytics)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="max-w-lg w-full rounded-xl bg-[#141519] border border-[#282932] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#22242b]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#38664B]" />
            <span className="font-semibold text-[#D8DAE0] text-xs">Analityka Skupienia i Wiedzy</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#727683] hover:text-[#D8DAE0]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {analytics && (
          <div className="my-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-[#101114] border border-[#22242b]">
                <div className="text-[10px] text-[#727683] mb-1">Flow Index</div>
                <div className="text-lg font-mono font-bold text-[#D8DAE0]">{analytics.flowIndex.toFixed(2)}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#101114] border border-[#22242b]">
                <div className="text-[10px] text-[#727683] mb-1">Seria Dni</div>
                <div className="text-lg font-mono font-bold text-[#D8DAE0]">{analytics.currentStreakDays} dni</div>
              </div>

              <div className="p-3 rounded-lg bg-[#101114] border border-[#22242b]">
                <div className="text-[10px] text-[#727683] mb-1">Rozwój Grafu</div>
                <div className="text-lg font-mono font-bold text-[#D8DAE0]">{analytics.graphGrowthRate}/h</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#101114] border border-[#22242b] grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="font-bold text-[#D8DAE0]">{analytics.totalFocusHours}h</div>
                <div className="text-[9px] text-[#727683]">Czas skupienia</div>
              </div>
              <div>
                <div className="font-bold text-[#D8DAE0]">{analytics.totalNodes}</div>
                <div className="text-[9px] text-[#727683]">Węzły</div>
              </div>
              <div>
                <div className="font-bold text-[#D8DAE0]">{analytics.retentionRatePercent}%</div>
                <div className="text-[9px] text-[#727683]">Retencja SRS</div>
              </div>
              <div>
                <div className="font-bold text-[#D8DAE0]">{analytics.totalCardsReviewed}</div>
                <div className="text-[9px] text-[#727683]">Powtórki</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-[#22242b]">
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-[#1b1c22] hover:bg-[#22242b] text-[11px] text-[#D8DAE0]"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}
