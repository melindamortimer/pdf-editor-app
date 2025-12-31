import { describe, it, expect } from 'vitest'
import {
  createDocument,
  createPages,
  createTestScenario,
  reorderPages,
  deletePage,
  duplicatePage
} from '@test/factories'
import type { PdfDocument, PdfPage } from './pdf'

describe('PDF Types', () => {
  describe('PdfDocument', () => {
    it('has required properties', () => {
      const doc = createDocument()

      expect(doc).toHaveProperty('id')
      expect(doc).toHaveProperty('name')
      expect(doc).toHaveProperty('path')
      expect(doc).toHaveProperty('pageCount')
    })

    it('can be customized via factory', () => {
      const doc = createDocument({
        name: 'custom.pdf',
        pageCount: 10
      })

      expect(doc.name).toBe('custom.pdf')
      expect(doc.pageCount).toBe(10)
    })
  })

  describe('PdfPage', () => {
    it('has required properties', () => {
      const pages = createPages('doc-1', 1)
      const page = pages[0]

      expect(page).toHaveProperty('id')
      expect(page).toHaveProperty('documentId')
      expect(page).toHaveProperty('pageIndex')
      expect(page).toHaveProperty('originalPageIndex')
    })

    it('initializes with matching pageIndex and originalPageIndex', () => {
      const pages = createPages('doc-1', 3)

      pages.forEach((page, i) => {
        expect(page.pageIndex).toBe(i)
        expect(page.originalPageIndex).toBe(i)
      })
    })

    it('has unique IDs for each page', () => {
      const pages = createPages('doc-1', 5)
      const ids = pages.map(p => p.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(5)
    })
  })
})

describe('Page Operations', () => {
  describe('reorderPages', () => {
    it('moves page forward', () => {
      const pages = createPages('doc-1', 5)
      const result = reorderPages(pages, 0, 3)

      expect(result[0].originalPageIndex).toBe(1)
      expect(result[1].originalPageIndex).toBe(2)
      expect(result[2].originalPageIndex).toBe(3)
      expect(result[3].originalPageIndex).toBe(0) // Moved from position 0
      expect(result[4].originalPageIndex).toBe(4)
    })

    it('moves page backward', () => {
      const pages = createPages('doc-1', 5)
      const result = reorderPages(pages, 4, 1)

      expect(result[0].originalPageIndex).toBe(0)
      expect(result[1].originalPageIndex).toBe(4) // Moved from position 4
      expect(result[2].originalPageIndex).toBe(1)
      expect(result[3].originalPageIndex).toBe(2)
      expect(result[4].originalPageIndex).toBe(3)
    })

    it('does not modify original array', () => {
      const pages = createPages('doc-1', 3)
      const originalFirst = pages[0]
      reorderPages(pages, 0, 2)

      expect(pages[0]).toBe(originalFirst)
    })

    it('handles moving to same position', () => {
      const pages = createPages('doc-1', 3)
      const result = reorderPages(pages, 1, 1)

      expect(result[0].originalPageIndex).toBe(0)
      expect(result[1].originalPageIndex).toBe(1)
      expect(result[2].originalPageIndex).toBe(2)
    })

    it('preserves page IDs through reorder', () => {
      const pages = createPages('doc-1', 3)
      const originalIds = pages.map(p => p.id)
      const result = reorderPages(pages, 0, 2)

      // Same IDs, different order
      expect(result.map(p => p.id)).toEqual([originalIds[1], originalIds[2], originalIds[0]])
    })
  })

  describe('deletePage', () => {
    it('removes page at specified index', () => {
      const pages = createPages('doc-1', 5)
      const result = deletePage(pages, 2)

      expect(result).toHaveLength(4)
      expect(result.map(p => p.originalPageIndex)).toEqual([0, 1, 3, 4])
    })

    it('removes first page', () => {
      const pages = createPages('doc-1', 3)
      const result = deletePage(pages, 0)

      expect(result).toHaveLength(2)
      expect(result[0].originalPageIndex).toBe(1)
    })

    it('removes last page', () => {
      const pages = createPages('doc-1', 3)
      const result = deletePage(pages, 2)

      expect(result).toHaveLength(2)
      expect(result[1].originalPageIndex).toBe(1)
    })

    it('does not modify original array', () => {
      const pages = createPages('doc-1', 3)
      deletePage(pages, 1)

      expect(pages).toHaveLength(3)
    })
  })

  describe('duplicatePage', () => {
    it('inserts duplicate after original', () => {
      const pages = createPages('doc-1', 3)
      const result = duplicatePage(pages, 1)

      expect(result).toHaveLength(4)
      expect(result[1].originalPageIndex).toBe(1)
      expect(result[2].originalPageIndex).toBe(1) // Duplicate
    })

    it('duplicates first page', () => {
      const pages = createPages('doc-1', 3)
      const result = duplicatePage(pages, 0)

      expect(result).toHaveLength(4)
      expect(result[0].originalPageIndex).toBe(0)
      expect(result[1].originalPageIndex).toBe(0) // Duplicate
    })

    it('duplicates last page', () => {
      const pages = createPages('doc-1', 3)
      const result = duplicatePage(pages, 2)

      expect(result).toHaveLength(4)
      expect(result[2].originalPageIndex).toBe(2)
      expect(result[3].originalPageIndex).toBe(2) // Duplicate
    })

    it('duplicate has same documentId', () => {
      const pages = createPages('my-doc', 3)
      const result = duplicatePage(pages, 1)

      expect(result[2].documentId).toBe('my-doc')
    })

    it('duplicate gets a new unique ID', () => {
      const pages = createPages('doc-1', 3)
      const originalId = pages[1].id
      const result = duplicatePage(pages, 1)

      // Original page keeps its ID
      expect(result[1].id).toBe(originalId)
      // Duplicate has a different ID
      expect(result[2].id).not.toBe(originalId)
    })
  })
})

describe('Multi-Document Scenarios', () => {
  it('creates correct test scenario', () => {
    const { documents, pages } = createTestScenario(2, 3)

    expect(documents).toHaveLength(2)
    expect(pages).toHaveLength(6)
  })

  it('pages reference correct documents', () => {
    const { documents, pages } = createTestScenario(2, 2)

    expect(pages[0].documentId).toBe(documents[0].id)
    expect(pages[1].documentId).toBe(documents[0].id)
    expect(pages[2].documentId).toBe(documents[1].id)
    expect(pages[3].documentId).toBe(documents[1].id)
  })

  it('can interleave pages from different documents', () => {
    const { documents, pages } = createTestScenario(2, 2)

    // Move page from doc2 between doc1 pages
    const result = reorderPages(pages, 2, 1)

    expect(result[0].documentId).toBe(documents[0].id)
    expect(result[1].documentId).toBe(documents[1].id) // Moved
    expect(result[2].documentId).toBe(documents[0].id)
    expect(result[3].documentId).toBe(documents[1].id)
  })

  it('can delete pages from specific document', () => {
    const { documents, pages } = createTestScenario(2, 3)

    // Delete all pages from first document
    let result = pages
    result = deletePage(result, 2) // Delete page 3 of doc1
    result = deletePage(result, 1) // Delete page 2 of doc1
    result = deletePage(result, 0) // Delete page 1 of doc1

    expect(result).toHaveLength(3)
    expect(result.every(p => p.documentId === documents[1].id)).toBe(true)
  })

  it('can duplicate page from one document among another', () => {
    const { documents, pages } = createTestScenario(2, 2)

    // Duplicate first page of doc2
    const result = duplicatePage(pages, 2)

    expect(result).toHaveLength(5)
    expect(result[2].documentId).toBe(documents[1].id)
    expect(result[3].documentId).toBe(documents[1].id) // Duplicate
  })
})
