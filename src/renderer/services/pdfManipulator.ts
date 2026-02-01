import { PDFDocument, rgb, PDFPage as PdfLibPage } from 'pdf-lib'
import type { PdfPage } from '../types/pdf'
import type { Annotation, TextAnnotation, BoxAnnotation, HighlightAnnotation, UnderlineAnnotation, StrikethroughAnnotation, PenAnnotation, ImageAnnotation } from '../types/annotations'
import { BOX_THICKNESS_PX } from '../types/annotations'
import { getEmbeddedFont, clearFontCache } from './fontLoader'

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
 * Parse color string to RGB values (0-1 range)
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]) / 255,
      g: parseInt(rgbMatch[2]) / 255,
      b: parseInt(rgbMatch[3]) / 255
    }
  }

  // Default to black
  return { r: 0, g: 0, b: 0 }
}

/**
 * Bake annotations onto a PDF page
 */
async function bakeAnnotationsOntoPage(
  pdfDoc: PDFDocument,
  page: PdfLibPage,
  annotations: Annotation[]
): Promise<void> {
  const { width: pageWidth, height: pageHeight } = page.getSize()

  // Text markings (highlight/underline/strikethrough) always render first (behind other annotations)
  // Other annotations (pen, box, text) preserve their array order (user's layer ordering)
  const textMarkings = annotations.filter(a =>
    a.type === 'highlight' || a.type === 'underline' || a.type === 'strikethrough'
  )
  const otherAnnotations = annotations.filter(a =>
    a.type !== 'highlight' && a.type !== 'underline' && a.type !== 'strikethrough'
  )
  const sortedAnnotations = [...textMarkings, ...otherAnnotations]

  for (const annotation of sortedAnnotations) {
    // Convert normalized coordinates to PDF points
    const x = annotation.x * pageWidth
    const width = annotation.width * pageWidth
    const height = annotation.height * pageHeight
    // PDF origin is bottom-left, app uses top-left
    const y = pageHeight - (annotation.y * pageHeight) - height

    switch (annotation.type) {
      case 'highlight':
        renderHighlight(page, annotation, x, y, width, height)
        break
      case 'underline':
        renderUnderline(page, annotation, x, y, width, height)
        break
      case 'strikethrough':
        renderStrikethrough(page, annotation, x, y, width, height)
        break
      case 'box':
        renderBox(page, annotation, x, y, width, height)
        break
      case 'pen':
        renderPen(page, annotation, pageWidth, pageHeight)
        break
      case 'text':
        await renderText(pdfDoc, page, annotation, x, y, width, height)
        break
      case 'image':
        await renderImage(pdfDoc, page, annotation, x, y, width, height)
        break
    }
  }
}

function renderHighlight(
  page: PdfLibPage,
  annotation: HighlightAnnotation,
  x: number, y: number, width: number, height: number
): void {
  if (annotation.color === 'transparent') return

  const { r, g, b } = parseColor(annotation.color)

  page.drawRectangle({
    x, y, width, height,
    color: rgb(r, g, b),
    opacity: 0.4
  })
}

function renderUnderline(
  page: PdfLibPage,
  annotation: UnderlineAnnotation,
  x: number, y: number, width: number, height: number
): void {
  if (annotation.color === 'transparent') return

  const { r, g, b } = parseColor(annotation.color)
  // Line at bottom of bounds, proportional thickness
  const thickness = Math.max(1, height * 0.08)
  const lineY = y + thickness / 2

  page.drawLine({
    start: { x, y: lineY },
    end: { x: x + width, y: lineY },
    thickness,
    color: rgb(r, g, b)
  })
}

function renderStrikethrough(
  page: PdfLibPage,
  annotation: StrikethroughAnnotation,
  x: number, y: number, width: number, height: number
): void {
  if (annotation.color === 'transparent') return

  const { r, g, b } = parseColor(annotation.color)
  // Line at ~40% from bottom to account for descenders
  const thickness = Math.max(1, height * 0.08)
  const lineY = y + height * 0.4

  page.drawLine({
    start: { x, y: lineY },
    end: { x: x + width, y: lineY },
    thickness,
    color: rgb(r, g, b)
  })
}

function renderBox(
  page: PdfLibPage,
  annotation: BoxAnnotation,
  x: number, y: number, width: number, height: number
): void {
  const { r: borderR, g: borderG, b: borderB } = parseColor(annotation.color)
  // PDF borders are centered on edge, so scale down from CSS pixels
  const thickness = BOX_THICKNESS_PX[annotation.thickness] * 1.0

  // Draw fill if not transparent
  if (annotation.fillColor !== 'transparent') {
    const { r: fillR, g: fillG, b: fillB } = parseColor(annotation.fillColor)
    page.drawRectangle({
      x, y, width, height,
      color: rgb(fillR, fillG, fillB)
    })
  }

  // Draw border
  page.drawRectangle({
    x, y, width, height,
    borderColor: rgb(borderR, borderG, borderB),
    borderWidth: thickness
  })
}

function renderPen(
  page: PdfLibPage,
  annotation: PenAnnotation,
  pageWidth: number,
  pageHeight: number
): void {
  if (annotation.points.length < 2) return

  const { r, g, b } = parseColor(annotation.color)
  const thickness = annotation.strokeWidth

  // Draw lines between consecutive points
  for (let i = 0; i < annotation.points.length - 1; i++) {
    const [x1Norm, y1Norm] = annotation.points[i]
    const [x2Norm, y2Norm] = annotation.points[i + 1]

    // Convert normalized coordinates to PDF points (PDF origin is bottom-left)
    const x1 = x1Norm * pageWidth
    const y1 = pageHeight - (y1Norm * pageHeight)
    const x2 = x2Norm * pageWidth
    const y2 = pageHeight - (y2Norm * pageHeight)

    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: rgb(r, g, b),
      lineCap: 1 // Round cap for smooth strokes
    })
  }
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  const wrappedLines: string[] = []

  // Split by explicit newlines first
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      wrappedLines.push('')
      continue
    }

    const words = paragraph.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth <= maxWidth || currentLine === '') {
        // Word fits, or it's the first word (must include even if too long)
        currentLine = testLine
      } else {
        // Word doesn't fit, start new line
        wrappedLines.push(currentLine)
        currentLine = word
      }
    }

    // Add the last line of the paragraph
    if (currentLine) {
      wrappedLines.push(currentLine)
    }
  }

  return wrappedLines
}

async function renderText(
  pdfDoc: PDFDocument,
  page: PdfLibPage,
  annotation: TextAnnotation,
  x: number, y: number, width: number, height: number
): Promise<void> {
  const { r, g, b } = parseColor(annotation.color)
  const font = await getEmbeddedFont(
    pdfDoc,
    annotation.font,
    annotation.bold || false,
    annotation.italic || false
  )

  // Wrap text to fit within box width
  const wrappedLines = wrapText(annotation.content, font, annotation.fontSize, width)
  const lineHeight = annotation.fontSize * 1.2

  // Start from top of text box
  let currentY = y + height - annotation.fontSize

  for (const line of wrappedLines) {
    if (currentY < y) break // Stop if we've gone below the box

    page.drawText(line, {
      x,
      y: currentY,
      size: annotation.fontSize,
      font,
      color: rgb(r, g, b)
    })

    // Draw underline if enabled
    if (annotation.underline && line) {
      const textWidth = font.widthOfTextAtSize(line, annotation.fontSize)
      const underlineY = currentY - annotation.fontSize * 0.15
      page.drawLine({
        start: { x, y: underlineY },
        end: { x: x + textWidth, y: underlineY },
        thickness: Math.max(1, annotation.fontSize * 0.05),
        color: rgb(r, g, b)
      })
    }

    currentY -= lineHeight
  }
}

async function renderImage(
  pdfDoc: PDFDocument,
  page: PdfLibPage,
  annotation: ImageAnnotation,
  x: number, y: number, width: number, height: number
): Promise<void> {
  try {
    // Extract base64 data from data URL
    const dataUrl = annotation.imageData
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) return

    // Determine image type from data URL
    const mimeMatch = dataUrl.match(/data:image\/(\w+);/)
    const imageType = mimeMatch ? mimeMatch[1].toLowerCase() : 'png'

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Embed image based on type
    let image
    if (imageType === 'png') {
      image = await pdfDoc.embedPng(bytes)
    } else if (imageType === 'jpeg' || imageType === 'jpg') {
      image = await pdfDoc.embedJpg(bytes)
    } else {
      // Try PNG for other formats (may fail for some)
      image = await pdfDoc.embedPng(bytes)
    }

    // Draw the image
    page.drawImage(image, {
      x,
      y,
      width,
      height
    })
  } catch (error) {
    console.error('Failed to render image annotation:', error)
  }
}

/**
 * Create a new PDF from the given pages array with baked annotations
 * Pages can come from multiple source documents and be in any order
 */
export async function createPdfFromPages(
  pages: PdfPage[],
  annotations: Annotation[] = []
): Promise<Uint8Array> {
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

    // Get annotations for this page and bake them
    const pageAnnotations = annotations.filter(a => a.pageId === page.id)
    if (pageAnnotations.length > 0) {
      await bakeAnnotationsOntoPage(newPdf, copiedPage, pageAnnotations)
    }
  }

  // Clear font cache for this document
  clearFontCache(newPdf)

  // Serialize the PDF to bytes
  const pdfBytes = await newPdf.save()
  return pdfBytes
}

/**
 * Save pages to a new file (Save As)
 * Returns the saved file path, or null if cancelled
 */
export async function saveAsNewFile(
  pages: PdfPage[],
  annotations: Annotation[] = []
): Promise<string | null> {
  try {
    // Get save path from user
    const filePath = await window.electronAPI.saveFileDialog()
    if (!filePath) return null

    // Create the PDF with baked annotations
    const pdfBytes = await createPdfFromPages(pages, annotations)

    // Save to file
    await window.electronAPI.saveFile(filePath, pdfBytes)
    return filePath
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
  pages: PdfPage[],
  annotations: Annotation[] = []
): Promise<boolean> {
  try {
    // Create the PDF with baked annotations
    const pdfBytes = await createPdfFromPages(pages, annotations)

    // Save to file
    await window.electronAPI.saveFile(filePath, pdfBytes)
    return true
  } catch (error) {
    console.error('Error saving PDF:', error)
    throw error
  }
}
