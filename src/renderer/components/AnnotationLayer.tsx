import { useRef, useState, useCallback, useEffect } from 'react'
import type {
  Annotation,
  AnnotationTool,
  HighlightColor,
  BoxThickness,
  TextFont
} from '../types/annotations'
import {
  HIGHLIGHT_COLORS_TRANSPARENT,
  BOX_THICKNESS_PX
} from '../types/annotations'
import './AnnotationLayer.css'

interface AnnotationLayerProps {
  pageId: string
  annotations: Annotation[]
  selectedAnnotationId: string | null
  currentTool: AnnotationTool
  canvasWidth: number
  canvasHeight: number
  zoom: number
  // Tool settings
  highlightColor: HighlightColor
  lineColor: string
  boxColor: string
  boxFillColor: string
  boxThickness: BoxThickness
  textColor: string
  textFont: TextFont
  textSize: number
  // Callbacks
  onAddAnnotation: (annotation: Annotation) => void
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void
  onDeleteAnnotation: (id: string) => void
  onSelectAnnotation: (id: string | null) => void
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
  selectedAnnotationId,
  currentTool,
  canvasWidth,
  canvasHeight,
  zoom,
  highlightColor,
  lineColor,
  boxColor,
  boxFillColor,
  boxThickness,
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
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; annX: number; annY: number } | null>(null)
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
        onSelectAnnotation(clickedAnnotation.id)
        // Start dragging
        setDragging({
          id: clickedAnnotation.id,
          startX: pos.x,
          startY: pos.y,
          annX: clickedAnnotation.x,
          annY: clickedAnnotation.y
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

    // Handle dragging
    if (dragging) {
      const deltaX = (pos.x - dragging.startX) / canvasWidth
      const deltaY = (pos.y - dragging.startY) / canvasHeight
      onUpdateAnnotation(dragging.id, {
        x: Math.max(0, Math.min(1, dragging.annX + deltaX)),
        y: Math.max(0, Math.min(1, dragging.annY + deltaY))
      })
    }
  }, [drawing, dragging, canvasWidth, canvasHeight, getMousePos, onUpdateAnnotation])

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

    // Finish dragging
    if (dragging) {
      setDragging(null)
    }
  }, [drawing, dragging, currentTool, pageId, canvasWidth, canvasHeight, toNormalized, highlightColor, lineColor, boxColor, boxFillColor, boxThickness, onAddAnnotation, onSelectAnnotation])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (drawing) setDrawing(null)
    if (dragging) setDragging(null)
  }, [drawing, dragging])

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
    const isSelected = annotation.id === selectedAnnotationId
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
              backgroundColor: HIGHLIGHT_COLORS_TRANSPARENT[annotation.color]
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
              backgroundColor: HIGHLIGHT_COLORS_TRANSPARENT[highlightColor]
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

  // Cursor style based on current tool
  const getCursorStyle = (): string => {
    switch (currentTool) {
      case 'select':
        return 'default'
      case 'text':
        return 'text'
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
    </div>
  )
}
