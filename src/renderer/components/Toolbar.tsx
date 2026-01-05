import { useState, useRef, useEffect } from 'react'
import type { AnnotationTool, HighlightColor, LineColor, TextFont } from '../types/annotations'
import { HIGHLIGHT_COLORS, LINE_COLORS, LINE_COLOR_OPTIONS, AVAILABLE_FONTS } from '../types/annotations'
import './Toolbar.css'

const TEXT_SIZE_OPTIONS = [10, 12, 14, 18, 24]

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
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
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
  { id: 'orange', label: 'Orange' },
  { id: 'clear', label: 'Eraser' }
]

const LINE_COLOR_LABELS: Record<LineColor, string> = {
  black: 'Black',
  red: 'Red',
  blue: 'Blue',
  clear: 'Eraser'
}

interface ToolbarProps {
  hasDocuments: boolean
  hasUnsavedChanges: boolean
  canSave: boolean
  zoom: number
  currentTool: AnnotationTool
  highlightColor: HighlightColor
  lineColor: string
  boxColor: string
  boxFillColor: string
  textFont: TextFont
  textSize: number
  textColor: string
  selectedAnnotationType: 'box' | 'text' | null // For showing tool options when annotation is selected
  canUndo: boolean
  canRedo: boolean
  onOpenFiles: () => void
  onCloseDocument: () => void
  onSave: () => void
  onSaveAs: () => void
  onZoomChange: (zoom: number) => void
  onToolChange: (tool: AnnotationTool) => void
  onHighlightColorChange: (color: HighlightColor) => void
  onLineColorChange: (color: string) => void
  onBoxColorChange: (color: string) => void
  onBoxFillColorChange: (color: string) => void
  onTextFontChange: (font: TextFont) => void
  onTextSizeChange: (size: number) => void
  onTextColorChange: (color: string) => void
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
  lineColor,
  boxColor,
  boxFillColor,
  textFont,
  textSize,
  textColor,
  selectedAnnotationType,
  canUndo,
  canRedo,
  onOpenFiles,
  onCloseDocument,
  onSave,
  onSaveAs,
  onZoomChange,
  onToolChange,
  onHighlightColorChange,
  onLineColorChange,
  onBoxColorChange,
  onBoxFillColorChange,
  onTextFontChange,
  onTextSizeChange,
  onTextColorChange,
  onUndo,
  onRedo,
  onDiscardAnnotations
}: ToolbarProps) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [showLineColorDropdown, setShowLineColorDropdown] = useState(false)
  const [showBoxColorDropdown, setShowBoxColorDropdown] = useState(false)
  const [showBoxFillColorDropdown, setShowBoxFillColorDropdown] = useState(false)
  const [showFontDropdown, setShowFontDropdown] = useState(false)
  const [showSizeDropdown, setShowSizeDropdown] = useState(false)
  const [showTextColorDropdown, setShowTextColorDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const lineColorDropdownRef = useRef<HTMLDivElement>(null)
  const boxColorDropdownRef = useRef<HTMLDivElement>(null)
  const boxFillColorDropdownRef = useRef<HTMLDivElement>(null)
  const fontDropdownRef = useRef<HTMLDivElement>(null)
  const sizeDropdownRef = useRef<HTMLDivElement>(null)
  const textColorDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowZoomDropdown(false)
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) {
        setShowColorDropdown(false)
      }
      if (lineColorDropdownRef.current && !lineColorDropdownRef.current.contains(e.target as Node)) {
        setShowLineColorDropdown(false)
      }
      if (boxColorDropdownRef.current && !boxColorDropdownRef.current.contains(e.target as Node)) {
        setShowBoxColorDropdown(false)
      }
      if (boxFillColorDropdownRef.current && !boxFillColorDropdownRef.current.contains(e.target as Node)) {
        setShowBoxFillColorDropdown(false)
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setShowFontDropdown(false)
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setShowSizeDropdown(false)
      }
      if (textColorDropdownRef.current && !textColorDropdownRef.current.contains(e.target as Node)) {
        setShowTextColorDropdown(false)
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
          onClick={onCloseDocument}
          disabled={!hasDocuments}
          title="Close document (Ctrl+W)"
        >
          Close
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
              className={`color-picker-button ${highlightColor === 'clear' ? 'clear-mode' : ''}`}
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              title="Highlight color"
              style={{ backgroundColor: highlightColor === 'clear' ? '#ffffff' : HIGHLIGHT_COLORS[highlightColor] }}
            >
              {highlightColor === 'clear' && <span className="eraser-icon">⌫</span>}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showColorDropdown && (
              <div className="color-dropdown">
                {HIGHLIGHT_COLOR_OPTIONS.map(color => (
                  <button
                    key={color.id}
                    className={`color-option ${color.id === 'clear' ? 'clear-option' : ''} ${highlightColor === color.id ? 'active' : ''}`}
                    onClick={() => {
                      onHighlightColorChange(color.id)
                      setShowColorDropdown(false)
                    }}
                    style={{ backgroundColor: color.id === 'clear' ? '#ffffff' : HIGHLIGHT_COLORS[color.id] }}
                    title={color.label}
                  >
                    {color.id === 'clear' && <span className="eraser-icon">⌫</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(currentTool === 'underline' || currentTool === 'strikethrough') && (
          <div className="color-dropdown-container" ref={lineColorDropdownRef}>
            <button
              className={`color-picker-button ${lineColor === 'transparent' ? 'clear-mode' : ''}`}
              onClick={() => setShowLineColorDropdown(!showLineColorDropdown)}
              title="Line color"
              style={{ backgroundColor: lineColor === 'transparent' ? '#ffffff' : lineColor }}
            >
              {lineColor === 'transparent' && <span className="eraser-icon">⌫</span>}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showLineColorDropdown && (
              <div className="color-dropdown">
                {LINE_COLOR_OPTIONS.map(colorId => (
                  <button
                    key={colorId}
                    className={`color-option ${lineColor === LINE_COLORS[colorId] ? 'active' : ''}`}
                    onClick={() => {
                      onLineColorChange(LINE_COLORS[colorId])
                      setShowLineColorDropdown(false)
                    }}
                    style={{ backgroundColor: LINE_COLORS[colorId] }}
                    title={LINE_COLOR_LABELS[colorId]}
                  />
                ))}
                {/* Clear/eraser option */}
                <button
                  className={`color-option clear-option ${lineColor === 'transparent' ? 'active' : ''}`}
                  onClick={() => {
                    onLineColorChange('transparent')
                    setShowLineColorDropdown(false)
                  }}
                  style={{ backgroundColor: '#ffffff' }}
                  title="Eraser"
                >
                  <span className="eraser-icon">⌫</span>
                </button>
              </div>
            )}
          </div>
        )}

        {(currentTool === 'box' || selectedAnnotationType === 'box') && (
          <>
            {/* Box outline color picker */}
            <div className="color-dropdown-container" ref={boxColorDropdownRef}>
              <button
                className="color-picker-button box-outline-picker"
                onClick={() => setShowBoxColorDropdown(!showBoxColorDropdown)}
                title="Box outline color"
                style={{ backgroundColor: boxColor }}
              >
                <span className="box-outline-icon" />
                <span className="dropdown-arrow">▼</span>
              </button>
              {showBoxColorDropdown && (
                <div className="color-dropdown">
                  {LINE_COLOR_OPTIONS.map(colorId => (
                    <button
                      key={colorId}
                      className={`color-option ${boxColor === LINE_COLORS[colorId] ? 'active' : ''}`}
                      onClick={() => {
                        onBoxColorChange(LINE_COLORS[colorId])
                        setShowBoxColorDropdown(false)
                      }}
                      style={{ backgroundColor: LINE_COLORS[colorId] }}
                      title={LINE_COLOR_LABELS[colorId]}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Box fill color picker */}
            <div className="color-dropdown-container" ref={boxFillColorDropdownRef}>
              <button
                className="color-picker-button box-fill-picker"
                onClick={() => setShowBoxFillColorDropdown(!showBoxFillColorDropdown)}
                title="Box fill color"
                style={{ backgroundColor: boxFillColor === 'transparent' ? '#ffffff' : boxFillColor }}
              >
                <span className="box-fill-icon" />
                <span className="dropdown-arrow">▼</span>
              </button>
              {showBoxFillColorDropdown && (
                <div className="color-dropdown">
                  <button
                    className={`color-option transparent-option ${boxFillColor === 'transparent' ? 'active' : ''}`}
                    onClick={() => {
                      onBoxFillColorChange('transparent')
                      setShowBoxFillColorDropdown(false)
                    }}
                    title="Transparent (no fill)"
                  >
                    <span className="transparent-pattern">∅</span>
                  </button>
                  {LINE_COLOR_OPTIONS.map(colorId => (
                    <button
                      key={colorId}
                      className={`color-option ${boxFillColor === LINE_COLORS[colorId] ? 'active' : ''}`}
                      onClick={() => {
                        onBoxFillColorChange(LINE_COLORS[colorId])
                        setShowBoxFillColorDropdown(false)
                      }}
                      style={{ backgroundColor: LINE_COLORS[colorId] }}
                      title={LINE_COLOR_LABELS[colorId]}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {(currentTool === 'text' || selectedAnnotationType === 'text') && (
          <>
            {/* Font dropdown */}
            <div className="color-dropdown-container font-dropdown-container" ref={fontDropdownRef}>
              <button
                className="font-picker-button"
                onClick={() => setShowFontDropdown(!showFontDropdown)}
                title="Font"
                style={{ fontFamily: textFont }}
              >
                {textFont}
                <span className="dropdown-arrow">▼</span>
              </button>
              {showFontDropdown && (
                <div className="font-dropdown">
                  {AVAILABLE_FONTS.map(font => (
                    <button
                      key={font}
                      className={textFont === font ? 'active' : ''}
                      onClick={() => {
                        onTextFontChange(font)
                        setShowFontDropdown(false)
                      }}
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Size dropdown */}
            <div className="color-dropdown-container" ref={sizeDropdownRef}>
              <button
                className="size-picker-button"
                onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                title="Font size"
              >
                {textSize}
                <span className="dropdown-arrow">▼</span>
              </button>
              {showSizeDropdown && (
                <div className="size-dropdown">
                  {TEXT_SIZE_OPTIONS.map(size => (
                    <button
                      key={size}
                      className={textSize === size ? 'active' : ''}
                      onClick={() => {
                        onTextSizeChange(size)
                        setShowSizeDropdown(false)
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Text color dropdown */}
            <div className="color-dropdown-container" ref={textColorDropdownRef}>
              <button
                className="color-picker-button"
                onClick={() => setShowTextColorDropdown(!showTextColorDropdown)}
                title="Text color"
                style={{ backgroundColor: textColor }}
              >
                <span className="dropdown-arrow">▼</span>
              </button>
              {showTextColorDropdown && (
                <div className="color-dropdown">
                  {LINE_COLOR_OPTIONS.map(colorId => (
                    <button
                      key={colorId}
                      className={`color-option ${textColor === LINE_COLORS[colorId] ? 'active' : ''}`}
                      onClick={() => {
                        onTextColorChange(LINE_COLORS[colorId])
                        setShowTextColorDropdown(false)
                      }}
                      style={{ backgroundColor: LINE_COLORS[colorId] }}
                      title={LINE_COLOR_LABELS[colorId]}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
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
