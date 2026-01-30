export interface ElectronAPI {
  openFileDialog: () => Promise<string[]>
  readFile: (filePath: string) => Promise<Uint8Array>
  saveFile: (filePath: string, data: Uint8Array) => Promise<boolean>
  saveFileDialog: () => Promise<string | undefined>
  loadSystemFont: (fontName: string) => Promise<Uint8Array | null>
  getInitialFiles: () => Promise<string[]>
  closeWindow: () => Promise<void>
  quitApp: () => Promise<void>
  setWindowTitle: (title: string) => Promise<void>
  openExternalUrl: (url: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
