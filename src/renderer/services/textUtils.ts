export interface TextBox {
  x: number
  y: number
  width: number
  height: number
  text: string
}

export interface TextLine {
  boxes: TextBox[]
  minX: number
  maxX: number
  y: number
  height: number
}

/**
 * Group text boxes into logical lines, handling multi-column layouts.
 * Uses gap detection to identify column boundaries.
 */
export function groupTextIntoLines(boxes: TextBox[]): TextLine[] {
  if (boxes.length === 0) return []

  // Calculate average height for Y tolerance
  const avgHeight = boxes.reduce((sum, b) => sum + b.height, 0) / boxes.length
  const yTolerance = avgHeight * 0.5

  // Group by Y position (within tolerance)
  const yBands = new Map<number, TextBox[]>()

  for (const box of boxes) {
    let foundBand = false
    for (const [bandY, bandBoxes] of yBands) {
      if (Math.abs(box.y - bandY) <= yTolerance) {
        bandBoxes.push(box)
        foundBand = true
        break
      }
    }
    if (!foundBand) {
      yBands.set(box.y, [box])
    }
  }

  const lines: TextLine[] = []

  // Process each Y band
  for (const [, bandBoxes] of yBands) {
    // Sort by X position
    bandBoxes.sort((a, b) => a.x - b.x)

    // Calculate average word width for gap threshold
    const avgWordWidth = bandBoxes.reduce((sum, b) => sum + b.width, 0) / bandBoxes.length

    // Collect all gaps
    const gaps: number[] = []
    for (let i = 1; i < bandBoxes.length; i++) {
      const gap = bandBoxes[i].x - (bandBoxes[i - 1].x + bandBoxes[i - 1].width)
      if (gap > 0) gaps.push(gap)
    }

    // Column gap threshold: 3x median for 3+ gaps, otherwise use avgWordWidth
    // Using 3x to handle justified text which has larger word spacing
    let columnGapThreshold: number
    if (gaps.length >= 3) {
      const sortedGaps = [...gaps].sort((a, b) => a - b)
      const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)]
      columnGapThreshold = medianGap * 3
    } else {
      columnGapThreshold = avgWordWidth
    }

    // Split into lines based on column gaps
    let currentLineBoxes: TextBox[] = [bandBoxes[0]]

    for (let i = 1; i < bandBoxes.length; i++) {
      const gap = bandBoxes[i].x - (bandBoxes[i - 1].x + bandBoxes[i - 1].width)

      if (gap > columnGapThreshold) {
        // Column break - finish current line and start new one
        lines.push(createLine(currentLineBoxes))
        currentLineBoxes = [bandBoxes[i]]
      } else {
        currentLineBoxes.push(bandBoxes[i])
      }
    }

    // Don't forget the last line
    if (currentLineBoxes.length > 0) {
      lines.push(createLine(currentLineBoxes))
    }
  }

  // Sort lines by Y, then by X (for same-row columns)
  lines.sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > avgHeight * 0.5) return yDiff
    return a.minX - b.minX
  })

  return lines
}

function createLine(boxes: TextBox[]): TextLine {
  const minX = Math.min(...boxes.map(b => b.x))
  const maxX = Math.max(...boxes.map(b => b.x + b.width))
  const y = boxes[0].y
  const height = Math.max(...boxes.map(b => b.height))

  return { boxes, minX, maxX, y, height }
}

export interface TextSelection {
  startLine: number
  startWord: number
  endLine: number
  endWord: number
}

export interface SelectedLineWords {
  lineIndex: number
  boxes: TextBox[]
  minX: number
  maxX: number
  y: number
  height: number
}

/**
 * Get selected words from a text selection, handling multi-line and reversed selections.
 * Returns one entry per line with the selected words on that line.
 * Only includes lines that horizontally overlap with the selection region.
 */
export function getSelectedWords(
  lines: TextLine[],
  selection: TextSelection
): SelectedLineWords[] {
  // Normalize selection (ensure start is before end)
  let { startLine, startWord, endLine, endWord } = selection

  if (startLine > endLine || (startLine === endLine && startWord > endWord)) {
    // Swap start and end
    ;[startLine, endLine] = [endLine, startLine]
    ;[startWord, endWord] = [endWord, startWord]
  }

  // Determine horizontal bounds of the selection from start and end positions
  const startBox = lines[startLine]?.boxes[startWord]
  const endBox = lines[endLine]?.boxes[endWord]
  if (!startBox || !endBox) return []

  // Selection X range: from leftmost to rightmost selected position
  const selectionMinX = Math.min(startBox.x, endBox.x)
  const selectionMaxX = Math.max(startBox.x + startBox.width, endBox.x + endBox.width)

  const result: SelectedLineWords[] = []

  for (let lineIdx = startLine; lineIdx <= endLine; lineIdx++) {
    const line = lines[lineIdx]
    if (!line) continue

    // Skip lines that don't horizontally overlap with selection region
    const lineOverlaps = line.maxX >= selectionMinX && line.minX <= selectionMaxX
    if (!lineOverlaps) continue

    let fromWord: number
    let toWord: number

    if (lineIdx === startLine && lineIdx === endLine) {
      // Single line selection
      fromWord = startWord
      toWord = endWord
    } else if (lineIdx === startLine) {
      // First line: from startWord to end of line
      fromWord = startWord
      toWord = line.boxes.length - 1
    } else if (lineIdx === endLine) {
      // Last line: from start to endWord
      fromWord = 0
      toWord = endWord
    } else {
      // Middle line: all words
      fromWord = 0
      toWord = line.boxes.length - 1
    }

    const selectedBoxes = line.boxes.slice(fromWord, toWord + 1)
    if (selectedBoxes.length === 0) continue

    const minX = Math.min(...selectedBoxes.map(b => b.x))
    const maxX = Math.max(...selectedBoxes.map(b => b.x + b.width))

    result.push({
      lineIndex: lineIdx,
      boxes: selectedBoxes,
      minX,
      maxX,
      y: line.y,
      height: line.height
    })
  }

  return result
}

export interface WordLocation {
  lineIndex: number
  wordIndex: number
}

/**
 * Find which word (if any) is at the given point.
 * Returns null if the point is not on any word.
 */
export function findWordAtPoint(
  lines: TextLine[],
  x: number,
  y: number
): WordLocation | null {
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]

    // Check if Y is within line bounds
    if (y < line.y || y > line.y + line.height) continue

    // Check each word in the line
    for (let wordIdx = 0; wordIdx < line.boxes.length; wordIdx++) {
      const box = line.boxes[wordIdx]

      if (x >= box.x && x <= box.x + box.width) {
        return { lineIndex: lineIdx, wordIndex: wordIdx }
      }
    }
  }

  return null
}

import type { Annotation } from '../types/annotations'

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

const ADJACENCY_TOLERANCE = 0.01 // 1% of page width

/**
 * Find an existing annotation that can be merged with a new one.
 * Returns the annotation if found, null otherwise.
 */
export function findMergeCandidate(
  annotations: Annotation[],
  pageId: string,
  type: 'highlight' | 'underline' | 'strikethrough',
  color: string,
  newBounds: Bounds
): Annotation | null {
  for (const ann of annotations) {
    // Must match page, type, and color
    if (ann.pageId !== pageId) continue
    if (ann.type !== type) continue
    if (!('color' in ann) || ann.color !== color) continue

    // Check if on same line (Y overlap)
    const yOverlap = !(
      newBounds.y + newBounds.height < ann.y ||
      ann.y + ann.height < newBounds.y
    )
    if (!yOverlap) continue

    // Check if overlapping or adjacent on X axis
    const newRight = newBounds.x + newBounds.width
    const annRight = ann.x + ann.width

    const overlapsOrAdjacent =
      // Overlapping
      (newBounds.x < annRight && newRight > ann.x) ||
      // Adjacent (within tolerance)
      Math.abs(newBounds.x - annRight) < ADJACENCY_TOLERANCE ||
      Math.abs(ann.x - newRight) < ADJACENCY_TOLERANCE

    if (overlapsOrAdjacent) {
      return ann
    }
  }

  return null
}

/**
 * Calculate merged bounds from existing annotation and new bounds.
 */
export function getMergedBounds(
  existing: Bounds,
  newBounds: Bounds
): Bounds {
  const minX = Math.min(existing.x, newBounds.x)
  const maxX = Math.max(existing.x + existing.width, newBounds.x + newBounds.width)
  const minY = Math.min(existing.y, newBounds.y)
  const maxY = Math.max(existing.y + existing.height, newBounds.y + newBounds.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}
