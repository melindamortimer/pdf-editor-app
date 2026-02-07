import { useEffect, useState } from 'react'
import { getPageLinks, type PdfLink } from '../services/pdfRenderer'
import type { AnnotationTool } from '../types/annotations'
import './LinkLayer.css'

interface LinkLayerProps {
  documentId: string
  pageIndex: number
  width: number
  height: number
  scale: number
  currentTool: AnnotationTool
  hasSelectedAnnotation: boolean
}

export default function LinkLayer({
  documentId,
  pageIndex,
  width,
  height,
  scale,
  currentTool,
  hasSelectedAnnotation
}: LinkLayerProps) {
  const [links, setLinks] = useState<PdfLink[]>([])
  const [modifierActive, setModifierActive] = useState(false)

  useEffect(() => {
    let cancelled = false

    getPageLinks(documentId, pageIndex, scale)
      .then((pageLinks) => {
        if (!cancelled) {
          setLinks(pageLinks)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error loading page links:', err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [documentId, pageIndex, scale])

  // Track modifier key (Cmd/Ctrl) state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setModifierActive(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setModifierActive(false)
      }
    }
    // Also deactivate when window loses focus
    const handleBlur = () => {
      setModifierActive(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const isQrData = (url: string) => url.startsWith('qrdata:')
  const getQrDataContent = (url: string) => url.slice('qrdata:'.length)

  const handleClick = (e: React.MouseEvent, url: string) => {
    // Always prevent default to stop <a> tag from navigating
    e.preventDefault()
    e.stopPropagation()

    if (isQrData(url)) {
      // Non-URL QR code — copy content to clipboard
      if ((e.metaKey || e.ctrlKey) && currentTool === 'select') {
        navigator.clipboard.writeText(getQrDataContent(url))
      }
      return
    }

    // Only open on cmd+click (Mac) or ctrl+click (Windows/Linux) with select tool
    if ((e.metaKey || e.ctrlKey) && currentTool === 'select') {
      window.electronAPI.openExternalUrl(url)
    }
  }

  // Only show link layer for select tool with no annotation selected
  const isSelectTool = currentTool === 'select' && !hasSelectedAnnotation

  // Debug: console.log(`[LinkLayer] links=${links.length}, currentTool=${currentTool}, hasSelectedAnnotation=${hasSelectedAnnotation}, isSelectTool=${isSelectTool}`)

  if (links.length === 0 || !isSelectTool) return null

  return (
    <div
      className={`link-layer select-tool ${modifierActive ? 'modifier-active' : ''}`}
      style={{ width, height }}
    >
      {links.map((link, index) => {
        const qrData = isQrData(link.url)
        const displayText = qrData ? getQrDataContent(link.url) : link.url
        const actionHint = qrData ? '(Cmd+Click to copy)' : '(Cmd+Click to open)'
        return (
          <a
            key={index}
            href={qrData ? '#' : link.url}
            className={`pdf-link${qrData ? ' qr-data' : ''}`}
            title={`${displayText}\n${actionHint}`}
            style={{
              left: link.rect.x,
              top: link.rect.y,
              width: link.rect.width,
              height: link.rect.height
            }}
            onClick={(e) => handleClick(e, link.url)}
          />
        )
      })}
    </div>
  )
}
