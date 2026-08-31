import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { FileItem, WorkspaceStats } from '../../shared/types/workspace'

export class FileSystemService {
  private workspacePath: string | null = null

  public setWorkspace(workspacePath: string): void {
    this.workspacePath = path.resolve(workspacePath)
  }

  public getWorkspace(): string | null {
    return this.workspacePath
  }

  public resolveSafePath(relativePath: string): string {
    if (!this.workspacePath) {
      throw new Error('No active workspace selected.')
    }
    // Prevent path traversal attacks
    const resolved = path.resolve(this.workspacePath, relativePath)
    if (!resolved.startsWith(this.workspacePath)) {
      throw new Error(`Access Denied: Path traversal detected for '${relativePath}'`)
    }
    return resolved
  }

  public initWorkspaceDirectories(workspacePath: string): void {
    this.setWorkspace(workspacePath)
    const dirs = [
      path.join(workspacePath, '.workspace'),
      path.join(workspacePath, '.workspace', 'history'),
      path.join(workspacePath, '.cache'),
      path.join(workspacePath, '.cache', 'thumbnails'),
      path.join(workspacePath, '.cache', 'temp_exports'),
      path.join(workspacePath, 'assets'),
      path.join(workspacePath, 'assets', 'images'),
      path.join(workspacePath, 'assets', 'diagrams'),
      path.join(workspacePath, 'assets', 'audio'),
      path.join(workspacePath, 'notes'),
      path.join(workspacePath, 'notes', 'Historia'),
      path.join(workspacePath, 'canvases')
    ]

    for (const d of dirs) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true })
      }
    }

    // Create a sample welcome note and canvas if the workspace is fresh
    const sampleNotePath = path.join(workspacePath, 'notes', 'Historia', 'Poniatowski.md')
    if (!fs.existsSync(sampleNotePath)) {
      const sampleMarkdown = `# Stanisław August Poniatowski

Ostatni król Polski, mecenas sztuki i współtwórca reform Sejmu Czteroletniego.

## Powiązane encje i fakty
- Współautor: [[Konstytucja 3 Maja]]
- Obiekt wiedzy: [[@entity_poniatowski_a8f9|Stanisław August Poniatowski]]
- Tag: #krol #reformy #wiek18

#test [W którym roku uchwalono Konstytucję 3 Maja?] | [1791 rok]`
      fs.writeFileSync(sampleNotePath, sampleMarkdown, 'utf-8')
    }

    const sampleCanvasPath = path.join(workspacePath, 'canvases', 'Rozbiory_Polski.canvas.json')
    if (!fs.existsSync(sampleCanvasPath)) {
      const sampleCanvas = {
        version: '1.3',
        canvas_id: 'canvases/Rozbiory_Polski.canvas.json',
        title: 'Rozbiory Polski i Sejm Czteroletni',
        viewport: { x: 0, y: 0, zoom: 1.0 },
        nodes: [
          {
            id: 'node_1',
            type: 'text_card',
            x: 100,
            y: 100,
            width: 280,
            height: 180,
            color: '#3B82F6',
            data: {
              title: 'Sejm Czteroletni (1788-1792)',
              markdown: 'Uchwalenie **Ustawy Rządowej** mającej na celu naprawę ustroju Rzeczypospolitej.'
            }
          },
          {
            id: 'node_2',
            type: 'visual_entity_node',
            x: 450,
            y: 100,
            width: 260,
            height: 280,
            color: '#8B5CF6',
            data: {
              entity_id: '@entity_poniatowski_a8f9',
              override_label: 'Stanisław August (Inicjator)',
              display_mode: 'card_with_preview',
              show_backlink_badge: true,
              title: 'Stanisław August Poniatowski'
            }
          },
          {
            id: 'node_3',
            type: 'quiz_card',
            x: 450,
            y: 430,
            width: 260,
            height: 160,
            color: '#F59E0B',
            data: {
              srs_card_id: 'q_sample_1',
              question: 'W którym roku uchwalono Konstytucję 3 Maja?',
              answer: '1791 rok',
              is_flipped: false
            }
          }
        ],
        edges: [
          {
            id: 'edge_1',
            fromNode: 'node_1',
            fromSide: 'right',
            toNode: 'node_2',
            toSide: 'left',
            label: 'INICJATOR REFORM',
            color: '#60A5FA',
            style: 'solid',
            bidirectional: false
          }
        ]
      }
      fs.writeFileSync(sampleCanvasPath, JSON.stringify(sampleCanvas, null, 2), 'utf-8')
    }
  }

  public readFile(relativePath: string): { content: string; hash: string; updatedAt: number } {
    const fullPath = this.resolveSafePath(relativePath)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath}`)
    }
    const buffer = fs.readFileSync(fullPath)
    const content = buffer.toString('utf-8')
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const stat = fs.statSync(fullPath)
    return {
      content,
      hash,
      updatedAt: stat.mtimeMs
    }
  }

  /**
   * Atomic file write:
   * 1. Write content to .workspace/temp_<uuid>.tmp
   * 2. fsync buffer to disk
   * 3. Atomic rename to target path
   * 4. Optional backup into .workspace/history/
   */
  public atomicWriteFile(relativePath: string, content: string, createBackup = true): { hash: string; updatedAt: number } {
    if (!this.workspacePath) throw new Error('No workspace active.')
    const fullPath = this.resolveSafePath(relativePath)
    const parentDir = path.dirname(fullPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    // If file exists and backup requested, create history diff
    if (createBackup && fs.existsSync(fullPath)) {
      try {
        const historyDir = path.join(this.workspacePath, '.workspace', 'history')
        const fileBase = path.basename(relativePath).replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        const backupName = `${Date.now()}_${fileBase}.bak`
        fs.copyFileSync(fullPath, path.join(historyDir, backupName))
      } catch (err) {
        console.warn('Failed to create history backup:', err)
      }
    }

    const tempDir = path.join(this.workspacePath, '.workspace')
    const tempFile = path.join(tempDir, `temp_${crypto.randomUUID()}.tmp`)

    const buffer = Buffer.from(content, 'utf-8')
    const fd = fs.openSync(tempFile, 'w')
    fs.writeSync(fd, buffer, 0, buffer.length, 0)
    fs.fsyncSync(fd)
    fs.closeSync(fd)

    // Atomic replace
    fs.renameSync(tempFile, fullPath)

    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const stat = fs.statSync(fullPath)
    return {
      hash,
      updatedAt: stat.mtimeMs
    }
  }

  public deleteFile(relativePath: string): boolean {
    const fullPath = this.resolveSafePath(relativePath)
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true })
      return true
    }
    return false
  }

  public createFolder(relativePath: string): boolean {
    const fullPath = this.resolveSafePath(relativePath)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      return true
    }
    return true
  }

  public renamePath(oldRelativePath: string, newName: string): { success: boolean; newPath: string } {
    const oldFullPath = this.resolveSafePath(oldRelativePath)
    if (!fs.existsSync(oldFullPath)) {
      throw new Error(`Path not found: ${oldRelativePath}`)
    }
    const parentDir = path.dirname(oldFullPath)
    const newFullPath = path.join(parentDir, newName)
    fs.renameSync(oldFullPath, newFullPath)
    const newRelative = path.relative(this.workspacePath!, newFullPath).replace(/\\/g, '/')
    return { success: true, newPath: newRelative }
  }

  public listFiles(subDir = ''): FileItem[] {
    if (!this.workspacePath) return []
    const targetDir = subDir ? this.resolveSafePath(subDir) : this.workspacePath
    return this.readDirRecursive(targetDir, this.workspacePath)
  }

  private readDirRecursive(currentDir: string, rootDir: string): FileItem[] {
    if (!fs.existsSync(currentDir)) return []
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    const items: FileItem[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue // Skip hidden like .workspace, .git, .cache
      const fullPath = path.join(currentDir, entry.name)
      const relative = path.relative(rootDir, fullPath).replace(/\\/g, '/')
      const stat = fs.statSync(fullPath)

      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          relativePath: relative,
          type: 'directory',
          updatedAt: stat.mtimeMs,
          children: this.readDirRecursive(fullPath, rootDir)
        })
      } else {
        const ext = path.extname(entry.name).toLowerCase()
        items.push({
          name: entry.name,
          relativePath: relative,
          type: 'file',
          extension: ext,
          sizeBytes: stat.size,
          updatedAt: stat.mtimeMs
        })
      }
    }
    return items
  }

  public getWorkspaceStats(): WorkspaceStats {
    if (!this.workspacePath) {
      return { notesCount: 0, canvasesCount: 0, entitiesCount: 0, cardsCount: 0, tasksCount: 0 }
    }
    const allFiles = this.listFiles()
    let notes = 0
    let canvases = 0

    function count(items: FileItem[]) {
      for (const item of items) {
        if (item.type === 'file') {
          if (item.extension === '.md') notes++
          if (item.extension === '.json' && item.name.includes('.canvas.')) canvases++
        } else if (item.children) {
          count(item.children)
        }
      }
    }
    count(allFiles)

    return {
      notesCount: notes,
      canvasesCount: canvases,
      entitiesCount: 0, // Augmented by DB
      cardsCount: 0,
      tasksCount: 0
    }
  }
}
