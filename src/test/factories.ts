/**
 * Test Factories - Create mock data for tests
 *
 * Usage:
 *   const doc = createDocument()
 *   const doc = createDocument({ name: 'custom.pdf', pageCount: 10 })
 *   const pages = createPages('doc-1', 5)
 */

import type { PdfDocument, PdfPage } from '../renderer/types/pdf'

let idCounter = 0

/**
 * Generate a unique test ID
 */
export function generateId(prefix = 'test'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Reset ID counter (call in beforeEach if needed)
 */
export function resetIdCounter(): void {
  idCounter = 0
}

/**
 * Create a mock PDF document
 */
export function createDocument(overrides: Partial<PdfDocument> = {}): PdfDocument {
  const id = overrides.id || generateId('doc')
  return {
    id,
    name: 'test-document.pdf',
    path: `/path/to/${id}.pdf`,
    pageCount: 3,
    ...overrides
  }
}

/**
 * Create multiple mock documents
 */
export function createDocuments(count: number, overrides: Partial<PdfDocument> = {}): PdfDocument[] {
  return Array.from({ length: count }, (_, i) =>
    createDocument({
      name: `document-${i + 1}.pdf`,
      ...overrides
    })
  )
}

/**
 * Create mock pages for a document
 */
export function createPages(documentId: string, count: number): PdfPage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId('page'),
    documentId,
    pageIndex: i,
    originalPageIndex: i
  }))
}

/**
 * Create pages for multiple documents
 */
export function createPagesForDocuments(documents: PdfDocument[]): PdfPage[] {
  return documents.flatMap(doc => createPages(doc.id, doc.pageCount))
}

/**
 * Create a complete test scenario with documents and pages
 */
export function createTestScenario(docCount: number, pagesPerDoc: number): {
  documents: PdfDocument[]
  pages: PdfPage[]
} {
  const documents = Array.from({ length: docCount }, (_, i) =>
    createDocument({
      name: `doc-${i + 1}.pdf`,
      pageCount: pagesPerDoc
    })
  )
  const pages = createPagesForDocuments(documents)
  return { documents, pages }
}

/**
 * Simulate page reorder operation
 */
export function reorderPages(pages: PdfPage[], fromIndex: number, toIndex: number): PdfPage[] {
  const newPages = [...pages]
  const [moved] = newPages.splice(fromIndex, 1)
  newPages.splice(toIndex, 0, moved)
  return newPages
}

/**
 * Simulate page delete operation
 */
export function deletePage(pages: PdfPage[], index: number): PdfPage[] {
  return pages.filter((_, i) => i !== index)
}

/**
 * Simulate page duplicate operation
 */
export function duplicatePage(pages: PdfPage[], index: number): PdfPage[] {
  const newPages = [...pages]
  const duplicate = { ...pages[index], id: generateId('page') }
  newPages.splice(index + 1, 0, duplicate)
  return newPages
}
