export type CanvasNodeType = 'text_card' | 'visual_entity_node' | 'quiz_card' | 'file_node'

export interface TextCardData {
  title: string
  markdown: string
}

export interface VisualEntityNodeData {
  entity_id: string
  override_label?: string
  display_mode?: 'card_with_preview' | 'avatar_only' | 'compact'
  show_backlink_badge?: boolean
  // Populated for rendering
  title?: string
  media_path?: string
  thumb_path?: string
  linked_note_id?: string | null
}

export interface QuizCardData {
  srs_card_id: string
  question: string
  answer: string
  is_flipped?: boolean
  stability?: number
  difficulty?: number
  due_date?: number
}

export interface CanvasNode<T = any> {
  id: string
  type: CanvasNodeType
  x: number
  y: number
  width: number
  height: number
  color?: string
  data: T
}

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left'
export type EdgeStyle = 'solid' | 'dashed' | 'dotted'

export interface CanvasEdge {
  id: string
  fromNode: string
  fromSide: EdgeSide
  toNode: string
  toSide: EdgeSide
  label?: string
  color?: string
  style?: EdgeStyle
  bidirectional?: boolean
}

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasDocument {
  version: '1.3'
  canvas_id: string
  title: string
  viewport: CanvasViewport
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}
