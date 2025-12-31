import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

const documentCache = new Map<string, PDFDocumentProxy>()

export async function loadPdfDocument(
  data: ArrayBuffer,
  id: string
): Promise<PDFDocumentProxy> {
  const pdf = await pdfjsLib.getDocument({ data }).promise
  documentCache.set(id, pdf)
  return pdf
}

export async function renderPage(
  documentId: string,
  pageIndex: number,
  scale: number = 1.0
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const pdf = documentCache.get(documentId)
  if (!pdf) throw new Error(`Document ${documentId} not loaded`)

  const page = await pdf.getPage(pageIndex + 1) // PDF.js uses 1-based indexing
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const context = canvas.getContext('2d')!
  await page.render({ canvasContext: context, viewport }).promise

  return { canvas, width: viewport.width, height: viewport.height }
}

export function getDocument(id: string): PDFDocumentProxy | undefined {
  return documentCache.get(id)
}

export function unloadDocument(id: string): void {
  const pdf = documentCache.get(id)
  if (pdf) {
    pdf.destroy()
    documentCache.delete(id)
  }
}
