import { useEffect, useState, useCallback, useRef } from 'react'
import { getTextContent } from '../services/pdfRenderer'
import {
  groupTextIntoLines,
  findWordAtPoint,
  getSelectedWords,
  findMergeCandidate,
  getMergedBounds,
  type TextLine,
  type TextSelection,
  type TextBox
} from '../services/textUtils'
import type { AnnotationTool, HighlightColor, Annotation } from '../types/annotations'
import { HIGHLIGHT_COLORS_TRANSPARENT } from '../types/annotations'
import './TextLayer.css'

interface TextLayerProps {
  documentId: string
  pageId: string
  pageIndex: number
  width: number
  height: number
  scale: number
  currentTool: AnnotationTool
  highlightColor: HighlightColor
  lineColor: string
  annotations: Annotation[]
  onAddAnnotation: (annotation: Annotation) => void
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void
  onDeleteAnnotation: (id: string) => void
  debug?: boolean
}

export default function TextLayer({
  documentId,
  pageId,
  pageIndex,
  width,
  height,
  scale,
  currentTool,
  highlightColor,
  lineColor,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  debug = false
}: TextLayerProps) {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])
  const [lines, setLines] = useState<TextLine[]>([])
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const mouseStart = useRef<{ x: number; y: number } | null>(null)
  const mouseMoved = useRef(false)

  // Is this a text-selection tool?
  const isTextTool = currentTool === 'highlight' || currentTool === 'underline' || currentTool === 'strikethrough'

  useEffect(() => {
    if (!documentId) return

    let cancelled = false

    getTextContent(documentId, pageIndex, scale)
      .then(({ textContent, viewport }) => {
        if (cancelled) return

        const boxes: TextBox[] = []

        // Create a canvas for text measurement
        const measureCanvas = document.createElement('canvas')
        const measureCtx = measureCanvas.getContext('2d')!

        // Get font styles from PDF.js
        const styles = textContent.styles || {}

        for (const item of textContent.items) {
          if (!('str' in item) || !item.str.trim()) continue

          const transform = item.transform
          // Transform coordinates are in PDF space, need to scale them
          const x = transform[4] * scale
          const y = viewport.height - transform[5] * scale
          const itemWidth = item.width * scale
          const itemHeight = Math.abs(transform[3]) * scale
          const baseY = y - itemHeight
          const str = item.str

          // Get font from PDF.js styles
          const fontName = item.fontName
          const style = styles[fontName] || {}
          const fontFamily = style.fontFamily || 'sans-serif'

          // Build font string with weight/style if available
          const isItalic = fontName?.toLowerCase().includes('italic') ||
                          fontName?.toLowerCase().includes('oblique')
          const isBold = fontName?.toLowerCase().includes('bold')

          const fontStyle = isItalic ? 'italic ' : ''
          const fontWeight = isBold ? 'bold ' : ''
          // Use fixed font size for measurement - scaleFactor will handle zoom and font differences
          const measureFontSize = 16

          measureCtx.font = `${fontStyle}${fontWeight}${measureFontSize}px ${fontFamily}, serif, sans-serif`

          // Measure the full string to get scale factor
          const measuredFullWidth = measureCtx.measureText(str).width
          const scaleFactor = measuredFullWidth > 0 ? itemWidth / measuredFullWidth : 1

          // Find word boundaries using regex
          const wordRegex = /\S+/g
          let match
          while ((match = wordRegex.exec(str)) !== null) {
            const word = match[0]
            const startIndex = match.index
            const endIndex = startIndex + word.length

            // Measure from string start to word start (avoids error accumulation)
            const prefixWidth = measureCtx.measureText(str.substring(0, startIndex)).width * scaleFactor
            const toEndWidth = measureCtx.measureText(str.substring(0, endIndex)).width * scaleFactor
            const wordWidth = toEndWidth - prefixWidth

            boxes.push({
              x: x + prefixWidth,
              y: baseY,
              width: wordWidth,
              height: itemHeight,
              text: word
            })
          }
        }

        setTextBoxes(boxes)
        setLines(groupTextIntoLines(boxes))
      })
      .catch((err) => {
        if (!cancelled) console.error('TextLayer error:', err)
      })

    return () => {
      cancelled = true
    }
  }, [documentId, pageIndex, scale])

  // Clear selection when tool changes
  useEffect(() => {
    setSelection(null)
    setIsDragging(false)
  }, [currentTool])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isTextTool) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const hit = findWordAtPoint(lines, x, y)
    if (!hit) return

    e.preventDefault()
    e.stopPropagation()

    mouseStart.current = { x, y }
    mouseMoved.current = false

    setSelection({
      startLine: hit.lineIndex,
      startWord: hit.wordIndex,
      endLine: hit.lineIndex,
      endWord: hit.wordIndex
    })
    setIsDragging(true)
  }, [isTextTool, lines])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selection) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Track if mouse actually moved (threshold of 3px to ignore tiny movements)
    if (mouseStart.current) {
      const dx = Math.abs(x - mouseStart.current.x)
      const dy = Math.abs(y - mouseStart.current.y)
      if (dx > 3 || dy > 3) {
        mouseMoved.current = true
      }
    }

    const hit = findWordAtPoint(lines, x, y)
    if (hit) {
      setSelection(prev => prev ? {
        ...prev,
        endLine: hit.lineIndex,
        endWord: hit.wordIndex
      } : null)
    }
  }, [isDragging, selection, lines])

  // Find all annotations that overlap with given bounds
  const findOverlappingAnnotations = useCallback((
    bounds: { x: number; y: number; width: number; height: number },
    type?: 'highlight' | 'underline' | 'strikethrough',
    color?: string
  ): Annotation[] => {
    return annotations.filter(ann => {
      if (ann.pageId !== pageId) return false
      if (ann.type !== 'highlight' && ann.type !== 'underline' && ann.type !== 'strikethrough') return false
      if (type && ann.type !== type) return false
      if (color && 'color' in ann && ann.color !== color) return false

      // Check if bounds overlap (with small tolerance)
      const tolerance = 0.001
      const overlapsX = bounds.x < ann.x + ann.width + tolerance && bounds.x + bounds.width > ann.x - tolerance
      const overlapsY = bounds.y < ann.y + ann.height + tolerance && bounds.y + bounds.height > ann.y - tolerance

      return overlapsX && overlapsY
    })
  }, [annotations, pageId])

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !selection) {
      setIsDragging(false)
      return
    }

    setIsDragging(false)

    // Check if this is a click (mouse didn't move) - do nothing for clicks
    const isClick = !mouseMoved.current
    if (isClick) {
      setSelection(null)
      return
    }

    // Get selected words for drag selection
    const selectedWords = getSelectedWords(lines, selection)
    if (selectedWords.length === 0) {
      setSelection(null)
      return
    }

    const tool = currentTool as 'highlight' | 'underline' | 'strikethrough'
    const color = currentTool === 'highlight' ? highlightColor : lineColor
    const isClearMode = (currentTool === 'highlight' && highlightColor === 'clear') ||
                        ((currentTool === 'underline' || currentTool === 'strikethrough') && lineColor === 'transparent')

    // Clear mode - erase the selected portion of overlapping annotations
    if (isClearMode) {
      const toDelete = new Set<string>()
      const toUpdate: Map<string, Partial<Annotation>> = new Map()
      const toAdd: Annotation[] = []

      for (const lineSelection of selectedWords) {
        const eraseBounds = {
          x: lineSelection.minX / width,
          y: lineSelection.y / height,
          width: (lineSelection.maxX - lineSelection.minX) / width,
          height: lineSelection.height / height
        }

        const overlapping = findOverlappingAnnotations(eraseBounds, tool)

        for (const ann of overlapping) {
          // Skip if already marked for deletion
          if (toDelete.has(ann.id)) continue

          const annLeft = ann.x
          const annRight = ann.x + ann.width
          const eraseLeft = eraseBounds.x
          const eraseRight = eraseBounds.x + eraseBounds.width
          const tolerance = 0.001

          // Case 1: Erase fully covers annotation → delete it
          if (eraseLeft <= annLeft + tolerance && eraseRight >= annRight - tolerance) {
            toDelete.add(ann.id)
            toUpdate.delete(ann.id) // Remove any pending updates
            continue
          }

          // Case 2: Erase covers left side → shrink from left
          if (eraseLeft <= annLeft + tolerance && eraseRight < annRight - tolerance) {
            const newX = eraseRight
            const newWidth = annRight - eraseRight
            toUpdate.set(ann.id, { x: newX, width: newWidth })
            continue
          }

          // Case 3: Erase covers right side → shrink from right
          if (eraseLeft > annLeft + tolerance && eraseRight >= annRight - tolerance) {
            const newWidth = eraseLeft - annLeft
            toUpdate.set(ann.id, { width: newWidth })
            continue
          }

          // Case 4: Erase is in the middle → split into two
          if (eraseLeft > annLeft + tolerance && eraseRight < annRight - tolerance) {
            // Left portion: keep original x, shrink width
            toUpdate.set(ann.id, { width: eraseLeft - annLeft })

            // Right portion: create new annotation
            const rightPortion: Annotation = {
              ...ann,
              id: crypto.randomUUID(),
              x: eraseRight,
              width: annRight - eraseRight
            }
            toAdd.push(rightPortion)
          }
        }
      }

      // Apply changes
      toDelete.forEach(id => onDeleteAnnotation(id))
      toUpdate.forEach((updates, id) => onUpdateAnnotation(id, updates))
      toAdd.forEach(ann => onAddAnnotation(ann))

      setSelection(null)
      return
    }

    // Check if ALL selected lines are fully covered by existing annotations of same type/color
    // If so, toggle off by removing just the selected portion (partial removal)
    let allCovered = true
    const coveringInfo: { bounds: { x: number; y: number; width: number; height: number }; annotations: Annotation[] }[] = []

    for (const lineSelection of selectedWords) {
      const bounds = {
        x: lineSelection.minX / width,
        y: lineSelection.y / height,
        width: (lineSelection.maxX - lineSelection.minX) / width,
        height: lineSelection.height / height
      }

      const overlapping = findOverlappingAnnotations(bounds, tool, color)

      if (overlapping.length === 0) {
        allCovered = false
        break
      }

      // Check if any annotation fully covers this selection
      const fullyCovered = overlapping.some(ann =>
        ann.x <= bounds.x + 0.001 &&
        ann.x + ann.width >= bounds.x + bounds.width - 0.001 &&
        ann.y <= bounds.y + 0.001 &&
        ann.y + ann.height >= bounds.y + bounds.height - 0.001
      )

      if (!fullyCovered) {
        allCovered = false
        break
      }

      coveringInfo.push({ bounds, annotations: overlapping })
    }

    if (allCovered && coveringInfo.length > 0) {
      // Toggle off - remove just the selected portion (same logic as eraser)
      const toDelete = new Set<string>()
      const toUpdate: Map<string, Partial<Annotation>> = new Map()
      const toAdd: Annotation[] = []

      for (const { bounds: eraseBounds, annotations: overlapping } of coveringInfo) {
        for (const ann of overlapping) {
          if (toDelete.has(ann.id)) continue

          const annLeft = ann.x
          const annRight = ann.x + ann.width
          const eraseLeft = eraseBounds.x
          const eraseRight = eraseBounds.x + eraseBounds.width
          const tolerance = 0.001

          // Case 1: Erase fully covers annotation → delete it
          if (eraseLeft <= annLeft + tolerance && eraseRight >= annRight - tolerance) {
            toDelete.add(ann.id)
            toUpdate.delete(ann.id)
            continue
          }

          // Case 2: Erase covers left side → shrink from left
          if (eraseLeft <= annLeft + tolerance && eraseRight < annRight - tolerance) {
            const newX = eraseRight
            const newWidth = annRight - eraseRight
            toUpdate.set(ann.id, { x: newX, width: newWidth })
            continue
          }

          // Case 3: Erase covers right side → shrink from right
          if (eraseLeft > annLeft + tolerance && eraseRight >= annRight - tolerance) {
            const newWidth = eraseLeft - annLeft
            toUpdate.set(ann.id, { width: newWidth })
            continue
          }

          // Case 4: Erase is in the middle → split into two
          if (eraseLeft > annLeft + tolerance && eraseRight < annRight - tolerance) {
            toUpdate.set(ann.id, { width: eraseLeft - annLeft })
            const rightPortion: Annotation = {
              ...ann,
              id: crypto.randomUUID(),
              x: eraseRight,
              width: annRight - eraseRight
            }
            toAdd.push(rightPortion)
          }
        }
      }

      toDelete.forEach(id => onDeleteAnnotation(id))
      toUpdate.forEach((updates, id) => onUpdateAnnotation(id, updates))
      toAdd.forEach(ann => onAddAnnotation(ann))

      setSelection(null)
      return
    }

    // Create or merge annotations (one per line)
    for (const lineSelection of selectedWords) {
      const newBounds = {
        x: lineSelection.minX / width,
        y: lineSelection.y / height,
        width: (lineSelection.maxX - lineSelection.minX) / width,
        height: lineSelection.height / height
      }

      // Check for merge candidate
      const mergeCandidate = findMergeCandidate(annotations, pageId, tool, color, newBounds)

      if (mergeCandidate) {
        // Merge: update existing annotation with expanded bounds
        const merged = getMergedBounds(mergeCandidate, newBounds)
        onUpdateAnnotation(mergeCandidate.id, merged)
      } else {
        // Create new annotation
        const annotation = createAnnotationFromSelection(
          pageId,
          lineSelection,
          width,
          height,
          tool,
          color
        )
        onAddAnnotation(annotation)
      }
    }

    setSelection(null)
  }, [isDragging, selection, lines, pageId, width, height, currentTool, highlightColor, lineColor, onAddAnnotation, onUpdateAnnotation, onDeleteAnnotation, annotations, findOverlappingAnnotations])

  // Get preview boxes for current selection
  const previewBoxes = selection ? getSelectedWords(lines, selection) : []

  return (
    <div
      className={`text-layer ${debug ? 'debug' : ''} ${isTextTool ? 'text-tool-active' : ''}`}
      style={{ width, height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Debug boxes */}
      {debug && textBoxes.map((box, i) => (
        <div
          key={i}
          className="text-box"
          style={{
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height
          }}
          data-text={box.text}
        />
      ))}

      {/* Selection preview */}
      {previewBoxes.map((lineSelection, i) => {
        // Line thickness proportional to text height (about 8%, min 1px)
        const lineThickness = Math.max(1, Math.round(lineSelection.height * 0.08))
        const isClearMode = (currentTool === 'highlight' && highlightColor === 'clear') ||
                            ((currentTool === 'underline' || currentTool === 'strikethrough') && lineColor === 'transparent')
        return (
          <div
            key={`preview-${i}`}
            className={`selection-preview ${currentTool} ${isClearMode ? 'clear-mode' : ''}`}
            style={{
              left: lineSelection.minX,
              // Clear mode always shows full text height, not just line
              top: !isClearMode && currentTool === 'underline'
                ? lineSelection.y + lineSelection.height
                : !isClearMode && currentTool === 'strikethrough'
                  // Position at ~65% down to account for descenders (p, g, y, etc.)
                  ? lineSelection.y + lineSelection.height * 0.65 - lineThickness / 2
                  : lineSelection.y,
              width: lineSelection.maxX - lineSelection.minX,
              height: !isClearMode && (currentTool === 'underline' || currentTool === 'strikethrough')
                ? lineThickness
                : lineSelection.height,
              backgroundColor: isClearMode
                ? 'rgba(255, 0, 0, 0.15)'
                : currentTool === 'highlight'
                  ? HIGHLIGHT_COLORS_TRANSPARENT[highlightColor]
                  : lineColor
            }}
          />
        )
      })}
    </div>
  )
}

function createAnnotationFromSelection(
  pageId: string,
  lineSelection: { minX: number; maxX: number; y: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  tool: 'highlight' | 'underline' | 'strikethrough',
  color: string | HighlightColor
): Annotation {
  const x = lineSelection.minX / canvasWidth
  const y = lineSelection.y / canvasHeight
  const w = (lineSelection.maxX - lineSelection.minX) / canvasWidth
  const h = lineSelection.height / canvasHeight

  const base = {
    id: crypto.randomUUID(),
    pageId,
    x,
    y,
    width: w,
    height: h
  }

  if (tool === 'highlight') {
    return { ...base, type: 'highlight', color: color as HighlightColor }
  } else if (tool === 'underline') {
    return { ...base, type: 'underline', color: color as string }
  } else {
    return { ...base, type: 'strikethrough', color: color as string }
  }
}
