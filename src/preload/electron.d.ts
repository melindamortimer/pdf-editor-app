export interface ElectronAPI {
  openFileDialog: () => Promise<string[]>
  readFile: (filePath: string) => Promise<Uint8Array>
  saveFile: (filePath: string, data: Uint8Array) => Promise<boolean>
  saveFileDialog: () => Promise<string | undefined>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
