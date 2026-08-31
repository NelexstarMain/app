export interface NoteRecord {
  note_id: string
  title: string
  file_path: string
  word_count: number
  char_count: number
  checksum_hash: string
  created_at: number
  updated_at: number
}

export type EntityArchetype = 'person' | 'event' | 'concept' | 'formula' | 'artwork' | 'location'

export interface VisualEntityRecord {
  entity_id: string
  title: string
  media_asset_id: string
  linked_note_id: string | null
  description_snippet: string | null
  entity_type: EntityArchetype
  created_at: number
  updated_at: number
}

export interface CanvasRecord {
  canvas_id: string
  title: string
  file_path: string
  node_count: number
  edge_count: number
  created_at: number
  updated_at: number
}

export type GraphNodeType = 'note' | 'visual_entity' | 'canvas' | 'block'
export type EdgeOrigin = 'inline_link' | 'canvas_arrow' | 'manual_tag'

export interface GraphEdgeRecord {
  edge_id: string
  source_id: string
  source_type: GraphNodeType
  target_id: string
  target_type: GraphNodeType
  relation_label: string | null
  origin_context: EdgeOrigin
  origin_canvas_id: string | null
  created_at: number
}

export interface AssetRecord {
  asset_id: string
  original_filename: string
  storage_path: string
  thumbnail_path: string | null
  mime_type: string
  byte_size: number
  width: number | null
  height: number | null
  created_at: number
}

export type TaskPriority = 'P1' | 'P2' | 'P3'
export type TaskStatus = 'BACKLOG' | 'SELECTED_FOR_SESSION' | 'COMPLETED' | 'ARCHIVED'

export interface TaskTodoRecord {
  task_id: string
  topic_id: string | null
  title: string
  priority: TaskPriority
  status: TaskStatus
  time_estimate_minutes: number
  assigned_session_id: string | null
  completed_at: number | null
  created_at: number
}

export interface SessionHistoryRecord {
  session_id: string
  started_at: number
  ended_at: number
  planned_duration_minutes: number | null
  effective_focus_seconds: number
  idle_seconds: number
  pauses_count: number
  tasks_completed_count: number
  nodes_created_count: number
  edges_created_count: number
  notes_written_count: number
  user_self_eval_score: number | null
  streak_day_count: number
}

export type SrsCardState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING'

export interface SrsCardRecord {
  card_id: string
  parent_note_id: string | null
  parent_entity_id: string | null
  parent_canvas_id: string | null
  question_text: string
  answer_text: string
  media_asset_id: string | null
  stability: number
  difficulty: number
  repetitions: number
  lapses: number
  state: SrsCardState
  last_review_at: number | null
  due_date: number
}

export interface TagRecord {
  tag_name: string
}

export interface ItemTagRecord {
  tag_name: string
  item_id: string
  item_type: 'note' | 'entity' | 'canvas'
}

export interface FtsSearchResult {
  item_id: string
  item_type: 'note' | 'visual_entity' | 'card'
  title: string
  content?: string
  tags?: string
  rank?: number
}
