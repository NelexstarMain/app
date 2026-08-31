import { SessionContext, SessionState, SessionDeltaSummary } from '../../../shared/types/session'
import { LIMITS } from '../../../shared/constants/limits'

export class SessionManager {
  private context: SessionContext

  constructor() {
    this.context = this.getInitialContext()
  }

  public getInitialContext(): SessionContext {
    return {
      sessionId: null,
      state: 'IDLE',
      plannedMinutes: 25,
      effectiveFocusSeconds: 0,
      idleSeconds: 0,
      pausesCount: 0,
      selectedTaskIds: [],
      createdNodeIds: [],
      modifiedNodeIds: [],
      createdEdgeIds: [],
      deletedEdgeIds: [],
      completedTaskIds: [],
      addedVisualEntityIds: [],
      srsReviewsCompleted: [],
      writtenCharactersDelta: 0,
      lastActiveTimestamp: Date.now(),
      startedAt: null
    }
  }

  public getContext(): SessionContext {
    return { ...this.context }
  }

  public getState(): SessionState {
    return this.context.state
  }

  // --- FSM Transitions ---
  public openSetup(): void {
    if (this.context.state === 'IDLE' || this.context.state === 'COMMITTED' || this.context.state === 'TERMINATED_ABORT') {
      this.context = this.getInitialContext()
      this.context.state = 'CONFIGURING'
    }
  }

  public cancelSetup(): void {
    if (this.context.state === 'CONFIGURING') {
      this.context.state = 'IDLE'
    }
  }

  public startSession(plannedMinutes: number, selectedTaskIds: string[]): void {
    this.context.sessionId = `session_${Date.now()}`
    this.context.plannedMinutes = plannedMinutes
    this.context.selectedTaskIds = selectedTaskIds
    this.context.startedAt = Date.now()
    this.context.lastActiveTimestamp = Date.now()
    this.context.state = 'ACTIVE_FOCUS'
  }

  public pauseManual(): void {
    if (this.context.state === 'ACTIVE_FOCUS') {
      this.context.state = 'MANUAL_PAUSED'
      this.context.pausesCount += 1
    }
  }

  public resumeManual(): void {
    if (this.context.state === 'MANUAL_PAUSED' || this.context.state === 'AUTO_PAUSED') {
      this.context.lastActiveTimestamp = Date.now()
      this.context.state = 'ACTIVE_FOCUS'
    }
  }

  public promptFinish(): void {
    if (this.context.state === 'ACTIVE_FOCUS' || this.context.state === 'MANUAL_PAUSED' || this.context.state === 'AUTO_PAUSED') {
      this.context.state = 'EVALUATION_MODAL'
    }
  }

  public cancelFinishModal(): void {
    if (this.context.state === 'EVALUATION_MODAL') {
      this.context.state = 'ACTIVE_FOCUS'
    }
  }

  public commitSession(): SessionContext {
    this.context.state = 'COMMITTED'
    const snapshot = { ...this.context }
    return snapshot
  }

  public abortSession(): void {
    this.context.state = 'TERMINATED_ABORT'
  }

  public resetToIdle(): void {
    this.context = this.getInitialContext()
  }

  // --- Heartbeat & Anti-Idle ---
  public registerActivity(): void {
    const now = Date.now()
    this.context.lastActiveTimestamp = now

    if (this.context.state === 'AUTO_PAUSED') {
      this.context.state = 'ACTIVE_FOCUS'
    }
  }

  public onHeartbeatTick(): { stateChanged: boolean; newState: SessionState } {
    if (this.context.state !== 'ACTIVE_FOCUS') {
      return { stateChanged: false, newState: this.context.state }
    }

    const now = Date.now()
    const idleSeconds = (now - this.context.lastActiveTimestamp) / 1000

    if (idleSeconds >= LIMITS.AUTO_PAUSE_CUTOFF_SECONDS) {
      // Deduct full 300 seconds of inactivity cutoff
      this.context.effectiveFocusSeconds = Math.max(0, this.context.effectiveFocusSeconds - LIMITS.AUTO_PAUSE_CUTOFF_SECONDS)
      this.context.idleSeconds += LIMITS.AUTO_PAUSE_CUTOFF_SECONDS
      this.context.state = 'AUTO_PAUSED'
      return { stateChanged: true, newState: 'AUTO_PAUSED' }
    } else {
      this.context.effectiveFocusSeconds += 1
      return { stateChanged: false, newState: 'ACTIVE_FOCUS' }
    }
  }

  // --- SessionDeltaBuffer Mutators ---
  public registerNodeCreated(nodeId: string): void {
    if (!this.context.createdNodeIds.includes(nodeId)) {
      this.context.createdNodeIds.push(nodeId)
    }
  }

  public registerNodeModified(nodeId: string): void {
    if (!this.context.modifiedNodeIds.includes(nodeId)) {
      this.context.modifiedNodeIds.push(nodeId)
    }
  }

  public registerEdgeCreated(edgeId: string): void {
    if (!this.context.createdEdgeIds.includes(edgeId)) {
      this.context.createdEdgeIds.push(edgeId)
    }
  }

  public registerTaskCompleted(taskId: string): void {
    if (!this.context.completedTaskIds.includes(taskId)) {
      this.context.completedTaskIds.push(taskId)
    }
  }

  public registerVisualEntityAdded(entityId: string): void {
    if (!this.context.addedVisualEntityIds.includes(entityId)) {
      this.context.addedVisualEntityIds.push(entityId)
    }
  }

  public registerSrsReview(cardId: string, grade: number, latencyMs: number): void {
    this.context.srsReviewsCompleted.push({
      cardId,
      grade,
      latencyMs,
      timestamp: Date.now()
    })
  }

  public registerCharDelta(chars: number): void {
    this.context.writtenCharactersDelta += chars
  }

  public getDeltaSummary(): SessionDeltaSummary {
    return {
      nodesAdded: this.context.createdNodeIds.length,
      edgesAdded: this.context.createdEdgeIds.length,
      tasksDone: this.context.completedTaskIds.length,
      visualEntitiesAdded: this.context.addedVisualEntityIds.length,
      reviewsDone: this.context.srsReviewsCompleted.length,
      netChars: this.context.writtenCharactersDelta
    }
  }
}
