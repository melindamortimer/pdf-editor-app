import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent } from '@test/render'
import AnnotationLayer from './AnnotationLayer'
import type { Annotation, HighlightAnnotation, BoxAnnotation, TextAnnotation } from '../types/annotations'

const defaultProps = {
  pageId: 'page-1',
  annotations: [] as Annotation[],
  selectedAnnotationIds: new Set<string>(),
  currentTool: 'select' as const,
  canvasWidth: 800,
  canvasHeight: 1000,
  zoom: 1,
  highlightColor: '#ffeb3b',
  lineColor: '#ff0000',
  boxColor: '#ff0000',
  boxFillColor: 'transparent',
  boxThickness: 'medium' as const,
  textColor: '#000000',
  textFont: 'Arial' as const,
  textSize: 12,
  onAddAnnotation: vi.fn(),
  onUpdateAnnotation: vi.fn(),
  onDeleteAnnotation: vi.fn(),
  onSelectAnnotation: vi.fn()
}

// Helper to create a highlight annotation
const createHighlight = (overrides = {}): HighlightAnnotation => ({
  id: 'highlight-1',
  pageId: 'page-1',
  type: 'highlight',
  x: 0.1,
  y: 0.1,
  width: 0.2,
  height: 0.05,
  color: '#ffeb3b',
  ...overrides
})

// Helper to create a box annotation
const createBox = (overrides = {}): BoxAnnotation => ({
  id: 'box-1',
  pageId: 'page-1',
  type: 'box',
  x: 0.3,
  y: 0.3,
  width: 0.2,
  height: 0.2,
  color: '#ff0000',
  fillColor: 'transparent',
  thickness: 'medium',
  ...overrides
})

// Helper to create a text annotation
const createText = (overrides = {}): TextAnnotation => ({
  id: 'text-1',
  pageId: 'page-1',
  type: 'text',
  x: 0.5,
  y: 0.5,
  width: 0.2,
  height: 0.05,
  content: 'Test text',
  font: 'Arial',
  fontSize: 12,
  color: '#000000',
  ...overrides
})

describe('AnnotationLayer', () => {
  describe('Rendering', () => {
    it('renders with correct dimensions', () => {
      const { container } = renderWithProviders(<AnnotationLayer {...defaultProps} />)

      const layer = container.querySelector('.annotation-layer')
      expect(layer).toHaveStyle({ width: '800px', height: '1000px' })
    })

    it('renders highlight annotations', () => {
      const highlight = createHighlight()
      const { container } = renderWithProviders(
        <AnnotationLayer {...defaultProps} annotations={[highlight]} />
      )

      const annotation = container.querySelector('.annotation.highlight')
      expect(annotation).toBeInTheDocument()
    })

    it('renders box annotations', () => {
      const box = createBox()
      const { container } = renderWithProviders(
        <AnnotationLayer {...defaultProps} annotations={[box]} />
      )

      const annotation = container.querySelector('.annotation.box')
      expect(annotation).toBeInTheDocument()
    })

    it('renders text annotations with content', () => {
      const text = createText({ content: 'Hello World' })
      renderWithProviders(
        <AnnotationLayer {...defaultProps} annotations={[text]} />
      )

      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('renders multiple annotations', () => {
      const annotations = [createHighlight(), createBox(), createText()]
      const { container } = renderWithProviders(
        <AnnotationLayer {...defaultProps} annotations={annotations} />
      )

      expect(container.querySelectorAll('.annotation')).toHaveLength(3)
    })

    it('marks selected annotation with selected class', () => {
      const highlight = createHighlight({ id: 'selected-one' })
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[highlight]}
          selectedAnnotationIds={new Set(['selected-one'])}
        />
      )

      const annotation = container.querySelector('.annotation')
      expect(annotation).toHaveClass('selected')
    })
  })

  describe('Cursor', () => {
    it('shows default cursor for select tool', () => {
      const { container } = renderWithProviders(
        <AnnotationLayer {...defaultProps} currentTool="select" />
      )

      expect(container.querySelector('.annotation-layer')).toHaveStyle({ cursor: 'default' })
    })

    it('shows crosshair cursor for drawing tools', () => {
      const { container } = renderWithProviders(
        <AnnotationLayer {...defaultProps} currentTool="highlight" />
      )

      expect(container.querySelector('.annotation-layer')).toHaveStyle({ cursor: 'crosshair' })
    })

    it('shows text cursor for text tool', () => {
      const { container } = renderWithProviders(
        <AnnotationLayer {...defaultProps} currentTool="text" />
      )

      expect(container.querySelector('.annotation-layer')).toHaveStyle({ cursor: 'text' })
    })
  })

  describe('Selection', () => {
    it('selects annotation when clicked with select tool', () => {
      const onSelectAnnotation = vi.fn()
      // Use box annotation since highlight/underline/strikethrough can't be selected
      const box = createBox({ x: 0.1, y: 0.1, width: 0.2, height: 0.1 })
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[box]}
          currentTool="select"
          onSelectAnnotation={onSelectAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!
      // Click inside the annotation (at x=120, y=150 which is within the annotation bounds)
      fireEvent.mouseDown(layer, { clientX: 120, clientY: 150, button: 0 })

      expect(onSelectAnnotation).toHaveBeenCalledWith('box-1', false)
    })

    it('clears selection when clicking empty area', () => {
      const onSelectAnnotation = vi.fn()
      const highlight = createHighlight({ x: 0.1, y: 0.1, width: 0.1, height: 0.1 })
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[highlight]}
          currentTool="select"
          onSelectAnnotation={onSelectAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!
      // Click outside the annotation
      fireEvent.mouseDown(layer, { clientX: 700, clientY: 700, button: 0 })

      expect(onSelectAnnotation).toHaveBeenCalledWith(null)
    })
  })

  describe('Drawing Highlight', () => {
    it('creates highlight annotation on mouse drag', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      // Simulate drawing
      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 200, clientY: 150 })
      fireEvent.mouseUp(layer)

      expect(onAddAnnotation).toHaveBeenCalled()
      const annotation = onAddAnnotation.mock.calls[0][0]
      expect(annotation.type).toBe('highlight')
      expect(annotation.color).toBe('#ffeb3b')
    })

    it('uses selected highlight color', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
          highlightColor="#00ff00"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 200, clientY: 150 })
      fireEvent.mouseUp(layer)

      const annotation = onAddAnnotation.mock.calls[0][0]
      expect(annotation.color).toBe('#00ff00')
    })

    it('does not create annotation for tiny drag', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      // Very small drag (less than 5px)
      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 102, clientY: 101 })
      fireEvent.mouseUp(layer)

      expect(onAddAnnotation).not.toHaveBeenCalled()
    })
  })

  describe('Drawing Box', () => {
    it('creates box annotation on mouse drag', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="box"
          boxColor="#00ff00"
          boxThickness="thick"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 250, clientY: 250 })
      fireEvent.mouseUp(layer)

      expect(onAddAnnotation).toHaveBeenCalled()
      const annotation = onAddAnnotation.mock.calls[0][0]
      expect(annotation.type).toBe('box')
      expect(annotation.color).toBe('#00ff00')
      expect(annotation.thickness).toBe('thick')
    })
  })

  describe('Drawing Underline', () => {
    it('creates underline annotation on mouse drag', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="underline"
          lineColor="#0000ff"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 300, clientY: 120 })
      fireEvent.mouseUp(layer)

      expect(onAddAnnotation).toHaveBeenCalled()
      const annotation = onAddAnnotation.mock.calls[0][0]
      expect(annotation.type).toBe('underline')
      expect(annotation.color).toBe('#0000ff')
    })
  })

  describe('Drawing Strikethrough', () => {
    it('creates strikethrough annotation on mouse drag', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="strikethrough"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 300, clientY: 120 })
      fireEvent.mouseUp(layer)

      expect(onAddAnnotation).toHaveBeenCalled()
      const annotation = onAddAnnotation.mock.calls[0][0]
      expect(annotation.type).toBe('strikethrough')
    })
  })

  describe('Placing Text', () => {
    it('creates text annotation on click', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="text"
          textFont="Georgia"
          textSize={16
          }
          textColor="#333333"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 200, clientY: 300, button: 0 })

      expect(onAddAnnotation).toHaveBeenCalled()
      const annotation = onAddAnnotation.mock.calls[0][0]
      expect(annotation.type).toBe('text')
      expect(annotation.font).toBe('Georgia')
      expect(annotation.fontSize).toBe(16)
      expect(annotation.color).toBe('#333333')
      expect(annotation.content).toBe('Text') // Placeholder text, auto-selected for replacement
    })

    it('selects newly created text annotation', () => {
      const onSelectAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="text"
          onSelectAnnotation={onSelectAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!
      fireEvent.mouseDown(layer, { clientX: 200, clientY: 300, button: 0 })

      expect(onSelectAnnotation).toHaveBeenCalled()
    })

    it('text annotations have pointer events enabled in text mode', () => {
      const text = createText()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[text]}
          currentTool="text"
        />
      )

      const annotation = container.querySelector('.annotation.text')
      expect(annotation).toHaveStyle({ pointerEvents: 'auto' })
    })
  })

  describe('Moving Annotations', () => {
    it('updates annotation position on drag', () => {
      const onUpdateAnnotation = vi.fn()
      // Use box annotation since highlight/underline/strikethrough can't be selected
      const box = createBox({ x: 0.1, y: 0.1, width: 0.2, height: 0.1 })
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[box]}
          currentTool="select"
          onUpdateAnnotation={onUpdateAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      // Click on annotation to start drag
      fireEvent.mouseDown(layer, { clientX: 120, clientY: 150, button: 0 })
      // Move
      fireEvent.mouseMove(layer, { clientX: 220, clientY: 250 })

      expect(onUpdateAnnotation).toHaveBeenCalled()
      expect(onUpdateAnnotation.mock.calls[0][0]).toBe('box-1')
    })
  })

  describe('Drawing Preview', () => {
    it('shows preview while drawing', () => {
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 200, clientY: 150 })

      const preview = container.querySelector('.drawing-preview')
      expect(preview).toBeInTheDocument()
    })

    it('removes preview after drawing complete', () => {
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 200, clientY: 150 })
      fireEvent.mouseUp(layer)

      const preview = container.querySelector('.drawing-preview')
      expect(preview).not.toBeInTheDocument()
    })
  })

  describe('Mouse Leave', () => {
    it('cancels drawing on mouse leave', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 0 })
      fireEvent.mouseMove(layer, { clientX: 200, clientY: 150 })
      fireEvent.mouseLeave(layer)

      // Should not create annotation
      expect(onAddAnnotation).not.toHaveBeenCalled()
    })
  })

  describe('Right Click', () => {
    it('ignores right click', () => {
      const onAddAnnotation = vi.fn()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          currentTool="highlight"
          onAddAnnotation={onAddAnnotation}
        />
      )

      const layer = container.querySelector('.annotation-layer')!

      // Right click (button: 2)
      fireEvent.mouseDown(layer, { clientX: 100, clientY: 100, button: 2 })
      fireEvent.mouseMove(layer, { clientX: 200, clientY: 150 })
      fireEvent.mouseUp(layer)

      expect(onAddAnnotation).not.toHaveBeenCalled()
    })
  })

  describe('Box Resize Handle', () => {
    it('shows resize handle when box is selected', () => {
      const box = createBox({ id: 'selected-box' })
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[box]}
          selectedAnnotationIds={new Set(['selected-box'])}
          currentTool="select"
        />
      )

      const resizeHandle = container.querySelector('.box-resize-handle')
      expect(resizeHandle).toBeInTheDocument()
    })

    it('shows resize handle when box tool is active', () => {
      const box = createBox()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[box]}
          currentTool="box"
        />
      )

      const resizeHandle = container.querySelector('.box-resize-handle')
      expect(resizeHandle).toBeInTheDocument()
    })

    it('does not show resize handle when box is not selected and different tool active', () => {
      const box = createBox()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[box]}
          currentTool="highlight"
        />
      )

      const resizeHandle = container.querySelector('.box-resize-handle')
      expect(resizeHandle).not.toBeInTheDocument()
    })

    it('box has pointer events enabled when resize handle is visible', () => {
      const box = createBox()
      const { container } = renderWithProviders(
        <AnnotationLayer
          {...defaultProps}
          annotations={[box]}
          currentTool="box"
        />
      )

      const annotation = container.querySelector('.annotation.box')
      expect(annotation).toHaveStyle({ pointerEvents: 'auto' })
    })
  })
})
