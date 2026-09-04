import { app, BrowserWindow, session, Menu, MenuItem } from 'electron'
import { join } from 'path'
import { setupSecurity, CSP_HEADER } from './security'
import { FileSystemService } from './services/fileSystemService'
import { DatabaseService } from './services/databaseService'
import { AssetService } from './services/assetService'
import { RecoveryService } from './services/recoveryService'
import { ConfigService } from './services/configService'
import { registerIpcHandlers } from './ipc/registerHandlers'

let mainWindow: BrowserWindow | null = null

const fsService = new FileSystemService()
const dbService = new DatabaseService()
const assetService = new AssetService(dbService)
const recoveryService = new RecoveryService()
const configService = new ConfigService()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#06070d',
    autoHideMenuBar: true,
    title: 'CogniCanvas / SynapseLearn v1.5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true
    }
  })

  // Native Context Menu with Spellcheck and standard actions
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu()

    // 1. Spellchecker suggestions
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => mainWindow?.webContents.replaceMisspelling(suggestion)
          })
        )
      }
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Dodaj do słownika',
          click: () => mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // 2. Standard editing commands
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo', label: 'Cofnij' }))
      menu.append(new MenuItem({ role: 'redo', label: 'Ponów' }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'cut', label: 'Wytnij' }))
      menu.append(new MenuItem({ role: 'copy', label: 'Kopiuj' }))
      menu.append(new MenuItem({ role: 'paste', label: 'Wklej' }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'selectAll', label: 'Zaznacz wszystko' }))
    } else if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy', label: 'Kopiuj' }))
      menu.append(new MenuItem({ role: 'selectAll', label: 'Zaznacz wszystko' }))
    }

    if (menu.items.length > 0) {
      menu.popup()
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
  registerIpcHandlers(mainWindow, fsService, dbService, assetService, recoveryService, configService)

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
