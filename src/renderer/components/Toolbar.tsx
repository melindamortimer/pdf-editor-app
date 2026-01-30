import { useState, useRef, useEffect } from 'react'
import type { AnnotationTool, TextFont, BoxThickness, PenWidth } from '../types/annotations'
import { AVAILABLE_FONTS, PEN_WIDTH_OPTIONS } from '../types/annotations'
import ColorPicker from './ColorPicker'
import './Toolbar.css'

// Icon imports
import cursorIcon from '../assets/cursor.png'
import eraserIcon from '../assets/eraser.png'
import highlighterIcon from '../assets/highlighter.png'
import rectangleIcon from '../assets/rectangle.png'
import undoIcon from '../assets/undo.png'

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

const ANNOTATION_TOOLS: { id: AnnotationTool; label: string; icon: string; iconSrc?: string; shortcut: string }[] = [
  { id: 'select', label: 'Select', icon: '↖', iconSrc: cursorIcon, shortcut: 'S' },
  { id: 'pen', label: 'Pen', icon: '✎', shortcut: 'P' },
  { id: 'eraser', label: 'Eraser', icon: '⌫', iconSrc: eraserIcon, shortcut: 'E' },
  { id: 'highlight', label: 'Highlight', icon: '▮', iconSrc: highlighterIcon, shortcut: 'H' },
  { id: 'underline', label: 'Underline', icon: 'U', shortcut: 'U' },
  { id: 'strikethrough', label: 'Strikethrough', icon: 'S', shortcut: 'K' },
  { id: 'box', label: 'Box', icon: '☐', iconSrc: rectangleIcon, shortcut: 'B' },
  { id: 'text', label: 'Text', icon: 'T', shortcut: 'T' }
]

const BOX_THICKNESS_OPTIONS: { id: BoxThickness; label: string }[] = [
  { id: 'thin', label: 'Thin' },
  { id: 'medium', label: 'Medium' },
  { id: 'thick', label: 'Thick' }
]

interface ToolbarProps {
  hasDocuments: boolean
  hasUnsavedChanges: boolean
  canSave: boolean
  zoom: number
  currentTool: AnnotationTool
  highlightColor: string
  lineColor: string
  boxColor: string
  boxFillColor: string
  boxThickness: BoxThickness
  penColor: string
  penWidth: PenWidth
  textFont: TextFont
  textSize: number
  textColor: string
  selectedAnnotationType: 'box' | 'text' | 'pen' | null
  canUndo: boolean
  canRedo: boolean
  onOpenFiles: () => void
  onCloseDocument: () => void
  onSave: () => void
  onSaveAs: () => void
  onZoomChange: (zoom: number) => void
  onToolChange: (tool: AnnotationTool) => void
  onHighlightColorChange: (color: string) => void
  onLineColorChange: (color: string) => void
  onBoxColorChange: (color: string) => void
  onBoxFillColorChange: (color: string) => void
  onBoxThicknessChange: (thickness: BoxThickness) => void
  onPenColorChange: (color: string) => void
  onPenWidthChange: (width: PenWidth) => void
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
  boxThickness,
  penColor,
  penWidth,
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
  onBoxThicknessChange,
  onPenColorChange,
  onPenWidthChange,
  onTextFontChange,
  onTextSizeChange,
  onTextColorChange,
  onUndo,
  onRedo,
  onDiscardAnnotations
}: ToolbarProps) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  const [showBoxThicknessDropdown, setShowBoxThicknessDropdown] = useState(false)
  const [showPenWidthDropdown, setShowPenWidthDropdown] = useState(false)
  const [showFontDropdown, setShowFontDropdown] = useState(false)
  const [showSizeDropdown, setShowSizeDropdown] = useState(false)
  const [boxFillTransparent, setBoxFillTransparent] = useState(boxFillColor === 'transparent')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const boxThicknessDropdownRef = useRef<HTMLDivElement>(null)
  const penWidthDropdownRef = useRef<HTMLDivElement>(null)
  const fontDropdownRef = useRef<HTMLDivElement>(null)
  const sizeDropdownRef = useRef<HTMLDivElement>(null)

  // Sync boxFillTransparent state with prop
  useEffect(() => {
    setBoxFillTransparent(boxFillColor === 'transparent')
  }, [boxFillColor])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowZoomDropdown(false)
      }
      if (boxThicknessDropdownRef.current && !boxThicknessDropdownRef.current.contains(e.target as Node)) {
        setShowBoxThicknessDropdown(false)
      }
      if (penWidthDropdownRef.current && !penWidthDropdownRef.current.contains(e.target as Node)) {
        setShowPenWidthDropdown(false)
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setShowFontDropdown(false)
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setShowSizeDropdown(false)
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

  const handleBoxFillTransparentChange = (isTransparent: boolean) => {
    setBoxFillTransparent(isTransparent)
    if (isTransparent) {
      onBoxFillColorChange('transparent')
    } else {
      onBoxFillColorChange('#ffffff') // Default to white when turning off transparent
    }
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
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.iconSrc ? (
              <img src={tool.iconSrc} alt={tool.label} className="tool-icon" />
            ) : (
              <span style={tool.id === 'pen' ? { display: 'inline-block', transform: 'scaleX(-1)' } : undefined}>
                {tool.icon}
              </span>
            )}
          </button>
        ))}

        {currentTool === 'highlight' && (
          <ColorPicker
            color={highlightColor}
            onChange={onHighlightColorChange}
            label="Color"
          />
        )}

        {(currentTool === 'underline' || currentTool === 'strikethrough') && (
          <ColorPicker
            color={lineColor}
            onChange={onLineColorChange}
            label="Color"
          />
        )}

        {(currentTool === 'box' || selectedAnnotationType === 'box') && (
          <>
            <ColorPicker
              color={boxColor}
              onChange={onBoxColorChange}
              label="Border"
            />
            <ColorPicker
              color={boxFillTransparent ? '#ffffff' : boxFillColor}
              onChange={onBoxFillColorChange}
              label="Fill"
              showTransparent
              isTransparent={boxFillTransparent}
              onTransparentChange={handleBoxFillTransparentChange}
            />
            {/* Box thickness dropdown */}
            <div className="color-dropdown-container" ref={boxThicknessDropdownRef}>
              <button
                className="thickness-picker-button"
                onClick={() => setShowBoxThicknessDropdown(!showBoxThicknessDropdown)}
                title="Border thickness"
              >
                <span className="thickness-icon" data-thickness={boxThickness}>━</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {showBoxThicknessDropdown && (
                <div className="thickness-dropdown">
                  {BOX_THICKNESS_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      className={`thickness-option ${boxThickness === id ? 'active' : ''}`}
                      onClick={() => {
                        onBoxThicknessChange(id)
                        setShowBoxThicknessDropdown(false)
                      }}
                      title={label}
                    >
                      <span className="thickness-preview" data-thickness={id}>━</span>
                      <span className="thickness-label">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {(currentTool === 'pen' || selectedAnnotationType === 'pen') && (
          <>
            <ColorPicker
              color={penColor}
              onChange={onPenColorChange}
              label="Color"
            />
            {/* Pen width dropdown */}
            <div className="color-dropdown-container" ref={penWidthDropdownRef}>
              <button
                className="width-picker-button"
                onClick={() => setShowPenWidthDropdown(!showPenWidthDropdown)}
                title="Pen width"
              >
                {penWidth}px
                <span className="dropdown-arrow">▼</span>
              </button>
              {showPenWidthDropdown && (
                <div className="width-dropdown">
                  {PEN_WIDTH_OPTIONS.map(width => (
                    <button
                      key={width}
                      className={`width-option ${penWidth === width ? 'active' : ''}`}
                      onClick={() => {
                        onPenWidthChange(width)
                        setShowPenWidthDropdown(false)
                      }}
                    >
                      <span
                        className="width-preview"
                        style={{ height: width, backgroundColor: penColor }}
                      />
                      <span className="width-label">{width}px</span>
                    </button>
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
            <ColorPicker
              color={textColor}
              onChange={onTextColorChange}
              label="Color"
            />
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
          <img src={undoIcon} alt="Undo" className="tool-icon" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="tool-button"
          title="Redo (Ctrl+Shift+Z)"
        >
          <img src={undoIcon} alt="Redo" className="tool-icon redo-icon" />
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
