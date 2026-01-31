import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdfjs-dist
const mockGetPage = vi.fn()
const mockGetDocument = vi.fn()
const mockDestroy = vi.fn()

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      getPage: mockGetPage,
      destroy: mockDestroy
    })
  })
}))

// Mock jsQR
const mockJsQR = vi.fn()
vi.mock('jsqr', () => ({
  default: (data: Uint8ClampedArray, width: number, height: number) => mockJsQR(data, width, height)
}))

// Mock canvas
const mockGetContext = vi.fn()
const mockGetImageData = vi.fn()

vi.stubGlobal('document', {
  createElement: vi.fn(() => ({
    width: 0,
    height: 0,
    getContext: mockGetContext
  }))
})

import {
  loadPdfDocument,
  getPageLinks,
  unloadDocument,
  clearAllDocuments
} from './pdfRenderer'

describe('pdfRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllDocuments()

    // Default mock implementations
    mockGetContext.mockReturnValue({
      getImageData: mockGetImageData
    })
    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray(100),
      width: 100,
      height: 100
    })
  })

  describe('getPageLinks', () => {
    const createMockPage = (options: {
      annotations?: any[]
      textItems?: any[]
      width?: number
      height?: number
    } = {}) => {
      const { annotations = [], textItems = [], width = 612, height = 792 } = options
      return {
        getViewport: vi.fn(() => ({
          width,
          height,
          convertToViewportPoint: (x: number, y: number) => [x, height - y]
        })),
        getAnnotations: vi.fn().mockResolvedValue(annotations),
        getTextContent: vi.fn().mockResolvedValue({ items: textItems }),
        render: vi.fn(() => ({ promise: Promise.resolve() }))
      }
    }

    it('detects PDF link annotations', async () => {
      const mockPage = createMockPage({
        annotations: [
          {
            subtype: 'Link',
            url: 'https://example.com',
            rect: [72, 700, 200, 720]
          }
        ]
      })
      mockGetPage.mockResolvedValue(mockPage)
      mockJsQR.mockReturnValue(null)

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(1)
      expect(links[0].url).toBe('https://example.com')
    })

    it('detects URLs in text content', async () => {
      const mockPage = createMockPage({
        textItems: [
          {
            str: 'Visit www.example.com for more info',
            transform: [12, 0, 0, 12, 72, 700],
            width: 200
          }
        ]
      })
      mockGetPage.mockResolvedValue(mockPage)
      mockJsQR.mockReturnValue(null)

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(1)
      expect(links[0].url).toBe('https://www.example.com')
    })

    it('skips email addresses in text', async () => {
      const mockPage = createMockPage({
        textItems: [
          {
            str: 'Contact us at test@example.com',
            transform: [12, 0, 0, 12, 72, 700],
            width: 200
          }
        ]
      })
      mockGetPage.mockResolvedValue(mockPage)
      mockJsQR.mockReturnValue(null)

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(0)
    })

    it('deduplicates URLs found in both annotations and text', async () => {
      const mockPage = createMockPage({
        annotations: [
          {
            subtype: 'Link',
            url: 'https://example.com',
            rect: [72, 700, 200, 720]
          }
        ],
        textItems: [
          {
            str: 'https://example.com',
            transform: [12, 0, 0, 12, 72, 700],
            width: 150
          }
        ]
      })
      mockGetPage.mockResolvedValue(mockPage)
      mockJsQR.mockReturnValue(null)

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(1)
    })

    it('normalizes URLs for deduplication (http vs https)', async () => {
      const mockPage = createMockPage({
        annotations: [
          {
            subtype: 'Link',
            url: 'http://example.com',
            rect: [72, 700, 200, 720]
          }
        ],
        textItems: [
          {
            str: 'https://example.com',
            transform: [12, 0, 0, 12, 72, 700],
            width: 150
          }
        ]
      })
      mockGetPage.mockResolvedValue(mockPage)
      mockJsQR.mockReturnValue(null)

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(1)
    })
  })

  describe('QR code detection', () => {
    const createMockPage = () => ({
      getViewport: vi.fn(() => ({
        width: 612,
        height: 792,
        convertToViewportPoint: (x: number, y: number) => [x, 792 - y]
      })),
      getAnnotations: vi.fn().mockResolvedValue([]),
      getTextContent: vi.fn().mockResolvedValue({ items: [] }),
      render: vi.fn(() => ({ promise: Promise.resolve() }))
    })

    it('detects QR codes containing URLs', async () => {
      const mockPage = createMockPage()
      mockGetPage.mockResolvedValue(mockPage)

      mockJsQR.mockReturnValue({
        data: 'https://qr-example.com',
        location: {
          topLeftCorner: { x: 100, y: 100 },
          topRightCorner: { x: 200, y: 100 },
          bottomLeftCorner: { x: 100, y: 200 },
          bottomRightCorner: { x: 200, y: 200 }
        }
      })

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(1)
      expect(links[0].url).toBe('https://qr-example.com')
    })

    it('ignores QR codes without URLs', async () => {
      const mockPage = createMockPage()
      mockGetPage.mockResolvedValue(mockPage)

      mockJsQR.mockReturnValue({
        data: 'Just some text, not a URL',
        location: {
          topLeftCorner: { x: 100, y: 100 },
          topRightCorner: { x: 200, y: 100 },
          bottomLeftCorner: { x: 100, y: 200 },
          bottomRightCorner: { x: 200, y: 200 }
        }
      })

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(0)
    })

    it('handles pages with no QR codes', async () => {
      const mockPage = createMockPage()
      mockGetPage.mockResolvedValue(mockPage)
      mockJsQR.mockReturnValue(null)

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(0)
    })

    it('deduplicates QR code URLs with existing links', async () => {
      const mockPage = {
        getViewport: vi.fn(() => ({
          width: 612,
          height: 792,
          convertToViewportPoint: (x: number, y: number) => [x, 792 - y]
        })),
        getAnnotations: vi.fn().mockResolvedValue([
          {
            subtype: 'Link',
            url: 'https://example.com',
            rect: [72, 700, 200, 720]
          }
        ]),
        getTextContent: vi.fn().mockResolvedValue({ items: [] }),
        render: vi.fn(() => ({ promise: Promise.resolve() }))
      }
      mockGetPage.mockResolvedValue(mockPage)

      mockJsQR.mockReturnValue({
        data: 'https://example.com',
        location: {
          topLeftCorner: { x: 100, y: 100 },
          topRightCorner: { x: 200, y: 100 },
          bottomLeftCorner: { x: 100, y: 200 },
          bottomRightCorner: { x: 200, y: 200 }
        }
      })

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      // Should only have 1 link (deduplicated)
      expect(links).toHaveLength(1)
    })

    it('calculates correct QR code position', async () => {
      const mockPage = createMockPage()
      mockGetPage.mockResolvedValue(mockPage)

      mockJsQR.mockReturnValue({
        data: 'https://example.com',
        location: {
          topLeftCorner: { x: 150, y: 150 },
          topRightCorner: { x: 300, y: 150 },
          bottomLeftCorner: { x: 150, y: 300 },
          bottomRightCorner: { x: 300, y: 300 }
        }
      })

      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      const links = await getPageLinks('test-doc', 0, 1.0)

      expect(links).toHaveLength(1)
      // Position should be scaled from scan resolution to target viewport
      expect(links[0].rect.width).toBeGreaterThan(0)
      expect(links[0].rect.height).toBeGreaterThan(0)
    })
  })

  describe('document management', () => {
    it('unloads documents correctly', async () => {
      await loadPdfDocument(new ArrayBuffer(10), 'test-doc')
      unloadDocument('test-doc')

      // Trying to get links for unloaded doc should throw
      await expect(getPageLinks('test-doc', 0)).rejects.toThrow()
    })

    it('clears all documents', async () => {
      await loadPdfDocument(new ArrayBuffer(10), 'doc1')
      await loadPdfDocument(new ArrayBuffer(10), 'doc2')

      clearAllDocuments()

      await expect(getPageLinks('doc1', 0)).rejects.toThrow()
      await expect(getPageLinks('doc2', 0)).rejects.toThrow()
    })
  })
})
