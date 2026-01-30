import { useEffect, useRef, useState, useCallback } from 'react'
import { renderPage } from '../services/pdfRenderer'
import TextLayer from './TextLayer'
import LinkLayer from './LinkLayer'
import AnnotationLayer from './AnnotationLayer'
import type { Annotation, AnnotationTool, BoxThickness, PenWidth, TextFont } from '../types/annotations'
import './MainViewer.css'

interface MainViewerProps {
  documentId: string | null
  pageId: string | null
  pageIndex: number
  zoom: number
  // Annotation props
  annotations: Annotation[]
  selectedAnnotationIds: Set<string>
  currentTool: AnnotationTool
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
  onAddAnnotation: (annotation: Annotation) => void
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void
  onDeleteAnnotation: (id: string) => void
  onSelectAnnotation: (id: string | null) => void
  onToolChange: (tool: AnnotationTool) => void
  onZoomChange: (zoom: number) => void
}

export default function MainViewer({
  documentId,
  pageId,
  pageIndex,
  zoom,
  annotations,
  selectedAnnotationIds,
  currentTool,
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
  onToolChange,
  onZoomChange
}: MainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendering, setRendering] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
  const previousContainerWidth = useRef<number>(0)

  // Panning state
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  // Track the tool to restore after grab mode
  const toolBeforeGrab = useRef<AnnotationTool | null>(null)

  useEffect(() => {
    if (!documentId) {
      setHasContent(false)
      setCanvasDimensions({ width: 0, height: 0 })
      return
    }

    let cancelled = false
    setRendering(true)

    renderPage(documentId, pageIndex, zoom)
      .then(({ canvas: renderedCanvas, width, height }) => {
        if (cancelled || !canvasRef.current) return

        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = width
          canvasRef.current.height = height
          ctx.drawImage(renderedCanvas, 0, 0)
          setHasContent(true)
          setCanvasDimensions({ width, height })

          // Scroll to top-left when page changes
          if (containerRef.current) {
            containerRef.current.scrollTop = 0
            containerRef.current.scrollLeft = 0
          }
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Render error:', err)
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })

    return () => {
      cancelled = true
    }
  }, [documentId, pageIndex, zoom])

  // ResizeObserver to scale zoom proportionally when container resizes
  useEffect(() => {
    if (!containerRef.current || !documentId) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        if (newWidth > 0 && previousContainerWidth.current > 0) {
          // Scale zoom proportionally to container width change
          const ratio = newWidth / previousContainerWidth.current
          const newZoom = zoom * ratio
          // Clamp between reasonable bounds
          const clampedZoom = Math.min(Math.max(newZoom, 0.25), 3)
          // Only update if significantly different to avoid loops
          if (Math.abs(clampedZoom - zoom) > 0.01) {
            onZoomChange(clampedZoom)
          }
        }
        previousContainerWidth.current = newWidth
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [documentId, zoom, onZoomChange])

  // Track space key for grab-to-pan mode - switches to grab tool temporarily
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Don't activate if typing in an input/textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        // Prevent default scroll behavior
        e.preventDefault()
        if (!e.repeat && currentTool !== 'grab') {
          // Save current tool and switch to grab
          toolBeforeGrab.current = currentTool
          onToolChange('grab')
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Don't interfere if typing in an input/textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        setIsPanning(false)
        // Restore previous tool
        if (toolBeforeGrab.current) {
          onToolChange(toolBeforeGrab.current)
          toolBeforeGrab.current = null
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [currentTool, onToolChange])

  // Allow panning with select tool, or when using grab tool
  const canPan = currentTool === 'select'
  const isGrabMode = currentTool === 'grab'

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || e.button !== 0) return
    // In grab mode (space held), allow panning anywhere
    if (isGrabMode) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop
      }
      return
    }
    // Normal panning - only outside canvas wrapper
    if (!canPan) return
    if ((e.target as HTMLElement).closest('.canvas-wrapper')) return
    setIsPanning(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    }
  }, [canPan, isGrabMode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    containerRef.current.scrollLeft = panStart.current.scrollLeft - dx
    containerRef.current.scrollTop = panStart.current.scrollTop - dy
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false)
  }, [])

  const isEmpty = !documentId

  return (
    <div
      className={`main-viewer ${isEmpty ? 'empty' : ''} ${isGrabMode ? 'grab-mode' : ''} ${isPanning ? 'panning' : ''}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {isEmpty && (
        <div className="empty-message">
          <p>Open a PDF to get started</p>
          <p className="hint">Ctrl+O to open file</p>
        </div>
      )}
      {rendering && <div className="loading">Rendering...</div>}
      <div className="canvas-wrapper" style={{ display: isEmpty ? 'none' : undefined }}>
        <div
          className="canvas-container"
          style={{
            position: 'relative',
            display: 'inline-block',
            cursor: currentTool === 'eraser'
              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, crosshair`
              : undefined
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ display: hasContent ? 'block' : 'none' }}
          />
          {hasContent && documentId && pageId && canvasDimensions.width > 0 && (
            <TextLayer
              documentId={documentId}
              pageId={pageId}
              pageIndex={pageIndex}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              scale={zoom}
              currentTool={currentTool}
              highlightColor={highlightColor}
              lineColor={lineColor}
              annotations={annotations}
              onAddAnnotation={onAddAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
              debug={false}
            />
          )}
          {hasContent && documentId && canvasDimensions.width > 0 && (
            <LinkLayer
              documentId={documentId}
              pageIndex={pageIndex}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              scale={zoom}
            />
          )}
          {hasContent && pageId && canvasDimensions.width > 0 && (
            <AnnotationLayer
              pageId={pageId}
              annotations={annotations}
              selectedAnnotationIds={selectedAnnotationIds}
              currentTool={currentTool}
              canvasWidth={canvasDimensions.width}
              canvasHeight={canvasDimensions.height}
              zoom={zoom}
              highlightColor={highlightColor}
              lineColor={lineColor}
              boxColor={boxColor}
              boxFillColor={boxFillColor}
              boxThickness={boxThickness}
              penColor={penColor}
              penWidth={penWidth}
              textColor={textColor}
              textFont={textFont}
              textSize={textSize}
              onAddAnnotation={onAddAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
              onSelectAnnotation={onSelectAnnotation}
              onToolChange={onToolChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
