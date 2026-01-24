export interface ElectronAPI {
  openFileDialog: () => Promise<string[]>
  readFile: (filePath: string) => Promise<Uint8Array>
  saveFile: (filePath: string, data: Uint8Array) => Promise<boolean>
  saveFileDialog: () => Promise<string | undefined>
  loadSystemFont: (fontName: string) => Promise<Uint8Array | null>
  getInitialFile: () => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
