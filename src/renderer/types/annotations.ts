// Annotation tool types
export type AnnotationTool =
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'box'
  | 'text'

// Colors for highlight tool ('clear' is used to erase highlights)
export type HighlightColor = 'yellow' | 'green' | 'pink' | 'orange' | 'clear'

// Box thickness options
export type BoxThickness = 'thin' | 'medium' | 'thick'

// Available fonts for text annotations
export type TextFont =
  | 'Arial'
  | 'Times New Roman'
  | 'Helvetica'
  | 'Georgia'
  | 'Calibri'
  | 'Garamond'
  | 'Courier New'

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
  color: HighlightColor
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
}

// Union of all annotation types
export type Annotation =
  | HighlightAnnotation
  | UnderlineAnnotation
  | StrikethroughAnnotation
  | BoxAnnotation
  | TextAnnotation

// Color mappings - vibrant colors for color picker display
export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: 'rgb(255, 235, 59)',
  green: 'rgb(76, 175, 80)',
  pink: 'rgb(233, 30, 99)',
  orange: 'rgb(255, 152, 0)',
  clear: 'transparent'
}

// Semi-transparent colors for actual highlight annotations on PDF
export const HIGHLIGHT_COLORS_TRANSPARENT: Record<HighlightColor, string> = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  green: 'rgba(76, 175, 80, 0.4)',
  pink: 'rgba(233, 30, 99, 0.35)',
  orange: 'rgba(255, 152, 0, 0.4)',
  clear: 'rgba(255, 0, 0, 0.15)'  // Light red tint to show eraser selection
}

// Box thickness in pixels (will be scaled by zoom)
export const BOX_THICKNESS_PX: Record<BoxThickness, number> = {
  thin: 1,
  medium: 2,
  thick: 4
}

// Default colors
export const DEFAULT_LINE_COLOR = '#000000' // Black for underline/strikethrough
export const DEFAULT_BOX_COLOR = '#ff0000' // Red for box outline
export const DEFAULT_BOX_FILL_COLOR = 'transparent' // Transparent fill by default
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'yellow'
export const DEFAULT_TEXT_FONT: TextFont = 'Arial'
export const DEFAULT_TEXT_SIZE = 12
export const DEFAULT_BOX_THICKNESS: BoxThickness = 'medium'

// Line/box color options for picker ('clear' is used to erase underlines/strikethroughs)
export type LineColor = 'black' | 'red' | 'blue' | 'clear'

export const LINE_COLORS: Record<LineColor, string> = {
  black: '#000000',
  red: '#ff0000',
  blue: '#0066cc',
  clear: 'transparent'
}

export const LINE_COLOR_OPTIONS: LineColor[] = ['black', 'red', 'blue']  // 'clear' added separately in picker

// Font list for UI
export const AVAILABLE_FONTS: TextFont[] = [
  'Arial',
  'Times New Roman',
  'Helvetica',
  'Georgia',
  'Calibri',
  'Garamond',
  'Courier New'
]
