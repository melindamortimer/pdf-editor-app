import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath: string, data: Uint8Array) =>
    ipcRenderer.invoke('save-file', filePath, data),
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog')
})
