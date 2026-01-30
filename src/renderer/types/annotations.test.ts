import { describe, it, expect } from 'vitest'
import {
  BOX_THICKNESS_PX,
  AVAILABLE_FONTS,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_SIZE,
  DEFAULT_BOX_THICKNESS,
  DEFAULT_LINE_COLOR,
  DEFAULT_BOX_COLOR,
  DEFAULT_BOX_FILL_COLOR,
  DEFAULT_PEN_COLOR,
  DEFAULT_PEN_WIDTH,
  PEN_WIDTH_OPTIONS,
  hexToHighlightRgba,
  type Annotation,
  type HighlightAnnotation,
  type UnderlineAnnotation,
  type StrikethroughAnnotation,
  type BoxAnnotation,
  type TextAnnotation,
  type PenAnnotation,
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
        color: '#ffeb3b'
      }

      expect(highlight.type).toBe('highlight')
      expect(highlight.color).toBe('#ffeb3b')
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
        fillColor: '#ffffff',
        thickness: 'medium'
      }

      expect(box.type).toBe('box')
      expect(box.thickness).toBe('medium')
      expect(box.fillColor).toBe('#ffffff')
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

  describe('PenAnnotation', () => {
    it('has required properties', () => {
      const pen: PenAnnotation = {
        id: 'p1',
        pageId: 'page-1',
        type: 'pen',
        x: 0.1,
        y: 0.1,
        width: 0.3,
        height: 0.2,
        points: [[0.1, 0.1], [0.2, 0.15], [0.3, 0.2]],
        color: '#000000',
        strokeWidth: 2
      }

      expect(pen.type).toBe('pen')
      expect(pen.points).toHaveLength(3)
      expect(pen.strokeWidth).toBe(2)
    })
  })

  describe('Annotation union type', () => {
    it('allows all annotation types', () => {
      const annotations: Annotation[] = [
        { id: '1', pageId: 'p1', type: 'highlight', x: 0, y: 0, width: 0.1, height: 0.1, color: '#ffeb3b' },
        { id: '2', pageId: 'p1', type: 'underline', x: 0, y: 0, width: 0.1, height: 0.01, color: '#f00' },
        { id: '3', pageId: 'p1', type: 'strikethrough', x: 0, y: 0, width: 0.1, height: 0.01, color: '#f00' },
        { id: '4', pageId: 'p1', type: 'box', x: 0, y: 0, width: 0.1, height: 0.1, color: '#f00', fillColor: '#fff', thickness: 'thin' },
        { id: '5', pageId: 'p1', type: 'text', x: 0, y: 0, width: 0.1, height: 0.05, content: 'Hi', font: 'Arial', fontSize: 12, color: '#000' },
        { id: '6', pageId: 'p1', type: 'pen', x: 0, y: 0, width: 0.1, height: 0.1, points: [[0, 0]], color: '#000', strokeWidth: 2 }
      ]

      expect(annotations).toHaveLength(6)
    })
  })

  describe('AnnotationTool type', () => {
    it('includes all tools', () => {
      const tools: AnnotationTool[] = ['select', 'highlight', 'underline', 'strikethrough', 'box', 'pen', 'text', 'eraser', 'grab']
      expect(tools).toHaveLength(9)
    })
  })
})

describe('Annotation Constants', () => {
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

  describe('PEN_WIDTH_OPTIONS', () => {
    it('has all width options', () => {
      expect(PEN_WIDTH_OPTIONS).toEqual([1, 2, 4, 8])
    })
  })

  describe('AVAILABLE_FONTS', () => {
    it('has 8 font options', () => {
      expect(AVAILABLE_FONTS).toHaveLength(8)
    })

    it('includes required fonts from spec', () => {
      expect(AVAILABLE_FONTS).toContain('Arial')
      expect(AVAILABLE_FONTS).toContain('Times New Roman')
      expect(AVAILABLE_FONTS).toContain('Verdana')
      expect(AVAILABLE_FONTS).toContain('Georgia')
      expect(AVAILABLE_FONTS).toContain('Trebuchet MS')
      expect(AVAILABLE_FONTS).toContain('Palatino')
      expect(AVAILABLE_FONTS).toContain('Courier New')
      expect(AVAILABLE_FONTS).toContain('Comic Sans MS')
    })
  })

  describe('Defaults', () => {
    it('has sensible default values', () => {
      expect(DEFAULT_HIGHLIGHT_COLOR).toBe('#ffeb3b') // Yellow hex
      expect(DEFAULT_TEXT_FONT).toBe('Arial')
      expect(DEFAULT_TEXT_SIZE).toBe(12)
      expect(DEFAULT_BOX_THICKNESS).toBe('medium')
      expect(DEFAULT_LINE_COLOR).toBe('#000000') // Black for underline
      expect(DEFAULT_BOX_COLOR).toBe('#ff0000') // Red for box
      expect(DEFAULT_BOX_FILL_COLOR).toBe('transparent') // Transparent fill
      expect(DEFAULT_PEN_COLOR).toBe('#000000') // Black for pen
      expect(DEFAULT_PEN_WIDTH).toBe(2)
    })
  })

  describe('hexToHighlightRgba', () => {
    it('converts hex to rgba with default alpha', () => {
      const result = hexToHighlightRgba('#ffeb3b')
      expect(result).toBe('rgba(255, 235, 59, 0.4)')
    })

    it('accepts custom alpha value', () => {
      const result = hexToHighlightRgba('#ff0000', 0.5)
      expect(result).toBe('rgba(255, 0, 0, 0.5)')
    })
  })
})
