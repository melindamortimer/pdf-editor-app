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
  onSelectAnnotation
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
  // Track the textarea ref for selecting placeholder text
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Clear pending annotation once it appears in the annotations array
  useEffect(() => {
    if (pendingTextAnnotation && annotations.some(a => a.id === pendingTextAnnotation.id)) {
      setPendingTextAnnotation(null)
    }
  }, [annotations, pendingTextAnnotation])

  // Select all text when editing starts with placeholder
  useEffect(() => {
    if (isPlaceholderText && editingTextId) {
      // Use setTimeout to ensure textarea is mounted and focused first
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isPlaceholderText, editingTextId])

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

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click

    const pos = getMousePos(e)

    // Check if clicking on an existing annotation (for select tool or any tool)
    if (currentTool === 'select') {
      // Find annotation at click position
      const clickedAnnotation = annotations.find(ann => {
        const annPos = toPixels(ann.x, ann.y)
        const annWidth = ann.width * canvasWidth
        const annHeight = ann.height * canvasHeight
        return (
          pos.x >= annPos.x &&
          pos.x <= annPos.x + annWidth &&
          pos.y >= annPos.y &&
          pos.y <= annPos.y + annHeight
        )
      })

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
      // First check if clicking on an existing text annotation
      const clickedTextAnnotation = annotations.find(ann => {
        if (ann.type !== 'text') return false
        const annPos = toPixels(ann.x, ann.y)
        const annWidth = ann.width * canvasWidth
        const annHeight = ann.height * canvasHeight
        return (
          pos.x >= annPos.x &&
          pos.x <= annPos.x + annWidth &&
          pos.y >= annPos.y &&
          pos.y <= annPos.y + annHeight
        )
      })

      if (clickedTextAnnotation) {
        // Edit existing text annotation
        onSelectAnnotation(clickedTextAnnotation.id)
        setEditingTextId(clickedTextAnnotation.id)
        setEditingContent(clickedTextAnnotation.type === 'text' ? clickedTextAnnotation.content : '')
        justStartedEditing.current = true
        return
      }

      // If currently editing a text annotation and clicked away, just finish the edit
      // (don't create a new text box)
      if (editingTextId) {
        // Save the current text and exit edit mode
        if (editingContent.trim()) {
          onUpdateAnnotation(editingTextId, { content: editingContent })
        }
        setEditingTextId(null)
        setEditingContent('')
        setIsPlaceholderText(false)
        setPendingTextAnnotation(null)
        onSelectAnnotation(null)
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
  }, [currentTool, annotations, pageId, canvasWidth, canvasHeight, getMousePos, toNormalized, toPixels, onAddAnnotation, onUpdateAnnotation, onSelectAnnotation, textFont, textSize, textColor, editingTextId, editingContent])

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
  }, [])

  // Finish editing text annotation (save content)
  const finishTextEdit = useCallback(() => {
    // Ignore spurious blur events that happen immediately after starting to edit
    if (justStartedEditing.current) {
      justStartedEditing.current = false
      return
    }
    if (editingTextId && editingContent.trim()) {
      onUpdateAnnotation(editingTextId, { content: editingContent })
    }
    // Don't delete empty annotations on blur - they're invisible anyway
    // User can press Escape to delete, or they'll be cleaned up on save
    setEditingTextId(null)
    setEditingContent('')
    setIsPlaceholderText(false)
    setPendingTextAnnotation(null)
  }, [editingTextId, editingContent, onUpdateAnnotation])

  // Cancel editing (keep annotation even if empty)
  const cancelTextEdit = useCallback(() => {
    setEditingTextId(null)
    setEditingContent('')
    setIsPlaceholderText(false)
    setPendingTextAnnotation(null)
  }, [])

  // Handle double-click to edit text
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (currentTool !== 'select') return

    const pos = getMousePos(e)

    // Find text annotation at click position
    const clickedAnnotation = annotations.find(ann => {
      if (ann.type !== 'text') return false
      const annPos = toPixels(ann.x, ann.y)
      const annWidth = ann.width * canvasWidth
      const annHeight = ann.height * canvasHeight
      return (
        pos.x >= annPos.x &&
        pos.x <= annPos.x + annWidth &&
        pos.y >= annPos.y &&
        pos.y <= annPos.y + annHeight
      )
    })

    if (clickedAnnotation) {
      startTextEdit(clickedAnnotation)
    }
  }, [currentTool, annotations, canvasWidth, canvasHeight, getMousePos, toPixels, startTextEdit])

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

      case 'underline':
      case 'strikethrough':
        return (
          <div
            key={annotation.id}
            className={`annotation line ${isSelected ? 'selected' : ''}`}
            style={{
              ...baseStyle,
              height: 2,
              backgroundColor: annotation.color
            }}
          />
        )

      case 'box':
        return (
          <div
            key={annotation.id}
            className={`annotation box ${isSelected ? 'selected' : ''}`}
            style={{
              ...baseStyle,
              border: `${BOX_THICKNESS_PX[annotation.thickness]}px solid ${annotation.color}`,
              backgroundColor: annotation.fillColor
            }}
          />
        )

      case 'text':
        const isEditing = annotation.id === editingTextId
        return (
          <div
            key={annotation.id}
            className={`annotation text ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
            style={{
              ...baseStyle,
              fontFamily: annotation.font,
              fontSize: annotation.fontSize * zoom,
              color: annotation.color,
              whiteSpace: 'pre-wrap',
              overflow: 'visible'
            }}
          >
            {isEditing ? (
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
                }}
                autoFocus
                rows={1}
                style={{
                  fontFamily: annotation.font,
                  fontSize: annotation.fontSize * zoom,
                  color: isPlaceholderText ? annotation.color : annotation.color
                }}
              />
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
              border: `${BOX_THICKNESS_PX[boxThickness]}px solid ${boxColor}`,
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

  return (
    <div
      ref={layerRef}
      className="annotation-layer"
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
