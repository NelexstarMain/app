import { parseCliCommand } from '../src/shared/types/commands'
import { updateFSRS, calculateRetrievability, DEFAULT_FSRS_WEIGHTS } from '../src/shared/types/fsrs'
import { SessionManager } from '../src/renderer/src/state/sessionStore'
import { calculateFlowIndex, calculateGraphGrowthRate } from '../src/shared/types/analytics'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  } else {
    console.log(`✅ Passed: ${message}`)
  }
}

console.log('=== RUNNING COGNICANVAS CORE TEST SUITE ===\n')

// 1. AST Command Parser Tests
console.log('--- 1. AST Command Parser Tests ---')
const cmd1 = parseCliCommand('#todo Przygotować schemat Sejmu !p1 ~25m --canvas:Rozbiory')
assert(cmd1 !== null, 'cmd1 parsed successfully')
assert(cmd1?.command === 'todo', 'command is todo')
assert(cmd1?.primaryArgument === 'Przygotować schemat Sejmu', 'primary argument parsed')
assert(cmd1?.flags.priority === 'p1', 'priority flag is p1')
assert(cmd1?.flags.timeEstimateMin === 25, 'time estimate is 25m')
assert(cmd1?.flags.targetCanvas === 'Rozbiory', 'target canvas is Rozbiory')

const cmd2 = parseCliCommand('#test Kto uchwalił Konstytucję 3 Maja? | Sejm Czteroletni')
assert(cmd2 !== null, 'cmd2 parsed successfully')
assert(cmd2?.command === 'test', 'command is test')
assert(cmd2?.primaryArgument === 'Kto uchwalił Konstytucję 3 Maja?', 'question parsed')
assert(cmd2?.secondaryArgument === 'Sejm Czteroletni', 'answer parsed')

// 2. FSRS Spaced Repetition Algorithm Tests
console.log('\n--- 2. FSRS Mathematical Calculation Tests ---')
const initialFSRS = {
  stability: 1.0,
  difficulty: 5.0,
  repetitions: 0,
  lapses: 0,
  lastReviewAt: Date.now() - 24 * 60 * 60 * 1000,
  dueDate: Date.now()
}

const rVal = calculateRetrievability(1, 1.0)
assert(rVal > 0 && rVal <= 1.0, `Retrievability is between 0 and 1 (${rVal})`)

const reviewedGood = updateFSRS(initialFSRS, 3, Date.now())
assert(reviewedGood.repetitions === 1, 'Repetitions incremented')
assert(reviewedGood.stability >= 1.0, `Stability increased on Good grade (${reviewedGood.stability})`)
assert(reviewedGood.dueDate > Date.now(), 'Due date is in future')

const reviewedLapse = updateFSRS(initialFSRS, 1, Date.now())
assert(reviewedLapse.lapses === 1, 'Lapse count incremented on Again grade')
assert(reviewedLapse.stability < reviewedGood.stability, 'Lapse stability is lower than Good grade')

// 3. Deterministic Session FSM & Anti-Idle Tests
console.log('\n--- 3. Session State Machine & Anti-Idle Tests ---')
const session = new SessionManager()
assert(session.getState() === 'IDLE', 'Initial state is IDLE')

session.openSetup()
assert(session.getState() === 'CONFIGURING', 'State transitioned to CONFIGURING')

session.startSession(25, ['task_1', 'task_2'])
assert(session.getState() === 'ACTIVE_FOCUS', 'State transitioned to ACTIVE_FOCUS')

session.pauseManual()
assert(session.getState() === 'MANUAL_PAUSED', 'State transitioned to MANUAL_PAUSED')

session.resumeManual()
assert(session.getState() === 'ACTIVE_FOCUS', 'State resumed to ACTIVE_FOCUS')

session.registerNodeCreated('node_123')
session.registerEdgeCreated('edge_456')
session.registerTaskCompleted('task_1')

const summary = session.getDeltaSummary()
assert(summary.nodesAdded === 1, 'SessionDeltaBuffer recorded 1 node added')
assert(summary.edgesAdded === 1, 'SessionDeltaBuffer recorded 1 edge added')
assert(summary.tasksDone === 1, 'SessionDeltaBuffer recorded 1 task done')

session.promptFinish()
assert(session.getState() === 'EVALUATION_MODAL', 'State transitioned to EVALUATION_MODAL')

const committed = session.commitSession()
assert(session.getState() === 'COMMITTED', 'State transitioned to COMMITTED')
assert(committed.completedTaskIds.includes('task_1'), 'Committed context preserved completed task')

// 4. Analytics Calculations Tests
console.log('\n--- 4. Analytics Formulas Tests ---')
const fi = calculateFlowIndex(3600, 1, 3000)
assert(fi > 0.7 && fi <= 1.0, `Flow Index correctly calculated (${fi})`)

const ggr = calculateGraphGrowthRate(5, 4, 2, 3600)
assert(ggr > 0, `Graph Growth Rate correctly calculated (${ggr})`)

console.log('\n=============================================')
console.log('🎉 ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY!')
console.log('=============================================\n')
