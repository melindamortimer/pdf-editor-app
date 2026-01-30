import { useEffect, useState } from 'react'
import { getPageLinks, type PdfLink } from '../services/pdfRenderer'
import './LinkLayer.css'

interface LinkLayerProps {
  documentId: string
  pageIndex: number
  width: number
  height: number
  scale: number
}

export default function LinkLayer({
  documentId,
  pageIndex,
  width,
  height,
  scale
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

  const handleClick = (e: React.MouseEvent, url: string) => {
    // Only open on cmd+click (Mac) or ctrl+click (Windows/Linux)
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      window.electronAPI.openExternalUrl(url)
    }
    // Without modifier, let the click pass through - don't prevent default
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Without modifier, let mousedown pass through to layers below
    if (!e.metaKey && !e.ctrlKey) {
      // Don't stop propagation - let it reach AnnotationLayer
      return
    }
    // With modifier, stop propagation to prevent annotation interactions
    e.stopPropagation()
  }

  // Debug: console.log(`[LinkLayer] Rendering ${links.length} links, container size: ${width}x${height}`)

  if (links.length === 0) return null

  return (
    <div
      className={`link-layer ${modifierActive ? 'modifier-active' : ''}`}
      style={{ width, height }}
    >
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          className="pdf-link"
          title={`${link.url}\n(Cmd+Click to open)`}
          style={{
            left: link.rect.x,
            top: link.rect.y,
            width: link.rect.width,
            height: link.rect.height
          }}
          onClick={(e) => handleClick(e, link.url)}
          onMouseDown={handleMouseDown}
        />
      ))}
    </div>
  )
}
