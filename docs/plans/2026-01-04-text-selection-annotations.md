# Text Selection Annotations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable selecting actual PDF text and applying highlight/underline/strikethrough annotations to the selected text bounds.

**Architecture:** Add a PDF.js text layer on top of the canvas that enables native browser text selection. When user selects text and has an annotation tool active, capture the selection bounds and create annotations that precisely follow the text positions.

**Tech Stack:** PDF.js TextLayer API, browser Selection API, React

---

## Stage 1: Render Text Layer (Testable Checkpoint)

### Task 1.1: Add getTextContent to pdfRenderer service

**Files:**
- Modify: `src/renderer/services/pdfRenderer.ts`

**Step 1: Add function to get text content from a page**

Add this function after `renderPage`:

```typescript
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
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

---

### Task 1.2: Create TextLayer component

**Files:**
- Create: `src/renderer/components/TextLayer.tsx`
- Create: `src/renderer/components/TextLayer.css`

**Step 1: Create CSS file**

```css
.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  opacity: 0.2;
  line-height: 1.0;
}

.text-layer > span {
  color: transparent;
  position: absolute;
  white-space: pre;
  transform-origin: 0% 0%;
  pointer-events: all;
}

/* Debug mode - make text visible */
.text-layer.debug > span {
  color: red;
  background: rgba(255, 255, 0, 0.3);
}
```

**Step 2: Create TextLayer component**

```tsx
import { useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { getTextContent } from '../services/pdfRenderer'
import './TextLayer.css'

interface TextLayerProps {
  documentId: string
  pageIndex: number
  width: number
  height: number
  scale: number
}

export default function TextLayer({
  documentId,
  pageIndex,
  width,
  height,
  scale
}: TextLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !documentId) return

    let cancelled = false
    const container = containerRef.current

    // Clear existing content
    container.innerHTML = ''

    getTextContent(documentId, pageIndex, scale)
      .then(({ textContent, viewport }) => {
        if (cancelled || !container) return

        // Use PDF.js TextLayer to render
        pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container,
          viewport,
        })
      })
      .catch((err) => {
        if (!cancelled) console.error('TextLayer error:', err)
      })

    return () => {
      cancelled = true
    }
  }, [documentId, pageIndex, scale])

  return (
    <div
      ref={containerRef}
      className="text-layer debug"
      style={{ width, height }}
    />
  )
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

---

### Task 1.3: Add TextLayer to MainViewer

**Files:**
- Modify: `src/renderer/components/MainViewer.tsx`

**Step 1: Import TextLayer**

Add at top with other imports:
```typescript
import TextLayer from './TextLayer'
```

**Step 2: Add TextLayer after canvas, before AnnotationLayer**

Find the `<canvas>` element and add TextLayer right after it:

```tsx
<canvas
  ref={canvasRef}
  style={{ display: hasContent ? 'block' : 'none' }}
/>
{hasContent && documentId && canvasDimensions.width > 0 && (
  <TextLayer
    documentId={documentId}
    pageIndex={pageIndex}
    width={canvasDimensions.width}
    height={canvasDimensions.height}
    scale={zoom}
  />
)}
{hasContent && pageId && canvasDimensions.width > 0 && (
  <AnnotationLayer
```

**Step 3: Verify and test**

Run: `npm run dev`

**TEST CHECKPOINT:**
- Open a PDF with text
- You should see red text overlaid on the PDF (debug mode)
- The text should align with the PDF text underneath
- Zoom in/out and verify text stays aligned

---

## Stage 2: Enable Text Selection (Testable Checkpoint)

### Task 2.1: Make text layer selectable

**Files:**
- Modify: `src/renderer/components/TextLayer.css`

**Step 1: Update CSS for selection**

Replace content with:

```css
.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  line-height: 1.0;
  z-index: 5;
}

.text-layer > span {
  color: transparent;
  position: absolute;
  white-space: pre;
  transform-origin: 0% 0%;
  pointer-events: all;
  cursor: text;
}

/* Selection highlight */
.text-layer > span::selection {
  background: rgba(0, 100, 255, 0.3);
}

/* Debug mode - make text visible */
.text-layer.debug > span {
  color: red;
  background: rgba(255, 255, 0, 0.3);
}
```

**Step 2: Verify and test**

Run: `npm run dev`

**TEST CHECKPOINT:**
- Open a PDF
- Click and drag to select text
- Selected text should show blue highlight
- You can copy selected text (Ctrl+C)

---

### Task 2.2: Pass tool state to TextLayer

**Files:**
- Modify: `src/renderer/components/TextLayer.tsx`
- Modify: `src/renderer/components/MainViewer.tsx`

**Step 1: Update TextLayer props**

```tsx
interface TextLayerProps {
  documentId: string
  pageIndex: number
  width: number
  height: number
  scale: number
  isSelectionTool: boolean // highlight, underline, or strikethrough active
}
```

Update component signature and add conditional class:

```tsx
export default function TextLayer({
  documentId,
  pageIndex,
  width,
  height,
  scale,
  isSelectionTool
}: TextLayerProps) {
```

Change the return to conditionally enable interaction:

```tsx
return (
  <div
    ref={containerRef}
    className={`text-layer ${isSelectionTool ? 'selection-active' : ''}`}
    style={{
      width,
      height,
      pointerEvents: isSelectionTool ? 'auto' : 'none'
    }}
  />
)
```

**Step 2: Pass prop from MainViewer**

```tsx
<TextLayer
  documentId={documentId}
  pageIndex={pageIndex}
  width={canvasDimensions.width}
  height={canvasDimensions.height}
  scale={zoom}
  isSelectionTool={['highlight', 'underline', 'strikethrough'].includes(currentTool)}
/>
```

**Step 3: Update CSS - remove debug mode**

In TextLayer.css, remove the debug class usage and delete the debug styles:

```css
.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  line-height: 1.0;
  z-index: 5;
}

.text-layer > span {
  color: transparent;
  position: absolute;
  white-space: pre;
  transform-origin: 0% 0%;
}

.text-layer.selection-active > span {
  pointer-events: all;
  cursor: text;
}

.text-layer > span::selection {
  background: rgba(0, 100, 255, 0.3);
}
```

And in TextLayer.tsx, remove "debug" from className:
```tsx
className={`text-layer ${isSelectionTool ? 'selection-active' : ''}`}
```

**Step 4: Verify and test**

Run: `npm run dev`

**TEST CHECKPOINT:**
- With select tool: Cannot select text, can drag/move annotations
- With highlight/underline/strikethrough tool: Can select PDF text
- Text layer is invisible but selectable when appropriate tools active

---

## Stage 3: Create Annotations from Selection (Testable Checkpoint)

### Task 3.1: Add selection capture and annotation creation

**Files:**
- Modify: `src/renderer/components/TextLayer.tsx`

**Step 1: Add props for annotation creation**

Update props interface:

```tsx
interface TextLayerProps {
  documentId: string
  pageIndex: number
  pageId: string
  width: number
  height: number
  scale: number
  currentTool: 'select' | 'highlight' | 'underline' | 'strikethrough' | 'box' | 'text'
  highlightColor: string
  lineColor: string
  onAddAnnotation: (annotation: any) => void
}
```

**Step 2: Add selection handler**

Add this inside the component, after the useEffect:

```tsx
const handleMouseUp = useCallback(() => {
  if (!['highlight', 'underline', 'strikethrough'].includes(currentTool)) return

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !containerRef.current) return

  const range = selection.getRangeAt(0)
  const rects = range.getClientRects()
  const containerRect = containerRef.current.getBoundingClientRect()

  if (rects.length === 0) return

  // Create annotation for each line of selection
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]

    // Convert to normalized coordinates (0-1)
    const x = (rect.left - containerRect.left) / width
    const y = (rect.top - containerRect.top) / height
    const w = rect.width / width
    const h = rect.height / height

    // Skip tiny rects (artifacts)
    if (w < 0.001 || h < 0.001) continue

    let annotation: any

    if (currentTool === 'highlight') {
      annotation = {
        id: crypto.randomUUID(),
        pageId,
        type: 'highlight',
        x,
        y,
        width: w,
        height: h,
        color: highlightColor
      }
    } else if (currentTool === 'underline') {
      annotation = {
        id: crypto.randomUUID(),
        pageId,
        type: 'underline',
        x,
        y: y + h, // Line at bottom
        width: w,
        height: 0.003,
        color: lineColor
      }
    } else if (currentTool === 'strikethrough') {
      annotation = {
        id: crypto.randomUUID(),
        pageId,
        type: 'strikethrough',
        x,
        y: y + h / 2, // Line in middle
        width: w,
        height: 0.003,
        color: lineColor
      }
    }

    if (annotation) {
      onAddAnnotation(annotation)
    }
  }

  // Clear selection after creating annotations
  selection.removeAllRanges()
}, [currentTool, pageId, width, height, highlightColor, lineColor, onAddAnnotation])
```

**Step 3: Add event listener**

Update the return JSX:

```tsx
return (
  <div
    ref={containerRef}
    className={`text-layer ${isSelectionTool ? 'selection-active' : ''}`}
    style={{
      width,
      height,
      pointerEvents: isSelectionTool ? 'auto' : 'none'
    }}
    onMouseUp={handleMouseUp}
  />
)
```

Add the isSelectionTool variable:
```tsx
const isSelectionTool = ['highlight', 'underline', 'strikethrough'].includes(currentTool)
```

**Step 4: Update imports**

Add useCallback to imports:
```tsx
import { useEffect, useRef, useCallback } from 'react'
```

---

### Task 3.2: Update MainViewer to pass new props

**Files:**
- Modify: `src/renderer/components/MainViewer.tsx`

**Step 1: Update TextLayer usage**

Replace the TextLayer component usage:

```tsx
{hasContent && documentId && pageId && canvasDimensions.width > 0 && (
  <TextLayer
    documentId={documentId}
    pageIndex={pageIndex}
    pageId={pageId}
    width={canvasDimensions.width}
    height={canvasDimensions.height}
    scale={zoom}
    currentTool={currentTool}
    highlightColor={highlightColor}
    lineColor={lineColor}
    onAddAnnotation={onAddAnnotation}
  />
)}
```

**Step 2: Verify and test**

Run: `npm run dev`

**TEST CHECKPOINT:**
- Select highlight tool, select some PDF text, release mouse
- Highlight annotation should appear over the selected text
- Try underline tool - line should appear under selected text
- Try strikethrough - line should appear through middle of text
- Multi-line selection should create multiple annotations
- Annotations should be saved and persist

---

## Stage 4: Polish and Edge Cases

### Task 4.1: Prevent annotation layer drawing when text selected

**Files:**
- Modify: `src/renderer/components/AnnotationLayer.tsx`

**Step 1: Add prop to check if text layer is handling selection**

The drawing behavior in AnnotationLayer for highlight/underline/strikethrough should be disabled when the text layer is active. Update the handleMouseDown to check if there's a text selection first:

At the start of handleMouseDown, add:
```tsx
// Don't start drawing if there's a text selection (let TextLayer handle it)
if (['highlight', 'underline', 'strikethrough'].includes(currentTool)) {
  const selection = window.getSelection()
  if (selection && !selection.isCollapsed) return
}
```

**Step 2: Verify and test**

Run: `npm run dev`

**TEST CHECKPOINT:**
- Text selection creates annotations via TextLayer
- Drawing mode still works for areas without text
- No duplicate annotations created

---

### Task 4.2: Add cursor feedback

**Files:**
- Modify: `src/renderer/components/TextLayer.css`

**Step 1: Add hover effects**

```css
.text-layer.selection-active {
  cursor: text;
}

.text-layer.selection-active > span:hover {
  background: rgba(0, 100, 255, 0.1);
}
```

**Step 2: Final test**

Run: `npm run dev`

**FINAL TEST CHECKPOINT:**
- Hover over text with highlight tool shows subtle highlight
- Selection works smoothly
- Annotations appear correctly positioned
- Zoom in/out maintains correct positioning
- Works with different PDFs

---

## Summary of Changes

1. **pdfRenderer.ts** - Added `getTextContent()` function
2. **TextLayer.tsx** - New component for PDF text layer
3. **TextLayer.css** - Styles for text layer and selection
4. **MainViewer.tsx** - Integrated TextLayer component
5. **AnnotationLayer.tsx** - Skip drawing when text selected
