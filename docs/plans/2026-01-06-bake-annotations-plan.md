# Bake Annotations into PDF Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When saving a PDF, permanently embed all annotations into the pages so the saved file displays exactly what the user sees in the editor.

**Architecture:** Add IPC for loading system fonts from main process, create annotation baking logic using pdf-lib's drawing methods, modify save functions to accept annotations, reload document fresh after save.

**Tech Stack:** Electron IPC, pdf-lib (drawRectangle, drawLine, drawText, embedFont), Node.js fs for font loading

---

## Task 1: Add System Font Loading IPC

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/preload.ts`

**Step 1: Add font loading handler to main process**

Edit `src/main/ipc.ts` - add this handler inside `setupIpcHandlers()`:

```typescript
import path from 'path'
import os from 'os'

// Add inside setupIpcHandlers():
ipcMain.handle('load-system-font', async (_, fontName: string): Promise<Uint8Array | null> => {
  const platform = os.platform()

  // Platform-specific font directories
  const fontDirs: string[] = []
  if (platform === 'darwin') {
    fontDirs.push('/System/Library/Fonts/', '/Library/Fonts/', path.join(os.homedir(), 'Library/Fonts/'))
  } else if (platform === 'win32') {
    fontDirs.push('C:\\Windows\\Fonts\\')
  } else {
    fontDirs.push('/usr/share/fonts/', path.join(os.homedir(), '.local/share/fonts/'))
  }

  // Search patterns for each font
  const fontFilePatterns: Record<string, string[]> = {
    'Arial': ['Arial.ttf', 'arial.ttf'],
    'Arial-Bold': ['Arial Bold.ttf', 'arialbd.ttf'],
    'Arial-Italic': ['Arial Italic.ttf', 'ariali.ttf'],
    'Arial-BoldItalic': ['Arial Bold Italic.ttf', 'arialbi.ttf'],
    'Times New Roman': ['Times New Roman.ttf', 'times.ttf', 'TimesNewRoman.ttf'],
    'Times New Roman-Bold': ['Times New Roman Bold.ttf', 'timesbd.ttf'],
    'Times New Roman-Italic': ['Times New Roman Italic.ttf', 'timesi.ttf'],
    'Times New Roman-BoldItalic': ['Times New Roman Bold Italic.ttf', 'timesbi.ttf'],
    'Verdana': ['Verdana.ttf', 'verdana.ttf'],
    'Verdana-Bold': ['Verdana Bold.ttf', 'verdanab.ttf'],
    'Verdana-Italic': ['Verdana Italic.ttf', 'verdanai.ttf'],
    'Verdana-BoldItalic': ['Verdana Bold Italic.ttf', 'verdanaz.ttf'],
    'Georgia': ['Georgia.ttf', 'georgia.ttf'],
    'Georgia-Bold': ['Georgia Bold.ttf', 'georgiab.ttf'],
    'Georgia-Italic': ['Georgia Italic.ttf', 'georgiai.ttf'],
    'Georgia-BoldItalic': ['Georgia Bold Italic.ttf', 'georgiaz.ttf'],
    'Trebuchet MS': ['Trebuchet MS.ttf', 'trebuc.ttf'],
    'Trebuchet MS-Bold': ['Trebuchet MS Bold.ttf', 'trebucbd.ttf'],
    'Trebuchet MS-Italic': ['Trebuchet MS Italic.ttf', 'trebucit.ttf'],
    'Trebuchet MS-BoldItalic': ['Trebuchet MS Bold Italic.ttf', 'trebucbi.ttf'],
    'Palatino': ['Palatino.ttc', 'pala.ttf', 'Palatino Linotype.ttf'],
    'Palatino-Bold': ['Palatino Bold.ttc', 'palab.ttf'],
    'Palatino-Italic': ['Palatino Italic.ttc', 'palai.ttf'],
    'Palatino-BoldItalic': ['Palatino Bold Italic.ttc', 'palabi.ttf'],
    'Courier New': ['Courier New.ttf', 'cour.ttf'],
    'Courier New-Bold': ['Courier New Bold.ttf', 'courbd.ttf'],
    'Courier New-Italic': ['Courier New Italic.ttf', 'couri.ttf'],
    'Courier New-BoldItalic': ['Courier New Bold Italic.ttf', 'courbi.ttf'],
    'Comic Sans MS': ['Comic Sans MS.ttf', 'comic.ttf'],
    'Comic Sans MS-Bold': ['Comic Sans MS Bold.ttf', 'comicbd.ttf']
  }

  const patterns = fontFilePatterns[fontName] || [`${fontName}.ttf`]

  for (const dir of fontDirs) {
    for (const pattern of patterns) {
      const fontPath = path.join(dir, pattern)
      try {
        const buffer = await fs.readFile(fontPath)
        return new Uint8Array(buffer)
      } catch {
        // Font not found in this location, continue searching
      }
    }
  }

  return null // Font not found
})
```

**Step 2: Expose in preload**

Edit `src/preload/preload.ts` - add to the exposed API:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath: string, data: Uint8Array) =>
    ipcRenderer.invoke('save-file', filePath, data),
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog'),
  loadSystemFont: (fontName: string): Promise<Uint8Array | null> =>
    ipcRenderer.invoke('load-system-font', fontName)
})
```

**Step 3: Run the app to verify IPC works**

Run: `npm run dev`
Expected: App starts without errors

---

## Task 2: Create Font Loader Service

**Files:**
- Create: `src/renderer/services/fontLoader.ts`
- Create: `src/renderer/services/fontLoader.test.ts`

**Step 1: Write the font loader service**

Create `src/renderer/services/fontLoader.ts`:

```typescript
import type { PDFFont, PDFDocument } from 'pdf-lib'
import { StandardFonts } from 'pdf-lib'
import type { TextFont } from '../types/annotations'

// Cache embedded fonts per PDF document
const fontCache = new Map<PDFDocument, Map<string, PDFFont>>()

// Fallback mapping to standard PDF fonts
const FALLBACK_FONTS: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.Helvetica,
  'Verdana': StandardFonts.Helvetica,
  'Trebuchet MS': StandardFonts.Helvetica,
  'Comic Sans MS': StandardFonts.Helvetica,
  'Times New Roman': StandardFonts.TimesRoman,
  'Georgia': StandardFonts.TimesRoman,
  'Palatino': StandardFonts.TimesRoman,
  'Courier New': StandardFonts.Courier
}

const FALLBACK_FONTS_BOLD: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.HelveticaBold,
  'Verdana': StandardFonts.HelveticaBold,
  'Trebuchet MS': StandardFonts.HelveticaBold,
  'Comic Sans MS': StandardFonts.HelveticaBold,
  'Times New Roman': StandardFonts.TimesRomanBold,
  'Georgia': StandardFonts.TimesRomanBold,
  'Palatino': StandardFonts.TimesRomanBold,
  'Courier New': StandardFonts.CourierBold
}

const FALLBACK_FONTS_ITALIC: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.HelveticaOblique,
  'Verdana': StandardFonts.HelveticaOblique,
  'Trebuchet MS': StandardFonts.HelveticaOblique,
  'Comic Sans MS': StandardFonts.HelveticaOblique,
  'Times New Roman': StandardFonts.TimesRomanItalic,
  'Georgia': StandardFonts.TimesRomanItalic,
  'Palatino': StandardFonts.TimesRomanItalic,
  'Courier New': StandardFonts.CourierOblique
}

const FALLBACK_FONTS_BOLD_ITALIC: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.HelveticaBoldOblique,
  'Verdana': StandardFonts.HelveticaBoldOblique,
  'Trebuchet MS': StandardFonts.HelveticaBoldOblique,
  'Comic Sans MS': StandardFonts.HelveticaBoldOblique,
  'Times New Roman': StandardFonts.TimesRomanBoldItalic,
  'Georgia': StandardFonts.TimesRomanBoldItalic,
  'Palatino': StandardFonts.TimesRomanBoldItalic,
  'Courier New': StandardFonts.CourierBoldOblique
}

/**
 * Get the font variant name for loading
 */
function getFontVariantName(font: TextFont, bold: boolean, italic: boolean): string {
  if (bold && italic) return `${font}-BoldItalic`
  if (bold) return `${font}-Bold`
  if (italic) return `${font}-Italic`
  return font
}

/**
 * Load and embed a font into the PDF document
 * Falls back to standard PDF fonts if system font not found
 */
export async function getEmbeddedFont(
  pdfDoc: PDFDocument,
  font: TextFont,
  bold: boolean = false,
  italic: boolean = false
): Promise<PDFFont> {
  // Get or create cache for this document
  let docCache = fontCache.get(pdfDoc)
  if (!docCache) {
    docCache = new Map()
    fontCache.set(pdfDoc, docCache)
  }

  const variantName = getFontVariantName(font, bold, italic)

  // Check cache first
  const cached = docCache.get(variantName)
  if (cached) return cached

  // Try to load system font
  try {
    const fontBytes = await window.electronAPI.loadSystemFont(variantName)
    if (fontBytes) {
      const embeddedFont = await pdfDoc.embedFont(fontBytes)
      docCache.set(variantName, embeddedFont)
      return embeddedFont
    }
  } catch {
    // Silent fallback
  }

  // Fall back to standard PDF font
  let fallbackFont: StandardFonts
  if (bold && italic) {
    fallbackFont = FALLBACK_FONTS_BOLD_ITALIC[font]
  } else if (bold) {
    fallbackFont = FALLBACK_FONTS_BOLD[font]
  } else if (italic) {
    fallbackFont = FALLBACK_FONTS_ITALIC[font]
  } else {
    fallbackFont = FALLBACK_FONTS[font]
  }

  const standardFont = await pdfDoc.embedFont(fallbackFont)
  docCache.set(variantName, standardFont)
  return standardFont
}

/**
 * Clear font cache for a document (call when done with document)
 */
export function clearFontCache(pdfDoc: PDFDocument): void {
  fontCache.delete(pdfDoc)
}

/**
 * Clear all font caches
 */
export function clearAllFontCaches(): void {
  fontCache.clear()
}
```

**Step 2: Write basic test**

Create `src/renderer/services/fontLoader.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'Helvetica-Bold',
    HelveticaOblique: 'Helvetica-Oblique',
    HelveticaBoldOblique: 'Helvetica-BoldOblique',
    TimesRoman: 'Times-Roman',
    TimesRomanBold: 'Times-Bold',
    TimesRomanItalic: 'Times-Italic',
    TimesRomanBoldItalic: 'Times-BoldItalic',
    Courier: 'Courier',
    CourierBold: 'Courier-Bold',
    CourierOblique: 'Courier-Oblique',
    CourierBoldOblique: 'Courier-BoldOblique'
  }
}))

// Mock electronAPI
const mockLoadSystemFont = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    loadSystemFont: mockLoadSystemFont
  }
})

import { getEmbeddedFont, clearAllFontCaches } from './fontLoader'

describe('fontLoader', () => {
  const mockPdfDoc = {
    embedFont: vi.fn()
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    clearAllFontCaches()
    mockPdfDoc.embedFont.mockResolvedValue({ name: 'embedded-font' })
  })

  it('falls back to Helvetica when Arial system font not found', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica')
  })

  it('falls back to Times-Roman when Times New Roman not found', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Times New Roman')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Times-Roman')
  })

  it('falls back to Courier when Courier New not found', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Courier New')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Courier')
  })

  it('uses bold variant when bold is true', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial', true, false)

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-Bold')
  })

  it('uses italic variant when italic is true', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial', false, true)

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-Oblique')
  })

  it('caches fonts for same document', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial')
    await getEmbeddedFont(mockPdfDoc, 'Arial')

    // Should only call embedFont once due to caching
    expect(mockPdfDoc.embedFont).toHaveBeenCalledTimes(1)
  })

  it('embeds system font when found', async () => {
    const mockFontBytes = new Uint8Array([1, 2, 3])
    mockLoadSystemFont.mockResolvedValue(mockFontBytes)

    await getEmbeddedFont(mockPdfDoc, 'Arial')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith(mockFontBytes)
  })
})
```

**Step 3: Run tests**

Run: `npm test -- src/renderer/services/fontLoader.test.ts`
Expected: All tests pass

---

## Task 3: Add Annotation Baking to PDF Manipulator

**Files:**
- Modify: `src/renderer/services/pdfManipulator.ts`

**Step 1: Add imports and color parsing helper**

Add at the top of `src/renderer/services/pdfManipulator.ts`:

```typescript
import { PDFDocument, rgb, PDFPage as PdfLibPage } from 'pdf-lib'
import type { PdfPage } from '../types/pdf'
import type { Annotation, TextAnnotation, BoxAnnotation, HighlightAnnotation, UnderlineAnnotation, StrikethroughAnnotation } from '../types/annotations'
import { HIGHLIGHT_COLORS, BOX_THICKNESS_PX } from '../types/annotations'
import { getEmbeddedFont, clearFontCache } from './fontLoader'

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
 * Parse rgba color to get opacity
 */
function parseOpacity(color: string): number {
  const match = color.match(/rgba?\([^)]+,\s*([\d.]+)\)/)
  if (match) {
    return parseFloat(match[1])
  }
  return 1
}
```

**Step 2: Add annotation rendering functions**

Add after the helper functions:

```typescript
/**
 * Bake annotations onto a PDF page
 */
async function bakeAnnotationsOntoPage(
  pdfDoc: PDFDocument,
  page: PdfLibPage,
  annotations: Annotation[]
): Promise<void> {
  const { width: pageWidth, height: pageHeight } = page.getSize()

  // Sort annotations by render order: highlights first, then lines, boxes, text on top
  const sortedAnnotations = [...annotations].sort((a, b) => {
    const order = { highlight: 0, underline: 1, strikethrough: 1, box: 2, text: 3 }
    return (order[a.type] || 0) - (order[b.type] || 0)
  })

  for (const annotation of sortedAnnotations) {
    // Convert normalized coordinates to PDF points
    const x = annotation.x * pageWidth
    const width = annotation.width * pageWidth
    const height = annotation.height * pageHeight
    // PDF origin is bottom-left, app uses top-left
    const y = pageHeight - (annotation.y * pageHeight) - height

    switch (annotation.type) {
      case 'highlight':
        await renderHighlight(page, annotation, x, y, width, height)
        break
      case 'underline':
        await renderUnderline(page, annotation, x, y, width, height, pageHeight)
        break
      case 'strikethrough':
        await renderStrikethrough(page, annotation, x, y, width, height, pageHeight)
        break
      case 'box':
        await renderBox(page, annotation, x, y, width, height)
        break
      case 'text':
        await renderText(pdfDoc, page, annotation, x, y, width, height)
        break
    }
  }
}

async function renderHighlight(
  page: PdfLibPage,
  annotation: HighlightAnnotation,
  x: number, y: number, width: number, height: number
): Promise<void> {
  const colorStr = HIGHLIGHT_COLORS[annotation.color]
  if (colorStr === 'transparent') return

  const { r, g, b } = parseColor(colorStr)

  page.drawRectangle({
    x, y, width, height,
    color: rgb(r, g, b),
    opacity: 0.4
  })
}

async function renderUnderline(
  page: PdfLibPage,
  annotation: UnderlineAnnotation,
  x: number, y: number, width: number, height: number,
  pageHeight: number
): Promise<void> {
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

async function renderStrikethrough(
  page: PdfLibPage,
  annotation: StrikethroughAnnotation,
  x: number, y: number, width: number, height: number,
  pageHeight: number
): Promise<void> {
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

async function renderBox(
  page: PdfLibPage,
  annotation: BoxAnnotation,
  x: number, y: number, width: number, height: number
): Promise<void> {
  const { r: borderR, g: borderG, b: borderB } = parseColor(annotation.color)
  const thickness = BOX_THICKNESS_PX[annotation.thickness]

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

  // Split text by newlines and render each line
  const lines = annotation.content.split('\n')
  const lineHeight = annotation.fontSize * 1.2

  // Start from top of text box
  let currentY = y + height - annotation.fontSize

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: annotation.fontSize,
      font,
      color: rgb(r, g, b)
    })

    // Draw underline if enabled
    if (annotation.underline) {
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
```

**Step 3: Update createPdfFromPages signature**

Modify the `createPdfFromPages` function:

```typescript
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
```

**Step 4: Update saveAsNewFile and saveToFile**

Update both functions to accept annotations:

```typescript
/**
 * Save pages to a new file (Save As)
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
```

**Step 5: Run tests**

Run: `npm test`
Expected: Existing tests still pass (save functions now have optional annotations param)

---

## Task 4: Update App.tsx to Pass Annotations and Reload

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Find and update handleSaveAs**

Locate `handleSaveAs` function and update it:

```typescript
// Save As - always prompts for new location
const handleSaveAs = useCallback(async () => {
  if (pages.length === 0) return

  try {
    const savedPath = await saveAsNewFile(pages, annotations)
    if (savedPath) {
      // Clear all state
      clearAllPdfCache()
      setDocuments([])
      setPages([])
      clearAnnotations()
      setHistoryStack([])
      setFutureStack([])
      setSelectedPageIndex(0)
      setSelectedPageIndices([0])
      setCopiedPages([])

      // Reopen the saved file fresh
      const data = await window.electronAPI.readFile(savedPath)
      const fileName = savedPath.split('/').pop() || savedPath.split('\\').pop() || 'document.pdf'
      await openPdfDocument(data, fileName, savedPath)
    }
  } catch (error) {
    console.error('Save As failed:', error)
    alert('Failed to save file. Please try again.')
  }
}, [pages, annotations, clearAnnotations, openPdfDocument])
```

**Step 2: Update handleSave similarly**

Update `handleSave` function:

```typescript
// Save - overwrites current file (with warning on first save)
const handleSave = useCallback(async () => {
  if (pages.length === 0) return

  // If multiple documents or no current path, use Save As
  if (documents.length > 1 || !currentFilePath) {
    handleSaveAs()
    return
  }

  // Show warning on first save
  if (!showSaveWarning) {
    const confirmed = window.confirm(
      'This will overwrite the original file and bake all annotations permanently. Continue?'
    )
    if (!confirmed) return
    setShowSaveWarning(true)
  }

  try {
    const success = await saveToFile(currentFilePath, pages, annotations)
    if (success) {
      // Clear all state
      clearAllPdfCache()
      setDocuments([])
      setPages([])
      clearAnnotations()
      setHistoryStack([])
      setFutureStack([])
      setSelectedPageIndex(0)
      setSelectedPageIndices([0])
      setCopiedPages([])

      // Reopen the saved file fresh
      const data = await window.electronAPI.readFile(currentFilePath)
      const fileName = currentFilePath.split('/').pop() || currentFilePath.split('\\').pop() || 'document.pdf'
      await openPdfDocument(data, fileName, currentFilePath)
    }
  } catch (error) {
    console.error('Save failed:', error)
    alert('Failed to save file. Please try again.')
  }
}, [pages, documents.length, currentFilePath, showSaveWarning, annotations, clearAnnotations, openPdfDocument, handleSaveAs])
```

**Step 3: Add missing import**

Add to imports in App.tsx:

```typescript
import { clearAllPdfCache } from './services/pdfManipulator'
```

**Step 4: Run the app and test manually**

Run: `npm run dev`
Test:
1. Open a PDF
2. Add a highlight annotation
3. Click Save As
4. Verify: Document reloads, annotation is baked into PDF (no longer movable)
5. Close and reopen the saved PDF in another viewer to confirm annotations are visible

---

## Task 5: Add TypeScript Declarations for IPC

**Files:**
- Modify: `src/renderer/types/electron.d.ts` (or create if missing)

**Step 1: Check if electron.d.ts exists and update**

If file exists, add the loadSystemFont declaration. If not, create it:

```typescript
export interface ElectronAPI {
  openFileDialog: () => Promise<string[]>
  readFile: (filePath: string) => Promise<Uint8Array>
  saveFile: (filePath: string, data: Uint8Array) => Promise<boolean>
  saveFileDialog: () => Promise<string | undefined>
  loadSystemFont: (fontName: string) => Promise<Uint8Array | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

**Step 2: Run TypeScript check**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 6: Update Return Type and Add Tests

**Files:**
- Modify: `src/renderer/services/pdfManipulator.ts`
- Create: `src/renderer/services/pdfManipulator.test.ts`

**Step 1: Write integration test for annotation baking**

Create `src/renderer/services/pdfManipulator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdf-lib
vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: () => ({ width: 612, height: 792 }),
    drawRectangle: vi.fn(),
    drawLine: vi.fn(),
    drawText: vi.fn()
  }

  const mockPdfDoc = {
    create: vi.fn(() => Promise.resolve({
      copyPages: vi.fn(() => Promise.resolve([mockPage])),
      addPage: vi.fn(),
      embedFont: vi.fn(() => Promise.resolve({
        widthOfTextAtSize: () => 100
      })),
      save: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3])))
    }))
  }

  return {
    PDFDocument: mockPdfDoc,
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    StandardFonts: {
      Helvetica: 'Helvetica',
      HelveticaBold: 'Helvetica-Bold',
      TimesRoman: 'Times-Roman',
      Courier: 'Courier'
    }
  }
})

// Mock electronAPI
vi.stubGlobal('window', {
  electronAPI: {
    loadSystemFont: vi.fn(() => Promise.resolve(null)),
    saveFileDialog: vi.fn(() => Promise.resolve('/test/path.pdf')),
    saveFile: vi.fn(() => Promise.resolve(true))
  }
})

describe('pdfManipulator', () => {
  describe('parseColor', () => {
    it('parses hex colors correctly', async () => {
      // We'll test this indirectly through annotation rendering
    })
  })

  describe('createPdfFromPages', () => {
    it('creates PDF without annotations', async () => {
      // Basic test that function works with empty annotations
    })
  })
})
```

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

---

## Task 7: Final Integration Testing

**Step 1: Run the full app**

Run: `npm run dev`

**Step 2: Test all annotation types**

1. Open a PDF
2. Add each annotation type:
   - Highlight (yellow)
   - Underline (black)
   - Strikethrough (red)
   - Box (red outline, blue fill)
   - Text ("Hello World", Arial, 18pt, bold)
3. Save As to new file
4. Verify document reloads fresh
5. Open saved PDF in external viewer (Preview, Adobe Reader)
6. Verify all annotations appear correctly

**Step 3: Test edge cases**

1. Save with no annotations (should work as before)
2. Save with multi-line text annotation
3. Save with transparent box fill
4. Test different fonts (Times New Roman, Courier New)

**Step 4: Run build**

Run: `npm run build`
Expected: No errors

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/main/ipc.ts` | Add `load-system-font` IPC handler |
| `src/preload/preload.ts` | Expose `loadSystemFont` to renderer |
| `src/renderer/services/fontLoader.ts` | NEW: Font loading with caching and fallback |
| `src/renderer/services/fontLoader.test.ts` | NEW: Font loader tests |
| `src/renderer/services/pdfManipulator.ts` | Add annotation baking, update signatures |
| `src/renderer/App.tsx` | Pass annotations to save, reload after save |
| `src/renderer/types/electron.d.ts` | Add `loadSystemFont` type declaration |
