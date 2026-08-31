import { FileItem, WorkspaceStats } from '../../../shared/types/workspace'
import { CanvasDocument } from '../../../shared/types/canvas'
import { IpcChannel } from '../../../shared/ipc/channels'

export interface ActiveTab {
  id: string
  title: string
  path: string
  type: 'note' | 'canvas' | 'graph'
  isDirty?: boolean
}

export interface WorkspaceState {
  workspacePath: string | null
  stats: WorkspaceStats
  fileTree: FileItem[]
  activeTabId: string | null
  openTabs: ActiveTab[]
  activeNoteContent: string
  activeCanvasDoc: CanvasDocument | null
  drawerOpen: boolean
  commandPaletteOpen: boolean
  statsHudOpen: boolean
  reviewRunnerOpen: boolean
  analyticsModalOpen: boolean
  kickoffModalOpen: boolean
  evaluationModalOpen: boolean
}
