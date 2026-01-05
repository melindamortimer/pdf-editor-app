import { describe, it, expect } from 'vitest'
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLORS_TRANSPARENT,
  BOX_THICKNESS_PX,
  AVAILABLE_FONTS,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_SIZE,
  DEFAULT_BOX_THICKNESS,
  DEFAULT_LINE_COLOR,
  DEFAULT_BOX_COLOR,
  LINE_COLORS,
  LINE_COLOR_OPTIONS,
  type Annotation,
  type HighlightAnnotation,
  type UnderlineAnnotation,
  type StrikethroughAnnotation,
  type BoxAnnotation,
  type TextAnnotation,
  type AnnotationTool
} from './annotations'

describe('Annotation Types', () => {
  describe('HighlightAnnotation', () => {
    it('has required properties', () => {
      const highlight: HighlightAnnotation = {
        id: 'h1',
        pageId: 'page-1',
        type: 'highlight',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.05,
        color: 'yellow'
      }

      expect(highlight.type).toBe('highlight')
      expect(highlight.color).toBe('yellow')
    })
  })

  describe('UnderlineAnnotation', () => {
    it('has required properties', () => {
      const underline: UnderlineAnnotation = {
        id: 'u1',
        pageId: 'page-1',
        type: 'underline',
        x: 0.1,
        y: 0.5,
        width: 0.4,
        height: 0.01,
        color: '#ff0000'
      }

      expect(underline.type).toBe('underline')
      expect(underline.color).toBe('#ff0000')
    })
  })

  describe('StrikethroughAnnotation', () => {
    it('has required properties', () => {
      const strikethrough: StrikethroughAnnotation = {
        id: 's1',
        pageId: 'page-1',
        type: 'strikethrough',
        x: 0.1,
        y: 0.5,
        width: 0.4,
        height: 0.01,
        color: '#0000ff'
      }

      expect(strikethrough.type).toBe('strikethrough')
    })
  })

  describe('BoxAnnotation', () => {
    it('has required properties', () => {
      const box: BoxAnnotation = {
        id: 'b1',
        pageId: 'page-1',
        type: 'box',
        x: 0.2,
        y: 0.3,
        width: 0.2,
        height: 0.2,
        color: '#00ff00',
        thickness: 'medium'
      }

      expect(box.type).toBe('box')
      expect(box.thickness).toBe('medium')
    })
  })

  describe('TextAnnotation', () => {
    it('has required properties', () => {
      const text: TextAnnotation = {
        id: 't1',
        pageId: 'page-1',
        type: 'text',
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.05,
        content: 'Hello World',
        font: 'Arial',
        fontSize: 14,
        color: '#000000'
      }

      expect(text.type).toBe('text')
      expect(text.content).toBe('Hello World')
      expect(text.font).toBe('Arial')
    })

    it('supports optional formatting properties', () => {
      const formattedText: TextAnnotation = {
        id: 't2',
        pageId: 'page-1',
        type: 'text',
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.05,
        content: 'Formatted Text',
        font: 'Arial',
        fontSize: 14,
        color: '#000000',
        bold: true,
        italic: true,
        underline: false
      }

      expect(formattedText.bold).toBe(true)
      expect(formattedText.italic).toBe(true)
      expect(formattedText.underline).toBe(false)
    })
  })

  describe('Annotation union type', () => {
    it('allows all annotation types', () => {
      const annotations: Annotation[] = [
        { id: '1', pageId: 'p1', type: 'highlight', x: 0, y: 0, width: 0.1, height: 0.1, color: 'yellow' },
        { id: '2', pageId: 'p1', type: 'underline', x: 0, y: 0, width: 0.1, height: 0.01, color: '#f00' },
        { id: '3', pageId: 'p1', type: 'strikethrough', x: 0, y: 0, width: 0.1, height: 0.01, color: '#f00' },
        { id: '4', pageId: 'p1', type: 'box', x: 0, y: 0, width: 0.1, height: 0.1, color: '#f00', thickness: 'thin' },
        { id: '5', pageId: 'p1', type: 'text', x: 0, y: 0, width: 0.1, height: 0.05, content: 'Hi', font: 'Arial', fontSize: 12, color: '#000' }
      ]

      expect(annotations).toHaveLength(5)
    })
  })

  describe('AnnotationTool type', () => {
    it('includes all tools', () => {
      const tools: AnnotationTool[] = ['select', 'highlight', 'underline', 'strikethrough', 'box', 'text', 'eraser']
      expect(tools).toHaveLength(7)
    })
  })
})

describe('Annotation Constants', () => {
  describe('HIGHLIGHT_COLORS', () => {
    it('has all highlight color options', () => {
      expect(HIGHLIGHT_COLORS.yellow).toBeDefined()
      expect(HIGHLIGHT_COLORS.green).toBeDefined()
      expect(HIGHLIGHT_COLORS.pink).toBeDefined()
      expect(HIGHLIGHT_COLORS.orange).toBeDefined()
      expect(HIGHLIGHT_COLORS.clear).toBeDefined()
    })

    it('colors are vibrant (no alpha) for picker display', () => {
      expect(HIGHLIGHT_COLORS.yellow).toContain('rgb(')
      expect(HIGHLIGHT_COLORS.yellow).not.toContain('rgba')
    })

    it('clear is transparent', () => {
      expect(HIGHLIGHT_COLORS.clear).toBe('transparent')
    })
  })

  describe('HIGHLIGHT_COLORS_TRANSPARENT', () => {
    it('has all highlight color options', () => {
      expect(HIGHLIGHT_COLORS_TRANSPARENT.yellow).toBeDefined()
      expect(HIGHLIGHT_COLORS_TRANSPARENT.green).toBeDefined()
      expect(HIGHLIGHT_COLORS_TRANSPARENT.pink).toBeDefined()
      expect(HIGHLIGHT_COLORS_TRANSPARENT.orange).toBeDefined()
      expect(HIGHLIGHT_COLORS_TRANSPARENT.clear).toBeDefined()
    })

    it('colors have alpha for transparency on PDF', () => {
      expect(HIGHLIGHT_COLORS_TRANSPARENT.yellow).toContain('rgba')
      expect(HIGHLIGHT_COLORS_TRANSPARENT.yellow).toContain('0.4')
    })
  })

  describe('BOX_THICKNESS_PX', () => {
    it('has all thickness options', () => {
      expect(BOX_THICKNESS_PX.thin).toBe(1)
      expect(BOX_THICKNESS_PX.medium).toBe(2)
      expect(BOX_THICKNESS_PX.thick).toBe(4)
    })

    it('thickness increases correctly', () => {
      expect(BOX_THICKNESS_PX.thin).toBeLessThan(BOX_THICKNESS_PX.medium)
      expect(BOX_THICKNESS_PX.medium).toBeLessThan(BOX_THICKNESS_PX.thick)
    })
  })

  describe('AVAILABLE_FONTS', () => {
    it('has 7 formal font options', () => {
      expect(AVAILABLE_FONTS).toHaveLength(7)
    })

    it('includes required fonts from spec', () => {
      expect(AVAILABLE_FONTS).toContain('Arial')
      expect(AVAILABLE_FONTS).toContain('Times New Roman')
      expect(AVAILABLE_FONTS).toContain('Verdana')
      expect(AVAILABLE_FONTS).toContain('Georgia')
      expect(AVAILABLE_FONTS).toContain('Trebuchet MS')
      expect(AVAILABLE_FONTS).toContain('Palatino')
      expect(AVAILABLE_FONTS).toContain('Courier New')
    })
  })

  describe('Defaults', () => {
    it('has sensible default values', () => {
      expect(DEFAULT_HIGHLIGHT_COLOR).toBe('yellow')
      expect(DEFAULT_TEXT_FONT).toBe('Arial')
      expect(DEFAULT_TEXT_SIZE).toBe(12)
      expect(DEFAULT_BOX_THICKNESS).toBe('medium')
      expect(DEFAULT_LINE_COLOR).toBe('#000000') // Black for underline
      expect(DEFAULT_BOX_COLOR).toBe('#ff0000') // Red for box
    })
  })

  describe('LINE_COLORS', () => {
    it('has all color options', () => {
      expect(LINE_COLORS.black).toBe('#000000')
      expect(LINE_COLORS.red).toBe('#ff0000')
      expect(LINE_COLORS.blue).toBe('#0066cc')
      expect(LINE_COLORS.clear).toBe('transparent')
    })

    it('has correct color options array (excludes clear)', () => {
      expect(LINE_COLOR_OPTIONS).toEqual(['black', 'red', 'blue'])
      expect(LINE_COLOR_OPTIONS).not.toContain('clear')
    })

    it('clear is transparent for eraser functionality', () => {
      expect(LINE_COLORS.clear).toBe('transparent')
    })
  })
})
