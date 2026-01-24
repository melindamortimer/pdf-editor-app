import { ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Store pending file path for windows (windowId -> filePath)
const pendingFiles = new Map<number, string>()

export function setPendingFile(windowId: number, filePath: string) {
  pendingFiles.set(windowId, filePath)
}

export function setupIpcHandlers() {
  ipcMain.handle('get-initial-file', (event) => {
    const windowId = event.sender.id
    const filePath = pendingFiles.get(windowId)
    if (filePath) {
      pendingFiles.delete(windowId)
      return filePath
    }
    return null
  })
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    return result.filePaths
  })

  ipcMain.handle('read-file', async (_, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    // Convert to Uint8Array for proper IPC serialization
    return new Uint8Array(buffer)
  })

  ipcMain.handle('save-file', async (_, filePath: string, data: Uint8Array) => {
    await fs.writeFile(filePath, data)
    return true
  })

  ipcMain.handle('save-file-dialog', async () => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    return result.filePath
  })

  ipcMain.handle('load-system-font', async (_, fontName: string): Promise<Uint8Array | null> => {
    const platform = os.platform()

    // Platform-specific font directories
    const fontDirs: string[] = []
    if (platform === 'darwin') {
      fontDirs.push('/System/Library/Fonts/', '/Library/Fonts/', path.join(os.homedir(), 'Library/Fonts/'))
    } else if (platform === 'win32') {
      fontDirs.push('C:\\Windows\\Fonts\\')
    } else {
      fontDirs.push('/usr/share/fonts/', path.join(os.homedir(), '.local/share/fonts/'))
    }

    // Search patterns for each font
    const fontFilePatterns: Record<string, string[]> = {
      'Arial': ['Arial.ttf', 'arial.ttf'],
      'Arial-Bold': ['Arial Bold.ttf', 'arialbd.ttf'],
      'Arial-Italic': ['Arial Italic.ttf', 'ariali.ttf'],
      'Arial-BoldItalic': ['Arial Bold Italic.ttf', 'arialbi.ttf'],
      'Times New Roman': ['Times New Roman.ttf', 'times.ttf', 'TimesNewRoman.ttf'],
      'Times New Roman-Bold': ['Times New Roman Bold.ttf', 'timesbd.ttf'],
      'Times New Roman-Italic': ['Times New Roman Italic.ttf', 'timesi.ttf'],
      'Times New Roman-BoldItalic': ['Times New Roman Bold Italic.ttf', 'timesbi.ttf'],
      'Verdana': ['Verdana.ttf', 'verdana.ttf'],
      'Verdana-Bold': ['Verdana Bold.ttf', 'verdanab.ttf'],
      'Verdana-Italic': ['Verdana Italic.ttf', 'verdanai.ttf'],
      'Verdana-BoldItalic': ['Verdana Bold Italic.ttf', 'verdanaz.ttf'],
      'Georgia': ['Georgia.ttf', 'georgia.ttf'],
      'Georgia-Bold': ['Georgia Bold.ttf', 'georgiab.ttf'],
      'Georgia-Italic': ['Georgia Italic.ttf', 'georgiai.ttf'],
      'Georgia-BoldItalic': ['Georgia Bold Italic.ttf', 'georgiaz.ttf'],
      'Trebuchet MS': ['Trebuchet MS.ttf', 'trebuc.ttf'],
      'Trebuchet MS-Bold': ['Trebuchet MS Bold.ttf', 'trebucbd.ttf'],
      'Trebuchet MS-Italic': ['Trebuchet MS Italic.ttf', 'trebucit.ttf'],
      'Trebuchet MS-BoldItalic': ['Trebuchet MS Bold Italic.ttf', 'trebucbi.ttf'],
      'Palatino': ['Palatino.ttc', 'pala.ttf', 'Palatino Linotype.ttf'],
      'Palatino-Bold': ['Palatino Bold.ttc', 'palab.ttf'],
      'Palatino-Italic': ['Palatino Italic.ttc', 'palai.ttf'],
      'Palatino-BoldItalic': ['Palatino Bold Italic.ttc', 'palabi.ttf'],
      'Courier New': ['Courier New.ttf', 'cour.ttf'],
      'Courier New-Bold': ['Courier New Bold.ttf', 'courbd.ttf'],
      'Courier New-Italic': ['Courier New Italic.ttf', 'couri.ttf'],
      'Courier New-BoldItalic': ['Courier New Bold Italic.ttf', 'courbi.ttf'],
      'Comic Sans MS': ['Comic Sans MS.ttf', 'comic.ttf'],
      'Comic Sans MS-Bold': ['Comic Sans MS Bold.ttf', 'comicbd.ttf']
    }

    const patterns = fontFilePatterns[fontName] || [`${fontName}.ttf`]

    for (const dir of fontDirs) {
      for (const pattern of patterns) {
        const fontPath = path.join(dir, pattern)
        try {
          const buffer = await fs.readFile(fontPath)
          return new Uint8Array(buffer)
        } catch {
          // Font not found in this location, continue searching
        }
      }
    }

    return null // Font not found
  })
}
