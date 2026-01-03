import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, act } from '@test/render'
import MainViewer from './MainViewer'

// Mock the pdfRenderer service
vi.mock('@services/pdfRenderer', () => ({
  renderPage: vi.fn().mockResolvedValue({
    canvas: document.createElement('canvas'),
    width: 800,
    height: 1000
  }),
  getTextContent: vi.fn().mockResolvedValue({
    textContent: { items: [] },
    viewport: {
      width: 800,
      height: 1000,
      rawDims: { pageWidth: 800, pageHeight: 1000 }
    }
  })
}))

// Helper to wait for render effects to settle
const waitForRender = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
})

// Default props for MainViewer including annotation props
const defaultProps = {
  documentId: null as string | null,
  pageId: null as string | null,
  pageIndex: 0,
  zoom: 1,
  annotations: [],
  selectedAnnotationId: null,
  currentTool: 'select' as const,
  highlightColor: 'yellow' as const,
  lineColor: '#ff0000',
  boxColor: '#ff0000',
  boxThickness: 'medium' as const,
  textColor: '#000000',
  textFont: 'Arial' as const,
  textSize: 12,
  onAddAnnotation: vi.fn(),
  onUpdateAnnotation: vi.fn(),
  onDeleteAnnotation: vi.fn(),
  onSelectAnnotation: vi.fn()
}

describe('MainViewer', () => {
  describe('Empty State', () => {
    it('shows instructions when no document is loaded', async () => {
      renderWithProviders(<MainViewer {...defaultProps} />)

      expect(screen.getByText('Open a PDF to get started')).toBeInTheDocument()
      expect(screen.getByText('Ctrl+O to open file')).toBeInTheDocument()
      await waitForRender()
    })

    it('has "empty" CSS class when no document', async () => {
      const { container } = renderWithProviders(<MainViewer {...defaultProps} />)

      expect(container.querySelector('.main-viewer')).toHaveClass('empty')
      await waitForRender()
    })

    it('still renders a hidden canvas for mounting purposes', async () => {
      const { container } = renderWithProviders(<MainViewer {...defaultProps} />)

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      await waitForRender()
    })
  })

  describe('With Document', () => {
    it('renders canvas when document is provided', async () => {
      const { container } = renderWithProviders(
        <MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      await waitForRender()
    })

    it('does not show empty message', async () => {
      renderWithProviders(
        <MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" />
      )

      expect(screen.queryByText('Open a PDF to get started')).not.toBeInTheDocument()
      await waitForRender()
    })

    it('removes "empty" CSS class', async () => {
      const { container } = renderWithProviders(
        <MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" />
      )

      expect(container.querySelector('.main-viewer')).not.toHaveClass('empty')
      await waitForRender()
    })
  })

  describe('Props Changes', () => {
    it('accepts different zoom levels', async () => {
      const { rerender } = renderWithProviders(
        <MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" />
      )
      await waitForRender()

      // Should not throw when changing zoom
      rerender(<MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" zoom={2} />)
      await waitForRender()
      rerender(<MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" zoom={0.5} />)
      await waitForRender()
    })

    it('accepts different page indices', async () => {
      const { rerender } = renderWithProviders(
        <MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" />
      )
      await waitForRender()

      rerender(<MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" pageIndex={1} />)
      await waitForRender()
      rerender(<MainViewer {...defaultProps} documentId="test-doc" pageId="page-1" pageIndex={5} />)
      await waitForRender()
    })
  })
})
