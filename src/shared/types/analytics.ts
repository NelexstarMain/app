export interface AnalyticsSummary {
  totalFocusHours: number
  flowIndex: number
  graphGrowthRate: number
  retentionRatePercent: number
  currentStreakDays: number
  streakFreezesAvailable: number
  totalNodes: number
  totalEdges: number
  totalVisualEntities: number
  totalCardsReviewed: number
}

export function calculateFlowIndex(
  effectiveFocusSec: number,
  pausesCount: number,
  longestContinuousSec: number
): number {
  if (effectiveFocusSec <= 0) return 0
  const hours = effectiveFocusSec / 3600
  const pausePenalty = (pausesCount / (hours + 1)) * 0.15
  const continuousRatio = Math.min(1.0, longestContinuousSec / effectiveFocusSec)
  const fi = continuousRatio * Math.max(0.1, 1 - pausePenalty)
  return Number(Math.min(1.0, Math.max(0, fi)).toFixed(2))
}

export function calculateGraphGrowthRate(
  deltaNodes: number,
  deltaEdges: number,
  deltaEntities: number,
  effectiveFocusSec: number
): number {
  const hours = Math.max(0.1, effectiveFocusSec / 3600)
  const ggr = (deltaNodes + 1.75 * deltaEdges + 0.5 * deltaEntities) / hours
  return Number(ggr.toFixed(2))
}
