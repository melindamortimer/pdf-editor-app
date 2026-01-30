import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath: string, data: Uint8Array) =>
    ipcRenderer.invoke('save-file', filePath, data),
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog'),
  loadSystemFont: (fontName: string): Promise<Uint8Array | null> =>
    ipcRenderer.invoke('load-system-font', fontName),
  getInitialFiles: (): Promise<string[]> => ipcRenderer.invoke('get-initial-files'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  setWindowTitle: (title: string) => ipcRenderer.invoke('set-window-title', title),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url)
})
