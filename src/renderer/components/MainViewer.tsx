import { useEffect, useRef, useState, useCallback } from 'react'
import { renderPage } from '../services/pdfRenderer'
import './MainViewer.css'

interface MainViewerProps {
  documentId: string | null
  pageIndex: number
  zoom: number
}

export default function MainViewer({ documentId, pageIndex, zoom }: MainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendering, setRendering] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  // Panning state
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  useEffect(() => {
    if (!documentId) {
      setHasContent(false)
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

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || e.button !== 0) return
    setIsPanning(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    }
  }, [])

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
        <canvas
          ref={canvasRef}
          style={{ display: hasContent ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}
