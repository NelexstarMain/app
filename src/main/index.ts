import { app, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { setupSecurity, CSP_HEADER } from './security'
import { FileSystemService } from './services/fileSystemService'
import { DatabaseService } from './services/databaseService'
import { AssetService } from './services/assetService'
import { RecoveryService } from './services/recoveryService'
import { registerIpcHandlers } from './ipc/registerHandlers'

let mainWindow: BrowserWindow | null = null

const fsService = new FileSystemService()
const dbService = new DatabaseService()
const assetService = new AssetService(dbService)
const recoveryService = new RecoveryService()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0B0F19',
    autoHideMenuBar: true,
    title: 'CogniCanvas / SynapseLearn v1.3',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // Enforce zero-trust security & link handling
  setupSecurity(mainWindow.webContents)

  // CSP Header in response headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_HEADER]
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Register IPC dispatchers
  registerIpcHandlers(mainWindow, fsService, dbService, assetService, recoveryService)

  // In development, load dev server URL; in production load local index.html
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
