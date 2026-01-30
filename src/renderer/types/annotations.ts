// Annotation tool types
export type AnnotationTool =
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'box'
  | 'pen'
  | 'text'
  | 'eraser'
  | 'grab'

// Box thickness options
export type BoxThickness = 'thin' | 'medium' | 'thick'

// Pen width options (in pixels)
export type PenWidth = 1 | 2 | 4 | 8

// Available fonts for text annotations
export type TextFont =
  | 'Arial'
  | 'Times New Roman'
  | 'Verdana'
  | 'Georgia'
  | 'Trebuchet MS'
  | 'Palatino'
  | 'Courier New'
  | 'Comic Sans MS'

// Base annotation properties
interface BaseAnnotation {
  id: string
  pageId: string // ID of the PdfPage this annotation belongs to
  x: number // Position relative to page (0-1 normalized)
  y: number
  width: number // Size relative to page (0-1 normalized)
  height: number
}

// Highlight annotation - semi-transparent rectangle
export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight'
  color: string // hex color
}

// Underline annotation - horizontal line
export interface UnderlineAnnotation extends BaseAnnotation {
  type: 'underline'
  color: string // Any color
}

// Strikethrough annotation - horizontal line through text
export interface StrikethroughAnnotation extends BaseAnnotation {
  type: 'strikethrough'
  color: string
}

// Box annotation - outline rectangle with optional fill
export interface BoxAnnotation extends BaseAnnotation {
  type: 'box'
  color: string // Outline color
  fillColor: string // Fill color (use 'transparent' for no fill)
  thickness: BoxThickness
}

// Text annotation - placed text
export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  content: string
  font: TextFont
  fontSize: number // in points
  color: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

// Pen annotation - freehand drawing
export interface PenAnnotation extends BaseAnnotation {
  type: 'pen'
  points: [number, number][] // Array of [x, y] normalized coordinates
  color: string // hex color
  strokeWidth: PenWidth
}

// Union of all annotation types
export type Annotation =
  | HighlightAnnotation
  | UnderlineAnnotation
  | StrikethroughAnnotation
  | BoxAnnotation
  | TextAnnotation
  | PenAnnotation

// Box thickness in pixels (will be scaled by zoom)
export const BOX_THICKNESS_PX: Record<BoxThickness, number> = {
  thin: 1,
  medium: 2,
  thick: 4
}

// Pen width options
export const PEN_WIDTH_OPTIONS: PenWidth[] = [1, 2, 4, 8]

// Default colors
export const DEFAULT_LINE_COLOR = '#000000' // Black for underline/strikethrough
export const DEFAULT_BOX_COLOR = '#ff0000' // Red for box outline
export const DEFAULT_BOX_FILL_COLOR = 'transparent' // Transparent fill by default
export const DEFAULT_HIGHLIGHT_COLOR = '#ffeb3b' // Yellow
export const DEFAULT_PEN_COLOR = '#000000' // Black
export const DEFAULT_PEN_WIDTH: PenWidth = 2
export const DEFAULT_TEXT_FONT: TextFont = 'Arial'
export const DEFAULT_TEXT_SIZE = 12
export const DEFAULT_BOX_THICKNESS: BoxThickness = 'medium'

// Helper to convert hex color to rgba with transparency (for highlights)
export function hexToHighlightRgba(hex: string, alpha = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Font list for UI
export const AVAILABLE_FONTS: TextFont[] = [
  'Arial',
  'Times New Roman',
  'Verdana',
  'Georgia',
  'Trebuchet MS',
  'Palatino',
  'Courier New',
  'Comic Sans MS'
]
