import { useRef, useState, useCallback, useEffect } from 'react'
import type {
  Annotation,
  AnnotationTool,
  BoxThickness,
  PenWidth,
  TextFont
} from '../types/annotations'
import {
  BOX_THICKNESS_PX,
  hexToHighlightRgba
} from '../types/annotations'
import './AnnotationLayer.css'

interface AnnotationLayerProps {
  pageId: string
  annotations: Annotation[]
  selectedAnnotationIds: Set<string>
  currentTool: AnnotationTool
  canvasWidth: number
  canvasHeight: number
  zoom: number
  // Tool settings
  highlightColor: string
  lineColor: string
  boxColor: string
  boxFillColor: string
  boxThickness: BoxThickness
  penColor: string
  penWidth: PenWidth
  textColor: string
  textFont: TextFont
  textSize: number
  // Callbacks
  onAddAnnotation: (annotation: Annotation) => void
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void
  onDeleteAnnotation: (id: string) => void
  onSelectAnnotation: (id: string | null, addToSelection?: boolean) => void
  onToolChange: (tool: AnnotationTool) => void
}

interface DrawingState {
  isDrawing: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export default function AnnotationLayer({
  pageId,
  annotations,
  selectedAnnotationIds,
  currentTool,
  canvasWidth,
  canvasHeight,
  zoom,
  highlightColor,
  lineColor,
  boxColor,
  boxFillColor,
  boxThickness,
  penColor,
  penWidth,
  textColor,
  textFont,
  textSize,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  onToolChange
}: AnnotationLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState<DrawingState | null>(null)
  const [penDrawing, setPenDrawing] = useState<{ points: [number, number][] } | null>(null)
  const [dragging, setDragging] = useState<{
    ids: string[]
    startX: number
    startY: number
    initialPositions: Map<string, { x: number; y: number }>
  } | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [isPlaceholderText, setIsPlaceholderText] = useState(false)
  // Store pending text annotation while waiting for parent state to update
  const [pendingTextAnnotation, setPendingTextAnnotation] = useState<Annotation | null>(null)
  // Track if we just started editing to ignore spurious blur events
  const justStartedEditing = useRef(false)
  // Track tool to restore after double-click edit (null = don't restore)
  const toolToRestoreRef = useRef<AnnotationTool | null>(null)
  // Track the textarea ref for selecting placeholder text
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Track custom resize state for text annotations
  const [resizing, setResizing] = useState<{ startX: number; startWidth: number } | null>(null)
  const [textareaWidth, setTextareaWidth] = useState<number | null>(null)
  // Track pen annotations marked for erasure (shown greyed out until mouse up)
  const [pendingErase, setPendingErase] = useState<Set<string>>(new Set())
  // Track if eraser is actively dragging
  const [eraserDragging, setEraserDragging] = useState(false)

  // Track resize state for box annotations
  const [boxResizing, setBoxResizing] = useState<{
    id: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    aspectRatio: number
  } | null>(null)

  // Clear pending annotation once it appears in the annotations array
  useEffect(() => {
    if (pendingTextAnnotation && annotations.some(a => a.id === pendingTextAnnotation.id)) {
      setPendingTextAnnotation(null)
    }
  }, [annotations, pendingTextAnnotation])

  // Select all text when editing starts (placeholder or double-click)
  const [selectAllOnEdit, setSelectAllOnEdit] = useState(false)

  useEffect(() => {
    if ((isPlaceholderText || selectAllOnEdit) && editingTextId) {
      // Use setTimeout to ensure textarea is mounted and focused first
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
        setSelectAllOnEdit(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isPlaceholderText, selectAllOnEdit, editingTextId])

  // Reset textarea width when starting to edit a different annotation
  useEffect(() => {
    setTextareaWidth(null)
  }, [editingTextId])

  // Track previous tool to detect tool changes
  const prevToolRef = useRef(currentTool)

  // Finish text editing when switching away from text tool
  useEffect(() => {
    const prevTool = prevToolRef.current
    prevToolRef.current = currentTool

    // Only finish if we switched FROM text tool to another tool while editing
    if (prevTool === 'text' && currentTool !== 'text' && editingTextId) {
      // Save or delete the annotation
      const shouldDelete = !editingContent.trim() || isPlaceholderText
      if (!shouldDelete) {
        const updates: { content: string; width?: number; height?: number } = { content: editingContent }
        if (textareaWidth !== null) {
          updates.width = textareaWidth / canvasWidth
        } else if (textareaRef.current) {
          updates.width = textareaRef.current.offsetWidth / canvasWidth
        }
        if (textareaRef.current) {
          updates.height = textareaRef.current.offsetHeight / canvasHeight
        }
        onUpdateAnnotation(editingTextId, updates)
      } else {
        onDeleteAnnotation(editingTextId)
      }
      // Clear editing state
      setEditingTextId(null)
      setEditingContent('')
      setIsPlaceholderText(false)
      setPendingTextAnnotation(null)
      setTextareaWidth(null)
      // User manually switched tools, don't restore
      toolToRestoreRef.current = null
    }
  }, [currentTool, editingTextId, editingContent, isPlaceholderText, textareaWidth, canvasWidth, canvasHeight, onUpdateAnnotation, onDeleteAnnotation])

  // Handle resize mouse move and mouse up on document
  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX
      const newWidth = Math.max(50, resizing.startWidth + delta)
      setTextareaWidth(newWidth)
    }

    const handleMouseUp = () => {
      setResizing(null)
      // Refocus textarea after resize
      textareaRef.current?.focus()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  // Handle box resize mouse move and mouse up on document
  useEffect(() => {
    if (!boxResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - boxResizing.startX
      const deltaY = e.clientY - boxResizing.startY
      let newWidth = Math.max(20, boxResizing.startWidth + deltaX)
      let newHeight = Math.max(20, boxResizing.startHeight + deltaY)

      // Hold shift to maintain aspect ratio
      if (e.shiftKey) {
        // Use the larger delta to determine size, maintain aspect ratio
        const widthRatio = newWidth / boxResizing.startWidth
        const heightRatio = newHeight / boxResizing.startHeight
        if (widthRatio > heightRatio) {
          newHeight = newWidth / boxResizing.aspectRatio
        } else {
          newWidth = newHeight * boxResizing.aspectRatio
        }
        // Ensure minimums are still respected
        newWidth = Math.max(20, newWidth)
        newHeight = Math.max(20, newHeight)
      }

      onUpdateAnnotation(boxResizing.id, {
        width: newWidth / canvasWidth,
        height: newHeight / canvasHeight
      })
    }

    const handleMouseUp = () => {
      setBoxResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [boxResizing, canvasWidth, canvasHeight, onUpdateAnnotation])

  // Handle eraser drag: mousedown to start, mousemove to detect intersections, mouseup to confirm, escape to cancel
  useEffect(() => {
    if (currentTool !== 'eraser') return

    const getLayerPos = (e: MouseEvent) => {
      if (!layerRef.current) return null
      const rect = layerRef.current.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const findHitPens = (pos: { x: number; y: number }) => {
      return annotations.filter(ann => {
        if (ann.type !== 'pen') return false
        const threshold = Math.max(ann.strokeWidth * zoom, 8)

        for (let i = 1; i < ann.points.length; i++) {
          const p1 = { x: ann.points[i - 1][0] * canvasWidth, y: ann.points[i - 1][1] * canvasHeight }
          const p2 = { x: ann.points[i][0] * canvasWidth, y: ann.points[i][1] * canvasHeight }

          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const lengthSq = dx * dx + dy * dy

          let t = 0
          if (lengthSq > 0) {
            t = Math.max(0, Math.min(1, ((pos.x - p1.x) * dx + (pos.y - p1.y) * dy) / lengthSq))
          }

          const nearestX = p1.x + t * dx
          const nearestY = p1.y + t * dy
          const distSq = (pos.x - nearestX) ** 2 + (pos.y - nearestY) ** 2

          if (distSq <= threshold ** 2) return true
        }
        return false
      })
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return // Only left click
      const pos = getLayerPos(e)
      if (!pos) return

      // Start eraser drag for pen marks (TextLayer handles text annotations separately)
      setEraserDragging(true)
      const hitPens = findHitPens(pos)
      if (hitPens.length > 0) {
        setPendingErase(new Set(hitPens.map(ann => ann.id)))
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!eraserDragging) return
      const pos = getLayerPos(e)
      if (!pos) return

      const hitPens = findHitPens(pos)
      if (hitPens.length > 0) {
        setPendingErase(prev => {
          const next = new Set(prev)
          hitPens.forEach(ann => next.add(ann.id))
          return next
        })
      }
    }

    const handleMouseUp = () => {
      if (!eraserDragging) return
      // Delete all pending erase annotations
      pendingErase.forEach(id => onDeleteAnnotation(id))
      setPendingErase(new Set())
      setEraserDragging(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && eraserDragging) {
        setPendingErase(new Set())
        setEraserDragging(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentTool, eraserDragging, pendingErase, annotations, canvasWidth, canvasHeight, zoom, onDeleteAnnotation])


  // Convert pixel coordinates to normalized (0-1) coordinates
  const toNormalized = useCallback((pixelX: number, pixelY: number) => ({
    x: pixelX / canvasWidth,
    y: pixelY / canvasHeight
  }), [canvasWidth, canvasHeight])

  // Convert normalized coordinates to pixels
  const toPixels = useCallback((normX: number, normY: number) => ({
    x: normX * canvasWidth,
    y: normY * canvasHeight
  }), [canvasWidth, canvasHeight])

  // Get mouse position relative to layer
  const getMousePos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    if (!layerRef.current) return { x: 0, y: 0 }
    const rect = layerRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  // Check if a point hits an annotation
  const hitTestAnnotation = useCallback((pos: { x: number; y: number }, ann: Annotation): boolean => {
    const annPos = toPixels(ann.x, ann.y)
    const annWidth = ann.width * canvasWidth
    const annHeight = ann.height * canvasHeight
    return (
      pos.x >= annPos.x &&
      pos.x <= annPos.x + annWidth &&
      pos.y >= annPos.y &&
      pos.y <= annPos.y + annHeight
    )
  }, [toPixels, canvasWidth, canvasHeight])

  // Find annotation at position, optionally filtered by type
  // excludeTextMarkings: exclude highlight/underline/strikethrough (they can't be selected)
  const findAnnotationAt = useCallback((
    pos: { x: number; y: number },
    typeFilter?: Annotation['type'],
    excludeTextMarkings = false
  ): Annotation | undefined => {
    return annotations.find(ann => {
      if (typeFilter && ann.type !== typeFilter) return false
      if (excludeTextMarkings && (ann.type === 'highlight' || ann.type === 'underline' || ann.type === 'strikethrough')) {
        return false
      }
      return hitTestAnnotation(pos, ann)
    })
  }, [annotations, hitTestAnnotation])

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click

    const pos = getMousePos(e)

    // Check if clicking on an existing annotation (for select tool)
    // Exclude text markings (highlight/underline/strikethrough) - use eraser tool for those
    if (currentTool === 'select') {
      const clickedAnnotation = findAnnotationAt(pos, undefined, true)

      if (clickedAnnotation) {
        const isAlreadySelected = selectedAnnotationIds.has(clickedAnnotation.id)
        const isShiftClick = e.shiftKey

        if (isShiftClick) {
          // Shift-click: toggle selection
          onSelectAnnotation(clickedAnnotation.id, true)
        } else if (!isAlreadySelected) {
          // Normal click on unselected: select only this one
          onSelectAnnotation(clickedAnnotation.id, false)
        }
        // If already selected without shift, keep current selection (allow dragging group)

        // Determine which annotations to drag
        const idsToDrag = isShiftClick
          ? [...selectedAnnotationIds, clickedAnnotation.id].filter((id, i, arr) => arr.indexOf(id) === i)
          : isAlreadySelected
            ? [...selectedAnnotationIds]
            : [clickedAnnotation.id]

        // Build initial positions for all dragged annotations
        const initialPositions = new Map<string, { x: number; y: number }>()
        idsToDrag.forEach(id => {
          const ann = annotations.find(a => a.id === id)
          if (ann) {
            initialPositions.set(id, { x: ann.x, y: ann.y })
          }
        })

        setDragging({
          ids: idsToDrag,
          startX: pos.x,
          startY: pos.y,
          initialPositions
        })
      } else {
        onSelectAnnotation(null)
      }
      return
    }

    // Start drawing for annotation tools
    if (['highlight', 'underline', 'strikethrough', 'box'].includes(currentTool)) {
      // Deselect any selected annotation when starting to draw
      onSelectAnnotation(null)
      setDrawing({
        isDrawing: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y
      })
    }

    // Pen tool - start collecting points
    if (currentTool === 'pen') {
      onSelectAnnotation(null)
      const normalized = toNormalized(pos.x, pos.y)
      setPenDrawing({ points: [[normalized.x, normalized.y]] })
    }

    // Text tool - place text at click position or edit existing text
    if (currentTool === 'text') {
      const clickedTextAnnotation = findAnnotationAt(pos, 'text')

      if (clickedTextAnnotation) {
        // If already editing this annotation, don't reset the content
        if (clickedTextAnnotation.id === editingTextId) {
          return
        }
        // If editing a different annotation, save or delete it first
        if (editingTextId) {
          const shouldDelete = !editingContent.trim() || isPlaceholderText
          if (!shouldDelete) {
            const updates: { content: string; width?: number; height?: number } = { content: editingContent }
            if (textareaRef.current) {
              updates.width = textareaRef.current.offsetWidth / canvasWidth
              updates.height = textareaRef.current.offsetHeight / canvasHeight
            }
            onUpdateAnnotation(editingTextId, updates)
          } else {
            onDeleteAnnotation(editingTextId)
          }
          setTextareaWidth(null)
        }
        // Edit existing text annotation
        onSelectAnnotation(clickedTextAnnotation.id)
        setEditingTextId(clickedTextAnnotation.id)
        setEditingContent(clickedTextAnnotation.type === 'text' ? clickedTextAnnotation.content : '')
        setIsPlaceholderText(false)
        justStartedEditing.current = true
        return
      }

      // If currently editing a text annotation and clicked away, just finish the edit
      // (don't create a new text box)
      if (editingTextId) {
        // Save the current text, width, and height, then exit edit mode
        const shouldDelete = !editingContent.trim() || isPlaceholderText
        if (!shouldDelete) {
          const updates: { content: string; width?: number; height?: number } = { content: editingContent }
          if (textareaRef.current) {
            updates.width = textareaRef.current.offsetWidth / canvasWidth
            updates.height = textareaRef.current.offsetHeight / canvasHeight
          }
          onUpdateAnnotation(editingTextId, updates)
        } else {
          // Delete empty text annotations
          onDeleteAnnotation(editingTextId)
        }
        setEditingTextId(null)
        setEditingContent('')
        setIsPlaceholderText(false)
        setPendingTextAnnotation(null)
        setTextareaWidth(null)
        onSelectAnnotation(null)
        // Restore previous tool if editing was started via double-click
        if (toolToRestoreRef.current) {
          onToolChange(toolToRestoreRef.current)
          toolToRestoreRef.current = null
        }
        return
      }

      // Place new text annotation and immediately enter edit mode
      // Adjust position slightly: 1px left, 2px down for better cursor alignment
      const normalized = toNormalized(pos.x - 1, pos.y + 2)
      const defaultWidth = 0.3
      const defaultHeight = 0.03
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        pageId,
        type: 'text',
        // Left edge at cursor, vertically centered
        x: normalized.x,
        y: normalized.y - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
        content: 'Text', // Placeholder text
        font: textFont,
        fontSize: textSize,
        color: textColor
      }
      // Store pending annotation locally so we can render it immediately
      setPendingTextAnnotation(annotation)
      onAddAnnotation(annotation)
      onSelectAnnotation(annotation.id)
      // Immediately enter edit mode with placeholder selected
      setEditingTextId(annotation.id)
      setEditingContent('Text')
      setIsPlaceholderText(true)
      justStartedEditing.current = true
    }
  }, [currentTool, pageId, canvasWidth, canvasHeight, getMousePos, toNormalized, findAnnotationAt, onAddAnnotation, onUpdateAnnotation, onDeleteAnnotation, onSelectAnnotation, onToolChange, textFont, textSize, textColor, editingTextId, editingContent, isPlaceholderText, textareaWidth])

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e)

    // Handle drawing
    if (drawing?.isDrawing) {
      setDrawing(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null)
    }

    // Handle pen drawing - add points as user moves
    if (penDrawing) {
      const normalized = toNormalized(pos.x, pos.y)
      setPenDrawing(prev => prev ? { points: [...prev.points, [normalized.x, normalized.y]] } : null)
    }

    // Handle dragging multiple annotations
    if (dragging) {
      const deltaX = (pos.x - dragging.startX) / canvasWidth
      const deltaY = (pos.y - dragging.startY) / canvasHeight

      // Update each dragged annotation
      dragging.ids.forEach(id => {
        const ann = annotations.find(a => a.id === id)
        const initialPos = dragging.initialPositions.get(id)
        if (!ann || !initialPos) return

        const newX = Math.max(0, Math.min(1, initialPos.x + deltaX))
        const newY = Math.max(0, Math.min(1, initialPos.y + deltaY))

        // For pen annotations, also update all points
        if (ann.type === 'pen') {
          const actualDeltaX = newX - ann.x
          const actualDeltaY = newY - ann.y
          const newPoints = ann.points.map(([px, py]): [number, number] => [
            px + actualDeltaX,
            py + actualDeltaY
          ])
          onUpdateAnnotation(id, { x: newX, y: newY, points: newPoints })
        } else {
          onUpdateAnnotation(id, { x: newX, y: newY })
        }
      })
    }
  }, [drawing, penDrawing, dragging, annotations, canvasWidth, canvasHeight, getMousePos, toNormalized, onUpdateAnnotation])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Finish drawing
    if (drawing?.isDrawing) {
      const minX = Math.min(drawing.startX, drawing.currentX)
      const minY = Math.min(drawing.startY, drawing.currentY)
      const width = Math.abs(drawing.currentX - drawing.startX)
      const height = Math.abs(drawing.currentY - drawing.startY)

      // Only create annotation if it has some size
      if (width > 5 && height > 2) {
        const normalized = toNormalized(minX, minY)
        const normalizedSize = {
          width: width / canvasWidth,
          height: height / canvasHeight
        }

        let annotation: Annotation | null = null

        switch (currentTool) {
          case 'highlight':
            annotation = {
              id: crypto.randomUUID(),
              pageId,
              type: 'highlight',
              x: normalized.x,
              y: normalized.y,
              width: normalizedSize.width,
              height: normalizedSize.height,
              color: highlightColor
            }
            break
          case 'underline':
            annotation = {
              id: crypto.randomUUID(),
              pageId,
              type: 'underline',
              x: normalized.x,
              y: normalized.y + normalizedSize.height, // Line at bottom
              width: normalizedSize.width,
              height: 0.003, // Thin line
              color: lineColor
            }
            break
          case 'strikethrough':
            annotation = {
              id: crypto.randomUUID(),
              pageId,
              type: 'strikethrough',
              x: normalized.x,
              y: normalized.y + normalizedSize.height / 2, // Line in middle
              width: normalizedSize.width,
              height: 0.003,
              color: lineColor
            }
            break
          case 'box':
            annotation = {
              id: crypto.randomUUID(),
              pageId,
              type: 'box',
              x: normalized.x,
              y: normalized.y,
              width: normalizedSize.width,
              height: normalizedSize.height,
              color: boxColor,
              fillColor: boxFillColor,
              thickness: boxThickness
            }
            break
        }

        if (annotation) {
          onAddAnnotation(annotation)
          onSelectAnnotation(annotation.id)
        }
      }
      setDrawing(null)
    }

    // Finish pen drawing
    if (penDrawing && penDrawing.points.length > 1) {
      // Calculate bounding box from points
      const xs = penDrawing.points.map(p => p[0])
      const ys = penDrawing.points.map(p => p[1])
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      const annotation: Annotation = {
        id: crypto.randomUUID(),
        pageId,
        type: 'pen',
        points: penDrawing.points,
        color: penColor,
        strokeWidth: penWidth,
        x: minX,
        y: minY,
        width: Math.max(0.01, maxX - minX),
        height: Math.max(0.01, maxY - minY)
      }
      onAddAnnotation(annotation)
      // Don't auto-select pen - user can select it later if they want to edit
    }
    setPenDrawing(null)

    // Finish dragging
    if (dragging) {
      setDragging(null)
    }
  }, [drawing, penDrawing, dragging, currentTool, pageId, canvasWidth, canvasHeight, toNormalized, highlightColor, lineColor, boxColor, boxFillColor, boxThickness, penColor, penWidth, onAddAnnotation, onSelectAnnotation])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (drawing) setDrawing(null)
    if (penDrawing) setPenDrawing(null)
    if (dragging) setDragging(null)
  }, [drawing, penDrawing, dragging])

  // Start editing a text annotation
  const startTextEdit = useCallback((annotation: Annotation) => {
    if (annotation.type !== 'text') return
    setEditingTextId(annotation.id)
    setEditingContent(annotation.content)
    setIsPlaceholderText(false) // Not a placeholder when editing existing
    setSelectAllOnEdit(true) // Select all text when starting to edit
  }, [])

  // Finish editing text annotation (save content and size)
  const finishTextEdit = useCallback((e?: React.FocusEvent) => {
    // Ignore spurious blur events that happen immediately after starting to edit
    if (justStartedEditing.current) {
      justStartedEditing.current = false
      return
    }
    // Don't finish if currently resizing
    if (resizing) return

    // Check if focus is going to toolbar controls - if so, refocus textarea instead of finishing
    if (e?.relatedTarget) {
      const relatedTarget = e.relatedTarget as HTMLElement
      if (relatedTarget.closest('.toolbar')) {
        // Focus went to toolbar, refocus textarea after toolbar interaction
        setTimeout(() => textareaRef.current?.focus(), 0)
        return
      }
    }

    if (editingTextId) {
      const shouldDelete = !editingContent.trim() || isPlaceholderText
      if (!shouldDelete) {
        // Capture resized width and actual height
        const updates: { content: string; width?: number; height?: number } = { content: editingContent }
        if (textareaWidth !== null) {
          updates.width = textareaWidth / canvasWidth
        } else if (textareaRef.current) {
          updates.width = textareaRef.current.offsetWidth / canvasWidth
        }
        // Save actual rendered height so selection area matches text
        if (textareaRef.current) {
          updates.height = textareaRef.current.offsetHeight / canvasHeight
        }
        onUpdateAnnotation(editingTextId, updates)
      } else {
        // Delete empty text annotations
        onDeleteAnnotation(editingTextId)
      }
    }
    setEditingTextId(null)
    setEditingContent('')
    setIsPlaceholderText(false)
    setPendingTextAnnotation(null)
    setTextareaWidth(null)
    // Restore previous tool if editing was started via double-click
    if (toolToRestoreRef.current) {
      onToolChange(toolToRestoreRef.current)
      toolToRestoreRef.current = null
    }
  }, [editingTextId, editingContent, isPlaceholderText, canvasWidth, canvasHeight, onUpdateAnnotation, onDeleteAnnotation, resizing, textareaWidth, onToolChange])

  // Start custom resize for text
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentWidth = textareaWidth ?? (textareaRef.current?.offsetWidth || 150)
    setResizing({ startX: e.clientX, startWidth: currentWidth })
  }, [textareaWidth])

  // Start resize for box annotation
  const startBoxResize = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.preventDefault()
    e.stopPropagation()
    const startWidth = annotation.width * canvasWidth
    const startHeight = annotation.height * canvasHeight
    setBoxResizing({
      id: annotation.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth,
      startHeight,
      aspectRatio: startWidth / startHeight
    })
  }, [canvasWidth, canvasHeight])

  // Cancel editing (keep annotation even if empty)
  const cancelTextEdit = useCallback(() => {
    setEditingTextId(null)
    setEditingContent('')
    setIsPlaceholderText(false)
    setPendingTextAnnotation(null)
  }, [])

  // Handle double-click to edit text - switch to text tool and start editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (currentTool !== 'select') return

    const pos = getMousePos(e)
    const clickedAnnotation = findAnnotationAt(pos, 'text')

    if (clickedAnnotation) {
      // Remember to restore select tool after editing
      toolToRestoreRef.current = 'select'
      onToolChange('text')
      startTextEdit(clickedAnnotation)
    }
  }, [currentTool, getMousePos, findAnnotationAt, startTextEdit, onToolChange])

  // Render a single annotation
  const renderAnnotation = (annotation: Annotation) => {
    const pos = toPixels(annotation.x, annotation.y)
    const isSelected = selectedAnnotationIds.has(annotation.id)
    const isBeingEdited = annotation.id === editingTextId

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: pos.x,
      top: pos.y,
      width: annotation.width * canvasWidth,
      height: annotation.height * canvasHeight,
      // Allow pointer events when selected/editing or in select mode
      pointerEvents: currentTool === 'select' || currentTool === 'text' || isBeingEdited ? 'auto' : 'none'
    }

    switch (annotation.type) {
      case 'highlight':
        return (
          <div
            key={annotation.id}
            className={`annotation highlight ${isSelected ? 'selected' : ''}`}
            style={{
              ...baseStyle,
              backgroundColor: hexToHighlightRgba(annotation.color)
            }}
          />
        )

      case 'underline': {
        // Line thickness proportional to text height (about 8%, min 1px)
        const textHeight = annotation.height * canvasHeight
        const lineThickness = Math.max(1, Math.round(textHeight * 0.08))
        return (
          <div
            key={annotation.id}
            className={`annotation line ${isSelected ? 'selected' : ''}`}
            style={{
              ...baseStyle,
              // Position at bottom of text bounds
              top: pos.y + textHeight,
              height: lineThickness,
              backgroundColor: annotation.color
            }}
          />
        )
      }

      case 'strikethrough': {
        // Line thickness proportional to text height (about 8%, min 1px)
        const textHeight = annotation.height * canvasHeight
        const lineThickness = Math.max(1, Math.round(textHeight * 0.08))
        return (
          <div
            key={annotation.id}
            className={`annotation line ${isSelected ? 'selected' : ''}`}
            style={{
              ...baseStyle,
              // Position at ~65% down to account for descenders (p, g, y, etc.)
              top: pos.y + textHeight * 0.65 - lineThickness / 2,
              height: lineThickness,
              backgroundColor: annotation.color
            }}
          />
        )
      }

      case 'box': {
        const showResizeHandle = isSelected || currentTool === 'box'
        return (
          <div
            key={annotation.id}
            className={`annotation box ${isSelected ? 'selected' : ''}`}
            style={{
              ...baseStyle,
              border: `${BOX_THICKNESS_PX[annotation.thickness] * zoom}px solid ${annotation.color}`,
              backgroundColor: annotation.fillColor,
              // Allow pointer events on box when resize handle is visible
              pointerEvents: showResizeHandle ? 'auto' : baseStyle.pointerEvents
            }}
          >
            {showResizeHandle && (
              <div
                className="box-resize-handle"
                onMouseDown={(e) => startBoxResize(e, annotation)}
              />
            )}
          </div>
        )
      }

      case 'pen': {
        // Generate SVG path from points
        const pathPoints = annotation.points
          .map((p, i) => {
            const px = p[0] * canvasWidth
            const py = p[1] * canvasHeight
            return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`
          })
          .join(' ')

        // Bounding box for selection indicator
        const penBounds = {
          x: annotation.x * canvasWidth,
          y: annotation.y * canvasHeight,
          width: annotation.width * canvasWidth,
          height: annotation.height * canvasHeight
        }
        const padding = 4 // Padding around the stroke

        const isPendingErase = pendingErase.has(annotation.id)

        return (
          <svg
            key={annotation.id}
            className={`annotation pen ${isSelected ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: canvasWidth,
              height: canvasHeight,
              pointerEvents: currentTool === 'select' ? 'auto' : 'none',
              overflow: 'visible',
              opacity: isPendingErase ? 0.4 : 1
            }}
          >
            {/* Selection bounding box */}
            {isSelected && (
              <rect
                x={penBounds.x - padding}
                y={penBounds.y - padding}
                width={penBounds.width + padding * 2}
                height={penBounds.height + padding * 2}
                fill="none"
                stroke="#4a90d9"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                pointerEvents="none"
              />
            )}
            <path
              d={pathPoints}
              stroke={isPendingErase ? '#888' : annotation.color}
              strokeWidth={annotation.strokeWidth * zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              pointerEvents="stroke"
            />
          </svg>
        )
      }

      case 'text':
        const isEditing = annotation.id === editingTextId
        const effectiveWidth = isEditing && textareaWidth !== null
          ? textareaWidth
          : annotation.width * canvasWidth
        return (
          <div
            key={annotation.id}
            className={`annotation text ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
            style={{
              ...baseStyle,
              // Let parent grow with textarea when editing
              ...(isEditing ? { height: 'auto', width: 'auto' } : {}),
              fontFamily: annotation.font,
              fontSize: annotation.fontSize * zoom,
              color: annotation.color,
              fontWeight: annotation.bold ? 'bold' : 'normal',
              fontStyle: annotation.italic ? 'italic' : 'normal',
              textDecoration: annotation.underline ? 'underline' : 'none',
              whiteSpace: 'pre-wrap',
              overflow: 'visible'
            }}
          >
            {isEditing ? (
              <div className="text-edit-wrapper">
                <textarea
                  ref={textareaRef}
                  className={`text-edit-input ${isPlaceholderText ? 'placeholder' : ''}`}
                  value={editingContent}
                  onChange={(e) => {
                    if (isPlaceholderText) {
                      setIsPlaceholderText(false)
                    }
                    setEditingContent(e.target.value)
                  }}
                  onBlur={finishTextEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      cancelTextEdit()
                    }
                    // Text formatting shortcuts
                    if (e.ctrlKey || e.metaKey) {
                      if (e.key === 'b') {
                        e.preventDefault()
                        onUpdateAnnotation(annotation.id, { bold: !annotation.bold })
                      } else if (e.key === 'i') {
                        e.preventDefault()
                        onUpdateAnnotation(annotation.id, { italic: !annotation.italic })
                      } else if (e.key === 'u') {
                        e.preventDefault()
                        onUpdateAnnotation(annotation.id, { underline: !annotation.underline })
                      }
                    }
                  }}
                  autoFocus
                  rows={1}
                  style={{
                    fontFamily: annotation.font,
                    fontSize: annotation.fontSize * zoom,
                    color: annotation.color,
                    width: effectiveWidth,
                    fontWeight: annotation.bold ? 'bold' : 'normal',
                    fontStyle: annotation.italic ? 'italic' : 'normal',
                    textDecoration: annotation.underline ? 'underline' : 'none'
                  }}
                />
                <div
                  className="text-resize-handle"
                  onMouseDown={startResize}
                />
              </div>
            ) : (
              annotation.content
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Render drawing preview
  const renderDrawingPreview = () => {
    if (!drawing?.isDrawing) return null

    const minX = Math.min(drawing.startX, drawing.currentX)
    const minY = Math.min(drawing.startY, drawing.currentY)
    const width = Math.abs(drawing.currentX - drawing.startX)
    const height = Math.abs(drawing.currentY - drawing.startY)

    const previewStyle: React.CSSProperties = {
      position: 'absolute',
      left: minX,
      top: minY,
      width,
      height,
      pointerEvents: 'none'
    }

    switch (currentTool) {
      case 'highlight':
        return (
          <div
            className="drawing-preview highlight"
            style={{
              ...previewStyle,
              backgroundColor: hexToHighlightRgba(highlightColor)
            }}
          />
        )
      case 'underline':
        return (
          <div
            className="drawing-preview line"
            style={{
              ...previewStyle,
              top: minY + height,
              height: 2,
              backgroundColor: lineColor
            }}
          />
        )
      case 'strikethrough':
        return (
          <div
            className="drawing-preview line"
            style={{
              ...previewStyle,
              top: minY + height / 2,
              height: 2,
              backgroundColor: lineColor
            }}
          />
        )
      case 'box':
        return (
          <div
            className="drawing-preview box"
            style={{
              ...previewStyle,
              border: `${BOX_THICKNESS_PX[boxThickness] * zoom}px solid ${boxColor}`,
              backgroundColor: boxFillColor
            }}
          />
        )
      default:
        return null
    }
  }

  // Render pen drawing preview
  const renderPenPreview = () => {
    if (!penDrawing || penDrawing.points.length < 2) return null

    const pathPoints = penDrawing.points
      .map((p, i) => {
        const px = p[0] * canvasWidth
        const py = p[1] * canvasHeight
        return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`
      })
      .join(' ')

    return (
      <svg
        className="drawing-preview pen"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <path
          d={pathPoints}
          stroke={penColor}
          strokeWidth={penWidth * zoom}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  }

  // Cursor style based on current tool
  const getCursorStyle = (): string => {
    switch (currentTool) {
      case 'select':
        return 'default'
      case 'text':
        return 'text'
      case 'pen':
        // Custom pen cursor - SVG pen icon with hotspot at tip
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 2 22, crosshair`
      case 'eraser':
        // Custom eraser cursor - rectangular eraser with hotspot at bottom corner
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, crosshair`
      default:
        return 'crosshair'
    }
  }

  // Text tools (highlight, underline, strikethrough, eraser) are handled by TextLayer
  const isTextTool = currentTool === 'highlight' || currentTool === 'underline' || currentTool === 'strikethrough' || currentTool === 'eraser'

  return (
    <div
      ref={layerRef}
      className={`annotation-layer ${isTextTool ? 'text-tool-active' : ''}`}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        cursor: getCursorStyle()
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      {annotations.map(renderAnnotation)}
      {/* Render pending text annotation while waiting for parent state update */}
      {pendingTextAnnotation && !annotations.some(a => a.id === pendingTextAnnotation.id) && renderAnnotation(pendingTextAnnotation)}
      {renderDrawingPreview()}
      {renderPenPreview()}
    </div>
  )
}
