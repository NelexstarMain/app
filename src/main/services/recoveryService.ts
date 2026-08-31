import * as fs from 'fs'
import * as path from 'path'

export class RecoveryService {
  private workspacePath: string | null = null

  public setWorkspace(workspacePath: string): void {
    this.workspacePath = workspacePath
  }

  private getSnapshotPath(): string | null {
    if (!this.workspacePath) return null
    return path.join(this.workspacePath, '.workspace', 'session_current.json')
  }

  public saveSnapshot(snapshotJson: string): boolean {
    const snapPath = this.getSnapshotPath()
    if (!snapPath) return false
    try {
      fs.writeFileSync(snapPath, snapshotJson, 'utf-8')
      return true
    } catch (err) {
      console.warn('Failed to write crash snapshot:', err)
      return false
    }
  }

  public checkSnapshot(): { hasSnapshot: boolean; snapshot?: any } {
    const snapPath = this.getSnapshotPath()
    if (!snapPath || !fs.existsSync(snapPath)) {
      return { hasSnapshot: false }
    }
    try {
      const content = fs.readFileSync(snapPath, 'utf-8')
      const parsed = JSON.parse(content)
      return { hasSnapshot: true, snapshot: parsed }
    } catch {
      return { hasSnapshot: false }
    }
  }

  public clearSnapshot(): boolean {
    const snapPath = this.getSnapshotPath()
    if (snapPath && fs.existsSync(snapPath)) {
      try {
        fs.unlinkSync(snapPath)
        return true
      } catch {
        return false
      }
    }
    return true
  }
}
