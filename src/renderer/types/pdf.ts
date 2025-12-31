export interface PdfDocument {
  id: string
  name: string
  path: string
  pageCount: number
}

export interface PdfPage {
  documentId: string
  pageIndex: number
  originalPageIndex: number
}

export interface PageRenderResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
}
