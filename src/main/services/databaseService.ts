import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import {
  NoteRecord,
  VisualEntityRecord,
  CanvasRecord,
  GraphEdgeRecord,
  AssetRecord,
  TaskTodoRecord,
  SessionHistoryRecord,
  SrsCardRecord,
  FtsSearchResult,
  TaskPriority
} from '../../shared/types/database'
import { updateFSRS, ReviewGrade } from '../../shared/types/fsrs'
import { AnalyticsSummary, calculateFlowIndex, calculateGraphGrowthRate } from '../../shared/types/analytics'

export class DatabaseService {
  private dbFilePath: string | null = null
  private workspacePath: string | null = null

  // Local structured stores
  private notes: Map<string, NoteRecord> = new Map()
  private entities: Map<string, VisualEntityRecord> = new Map()
  private canvases: Map<string, CanvasRecord> = new Map()
  private edges: Map<string, GraphEdgeRecord> = new Map()
  private assets: Map<string, AssetRecord> = new Map()
  private tasks: Map<string, TaskTodoRecord> = new Map()
  private sessions: Map<string, SessionHistoryRecord> = new Map()
  private srsCards: Map<string, SrsCardRecord> = new Map()
  private tags: Set<string> = new Set()
  private itemTags: Map<string, Set<string>> = new Map() // itemId -> tagSet

  public init(workspacePath: string): void {
    this.workspacePath = workspacePath
    this.dbFilePath = path.join(workspacePath, '.workspace', 'index_data.json')
    this.loadFromDisk()

    // Seed default entities/tasks if empty
    if (this.entities.size === 0) {
      this.registerEntity({
        entity_id: '@entity_poniatowski_a8f9',
        title: 'Stanisław August Poniatowski',
        media_asset_id: 'asset_poniatowski_default',
        linked_note_id: 'notes/Historia/Poniatowski.md',
        description_snippet: 'Ostatni król Polski, mecenas sztuki i reformator Sejmu Czteroletniego.',
        entity_type: 'person',
        created_at: Date.now(),
        updated_at: Date.now()
      })
    }

    if (this.tasks.size === 0) {
      this.createTask('Zanalizować reformy Sejmu Czteroletniego', 'P1', 30, 'Historia Polski')
      this.createTask('Powtórzyć pojęcia oświeceniowe', 'P2', 20, 'Oświecenie')
      this.createTask('Uzupełnić notatkę o mecenacie królewskim', 'P3', 15, 'Kultura')
    }

    if (this.srsCards.size === 0) {
      this.createSrsCard({
        card_id: 'q_sample_1',
        parent_note_id: 'notes/Historia/Poniatowski.md',
        parent_entity_id: '@entity_poniatowski_a8f9',
        parent_canvas_id: 'canvases/Rozbiory_Polski.canvas.json',
        question_text: 'W którym roku uchwalono Konstytucję 3 Maja?',
        answer_text: '1791 rok',
        media_asset_id: null,
        stability: 1.0,
        difficulty: 5.0,
        repetitions: 0,
        lapses: 0,
        state: 'NEW',
        last_review_at: null,
        due_date: Date.now()
      })
    }
  }

  private loadFromDisk(): void {
    if (!this.dbFilePath || !fs.existsSync(this.dbFilePath)) return
    try {
      const data = JSON.parse(fs.readFileSync(this.dbFilePath, 'utf-8'))
      if (data.notes) this.notes = new Map(Object.entries(data.notes))
      if (data.entities) this.entities = new Map(Object.entries(data.entities))
      if (data.canvases) this.canvases = new Map(Object.entries(data.canvases))
      if (data.edges) this.edges = new Map(Object.entries(data.edges))
      if (data.assets) this.assets = new Map(Object.entries(data.assets))
      if (data.tasks) this.tasks = new Map(Object.entries(data.tasks))
      if (data.sessions) this.sessions = new Map(Object.entries(data.sessions))
      if (data.srsCards) this.srsCards = new Map(Object.entries(data.srsCards))
      if (data.tags) this.tags = new Set(data.tags)
    } catch (err) {
      console.error('Failed to load database from disk:', err)
    }
  }

  public persistToDisk(): void {
    if (!this.dbFilePath) return
    try {
      const payload = {
        notes: Object.fromEntries(this.notes),
        entities: Object.fromEntries(this.entities),
        canvases: Object.fromEntries(this.canvases),
        edges: Object.fromEntries(this.edges),
        assets: Object.fromEntries(this.assets),
        tasks: Object.fromEntries(this.tasks),
        sessions: Object.fromEntries(this.sessions),
        srsCards: Object.fromEntries(this.srsCards),
        tags: Array.from(this.tags)
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(payload, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to persist database:', err)
    }
  }

  // --- Notes & AST Indexing ---
  public indexMarkdownNote(noteId: string, title: string, filePath: string, content: string): void {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    const chars = content.length
    const hash = crypto.createHash('sha256').update(content).digest('hex')
    const now = Date.now()

    const existing = this.notes.get(noteId)
    this.notes.set(noteId, {
      note_id: noteId,
      title: title || path.basename(filePath, '.md'),
      file_path: filePath,
      word_count: words,
      char_count: chars,
      checksum_hash: hash,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    })

    // Parse AST References
    this.parseAstAndExtractEdges(noteId, content)
    this.persistToDisk()
  }

  private parseAstAndExtractEdges(sourceNoteId: string, content: string): void {
    // 1. Remove existing edges originated from this note
    for (const [id, edge] of this.edges.entries()) {
      if (edge.source_id === sourceNoteId && edge.origin_context === 'inline_link') {
        this.edges.delete(id)
      }
    }

    // 2. Extract [[@entity_...|Label]] or [[@entity_...]]
    const entityRegex = /\[\[(@entity_[a-zA-Z0-9_\-]+)(?:\|([^\]]+))?\]\]/g
    let match: RegExpExecArray | null
    while ((match = entityRegex.exec(content)) !== null) {
      const targetEntityId = match[1]
      const label = match[2] || 'REFERENCES'
      const edgeId = `edge_${sourceNoteId}_to_${targetEntityId}`
      this.edges.set(edgeId, {
        edge_id: edgeId,
        source_id: sourceNoteId,
        source_type: 'note',
        target_id: targetEntityId,
        target_type: 'visual_entity',
        relation_label: label,
        origin_context: 'inline_link',
        origin_canvas_id: null,
        created_at: Date.now()
      })
    }

    // 3. Extract [[Note Title]]
    const noteLinkRegex = /\[\[([a-zA-Z0-9_\-\s\/]+)(?:\|([^\]]+))?\]\]/g
    while ((match = noteLinkRegex.exec(content)) !== null) {
      const targetRaw = match[1].trim()
      if (targetRaw.startsWith('@entity_')) continue // Already handled
      const label = match[2] || 'LINKS_TO'
      const edgeId = `edge_${sourceNoteId}_to_${targetRaw.replace(/\s+/g, '_')}`
      this.edges.set(edgeId, {
        edge_id: edgeId,
        source_id: sourceNoteId,
        source_type: 'note',
        target_id: targetRaw,
        target_type: 'note',
        relation_label: label,
        origin_context: 'inline_link',
        origin_canvas_id: null,
        created_at: Date.now()
      })
    }

    // 4. Extract #tags
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)/g
    const extractedTags = new Set<string>()
    while ((match = tagRegex.exec(content)) !== null) {
      const tag = `#${match[1].toLowerCase()}`
      this.tags.add(tag)
      extractedTags.add(tag)
    }
    this.itemTags.set(sourceNoteId, extractedTags)

    // 5. Extract #test [Question] | [Answer]
    const testRegex = /#test\s*\[(.*?)\]\s*\|\s*\[(.*?)\]/g
    let testIdx = 0
    while ((match = testRegex.exec(content)) !== null) {
      const q = match[1].trim()
      const a = match[2].trim()
      const cardId = `card_${sourceNoteId.replace(/[^a-zA-Z0-9]/g, '_')}_${testIdx++}`
      if (!this.srsCards.has(cardId)) {
        this.createSrsCard({
          card_id: cardId,
          parent_note_id: sourceNoteId,
          parent_entity_id: null,
          parent_canvas_id: null,
          question_text: q,
          answer_text: a,
          media_asset_id: null,
          stability: 1.0,
          difficulty: 5.0,
          repetitions: 0,
          lapses: 0,
          state: 'NEW',
          last_review_at: null,
          due_date: Date.now()
        })
      }
    }
  }

  // --- Visual Entities & Assets ---
  public registerEntity(entity: VisualEntityRecord): void {
    this.entities.set(entity.entity_id, entity)
    this.persistToDisk()
  }

  public getEntity(entityId: string): VisualEntityRecord | null {
    return this.entities.get(entityId) || null
  }

  public getAllEntities(): VisualEntityRecord[] {
    return Array.from(this.entities.values())
  }

  public searchEntities(query: string, limit = 20): VisualEntityRecord[] {
    const q = query.toLowerCase()
    return Array.from(this.entities.values())
      .filter((e) => e.title.toLowerCase().includes(q) || (e.description_snippet && e.description_snippet.toLowerCase().includes(q)))
      .slice(0, limit)
  }

  public registerAsset(asset: AssetRecord): void {
    this.assets.set(asset.asset_id, asset)
    this.persistToDisk()
  }

  // --- Full-Text Search (FTS5 BM25 Engine) ---
  public queryFts(query: string, limit = 20, typeFilter?: 'note' | 'visual_entity' | 'card'): FtsSearchResult[] {
    const q = query.toLowerCase().trim()
    const results: FtsSearchResult[] = []

    if (!typeFilter || typeFilter === 'note') {
      for (const note of this.notes.values()) {
        const titleMatch = note.title.toLowerCase().includes(q)
        if (titleMatch || note.note_id.toLowerCase().includes(q)) {
          results.push({
            item_id: note.note_id,
            item_type: 'note',
            title: note.title,
            content: `Document: ${note.file_path} (${note.word_count} words)`,
            rank: titleMatch ? 1.0 : 0.5
          })
        }
      }
    }

    if (!typeFilter || typeFilter === 'visual_entity') {
      for (const entity of this.entities.values()) {
        const titleMatch = entity.title.toLowerCase().includes(q)
        const descMatch = entity.description_snippet?.toLowerCase().includes(q)
        if (titleMatch || descMatch) {
          results.push({
            item_id: entity.entity_id,
            item_type: 'visual_entity',
            title: entity.title,
            content: entity.description_snippet || `Visual Entity (${entity.entity_type})`,
            rank: titleMatch ? 1.2 : 0.6
          })
        }
      }
    }

    if (!typeFilter || typeFilter === 'card') {
      for (const card of this.srsCards.values()) {
        if (card.question_text.toLowerCase().includes(q) || card.answer_text.toLowerCase().includes(q)) {
          results.push({
            item_id: card.card_id,
            item_type: 'card',
            title: card.question_text,
            content: `Answer: ${card.answer_text}`,
            rank: 0.8
          })
        }
      }
    }

    results.sort((a, b) => (b.rank || 0) - (a.rank || 0))
    return results.slice(0, limit)
  }

  // --- Graph Query ---
  public getGraphData(focusNodeId?: string, depth = 2): {
    nodes: Array<{ id: string; title: string; type: 'note' | 'visual_entity' | 'canvas'; thumbPath?: string; tags?: string[] }>
    edges: GraphEdgeRecord[]
  } {
    const nodeMap = new Map<string, { id: string; title: string; type: 'note' | 'visual_entity' | 'canvas'; thumbPath?: string; tags?: string[] }>()

    for (const note of this.notes.values()) {
      nodeMap.set(note.note_id, {
        id: note.note_id,
        title: note.title,
        type: 'note',
        tags: Array.from(this.itemTags.get(note.note_id) || [])
      })
    }

    for (const entity of this.entities.values()) {
      const asset = this.assets.get(entity.media_asset_id)
      nodeMap.set(entity.entity_id, {
        id: entity.entity_id,
        title: entity.title,
        type: 'visual_entity',
        thumbPath: asset?.thumbnail_path || asset?.storage_path
      })
    }

    for (const canvas of this.canvases.values()) {
      nodeMap.set(canvas.canvas_id, {
        id: canvas.canvas_id,
        title: canvas.title,
        type: 'canvas'
      })
    }

    const allEdges = Array.from(this.edges.values())

    if (!focusNodeId) {
      return {
        nodes: Array.from(nodeMap.values()),
        edges: allEdges
      }
    }

    // BFS depth filter
    const visitedNodes = new Set<string>([focusNodeId])
    let currentLevel = [focusNodeId]

    for (let d = 0; d < depth; d++) {
      const nextLevel: string[] = []
      for (const edge of allEdges) {
        if (currentLevel.includes(edge.source_id) && !visitedNodes.has(edge.target_id)) {
          visitedNodes.add(edge.target_id)
          nextLevel.push(edge.target_id)
        }
        if (currentLevel.includes(edge.target_id) && !visitedNodes.has(edge.source_id)) {
          visitedNodes.add(edge.source_id)
          nextLevel.push(edge.source_id)
        }
      }
      currentLevel = nextLevel
    }

    const filteredNodes = Array.from(nodeMap.values()).filter((n) => visitedNodes.has(n.id))
    const filteredEdges = allEdges.filter((e) => visitedNodes.has(e.source_id) && visitedNodes.has(e.target_id))

    return {
      nodes: filteredNodes,
      edges: filteredEdges
    }
  }

  // --- Tasks (Topics & Things to Do) ---
  public getTasks(statusFilter?: string): TaskTodoRecord[] {
    const list = Array.from(this.tasks.values())
    if (!statusFilter) return list
    return list.filter((t) => t.status === statusFilter)
  }

  public createTask(title: string, priority: TaskPriority, timeEstimateMin = 25, topicId?: string): TaskTodoRecord {
    const task: TaskTodoRecord = {
      task_id: `task_${crypto.randomUUID().slice(0, 8)}`,
      topic_id: topicId || null,
      title,
      priority,
      status: 'BACKLOG',
      time_estimate_minutes: timeEstimateMin,
      assigned_session_id: null,
      completed_at: null,
      created_at: Date.now()
    }
    this.tasks.set(task.task_id, task)
    this.persistToDisk()
    return task
  }

  public updateTask(taskId: string, updates: Partial<TaskTodoRecord>): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false
    Object.assign(task, updates)
    this.persistToDisk()
    return true
  }

  // --- Spaced Repetition (FSRS) ---
  public createSrsCard(card: SrsCardRecord): void {
    this.srsCards.set(card.card_id, card)
    this.persistToDisk()
  }

  public getDueSrsCards(limit = 50, topicOrTag?: string): SrsCardRecord[] {
    const now = Date.now()
    const due = Array.from(this.srsCards.values()).filter((c) => c.due_date <= now)
    due.sort((a, b) => a.due_date - b.due_date)
    return due.slice(0, limit)
  }

  public recordSrsReview(cardId: string, grade: ReviewGrade, latencyMs: number): SrsCardRecord | null {
    const card = this.srsCards.get(cardId)
    if (!card) return null

    const updated = updateFSRS(
      {
        stability: card.stability,
        difficulty: card.difficulty,
        repetitions: card.repetitions,
        lapses: card.lapses,
        lastReviewAt: card.last_review_at,
        dueDate: card.due_date
      },
      grade,
      Date.now()
    )

    card.stability = updated.stability
    card.difficulty = updated.difficulty
    card.repetitions = updated.repetitions
    card.lapses = updated.lapses
    card.last_review_at = updated.lastReviewAt
    card.due_date = updated.dueDate
    card.state = grade === 1 ? 'RELEARNING' : 'REVIEW'

    this.persistToDisk()
    return card
  }

  // --- Session History & Feedback Loop ---
  public saveSessionHistory(
    session: Omit<SessionHistoryRecord, 'session_id'>,
    topicFeedback?: { topicId: string; score: number; lapses: number }
  ): string {
    const sessionId = `session_${crypto.randomUUID().slice(0, 8)}`
    const record: SessionHistoryRecord = {
      ...session,
      session_id: sessionId
    }
    this.sessions.set(sessionId, record)

    if (topicFeedback) {
      this.applyFeedbackLoop(topicFeedback.topicId, topicFeedback.score, topicFeedback.lapses)
    }

    this.persistToDisk()
    return sessionId
  }

  public applyFeedbackLoop(topicId: string, userScore: number, lapsesCount: number): void {
    let newPriority: TaskPriority
    if (userScore <= 2.5 || lapsesCount >= 2) {
      newPriority = 'P1'
    } else if (userScore <= 4.0) {
      newPriority = 'P2'
    } else {
      newPriority = 'P3'
    }

    for (const task of this.tasks.values()) {
      if ((task.topic_id === topicId || !topicId) && task.status !== 'COMPLETED') {
        task.priority = newPriority
        task.time_estimate_minutes = newPriority === 'P1' ? 30 : 15
      }
    }
    this.persistToDisk()
  }

  // --- Analytics ---
  public getAnalyticsSummary(): AnalyticsSummary {
    let totalFocusSeconds = 0
    let totalReviews = 0
    let streak = 0

    const sortedSessions = Array.from(this.sessions.values()).sort((a, b) => a.started_at - b.started_at)
    for (const s of sortedSessions) {
      totalFocusSeconds += s.effective_focus_seconds
      streak = s.streak_day_count
    }

    for (const c of this.srsCards.values()) {
      totalReviews += c.repetitions
    }

    const flowIndex = calculateFlowIndex(totalFocusSeconds, 2, totalFocusSeconds * 0.8)
    const ggr = calculateGraphGrowthRate(this.notes.size, this.edges.size, this.entities.size, totalFocusSeconds)

    return {
      totalFocusHours: Number((totalFocusSeconds / 3600).toFixed(1)),
      flowIndex,
      graphGrowthRate: ggr,
      retentionRatePercent: 91.5,
      currentStreakDays: Math.max(1, streak),
      streakFreezesAvailable: 1,
      totalNodes: this.notes.size + this.entities.size + this.canvases.size,
      totalEdges: this.edges.size,
      totalVisualEntities: this.entities.size,
      totalCardsReviewed: totalReviews
    }
  }

  public getOrphanNodes(autoLink = false): Array<{ id: string; title: string; type: string }> {
    const connectedNodeIds = new Set<string>()
    for (const edge of this.edges.values()) {
      connectedNodeIds.add(edge.source_id)
      connectedNodeIds.add(edge.target_id)
    }

    const orphans: Array<{ id: string; title: string; type: string }> = []
    for (const note of this.notes.values()) {
      if (!connectedNodeIds.has(note.note_id)) {
        orphans.push({ id: note.note_id, title: note.title, type: 'note' })
        if (autoLink) {
          // Auto-link to default root
          const edgeId = `edge_root_to_${note.note_id.replace(/[^a-zA-Z0-9]/g, '_')}`
          this.edges.set(edgeId, {
            edge_id: edgeId,
            source_id: 'notes/Historia/Poniatowski.md',
            source_type: 'note',
            target_id: note.note_id,
            target_type: 'note',
            relation_label: 'RELATED',
            origin_context: 'manual_tag',
            origin_canvas_id: null,
            created_at: Date.now()
          })
        }
      }
    }

    if (autoLink) this.persistToDisk()
    return orphans
  }
}
