import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { nativeImage } from 'electron'
import { AssetRecord, VisualEntityRecord, EntityArchetype } from '../../shared/types/database'
import { DatabaseService } from './databaseService'

export class AssetService {
  private workspacePath: string | null = null
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
  }

  public setWorkspace(workspacePath: string): void {
    this.workspacePath = workspacePath
  }

  public async ingestMedia(options: {
    sourceFilePath?: string
    base64Data?: string
    fileName: string
    title: string
    archetype?: string
    linkedNoteId?: string
  }): Promise<{ entity: VisualEntityRecord; assetPath: string; thumbPath: string }> {
    if (!this.workspacePath) throw new Error('No workspace configured.')

    let buffer: Buffer
    if (options.sourceFilePath && fs.existsSync(options.sourceFilePath)) {
      buffer = fs.readFileSync(options.sourceFilePath)
    } else if (options.base64Data) {
      const cleanBase64 = options.base64Data.replace(/^data:image\/\w+;base64,/, '')
      buffer = Buffer.from(cleanBase64, 'base64')
    } else {
      throw new Error('No valid media payload supplied.')
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
    const ext = path.extname(options.fileName) || '.png'
    const storageRelPath = path.join('assets', 'images', `${sha256}${ext}`).replace(/\\/g, '/')
    const storageFullPath = path.join(this.workspacePath, storageRelPath)

    if (!fs.existsSync(storageFullPath)) {
      fs.writeFileSync(storageFullPath, buffer)
    }

    // Generate thumbnails using nativeImage
    const img = nativeImage.createFromBuffer(buffer)
    const size = img.getSize()
    const thumb256 = img.resize({ width: 256, quality: 'good' })
    const thumbRelPath = path.join('.cache', 'thumbnails', `${sha256}_256.png`).replace(/\\/g, '/')
    const thumbFullPath = path.join(this.workspacePath, thumbRelPath)

    try {
      fs.writeFileSync(thumbFullPath, thumb256.toPNG())
    } catch (err) {
      console.warn('Failed to write thumbnail:', err)
    }

    const assetRecord: AssetRecord = {
      asset_id: `asset_${sha256.slice(0, 12)}`,
      original_filename: options.fileName,
      storage_path: storageRelPath,
      thumbnail_path: thumbRelPath,
      mime_type: ext === '.svg' ? 'image/svg+xml' : 'image/png',
      byte_size: buffer.length,
      width: size.width || 256,
      height: size.height || 256,
      created_at: Date.now()
    }
    this.db.registerAsset(assetRecord)

    const slug = options.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)
    const entityId = `@entity_${slug}_${sha256.slice(0, 4)}`
    const entityRecord: VisualEntityRecord = {
      entity_id: entityId,
      title: options.title,
      media_asset_id: assetRecord.asset_id,
      linked_note_id: options.linkedNoteId || null,
      description_snippet: `Visual Entity: ${options.title}`,
      entity_type: (options.archetype as EntityArchetype) || 'concept',
      created_at: Date.now(),
      updated_at: Date.now()
    }
    this.db.registerEntity(entityRecord)

    return {
      entity: entityRecord,
      assetPath: storageRelPath,
      thumbPath: thumbRelPath
    }
  }
}
