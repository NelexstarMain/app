export type ReviewGrade = 1 | 2 | 3 | 4

export interface FSRSWeights {
  w_D: number       // Difficulty delta weight (default ~0.5)
  w_S0: number      // Stability base multiplier (default ~0.4)
  w_S1: number      // Stability decay exponent (default ~0.2)
  w_S2: number      // Retrievability impact factor (default ~0.8)
  w_L0: number      // Lapse stability base (default ~0.2)
  w_L1: number      // Lapse difficulty exponent (default ~0.3)
  w_L2: number      // Lapse stability exponent (default ~0.4)
  targetRetention: number // default 0.90
}

export const DEFAULT_FSRS_WEIGHTS: FSRSWeights = {
  w_D: 0.5,
  w_S0: 0.4,
  w_S1: 0.2,
  w_S2: 0.8,
  w_L0: 0.3,
  w_L1: 0.3,
  w_L2: 0.4,
  targetRetention: 0.90
}

export interface FSRSState {
  stability: number   // S in days
  difficulty: number  // D in 1.0..10.0
  repetitions: number
  lapses: number
  lastReviewAt: number | null
  dueDate: number
}

export function calculateRetrievability(daysElapsed: number, stability: number): number {
  if (stability <= 0) return 0
  const factor = 19.0
  return Math.pow(1.0 + factor * (daysElapsed / stability), -0.5)
}

export function updateFSRS(
  currentState: FSRSState,
  grade: ReviewGrade,
  reviewTimestamp: number,
  weights: FSRSWeights = DEFAULT_FSRS_WEIGHTS
): FSRSState {
  const nowDays = reviewTimestamp / (1000 * 60 * 60 * 24)
  const lastReviewDays = currentState.lastReviewAt ? currentState.lastReviewAt / (1000 * 60 * 60 * 24) : nowDays
  const elapsedDays = Math.max(0, nowDays - lastReviewDays)

  const currentR = currentState.lastReviewAt ? calculateRetrievability(elapsedDays, currentState.stability) : 1.0

  // 1. Difficulty update
  const deltaD = -weights.w_D * (grade - 3)
  const newD = Math.max(1.0, Math.min(10.0, currentState.difficulty + deltaD))

  let newS: number
  let newLapses = currentState.lapses
  let newRepetitions = currentState.repetitions + 1

  if (grade === 1) {
    // Lapse
    newLapses += 1
    newS = Math.max(0.4, weights.w_L0 * Math.pow(newD, -weights.w_L1) * Math.pow(currentState.stability, weights.w_L2))
  } else {
    // Successful recall (2, 3, or 4)
    const gradeMultiplier = grade === 2 ? 0.7 : grade === 4 ? 1.4 : 1.0
    const sDelta = Math.exp(weights.w_S0) * (11 - newD) * Math.pow(currentState.stability, -weights.w_S1) * (Math.exp((1 - currentR) * weights.w_S2) - 1)
    newS = Math.max(0.5, currentState.stability * (1 + sDelta * gradeMultiplier))
  }

  // Interval in days
  const intervalDays = Math.max(1, Math.round(newS))
  const newDueDate = reviewTimestamp + intervalDays * 24 * 60 * 60 * 1000

  return {
    stability: Number(newS.toFixed(2)),
    difficulty: Number(newD.toFixed(2)),
    repetitions: newRepetitions,
    lapses: newLapses,
    lastReviewAt: reviewTimestamp,
    dueDate: newDueDate
  }
}
