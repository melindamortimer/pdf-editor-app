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

export async function getTextContent(
  documentId: string,
  pageIndex: number,
  scale: number = 1.0
): Promise<{ textContent: any; viewport: any }> {
  const pdf = documentCache.get(documentId)
  if (!pdf) throw new Error(`Document ${documentId} not loaded`)

  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale })
  const textContent = await page.getTextContent()

  return { textContent, viewport }
}

export function getDocument(id: string): PDFDocumentProxy | undefined {
  return documentCache.get(id)
}

export async function getPageDimensions(
  documentId: string,
  pageIndex: number
): Promise<{ width: number; height: number }> {
  const pdf = documentCache.get(documentId)
  if (!pdf) throw new Error(`Document ${documentId} not loaded`)

  const page = await pdf.getPage(pageIndex + 1) // PDF.js uses 1-based indexing
  const viewport = page.getViewport({ scale: 1.0 })

  return { width: viewport.width, height: viewport.height }
}

export interface PdfLink {
  url: string
  rect: { x: number; y: number; width: number; height: number }
}

// URL pattern to match URLs in text (with or without protocol)
const URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi

// Debug flag for link detection logging
const DEBUG_LINKS = false

export async function getPageLinks(
  documentId: string,
  pageIndex: number,
  scale: number = 1.0
): Promise<PdfLink[]> {
  const pdf = documentCache.get(documentId)
  if (!pdf) throw new Error(`Document ${documentId} not loaded`)

  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale })
  const annotations = await page.getAnnotations()

  const links: PdfLink[] = []

  // Get link annotations from PDF structure
  if (DEBUG_LINKS) console.log(`[LinkLayer] Checking ${annotations.length} annotations`)
  for (const annotation of annotations) {
    // Link annotations have subtype 'Link' and a url property
    if (annotation.subtype === 'Link' && annotation.url) {
      // annotation.rect is [x1, y1, x2, y2] in PDF coordinates (bottom-left origin)
      const [x1, y1, x2, y2] = annotation.rect

      // Transform to viewport coordinates (top-left origin)
      const [vx1, vy1] = viewport.convertToViewportPoint(x1, y1)
      const [vx2, vy2] = viewport.convertToViewportPoint(x2, y2)

      const rect = {
        x: Math.min(vx1, vx2),
        y: Math.min(vy1, vy2),
        width: Math.abs(vx2 - vx1),
        height: Math.abs(vy2 - vy1)
      }
      if (DEBUG_LINKS) console.log(`[LinkLayer] Annotation link: "${annotation.url}" at`, rect)
      links.push({ url: annotation.url, rect })
    }
  }

  // Track URLs already found from annotations (these have accurate positions)
  // Normalize URLs for comparison: remove protocol and trailing slashes
  const normalizeUrl = (url: string) => url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const annotationUrls = new Set(links.map(l => normalizeUrl(l.url)))
  if (DEBUG_LINKS) console.log(`[LinkLayer] Found ${links.length} annotation links, normalized URLs:`, [...annotationUrls])

  // Only scan text content for URLs NOT already found as annotations
  const textContent = await page.getTextContent()

  for (const item of textContent.items) {
    if (!('str' in item) || !item.str) continue

    const text = item.str as string
    const matches = text.matchAll(URL_PATTERN)

    for (const match of matches) {
      let url = match[0]

      // Skip if it doesn't look like a real URL (must have a dot and valid TLD-like ending)
      if (!url.includes('.')) continue

      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      // Skip if this URL was already found as an annotation
      if (annotationUrls.has(normalizeUrl(url))) continue

      // Get the transform matrix for this text item
      const tx = (item as any).transform
      if (!tx) continue

      // Calculate position - transform is [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1])
      const x = tx[4]
      const y = tx[5]

      // Estimate width based on character position in string
      const charWidth = (item as any).width / text.length
      const startX = x + (match.index || 0) * charWidth
      const matchWidth = match[0].length * charWidth

      // Convert to viewport coordinates
      const [vx1, vy1] = viewport.convertToViewportPoint(startX, y)
      const [vx2, vy2] = viewport.convertToViewportPoint(startX + matchWidth, y - fontSize)

      const rect = {
        x: Math.min(vx1, vx2),
        y: Math.min(vy1, vy2),
        width: Math.abs(vx2 - vx1),
        height: Math.abs(vy2 - vy1)
      }
      if (DEBUG_LINKS) console.log(`[LinkLayer] Found text URL: "${url}" at`, rect)
      links.push({ url, rect })
      annotationUrls.add(normalizeUrl(url)) // Prevent further duplicates
    }
  }

  if (DEBUG_LINKS) console.log(`[LinkLayer] Total links found: ${links.length}`)
  return links
}

export function unloadDocument(id: string): void {
  const pdf = documentCache.get(id)
  if (pdf) {
    pdf.destroy()
    documentCache.delete(id)
  }
}

export function clearAllDocuments(): void {
  for (const pdf of documentCache.values()) {
    pdf.destroy()
  }
  documentCache.clear()
}
