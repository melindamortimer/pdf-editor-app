import { useEffect, useRef, useState, useCallback } from 'react'
import { renderPage } from '../services/pdfRenderer'
import TextLayer from './TextLayer'
import AnnotationLayer from './AnnotationLayer'
import type { Annotation, AnnotationTool, HighlightColor, BoxThickness, TextFont } from '../types/annotations'
import './MainViewer.css'

interface MainViewerProps {
  documentId: string | null
  pageId: string | null
  pageIndex: number
  zoom: number
  // Annotation props
  annotations: Annotation[]
  selectedAnnotationId: string | null
  currentTool: AnnotationTool
  highlightColor: HighlightColor
  lineColor: string
  boxColor: string
  boxFillColor: string
  boxThickness: BoxThickness
  textColor: string
  textFont: TextFont
  textSize: number
  onAddAnnotation: (annotation: Annotation) => void
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void
  onDeleteAnnotation: (id: string) => void
  onSelectAnnotation: (id: string | null) => void
}

export default function MainViewer({
  documentId,
  pageId,
  pageIndex,
  zoom,
  annotations,
  selectedAnnotationId,
  currentTool,
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
}: MainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendering, setRendering] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })

  // Panning state
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

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

  // Only allow panning with select tool
  const canPan = currentTool === 'select'

  // Pan handlers - only work with select tool and when not on annotation layer
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || e.button !== 0 || !canPan) return
    // Don't start panning if clicking on canvas wrapper (let annotation layer handle it)
    if ((e.target as HTMLElement).closest('.canvas-wrapper')) return
    setIsPanning(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    }
  }, [canPan])

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
      className={`main-viewer ${isEmpty ? 'empty' : ''} ${isPanning ? 'panning' : ''}`}
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
        <div className="canvas-container" style={{ position: 'relative', display: 'inline-block' }}>
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
              onSelectAnnotation={onSelectAnnotation}
              debug={true}
            />
          )}
          {hasContent && pageId && canvasDimensions.width > 0 && (
            <AnnotationLayer
              pageId={pageId}
              annotations={annotations}
              selectedAnnotationId={selectedAnnotationId}
              currentTool={currentTool}
              canvasWidth={canvasDimensions.width}
              canvasHeight={canvasDimensions.height}
              zoom={zoom}
              highlightColor={highlightColor}
              lineColor={lineColor}
              boxColor={boxColor}
              boxFillColor={boxFillColor}
              boxThickness={boxThickness}
              textColor={textColor}
              textFont={textFont}
              textSize={textSize}
              onAddAnnotation={onAddAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
              onSelectAnnotation={onSelectAnnotation}
            />
          )}
        </div>
      </div>
    </div>
  )
}
