import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { IpcChannel } from '../../shared/ipc/channels'
import { FileSystemService } from '../services/fileSystemService'
import { DatabaseService } from '../services/databaseService'
import { AssetService } from '../services/assetService'
import { RecoveryService } from '../services/recoveryService'
import * as path from 'path'

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  fsService: FileSystemService,
  dbService: DatabaseService,
  assetService: AssetService,
  recoveryService: RecoveryService
): void {
  // 1. Workspace
  ipcMain.handle(IpcChannel.WORKSPACE_SELECT, async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select CogniCanvas Workspace',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) {
      return { path: null }
    }
    const selected = res.filePaths[0]
    fsService.initWorkspaceDirectories(selected)
    dbService.init(selected)
    assetService.setWorkspace(selected)
    recoveryService.setWorkspace(selected)
    return { path: selected }
  })

  ipcMain.handle(IpcChannel.WORKSPACE_INIT, async (_, payload: { workspacePath: string }) => {
    try {
      fsService.initWorkspaceDirectories(payload.workspacePath)
      dbService.init(payload.workspacePath)
      assetService.setWorkspace(payload.workspacePath)
      recoveryService.setWorkspace(payload.workspacePath)
      const stats = fsService.getWorkspaceStats()
      return { success: true, stats }
    } catch (err: any) {
      return { success: false, stats: { notesCount: 0, canvasesCount: 0, entitiesCount: 0, cardsCount: 0, tasksCount: 0 }, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.WORKSPACE_GET_CURRENT, async () => {
    const current = fsService.getWorkspace()
    if (!current) return { path: null }
    const stats = fsService.getWorkspaceStats()
    return { path: current, stats }
  })

  // 2. File Operations
  ipcMain.handle(IpcChannel.FILE_READ, async (_, payload: { relativePath: string }) => {
    try {
      const res = fsService.readFile(payload.relativePath)
      return res
    } catch (err: any) {
      return { content: '', hash: '', updatedAt: 0, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.FILE_WRITE_ATOMIC, async (_, payload: { relativePath: string; content: string; createBackup?: boolean }) => {
    try {
      const res = fsService.atomicWriteFile(payload.relativePath, payload.content, payload.createBackup !== false)
      // If it is a note, reindex it in DB
      if (payload.relativePath.endsWith('.md')) {
        const title = path.basename(payload.relativePath, '.md')
        dbService.indexMarkdownNote(payload.relativePath, title, payload.relativePath, payload.content)
      }
      return { success: true, ...res }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.FILE_DELETE, async (_, payload: { relativePath: string }) => {
    try {
      const res = fsService.deleteFile(payload.relativePath)
      return { success: res }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.FILE_CREATE_FOLDER, async (_, payload: { relativePath: string }) => {
    try {
      const res = fsService.createFolder(payload.relativePath)
      return { success: res }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.FILE_RENAME, async (_, payload: { oldPath: string; newName: string }) => {
    try {
      const res = fsService.renamePath(payload.oldPath, payload.newName)
      return res
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.FILE_LIST, async (_, payload: { subDir?: string }) => {
    try {
      const items = fsService.listFiles(payload?.subDir || '')
      return { items }
    } catch (err: any) {
      return { items: [], error: err.message }
    }
  })

  // 3. Database & FTS5
  ipcMain.handle(IpcChannel.DB_QUERY_FTS, async (_, payload: { query: string; limit?: number; typeFilter?: 'note' | 'visual_entity' | 'card' }) => {
    try {
      const results = dbService.queryFts(payload.query, payload.limit || 20, payload.typeFilter)
      return { results }
    } catch (err: any) {
      return { results: [], error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_GET_GRAPH_DATA, async (_, payload: { focusNodeId?: string; depth?: number }) => {
    try {
      const data = dbService.getGraphData(payload?.focusNodeId, payload?.depth || 2)
      return data
    } catch (err: any) {
      return { nodes: [], edges: [], error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_CREATE_EDGES, async (_, payload: { edges: any[] }) => {
    try {
      if (payload.edges && payload.edges.length > 0) {
        dbService.createEdges(payload.edges)
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_GET_TASKS, async (_, payload: { status?: string }) => {
    try {
      const tasks = dbService.getTasks(payload?.status)
      return { tasks }
    } catch (err: any) {
      return { tasks: [], error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_CREATE_TASK, async (_, payload) => {
    try {
      const task = dbService.createTask(payload.title, payload.priority, payload.timeEstimateMin || 25, payload.topicId)
      return { task }
    } catch (err: any) {
      return { task: {} as any, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_UPDATE_TASK, async (_, payload) => {
    try {
      const success = dbService.updateTask(payload.taskId, {
        status: payload.status as any,
        priority: payload.priority,
        completed_at: payload.completedAt
      })
      return { success }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_DELETE_TASK, async (_, payload: { taskId: string }) => {
    try {
      const success = dbService.deleteTask(payload.taskId)
      return { success }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_GET_SRS_DUE, async (_, payload) => {
    try {
      const cards = dbService.getDueSrsCards(payload?.limit || 50, payload?.topicOrTag)
      return { cards }
    } catch (err: any) {
      return { cards: [], error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_RECORD_SRS_REVIEW, async (_, payload) => {
    try {
      const updatedCard = dbService.recordSrsReview(payload.cardId, payload.grade, payload.latencyMs)
      return { success: !!updatedCard, updatedCard: updatedCard || undefined }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_SAVE_SESSION_HISTORY, async (_, payload) => {
    try {
      const sessionId = dbService.saveSessionHistory(payload.session, payload.topicFeedback)
      return { success: true, sessionId }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_GET_ANALYTICS, async () => {
    try {
      const analytics = dbService.getAnalyticsSummary()
      return { analytics }
    } catch (err: any) {
      return { analytics: {} as any, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_REINDEX_ALL, async () => {
    const start = Date.now()
    try {
      const files = fsService.listFiles('notes')
      let count = 0
      function reindex(items: any[]) {
        for (const item of items) {
          if (item.type === 'file' && item.extension === '.md') {
            const data = fsService.readFile(item.relativePath)
            const title = path.basename(item.relativePath, '.md')
            dbService.indexMarkdownNote(item.relativePath, title, item.relativePath, data.content)
            count++
          } else if (item.children) {
            reindex(item.children)
          }
        }
      }
      reindex(files)
      return { success: true, count, durationMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, count: 0, durationMs: Date.now() - start, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_GET_ORPHANS, async (_, payload) => {
    try {
      const orphans = dbService.getOrphanNodes(payload?.autoLink)
      return { orphans }
    } catch (err: any) {
      return { orphans: [], error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.DB_APPLY_FEEDBACK, async (_, payload) => {
    try {
      dbService.applyFeedbackLoop(payload.topicId, payload.score, payload.lapses)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 4. Visual Entities & Assets
  ipcMain.handle(IpcChannel.ASSET_INGEST, async (_, payload) => {
    try {
      const res = await assetService.ingestMedia(payload)
      return res
    } catch (err: any) {
      return { entity: {} as any, assetPath: '', thumbPath: '', error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.ASSET_GET_ENTITY, async (_, payload) => {
    try {
      const entity = dbService.getEntity(payload.entityId)
      return { entity }
    } catch (err: any) {
      return { entity: null, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.ASSET_SEARCH_ENTITIES, async (_, payload) => {
    try {
      const entities = dbService.searchEntities(payload.query, payload.limit)
      return { entities }
    } catch (err: any) {
      return { entities: [], error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.ASSET_GET_ALL, async () => {
    try {
      const entities = dbService.getAllEntities()
      return { entities }
    } catch (err: any) {
      return { entities: [], error: err.message }
    }
  })

  // 5. Crash Recovery
  ipcMain.handle(IpcChannel.RECOVERY_SAVE_SNAPSHOT, async (_, payload) => {
    try {
      const success = recoveryService.saveSnapshot(payload.snapshotJson)
      return { success }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.RECOVERY_CHECK_SNAPSHOT, async () => {
    try {
      const res = recoveryService.checkSnapshot()
      return res
    } catch (err: any) {
      return { hasSnapshot: false, error: err.message }
    }
  })

  ipcMain.handle(IpcChannel.RECOVERY_CLEAR_SNAPSHOT, async () => {
    try {
      const success = recoveryService.clearSnapshot()
      return { success }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 6. App Utilities
  ipcMain.handle(IpcChannel.APP_GET_VERSION, async () => {
    return { version: '1.3.0', platform: process.platform }
  })

  ipcMain.handle(IpcChannel.SHELL_OPEN_EXTERNAL, async (_, payload: { url: string }) => {
    try {
      await shell.openExternal(payload.url)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
