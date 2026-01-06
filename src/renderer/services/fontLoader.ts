import type { PDFFont, PDFDocument } from 'pdf-lib'
import { StandardFonts } from 'pdf-lib'
import type { TextFont } from '../types/annotations'

// Cache embedded fonts per PDF document
const fontCache = new Map<PDFDocument, Map<string, PDFFont>>()

// Fallback mapping to standard PDF fonts
const FALLBACK_FONTS: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.Helvetica,
  'Verdana': StandardFonts.Helvetica,
  'Trebuchet MS': StandardFonts.Helvetica,
  'Comic Sans MS': StandardFonts.Helvetica,
  'Times New Roman': StandardFonts.TimesRoman,
  'Georgia': StandardFonts.TimesRoman,
  'Palatino': StandardFonts.TimesRoman,
  'Courier New': StandardFonts.Courier
}

const FALLBACK_FONTS_BOLD: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.HelveticaBold,
  'Verdana': StandardFonts.HelveticaBold,
  'Trebuchet MS': StandardFonts.HelveticaBold,
  'Comic Sans MS': StandardFonts.HelveticaBold,
  'Times New Roman': StandardFonts.TimesRomanBold,
  'Georgia': StandardFonts.TimesRomanBold,
  'Palatino': StandardFonts.TimesRomanBold,
  'Courier New': StandardFonts.CourierBold
}

const FALLBACK_FONTS_ITALIC: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.HelveticaOblique,
  'Verdana': StandardFonts.HelveticaOblique,
  'Trebuchet MS': StandardFonts.HelveticaOblique,
  'Comic Sans MS': StandardFonts.HelveticaOblique,
  'Times New Roman': StandardFonts.TimesRomanItalic,
  'Georgia': StandardFonts.TimesRomanItalic,
  'Palatino': StandardFonts.TimesRomanItalic,
  'Courier New': StandardFonts.CourierOblique
}

const FALLBACK_FONTS_BOLD_ITALIC: Record<TextFont, StandardFonts> = {
  'Arial': StandardFonts.HelveticaBoldOblique,
  'Verdana': StandardFonts.HelveticaBoldOblique,
  'Trebuchet MS': StandardFonts.HelveticaBoldOblique,
  'Comic Sans MS': StandardFonts.HelveticaBoldOblique,
  'Times New Roman': StandardFonts.TimesRomanBoldItalic,
  'Georgia': StandardFonts.TimesRomanBoldItalic,
  'Palatino': StandardFonts.TimesRomanBoldItalic,
  'Courier New': StandardFonts.CourierBoldOblique
}

/**
 * Get the font variant name for loading
 */
function getFontVariantName(font: TextFont, bold: boolean, italic: boolean): string {
  if (bold && italic) return `${font}-BoldItalic`
  if (bold) return `${font}-Bold`
  if (italic) return `${font}-Italic`
  return font
}

/**
 * Load and embed a font into the PDF document
 * Falls back to standard PDF fonts if system font not found
 */
export async function getEmbeddedFont(
  pdfDoc: PDFDocument,
  font: TextFont,
  bold: boolean = false,
  italic: boolean = false
): Promise<PDFFont> {
  // Get or create cache for this document
  let docCache = fontCache.get(pdfDoc)
  if (!docCache) {
    docCache = new Map()
    fontCache.set(pdfDoc, docCache)
  }

  const variantName = getFontVariantName(font, bold, italic)

  // Check cache first
  const cached = docCache.get(variantName)
  if (cached) return cached

  // Try to load system font
  try {
    const fontBytes = await window.electronAPI.loadSystemFont(variantName)
    if (fontBytes) {
      const embeddedFont = await pdfDoc.embedFont(fontBytes)
      docCache.set(variantName, embeddedFont)
      return embeddedFont
    }
  } catch {
    // Silent fallback
  }

  // Fall back to standard PDF font
  let fallbackFont: StandardFonts
  if (bold && italic) {
    fallbackFont = FALLBACK_FONTS_BOLD_ITALIC[font]
  } else if (bold) {
    fallbackFont = FALLBACK_FONTS_BOLD[font]
  } else if (italic) {
    fallbackFont = FALLBACK_FONTS_ITALIC[font]
  } else {
    fallbackFont = FALLBACK_FONTS[font]
  }

  const standardFont = await pdfDoc.embedFont(fallbackFont)
  docCache.set(variantName, standardFont)
  return standardFont
}

/**
 * Clear font cache for a document (call when done with document)
 */
export function clearFontCache(pdfDoc: PDFDocument): void {
  fontCache.delete(pdfDoc)
}

/**
 * Clear all font caches
 */
export function clearAllFontCaches(): void {
  fontCache.clear()
}
