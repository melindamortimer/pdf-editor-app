import { app, BrowserWindow } from 'electron'
import path from 'path'
import { setupIpcHandlers, setPendingFile } from './ipc'

let mainWindow: BrowserWindow | null = null
let pendingFilePath: string | null = null

function createWindow(filePath?: string) {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Store pending file for this window
  if (filePath) {
    setPendingFile(window.webContents.id, filePath)
  }

  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:5173')
    window.webContents.openDevTools()
  } else {
    window.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  window.on('closed', () => {
    if (window === mainWindow) {
      mainWindow = null
    }
  })

  // Track first window as main
  if (!mainWindow) {
    mainWindow = window
  }

  return window
}

// Handle file open from Finder (macOS)
app.on('open-file', (event, filePath) => {
  event.preventDefault()

  if (app.isReady()) {
    // App is ready, create new window with file
    createWindow(filePath)
  } else {
    // App is starting, store for later
    pendingFilePath = filePath
  }
})

app.whenReady().then(() => {
  setupIpcHandlers()

  // Check for file path in command line args (macOS passes file as arg)
  const fileArg = process.argv.find(arg => arg.endsWith('.pdf') && !arg.startsWith('-'))
  const initialFile = pendingFilePath || fileArg

  createWindow(initialFile || undefined)
  pendingFilePath = null

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
