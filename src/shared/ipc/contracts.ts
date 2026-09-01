import { IpcChannel } from './channels'
import {
  NoteRecord,
  VisualEntityRecord,
  CanvasRecord,
  GraphEdgeRecord,
  TaskTodoRecord,
  SessionHistoryRecord,
  SrsCardRecord,
  FtsSearchResult,
  TaskPriority
} from '../types/database'
import { CanvasDocument } from '../types/canvas'
import { FileItem, WorkspaceStats } from '../types/workspace'
import { AnalyticsSummary } from '../types/analytics'
import { ReviewGrade } from '../types/fsrs'

export interface IpcContracts {
  // Workspace
  [IpcChannel.WORKSPACE_SELECT]: {
    request: void
    response: { path: string | null; error?: string }
  }
  [IpcChannel.WORKSPACE_INIT]: {
    request: { workspacePath: string }
    response: { success: boolean; stats: WorkspaceStats; error?: string }
  }
  [IpcChannel.WORKSPACE_GET_CURRENT]: {
    request: void
    response: { path: string | null; stats?: WorkspaceStats }
  }
  [IpcChannel.FILE_READ]: {
    request: { relativePath: string }
    response: { content: string; hash: string; updatedAt: number; error?: string }
  }
  [IpcChannel.FILE_WRITE_ATOMIC]: {
    request: { relativePath: string; content: string; createBackup?: boolean }
    response: { success: boolean; hash?: string; updatedAt?: number; error?: string }
  }
  [IpcChannel.FILE_DELETE]: {
    request: { relativePath: string }
    response: { success: boolean; error?: string }
  }
  [IpcChannel.FILE_CREATE_FOLDER]: {
    request: { relativePath: string }
    response: { success: boolean; error?: string }
  }
  [IpcChannel.FILE_RENAME]: {
    request: { oldPath: string; newName: string }
    response: { success: boolean; newPath?: string; error?: string }
  }
  [IpcChannel.FILE_LIST]: {
    request: { subDir?: string }
    response: { items: FileItem[]; error?: string }
  }

  // Database & FTS
  [IpcChannel.DB_QUERY_FTS]: {
    request: { query: string; limit?: number; typeFilter?: 'note' | 'visual_entity' | 'card' }
    response: { results: FtsSearchResult[]; error?: string }
  }
  [IpcChannel.DB_GET_GRAPH_DATA]: {
    request: { focusNodeId?: string; depth?: number }
    response: {
      nodes: Array<{
        id: string
        title: string
        type: 'note' | 'visual_entity' | 'canvas'
        thumbPath?: string
        mediaPath?: string
        tags?: string[]
      }>
      edges: GraphEdgeRecord[]
      error?: string
    }
  }
  [IpcChannel.DB_CREATE_EDGES]: {
    request: { edges: GraphEdgeRecord[] }
    response: { success: boolean; error?: string }
  }
  [IpcChannel.DB_GET_TASKS]: {
    request: { status?: string }
    response: { tasks: TaskTodoRecord[]; error?: string }
  }
  [IpcChannel.DB_CREATE_TASK]: {
    request: { title: string; priority: TaskPriority; timeEstimateMin?: number; topicId?: string }
    response: { task: TaskTodoRecord; error?: string }
  }
  [IpcChannel.DB_UPDATE_TASK]: {
    request: { taskId: string; status?: string; priority?: TaskPriority; completedAt?: number | null }
    response: { success: boolean; error?: string }
  }
  [IpcChannel.DB_DELETE_TASK]: {
    request: { taskId: string }
    response: { success: boolean; error?: string }
  }
  [IpcChannel.DB_GET_SRS_DUE]: {
    request: { limit?: number; topicOrTag?: string }
    response: { cards: SrsCardRecord[]; error?: string }
  }
  [IpcChannel.DB_RECORD_SRS_REVIEW]: {
    request: { cardId: string; grade: ReviewGrade; latencyMs: number }
    response: { success: boolean; updatedCard?: SrsCardRecord; error?: string }
  }
  [IpcChannel.DB_SAVE_SESSION_HISTORY]: {
    request: {
      session: Omit<SessionHistoryRecord, 'session_id'>
      topicFeedback?: { topicId: string; score: number; lapses: number }
    }
    response: { success: boolean; sessionId?: string; error?: string }
  }
  [IpcChannel.DB_GET_ANALYTICS]: {
    request: void
    response: { analytics: AnalyticsSummary; error?: string }
  }
  [IpcChannel.DB_REINDEX_ALL]: {
    request: void
    response: { success: boolean; count: number; durationMs: number; error?: string }
  }
  [IpcChannel.DB_GET_ORPHANS]: {
    request: { autoLink?: boolean }
    response: { orphans: Array<{ id: string; title: string; type: string }>; error?: string }
  }
  [IpcChannel.DB_APPLY_FEEDBACK]: {
    request: { topicId: string; score: number; lapses: number }
    response: { success: boolean; error?: string }
  }

  // Visual Entities & Assets
  [IpcChannel.ASSET_INGEST]: {
    request: {
      sourceFilePath?: string
      base64Data?: string
      fileName: string
      title: string
      archetype?: string
      linkedNoteId?: string
    }
    response: { entity: VisualEntityRecord; assetPath: string; thumbPath: string; error?: string }
  }
  [IpcChannel.ASSET_GET_ENTITY]: {
    request: { entityId: string }
    response: { entity: VisualEntityRecord | null; error?: string }
  }
  [IpcChannel.ASSET_SEARCH_ENTITIES]: {
    request: { query: string; limit?: number }
    response: { entities: VisualEntityRecord[]; error?: string }
  }
  [IpcChannel.ASSET_GET_ALL]: {
    request: void
    response: { entities: VisualEntityRecord[]; error?: string }
  }

  // Crash Recovery
  [IpcChannel.RECOVERY_SAVE_SNAPSHOT]: {
    request: { snapshotJson: string }
    response: { success: boolean; error?: string }
  }
  [IpcChannel.RECOVERY_CHECK_SNAPSHOT]: {
    request: void
    response: { hasSnapshot: boolean; snapshot?: any; error?: string }
  }
  [IpcChannel.RECOVERY_CLEAR_SNAPSHOT]: {
    request: void
    response: { success: boolean; error?: string }
  }

  // Configuration & Settings
  [IpcChannel.CONFIG_GET]: {
    request: void
    response: { config: any; rawJson: string; error?: string }
  }
  [IpcChannel.CONFIG_UPDATE]: {
    request: { configJson: string }
    response: { success: boolean; config?: any; error?: string }
  }
  [IpcChannel.CONFIG_RESET]: {
    request: void
    response: { success: boolean; config: any; rawJson: string; error?: string }
  }

  // App Utilities
  [IpcChannel.APP_GET_VERSION]: {
    request: void
    response: { version: string; platform: string }
  }
  [IpcChannel.SHELL_OPEN_EXTERNAL]: {
    request: { url: string }
    response: { success: boolean; error?: string }
  }
}

export interface IElectronAPI {
  invoke<K extends keyof IpcContracts>(
    channel: K,
    payload: IpcContracts[K]['request']
  ): Promise<IpcContracts[K]['response']>
  onEvent(channel: string, listener: (event: any, ...args: any[]) => void): () => void
}
