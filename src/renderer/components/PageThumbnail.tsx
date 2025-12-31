import { useEffect, useRef } from 'react'
import { renderPage } from '../services/pdfRenderer'
import './PageThumbnail.css'

interface PageThumbnailProps {
  documentId: string
  pageIndex: number
  pageNumber: number
  selected: boolean
  onClick: () => void
}

const THUMBNAIL_SCALE = 0.2

export default function PageThumbnail({
  documentId,
  pageIndex,
  pageNumber,
  selected,
  onClick
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    let cancelled = false

    renderPage(documentId, pageIndex, THUMBNAIL_SCALE)
      .then(({ canvas: renderedCanvas, width, height }) => {
        if (cancelled || !canvasRef.current) return

        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = width
          canvasRef.current.height = height
          ctx.drawImage(renderedCanvas, 0, 0)
        }
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [documentId, pageIndex])

  return (
    <div
      className={`page-thumbnail ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="thumbnail-canvas">
        <canvas ref={canvasRef} />
      </div>
      <span className="page-number">{pageNumber}</span>
    </div>
  )
}
