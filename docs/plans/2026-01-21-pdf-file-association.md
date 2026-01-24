# PDF File Association Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable the app to automatically open PDF files when double-clicked in Finder (or when the app is set as the default PDF handler).

**Architecture:** Handle macOS `open-file` events and `process.argv` arguments in the main process. Pass file paths to new windows via IPC. Register PDF file associations in electron-builder config. Each PDF opens in a new window.

**Tech Stack:** Electron (main process events), IPC, electron-builder file associations

---

## Task 1: Add IPC channel for initial file path

**Files:**
- Modify: `src/main/ipc.ts:6-13`
- Modify: `src/preload/preload.ts:3-11`
- Modify: `src/preload/electron.d.ts:1-7`

**Step 1.1: Add IPC handler in ipc.ts**

Add a new IPC handler that returns the initial file path for a window. The main process will store pending file paths and the renderer will request them on startup.

In `src/main/ipc.ts`, add after the imports:

```typescript
// Store pending file path for windows (windowId -> filePath)
const pendingFiles = new Map<number, string>()

export function setPendingFile(windowId: number, filePath: string) {
  pendingFiles.set(windowId, filePath)
}
```

Then add this handler inside `setupIpcHandlers()`:

```typescript
ipcMain.handle('get-initial-file', (event) => {
  const windowId = event.sender.id
  const filePath = pendingFiles.get(windowId)
  if (filePath) {
    pendingFiles.delete(windowId)
    return filePath
  }
  return null
})
```

**Step 1.2: Add preload exposure in preload.ts**

In `src/preload/preload.ts`, add to the `electronAPI` object:

```typescript
getInitialFile: () => ipcRenderer.invoke('get-initial-file'),
```

**Step 1.3: Update type definitions in electron.d.ts**

In `src/preload/electron.d.ts`, add to the `ElectronAPI` interface:

```typescript
getInitialFile: () => Promise<string | null>
```

**Step 1.4: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 1.5: Commit**

```bash
git add src/main/ipc.ts src/preload/preload.ts src/preload/electron.d.ts
git commit -m "Add IPC channel for initial file path"
```

**Step 1.6: Code review and simplify**

Run @superpowers:code-reviewer and @code-simplifier:code-simplifier agents on the changes.

---

## Task 2: Handle file open events in main process

**Files:**
- Modify: `src/main/main.ts`

**Step 2.1: Import setPendingFile**

At the top of `src/main/main.ts`, update the import:

```typescript
import { setupIpcHandlers, setPendingFile } from './ipc'
```

**Step 2.2: Add file handling logic**

Replace the entire `src/main/main.ts` with:

```typescript
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
```

**Step 2.3: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 2.4: Commit**

```bash
git add src/main/main.ts
git commit -m "Handle file open events in main process"
```

**Step 2.5: Code review and simplify**

Run @superpowers:code-reviewer and @code-simplifier:code-simplifier agents on the changes.

---

## Task 3: Auto-load file in renderer on startup

**Files:**
- Modify: `src/renderer/App.tsx:60-113`

**Step 3.1: Add useEffect to check for initial file**

In `src/renderer/App.tsx`, add a new `useEffect` after the keyboard shortcuts effect (around line 675). Add this before the `return` statement:

```typescript
// Check for initial file to open (when app opened via file association)
useEffect(() => {
  const checkInitialFile = async () => {
    try {
      const filePath = await window.electronAPI.getInitialFile()
      if (filePath) {
        // Load the file using the same logic as handleOpenFiles
        const data = await window.electronAPI.readFile(filePath)
        const id = crypto.randomUUID()
        const name = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown'

        const viewerBuffer = new Uint8Array(data).buffer
        const manipulatorBuffer = new Uint8Array(data).buffer

        const pdf = await loadPdfDocument(viewerBuffer, id)
        const pageCount = pdf.numPages

        await loadPdfForManipulation(id, manipulatorBuffer)

        const newDoc: PdfDocument = { id, name, path: filePath, pageCount }
        const newPages: PdfPage[] = Array.from({ length: pageCount }, (_, i) => ({
          id: crypto.randomUUID(),
          documentId: id,
          pageIndex: i,
          originalPageIndex: i
        }))

        setDocuments([newDoc])
        setPages(newPages)
        initialPagesRef.current = serializePageState(newPages)
        setCurrentFilePath(filePath)
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error loading initial file:', error)
    }
  }

  checkInitialFile()
}, []) // Run once on mount
```

**Step 3.2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3.3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "Auto-load file in renderer on startup"
```

**Step 3.4: Code review and simplify**

Run @superpowers:code-reviewer and @code-simplifier:code-simplifier agents on the changes.

---

## Task 4: Add PDF file association in package.json

**Files:**
- Modify: `package.json:28-35`

**Step 4.1: Add fileAssociations to mac config**

In `package.json`, update the `build.mac` section to include file associations:

```json
"mac": {
  "category": "public.app-category.productivity",
  "icon": "resources/icon.icns",
  "target": [
    "dmg",
    "zip"
  ],
  "fileAssociations": [
    {
      "ext": "pdf",
      "name": "PDF Document",
      "role": "Editor",
      "icon": "resources/icon.icns"
    }
  ]
}
```

**Step 4.2: Commit**

```bash
git add package.json
git commit -m "Add PDF file association for macOS"
```

**Step 4.3: Code review and simplify**

Run @superpowers:code-reviewer and @code-simplifier:code-simplifier agents on the changes.

---

## Task 5: Build and test the app

**Step 5.1: Build the application**

Run: `npm run package:mac`
Expected: Build succeeds, creates DMG in `release/` directory

**Step 5.2: Manual test**

1. Install the built app
2. Right-click any PDF file in Finder
3. Select "Get Info" > "Open with" > Choose DocuMint PDF Editor > "Change All"
4. Double-click a PDF file
5. Expected: App opens with the PDF loaded

**Step 5.3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "Fix any issues found during testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add IPC channel for initial file path | ipc.ts, preload.ts, electron.d.ts |
| 2 | Handle file open events in main process | main.ts |
| 3 | Auto-load file in renderer on startup | App.tsx |
| 4 | Add PDF file association config | package.json |
| 5 | Build and test | - |

**Total: 5 tasks, ~15-20 implementation steps**

**Review checkpoints:** After each task, run @superpowers:code-reviewer and @code-simplifier:code-simplifier agents.
