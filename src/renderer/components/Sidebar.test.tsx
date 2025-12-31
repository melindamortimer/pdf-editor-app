import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '@test/render'
import {
  createDocument,
  createPages,
  createTestScenario
} from '@test/factories'
import Sidebar from './Sidebar'

// Mock the pdfRenderer service
vi.mock('@services/pdfRenderer', () => ({
  renderPage: vi.fn().mockResolvedValue({
    canvas: document.createElement('canvas'),
    width: 100,
    height: 150
  })
}))

// Default props for all tests
const defaultProps = {
  onReorder: vi.fn(),
  onDeletePage: vi.fn(),
  onDuplicatePage: vi.fn()
}

describe('Sidebar', () => {
  describe('Empty State', () => {
    it('shows message when no documents', () => {
      renderWithProviders(
        <Sidebar
          documents={[]}
          pages={[]}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      expect(screen.getByText('No documents')).toBeInTheDocument()
    })

    it('has "empty" CSS class', () => {
      const { container } = renderWithProviders(
        <Sidebar
          documents={[]}
          pages={[]}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      expect(container.querySelector('.sidebar')).toHaveClass('empty')
    })
  })

  describe('With Single Document', () => {
    it('shows document header', () => {
      const doc = createDocument({ name: 'my-file.pdf' })
      const pages = createPages(doc.id, 3)

      renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      expect(screen.getByText('my-file.pdf')).toBeInTheDocument()
    })

    it('renders correct number of thumbnails', () => {
      const doc = createDocument({ pageCount: 5 })
      const pages = createPages(doc.id, 5)

      const { container } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      expect(thumbnails).toHaveLength(5)
    })

    it('shows sequential page numbers', () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)

      renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Page Selection', () => {
    it('marks selected page with CSS class', () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)

      const { container } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={1}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      expect(thumbnails[0]).not.toHaveClass('selected')
      expect(thumbnails[1]).toHaveClass('selected')
      expect(thumbnails[2]).not.toHaveClass('selected')
    })

    it('calls onPageSelect with correct index when clicked', async () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)
      const onPageSelect = vi.fn()

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={onPageSelect}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.click(thumbnails[2])

      expect(onPageSelect).toHaveBeenCalledWith(2)
    })

    it('can select first page', async () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)
      const onPageSelect = vi.fn()

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={2}
          onPageSelect={onPageSelect}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.click(thumbnails[0])

      expect(onPageSelect).toHaveBeenCalledWith(0)
    })
  })

  describe('Multiple Documents', () => {
    it('shows all document headers', () => {
      const { documents, pages } = createTestScenario(3, 2)
      documents[0].name = 'first.pdf'
      documents[1].name = 'second.pdf'
      documents[2].name = 'third.pdf'

      renderWithProviders(
        <Sidebar
          documents={documents}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      expect(screen.getByText('first.pdf')).toBeInTheDocument()
      expect(screen.getByText('second.pdf')).toBeInTheDocument()
      expect(screen.getByText('third.pdf')).toBeInTheDocument()
    })

    it('renders thumbnails for all documents', () => {
      const { documents, pages } = createTestScenario(2, 3) // 2 docs x 3 pages = 6 total

      const { container } = renderWithProviders(
        <Sidebar
          documents={documents}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      expect(thumbnails).toHaveLength(6)
    })

    it('resets page numbers for each document', () => {
      const { documents, pages } = createTestScenario(2, 2)

      renderWithProviders(
        <Sidebar
          documents={documents}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      // Should have two "1"s and two "2"s (one for each document)
      const pageNumbers = screen.getAllByText('1')
      expect(pageNumbers).toHaveLength(2)
    })

    it('handles selection across documents', async () => {
      const { documents, pages } = createTestScenario(2, 2) // Pages: [0, 1, 2, 3]
      const onPageSelect = vi.fn()

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={documents}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={onPageSelect}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.click(thumbnails[3]) // Click last page (from second doc)

      expect(onPageSelect).toHaveBeenCalledWith(3)
    })
  })

  describe('Context Menu', () => {
    it('shows context menu on right-click', async () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.pointer({ keys: '[MouseRight]', target: thumbnails[1] })

      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('calls onDuplicatePage when Duplicate clicked', async () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)
      const onDuplicatePage = vi.fn()

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          onReorder={vi.fn()}
          onDeletePage={vi.fn()}
          onDuplicatePage={onDuplicatePage}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.pointer({ keys: '[MouseRight]', target: thumbnails[1] })
      await user.click(screen.getByText('Duplicate'))

      expect(onDuplicatePage).toHaveBeenCalledWith(1)
    })

    it('calls onDeletePage when Delete clicked', async () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)
      const onDeletePage = vi.fn()

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          onReorder={vi.fn()}
          onDeletePage={onDeletePage}
          onDuplicatePage={vi.fn()}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.pointer({ keys: '[MouseRight]', target: thumbnails[2] })
      await user.click(screen.getByText('Delete'))

      expect(onDeletePage).toHaveBeenCalledWith(2)
    })

    it('closes context menu when clicking elsewhere', async () => {
      const doc = createDocument({ pageCount: 3 })
      const pages = createPages(doc.id, 3)

      const { container, user } = renderWithProviders(
        <Sidebar
          documents={[doc]}
          pages={pages}
          selectedPageIndex={0}
          onPageSelect={vi.fn()}
          {...defaultProps}
        />
      )

      const thumbnails = container.querySelectorAll('.page-thumbnail')
      await user.pointer({ keys: '[MouseRight]', target: thumbnails[1] })
      expect(screen.getByText('Duplicate')).toBeInTheDocument()

      // Click on sidebar to close
      await user.click(container.querySelector('.sidebar')!)
      expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()
    })
  })
})
