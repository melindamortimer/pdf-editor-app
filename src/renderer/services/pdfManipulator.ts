import { PDFDocument } from 'pdf-lib'
import type { PdfPage } from '../types/pdf'

// Cache of loaded PDF documents for manipulation
const pdfDocCache = new Map<string, PDFDocument>()

/**
 * Load a PDF document for manipulation (separate from viewing)
 */
export async function loadPdfForManipulation(
  documentId: string,
  data: ArrayBuffer
): Promise<void> {
  const pdfDoc = await PDFDocument.load(data)
  pdfDocCache.set(documentId, pdfDoc)
}

/**
 * Get a cached PDF document
 */
export function getCachedPdf(documentId: string): PDFDocument | undefined {
  return pdfDocCache.get(documentId)
}

/**
 * Clear a document from cache
 */
export function clearPdfFromCache(documentId: string): void {
  pdfDocCache.delete(documentId)
}

/**
 * Clear all cached documents
 */
export function clearAllPdfCache(): void {
  pdfDocCache.clear()
}

/**
 * Create a new PDF from the given pages array
 * Pages can come from multiple source documents and be in any order
 */
export async function createPdfFromPages(pages: PdfPage[]): Promise<Uint8Array> {
  // Create a new PDF document
  const newPdf = await PDFDocument.create()

  // Group pages by source document to minimize copying operations
  for (const page of pages) {
    const sourcePdf = pdfDocCache.get(page.documentId)
    if (!sourcePdf) {
      console.warn(`Source PDF not found for document ${page.documentId}`)
      continue
    }

    // Copy the page from source to new document
    const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.originalPageIndex])
    newPdf.addPage(copiedPage)
  }

  // Serialize the PDF to bytes
  const pdfBytes = await newPdf.save()
  return pdfBytes
}

/**
 * Save pages to a new file (Save As)
 */
export async function saveAsNewFile(pages: PdfPage[]): Promise<boolean> {
  try {
    // Get save path from user
    const filePath = await window.electronAPI.saveFileDialog()
    if (!filePath) return false

    // Create the PDF
    const pdfBytes = await createPdfFromPages(pages)

    // Save to file
    await window.electronAPI.saveFile(filePath, pdfBytes)
    return true
  } catch (error) {
    console.error('Error saving PDF:', error)
    throw error
  }
}

/**
 * Save pages to an existing file (overwrite)
 */
export async function saveToFile(
  filePath: string,
  pages: PdfPage[]
): Promise<boolean> {
  try {
    // Create the PDF
    const pdfBytes = await createPdfFromPages(pages)

    // Save to file
    await window.electronAPI.saveFile(filePath, pdfBytes)
    return true
  } catch (error) {
    console.error('Error saving PDF:', error)
    throw error
  }
}
