export interface WorkspaceConfig {
  workspacePath: string
  name: string
  lastOpened: number
  theme: 'dark' | 'light'
  focusSettings: {
    idleWarningSeconds: number
    autoPauseCutoffSeconds: number
    debounceMs: number
  }
}

export interface WorkspaceStats {
  notesCount: number
  canvasesCount: number
  entitiesCount: number
  cardsCount: number
  tasksCount: number
}

export interface FileItem {
  name: string
  relativePath: string
  type: 'file' | 'directory'
  extension?: string
  sizeBytes?: number
  updatedAt: number
  children?: FileItem[]
}
