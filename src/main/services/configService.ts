import * as fs from 'fs'
import * as path from 'path'
import { AppConfig, DEFAULT_APP_CONFIG } from '../../shared/types/config'

export class ConfigService {
  private workspacePath: string | null = null
  private currentConfig: AppConfig = DEFAULT_APP_CONFIG

  public setWorkspace(workspacePath: string): void {
    this.workspacePath = workspacePath
    this.initConfigFile()
  }

  private getConfigPath(): string {
    if (!this.workspacePath) throw new Error('No workspace active')
    return path.join(this.workspacePath, 'config.json')
  }

  private getBackupConfigPath(): string {
    if (!this.workspacePath) throw new Error('No workspace active')
    return path.join(this.workspacePath, '.workspace', 'default_config.json')
  }

  public initConfigFile(): void {
    if (!this.workspacePath) return
    const cfgPath = this.getConfigPath()
    const backupPath = this.getBackupConfigPath()

    // Ensure workspace folder exists
    const wsDir = path.dirname(backupPath)
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true })
    }

    // Write permanent default backup
    fs.writeFileSync(backupPath, JSON.stringify(DEFAULT_APP_CONFIG, null, 2), 'utf-8')

    if (!fs.existsSync(cfgPath)) {
      fs.writeFileSync(cfgPath, JSON.stringify(DEFAULT_APP_CONFIG, null, 2), 'utf-8')
      this.currentConfig = DEFAULT_APP_CONFIG
    } else {
      try {
        const content = fs.readFileSync(cfgPath, 'utf-8')
        this.currentConfig = { ...DEFAULT_APP_CONFIG, ...JSON.parse(content) }
      } catch (err) {
        console.warn('Failed to parse config.json, using defaults:', err)
        this.currentConfig = DEFAULT_APP_CONFIG
      }
    }
  }

  public getConfig(): { config: AppConfig; rawJson: string } {
    if (!this.workspacePath) {
      return { config: DEFAULT_APP_CONFIG, rawJson: JSON.stringify(DEFAULT_APP_CONFIG, null, 2) }
    }
    const cfgPath = this.getConfigPath()
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf-8')
        this.currentConfig = { ...DEFAULT_APP_CONFIG, ...JSON.parse(raw) }
        return { config: this.currentConfig, rawJson: raw }
      }
    } catch {
      // Return memory config
    }
    return { config: DEFAULT_APP_CONFIG, rawJson: JSON.stringify(DEFAULT_APP_CONFIG, null, 2) }
  }

  public updateConfig(rawJson: string): { success: boolean; config?: AppConfig; error?: string } {
    try {
      const parsed = JSON.parse(rawJson)
      this.currentConfig = { ...DEFAULT_APP_CONFIG, ...parsed }
      const cfgPath = this.getConfigPath()
      fs.writeFileSync(cfgPath, JSON.stringify(this.currentConfig, null, 2), 'utf-8')
      return { success: true, config: this.currentConfig }
    } catch (err: any) {
      return { success: false, error: `Błąd składni JSON: ${err.message}` }
    }
  }

  public resetToDefaults(): { success: boolean; config: AppConfig; rawJson: string } {
    this.currentConfig = DEFAULT_APP_CONFIG
    const cfgPath = this.getConfigPath()
    const pretty = JSON.stringify(DEFAULT_APP_CONFIG, null, 2)
    fs.writeFileSync(cfgPath, pretty, 'utf-8')
    return { success: true, config: DEFAULT_APP_CONFIG, rawJson: pretty }
  }
}
