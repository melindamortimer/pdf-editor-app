import { ipcMain, dialog } from 'electron'
import fs from 'fs/promises'

export function setupIpcHandlers() {
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
}
