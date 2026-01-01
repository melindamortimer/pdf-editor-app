import { useState, useRef, useEffect } from 'react'
import './Toolbar.css'

const ZOOM_PRESETS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
  { label: '300%', value: 3 }
]

interface ToolbarProps {
  hasDocuments: boolean
  hasUnsavedChanges: boolean
  canSave: boolean
  zoom: number
  onOpenFiles: () => void
  onSave: () => void
  onSaveAs: () => void
  onZoomChange: (zoom: number) => void
}

export default function Toolbar({
  hasDocuments,
  hasUnsavedChanges,
  canSave,
  zoom,
  onOpenFiles,
  onSave,
  onSaveAs,
  onZoomChange
}: ToolbarProps) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowZoomDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleZoomIn = () => {
    const currentIndex = ZOOM_PRESETS.findIndex(p => p.value >= zoom)
    if (currentIndex < ZOOM_PRESETS.length - 1) {
      onZoomChange(ZOOM_PRESETS[currentIndex === -1 ? ZOOM_PRESETS.length - 1 : currentIndex + 1].value)
    } else if (zoom < 3) {
      onZoomChange(Math.min(3, zoom + 0.25))
    }
  }

  const handleZoomOut = () => {
    const currentIndex = ZOOM_PRESETS.findIndex(p => p.value >= zoom)
    if (currentIndex > 0) {
      onZoomChange(ZOOM_PRESETS[currentIndex - 1].value)
    } else if (zoom > 0.25) {
      onZoomChange(Math.max(0.25, zoom - 0.25))
    }
  }

  const handleZoomSelect = (value: number) => {
    onZoomChange(value)
    setShowZoomDropdown(false)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button onClick={onOpenFiles} title="Open PDF (Ctrl+O)">
          Open
        </button>
        <button
          onClick={onSave}
          disabled={!hasDocuments}
          className={hasUnsavedChanges ? 'has-changes' : ''}
          title={canSave ? 'Save (Ctrl+S)' : 'Save As (Ctrl+S) - Multiple documents open'}
        >
          Save{hasUnsavedChanges ? '*' : ''}
        </button>
        <button
          onClick={onSaveAs}
          disabled={!hasDocuments}
          title="Save As (Ctrl+Shift+S)"
        >
          Save As
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-section zoom-section">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.25}
          title="Zoom Out"
        >
          −
        </button>

        <div className="zoom-dropdown-container" ref={dropdownRef}>
          <button
            className="zoom-display"
            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
            title="Select zoom level"
          >
            {Math.round(zoom * 100)}%
            <span className="dropdown-arrow">▼</span>
          </button>

          {showZoomDropdown && (
            <div className="zoom-dropdown">
              {ZOOM_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  className={zoom === preset.value ? 'active' : ''}
                  onClick={() => handleZoomSelect(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          title="Zoom In"
        >
          +
        </button>
      </div>
    </div>
  )
}
