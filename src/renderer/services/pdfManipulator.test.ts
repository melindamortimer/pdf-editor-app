import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  loadPdfForManipulation,
  getCachedPdf,
  clearPdfFromCache,
  clearAllPdfCache,
  createPdfFromPages
} from './pdfManipulator'
import type { PdfPage } from '../types/pdf'

// Mock the electron API for save operations
vi.stubGlobal('window', {
  electronAPI: {
    saveFileDialog: vi.fn(),
    saveFile: vi.fn()
  }
})

describe('pdfManipulator', () => {
  beforeEach(() => {
    clearAllPdfCache()
  })

  describe('loadPdfForManipulation', () => {
    it('loads a PDF and caches it', async () => {
      // Create a real minimal PDF
      const pdfDoc = await PDFDocument.create()
      pdfDoc.addPage()
      const pdfBytes = await pdfDoc.save()
      const arrayBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      )

      await loadPdfForManipulation('doc-1', arrayBuffer)

      expect(getCachedPdf('doc-1')).toBeDefined()
    })

    it('can load same data into multiple documents (separate buffers)', async () => {
      // This tests the pattern that caused the bug:
      // Using the same source data to create multiple ArrayBuffers
      const pdfDoc = await PDFDocument.create()
      pdfDoc.addPage()
      const pdfBytes = await pdfDoc.save()

      // Simulate what App.tsx does: create separate buffers from same source
      const buffer1 = new Uint8Array(pdfBytes).buffer
      const buffer2 = new Uint8Array(pdfBytes).buffer

      // Both should load successfully
      await loadPdfForManipulation('doc-1', buffer1)
      await loadPdfForManipulation('doc-2', buffer2)

      expect(getCachedPdf('doc-1')).toBeDefined()
      expect(getCachedPdf('doc-2')).toBeDefined()
    })
  })

  describe('cache operations', () => {
    it('clearPdfFromCache removes specific document', async () => {
      const pdfDoc = await PDFDocument.create()
      pdfDoc.addPage()
      const pdfBytes = await pdfDoc.save()

      await loadPdfForManipulation('doc-1', pdfBytes.buffer)
      await loadPdfForManipulation('doc-2', new Uint8Array(pdfBytes).buffer)

      clearPdfFromCache('doc-1')

      expect(getCachedPdf('doc-1')).toBeUndefined()
      expect(getCachedPdf('doc-2')).toBeDefined()
    })

    it('clearAllPdfCache removes all documents', async () => {
      const pdfDoc = await PDFDocument.create()
      pdfDoc.addPage()
      const pdfBytes = await pdfDoc.save()

      await loadPdfForManipulation('doc-1', pdfBytes.buffer)
      await loadPdfForManipulation('doc-2', new Uint8Array(pdfBytes).buffer)

      clearAllPdfCache()

      expect(getCachedPdf('doc-1')).toBeUndefined()
      expect(getCachedPdf('doc-2')).toBeUndefined()
    })
  })

  describe('createPdfFromPages', () => {
    it('creates PDF with pages in specified order', async () => {
      // Create a 2-page PDF
      const sourcePdf = await PDFDocument.create()
      sourcePdf.addPage([200, 200]) // Page 0 - small
      sourcePdf.addPage([400, 400]) // Page 1 - larger
      const sourceBytes = await sourcePdf.save()

      await loadPdfForManipulation('source', sourceBytes.buffer)

      // Request pages in reverse order
      const pages: PdfPage[] = [
        { id: 'p1', documentId: 'source', pageIndex: 1, originalPageIndex: 1 },
        { id: 'p0', documentId: 'source', pageIndex: 0, originalPageIndex: 0 }
      ]

      const resultBytes = await createPdfFromPages(pages)

      // Load result and verify
      const resultPdf = await PDFDocument.load(resultBytes)
      expect(resultPdf.getPageCount()).toBe(2)

      // First page should now be the larger one (was index 1)
      const firstPage = resultPdf.getPage(0)
      expect(firstPage.getWidth()).toBe(400)
    })

    it('handles pages from multiple source documents', async () => {
      // Create two source PDFs
      const pdf1 = await PDFDocument.create()
      pdf1.addPage([100, 100])
      const bytes1 = await pdf1.save()

      const pdf2 = await PDFDocument.create()
      pdf2.addPage([200, 200])
      const bytes2 = await pdf2.save()

      await loadPdfForManipulation('doc1', bytes1.buffer)
      await loadPdfForManipulation('doc2', new Uint8Array(bytes2).buffer)

      const pages: PdfPage[] = [
        { id: 'p1', documentId: 'doc1', pageIndex: 0, originalPageIndex: 0 },
        { id: 'p2', documentId: 'doc2', pageIndex: 0, originalPageIndex: 0 }
      ]

      const resultBytes = await createPdfFromPages(pages)
      const resultPdf = await PDFDocument.load(resultBytes)

      expect(resultPdf.getPageCount()).toBe(2)
      expect(resultPdf.getPage(0).getWidth()).toBe(100)
      expect(resultPdf.getPage(1).getWidth()).toBe(200)
    })

    it('handles duplicate pages', async () => {
      const sourcePdf = await PDFDocument.create()
      sourcePdf.addPage([300, 300])
      const sourceBytes = await sourcePdf.save()

      await loadPdfForManipulation('source', sourceBytes.buffer)

      // Duplicate the same page
      const pages: PdfPage[] = [
        { id: 'p1', documentId: 'source', pageIndex: 0, originalPageIndex: 0 },
        { id: 'p2', documentId: 'source', pageIndex: 0, originalPageIndex: 0 },
        { id: 'p3', documentId: 'source', pageIndex: 0, originalPageIndex: 0 }
      ]

      const resultBytes = await createPdfFromPages(pages)
      const resultPdf = await PDFDocument.load(resultBytes)

      expect(resultPdf.getPageCount()).toBe(3)
    })

    it('skips pages from unknown documents', async () => {
      const sourcePdf = await PDFDocument.create()
      sourcePdf.addPage()
      const sourceBytes = await sourcePdf.save()

      await loadPdfForManipulation('known', sourceBytes.buffer)

      const pages: PdfPage[] = [
        { id: 'p1', documentId: 'known', pageIndex: 0, originalPageIndex: 0 },
        { id: 'p2', documentId: 'unknown', pageIndex: 0, originalPageIndex: 0 }
      ]

      const resultBytes = await createPdfFromPages(pages)
      const resultPdf = await PDFDocument.load(resultBytes)

      // Only the known document's page should be included
      expect(resultPdf.getPageCount()).toBe(1)
    })
  })
})
