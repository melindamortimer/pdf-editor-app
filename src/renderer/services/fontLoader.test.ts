import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'Helvetica-Bold',
    HelveticaOblique: 'Helvetica-Oblique',
    HelveticaBoldOblique: 'Helvetica-BoldOblique',
    TimesRoman: 'Times-Roman',
    TimesRomanBold: 'Times-Bold',
    TimesRomanItalic: 'Times-Italic',
    TimesRomanBoldItalic: 'Times-BoldItalic',
    Courier: 'Courier',
    CourierBold: 'Courier-Bold',
    CourierOblique: 'Courier-Oblique',
    CourierBoldOblique: 'Courier-BoldOblique'
  }
}))

// Mock electronAPI
const mockLoadSystemFont = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    loadSystemFont: mockLoadSystemFont
  }
})

import { getEmbeddedFont, clearAllFontCaches } from './fontLoader'

describe('fontLoader', () => {
  const mockPdfDoc = {
    embedFont: vi.fn()
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    clearAllFontCaches()
    mockPdfDoc.embedFont.mockResolvedValue({ name: 'embedded-font' })
  })

  it('falls back to Helvetica when Arial system font not found', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica')
  })

  it('falls back to Times-Roman when Times New Roman not found', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Times New Roman')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Times-Roman')
  })

  it('falls back to Courier when Courier New not found', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Courier New')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Courier')
  })

  it('uses bold variant when bold is true', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial', true, false)

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-Bold')
  })

  it('uses italic variant when italic is true', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial', false, true)

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-Oblique')
  })

  it('uses bold-italic variant when both are true', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial', true, true)

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-BoldOblique')
  })

  it('caches fonts for same document', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial')
    await getEmbeddedFont(mockPdfDoc, 'Arial')

    // Should only call embedFont once due to caching
    expect(mockPdfDoc.embedFont).toHaveBeenCalledTimes(1)
  })

  it('embeds system font when found', async () => {
    const mockFontBytes = new Uint8Array([1, 2, 3])
    mockLoadSystemFont.mockResolvedValue(mockFontBytes)

    await getEmbeddedFont(mockPdfDoc, 'Arial')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith(mockFontBytes)
  })

  it('falls back to standard font when system font loading throws', async () => {
    mockLoadSystemFont.mockRejectedValue(new Error('Font load error'))

    await getEmbeddedFont(mockPdfDoc, 'Arial')

    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica')
  })

  it('caches different font variants separately', async () => {
    mockLoadSystemFont.mockResolvedValue(null)

    await getEmbeddedFont(mockPdfDoc, 'Arial', false, false)
    await getEmbeddedFont(mockPdfDoc, 'Arial', true, false)
    await getEmbeddedFont(mockPdfDoc, 'Arial', false, true)

    expect(mockPdfDoc.embedFont).toHaveBeenCalledTimes(3)
    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica')
    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-Bold')
    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica-Oblique')
  })
})
