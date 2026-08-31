export type SessionState =
  | 'IDLE'
  | 'CONFIGURING'
  | 'ACTIVE_FOCUS'
  | 'AUTO_PAUSED'
  | 'MANUAL_PAUSED'
  | 'EVALUATION_MODAL'
  | 'COMMITTED'
  | 'TERMINATED_ABORT'

export interface SessionContext {
  sessionId: string | null
  state: SessionState
  plannedMinutes: number
  effectiveFocusSeconds: number
  idleSeconds: number
  pausesCount: number
  selectedTaskIds: string[]
  createdNodeIds: string[]
  modifiedNodeIds: string[]
  createdEdgeIds: string[]
  deletedEdgeIds: string[]
  completedTaskIds: string[]
  addedVisualEntityIds: string[]
  srsReviewsCompleted: Array<{
    cardId: string
    grade: number
    latencyMs: number
    timestamp: number
  }>
  writtenCharactersDelta: number
  lastActiveTimestamp: number
  startedAt: number | null
}

export interface SessionDeltaSummary {
  nodesAdded: number
  edgesAdded: number
  tasksDone: number
  visualEntitiesAdded: number
  reviewsDone: number
  netChars: number
}

export interface DragEntityPayload {
  mimeType: 'application/x-cogni-entity'
  entityId: string
  title: string
  mediaThumbPath: string
  linkedNoteId: string | null
  tags: string[]
  defaultQuestionSnippet: string
}
