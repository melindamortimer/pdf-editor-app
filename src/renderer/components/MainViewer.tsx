import { useEffect, useRef, useState } from 'react'
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

  const isEmpty = !documentId

  return (
    <div className={`main-viewer ${isEmpty ? 'empty' : ''}`} ref={containerRef}>
      {isEmpty && (
        <div className="empty-message">
          <p>Open a PDF to get started</p>
          <p className="hint">Ctrl+O to open file</p>
        </div>
      )}
      {rendering && <div className="loading">Rendering...</div>}
      <canvas
        ref={canvasRef}
        style={{ display: hasContent ? 'block' : 'none' }}
      />
    </div>
  )
}
