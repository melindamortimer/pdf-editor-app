import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import jsQR from 'jsqr'

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

  // Easter egg: "Hivin" links to Sunkern
  const EASTER_EGG_URL = 'https://pokemondb.net/pokedex/sunkern'

  for (const item of textContent.items) {
    if (!('str' in item) || !item.str) continue

    const text = item.str as string

    // Easter egg: Check for "Hivin" text
    const hivinMatch = text.match(/\bHivin\b/i)
    if (hivinMatch && !annotationUrls.has(normalizeUrl(EASTER_EGG_URL))) {
      const tx = (item as any).transform
      if (tx) {
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1])
        const x = tx[4]
        const y = tx[5]
        const charWidth = (item as any).width / text.length
        const startX = x + (hivinMatch.index || 0) * charWidth
        const matchWidth = hivinMatch[0].length * charWidth

        const [vx1, vy1] = viewport.convertToViewportPoint(startX, y)
        const [vx2, vy2] = viewport.convertToViewportPoint(startX + matchWidth, y + fontSize)

        const rect = {
          x: Math.min(vx1, vx2),
          y: Math.min(vy1, vy2),
          width: Math.abs(vx2 - vx1),
          height: Math.abs(vy2 - vy1)
        }
        if (DEBUG_LINKS) console.log(`[LinkLayer] Easter egg: "Hivin" -> Sunkern at`, rect)
        links.push({ url: EASTER_EGG_URL, rect })
        annotationUrls.add(normalizeUrl(EASTER_EGG_URL))
      }
    }

    const matches = text.matchAll(URL_PATTERN)

    for (const match of matches) {
      let url = match[0]

      // Skip if it doesn't look like a real URL (must have a dot and valid TLD-like ending)
      if (!url.includes('.')) continue

      // Skip email addresses
      if (url.includes('@')) continue

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
      // In PDF coords, y increases upward, so top of text is y + fontSize
      const [vx1, vy1] = viewport.convertToViewportPoint(startX, y)
      const [vx2, vy2] = viewport.convertToViewportPoint(startX + matchWidth, y + fontSize)

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

  // Scan for QR codes containing URLs
  const qrLinks = await scanPageForQRCodes(documentId, pageIndex, scale, annotationUrls)
  links.push(...qrLinks)

  if (DEBUG_LINKS) console.log(`[LinkLayer] Total links found: ${links.length}`)
  return links
}

// URL pattern for validating QR code content - matches URLs with or without protocol
const QR_URL_PATTERN = /^(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/i

/**
 * Scan a PDF page for QR codes containing URLs
 */
async function scanPageForQRCodes(
  documentId: string,
  pageIndex: number,
  scale: number,
  existingUrls: Set<string>
): Promise<PdfLink[]> {
  const links: PdfLink[] = []

  try {
    // Render page to canvas for QR scanning
    // Use higher scale for better QR detection (small QR codes need more resolution)
    const scanScale = Math.max(scale, 2.5)
    const { canvas, width, height } = await renderPage(documentId, pageIndex, scanScale)

    const ctx = canvas.getContext('2d')
    if (!ctx) return links

    const imageData = ctx.getImageData(0, 0, width, height)

    if (DEBUG_LINKS) console.log(`[LinkLayer] Scanning for QR codes at ${width}x${height}...`)

    // Scan for multiple QR codes by repeatedly scanning and blanking out found codes
    const maxQRCodes = 10 // Safety limit
    let foundCount = 0

    while (foundCount < maxQRCodes) {
      // Scan for QR code with inversion attempts for better detection
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      })

      if (!qrCode || !qrCode.data) {
        if (DEBUG_LINKS) console.log(`[LinkLayer] No more QR codes found (total: ${foundCount})`)
        break
      }

      foundCount++
      if (DEBUG_LINKS) console.log(`[LinkLayer] jsQR found QR code #${foundCount} with data: "${qrCode.data}"`)

      let url = qrCode.data

      // Only process if it looks like a URL
      if (QR_URL_PATTERN.test(url)) {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }

        // Normalize for comparison
        const normalizeUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

        // Skip if already found
        if (!existingUrls.has(normalizeUrl(url))) {
          // Calculate position in viewport coordinates
          // QR code location is in scan canvas coordinates, need to scale to target viewport
          const scaleRatio = scale / scanScale
          const rect = {
            x: qrCode.location.topLeftCorner.x * scaleRatio,
            y: qrCode.location.topLeftCorner.y * scaleRatio,
            width: (qrCode.location.topRightCorner.x - qrCode.location.topLeftCorner.x) * scaleRatio,
            height: (qrCode.location.bottomLeftCorner.y - qrCode.location.topLeftCorner.y) * scaleRatio
          }

          if (DEBUG_LINKS) console.log(`[LinkLayer] Found QR code URL: "${url}" at`, rect)
          links.push({ url, rect })
          existingUrls.add(normalizeUrl(url))
        }
      } else if (DEBUG_LINKS) {
        console.log(`[LinkLayer] QR code data "${qrCode.data}" does not look like a URL`)
      }

      // Blank out the found QR code region so we can find others
      const loc = qrCode.location
      const minX = Math.floor(Math.min(loc.topLeftCorner.x, loc.bottomLeftCorner.x)) - 10
      const maxX = Math.ceil(Math.max(loc.topRightCorner.x, loc.bottomRightCorner.x)) + 10
      const minY = Math.floor(Math.min(loc.topLeftCorner.y, loc.topRightCorner.y)) - 10
      const maxY = Math.ceil(Math.max(loc.bottomLeftCorner.y, loc.bottomRightCorner.y)) + 10

      // Fill the region with white pixels
      for (let y = Math.max(0, minY); y < Math.min(height, maxY); y++) {
        for (let x = Math.max(0, minX); x < Math.min(width, maxX); x++) {
          const idx = (y * width + x) * 4
          imageData.data[idx] = 255     // R
          imageData.data[idx + 1] = 255 // G
          imageData.data[idx + 2] = 255 // B
          // Alpha stays the same
        }
      }
    }
  } catch (err) {
    if (DEBUG_LINKS) console.error('[LinkLayer] Error scanning for QR codes:', err)
  }

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
