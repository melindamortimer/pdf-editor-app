import { useState, useRef, useEffect } from 'react'
import type { AnnotationTool, HighlightColor } from '../types/annotations'
import { HIGHLIGHT_COLORS } from '../types/annotations'
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

const ANNOTATION_TOOLS: { id: AnnotationTool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'highlight', label: 'Highlight', icon: '▮' },
  { id: 'underline', label: 'Underline', icon: 'U' },
  { id: 'strikethrough', label: 'Strikethrough', icon: 'S' },
  { id: 'box', label: 'Box', icon: '☐' },
  { id: 'text', label: 'Text', icon: 'T' }
]

const HIGHLIGHT_COLOR_OPTIONS: { id: HighlightColor; label: string }[] = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'pink', label: 'Pink' },
  { id: 'blue', label: 'Blue' }
]

interface ToolbarProps {
  hasDocuments: boolean
  hasUnsavedChanges: boolean
  canSave: boolean
  zoom: number
  currentTool: AnnotationTool
  highlightColor: HighlightColor
  canUndo: boolean
  canRedo: boolean
  onOpenFiles: () => void
  onSave: () => void
  onSaveAs: () => void
  onZoomChange: (zoom: number) => void
  onToolChange: (tool: AnnotationTool) => void
  onHighlightColorChange: (color: HighlightColor) => void
  onUndo: () => void
  onRedo: () => void
  onDiscardAnnotations: () => void
}

export default function Toolbar({
  hasDocuments,
  hasUnsavedChanges,
  canSave,
  zoom,
  currentTool,
  highlightColor,
  canUndo,
  canRedo,
  onOpenFiles,
  onSave,
  onSaveAs,
  onZoomChange,
  onToolChange,
  onHighlightColorChange,
  onUndo,
  onRedo,
  onDiscardAnnotations
}: ToolbarProps) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowZoomDropdown(false)
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) {
        setShowColorDropdown(false)
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

      <div className="toolbar-section annotation-tools">
        {ANNOTATION_TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-button ${currentTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolChange(tool.id)}
            disabled={!hasDocuments && tool.id !== 'select'}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}

        {currentTool === 'highlight' && (
          <div className="color-dropdown-container" ref={colorDropdownRef}>
            <button
              className="color-picker-button"
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              title="Highlight color"
              style={{ backgroundColor: HIGHLIGHT_COLORS[highlightColor] }}
            >
              <span className="dropdown-arrow">▼</span>
            </button>
            {showColorDropdown && (
              <div className="color-dropdown">
                {HIGHLIGHT_COLOR_OPTIONS.map(color => (
                  <button
                    key={color.id}
                    className={`color-option ${highlightColor === color.id ? 'active' : ''}`}
                    onClick={() => {
                      onHighlightColorChange(color.id)
                      setShowColorDropdown(false)
                    }}
                    style={{ backgroundColor: HIGHLIGHT_COLORS[color.id] }}
                    title={color.label}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-section">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="tool-button"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="tool-button"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </button>
        <button
          onClick={onDiscardAnnotations}
          disabled={!canUndo}
          title="Discard all annotations"
        >
          Discard
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
