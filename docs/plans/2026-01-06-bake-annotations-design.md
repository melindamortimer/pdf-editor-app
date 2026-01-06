# Bake Annotations into PDF on Save

## Overview

When saving a PDF, annotations are permanently embedded into the PDF pages. The saved file displays exactly what the user sees in the editor. After saving, the document reloads fresh with annotations as part of the page content (no longer editable as annotations).

## Architecture

### Flow

1. User clicks Save/Save As
2. `createPdfFromPages()` copies pages from source PDFs
3. For each page, `bakeAnnotationsOntoPage()` renders annotations using pdf-lib
4. PDF saved to disk
5. State cleared and saved file reopened fresh

### Files Changed

- `pdfManipulator.ts` - Add annotation baking, accept annotations parameter
- NEW: `fontLoader.ts` - Find and cache system fonts
- `preload.ts` / `main.ts` - Add IPC for loading system fonts
- `App.tsx` - Pass annotations to save functions, reload after save

## Font Loading

### System Font Locations

| Platform | Directories |
|----------|-------------|
| macOS | `/System/Library/Fonts/`, `/Library/Fonts/`, `~/Library/Fonts/` |
| Windows | `C:\Windows\Fonts\` |
| Linux | `/usr/share/fonts/`, `~/.local/share/fonts/` |

### Font File Mapping

| App Font | Search Names |
|----------|--------------|
| Arial | Arial.ttf, arial.ttf |
| Times New Roman | Times New Roman.ttf, times.ttf |
| Verdana | Verdana.ttf |
| Georgia | Georgia.ttf |
| Trebuchet MS | Trebuchet MS.ttf, trebuc.ttf |
| Palatino | Palatino.ttc, pala.ttf |
| Courier New | Courier New.ttf, cour.ttf |
| Comic Sans MS | Comic Sans MS.ttf, comic.ttf |

### Fallback Strategy

If a system font isn't found, silently fall back to standard PDF fonts:
- Arial, Verdana, Trebuchet MS, Comic Sans MS → Helvetica
- Times New Roman, Georgia, Palatino → Times-Roman
- Courier New → Courier

## Annotation Rendering

### Coordinate Conversion

Annotations use normalized coordinates (0-1). Convert to PDF points:

```typescript
const pdfX = annotation.x * pageWidth
const pdfY = pageHeight - (annotation.y * pageHeight) - (annotation.height * pageHeight)
// PDF origin is bottom-left; app uses top-left
```

### Rendering by Type

| Type | Method | Notes |
|------|--------|-------|
| Highlight | `drawRectangle()` | Color with ~0.4 opacity |
| Underline | `drawLine()` | At bottom of bounds, proportional thickness |
| Strikethrough | `drawLine()` | At ~40% height for descenders |
| Box | `drawRectangle()` | Border color/width, optional fill |
| Text | `drawText()` | Embedded font, size, color |

### Text Annotation Details

- Bold/italic: Load variant font files (Arial Bold.ttf, etc.)
- Underline formatting: Draw line at text baseline, same color as text
- Multi-line: Split by newlines, offset each line by fontSize * lineHeight

### Rendering Order

1. Highlights (behind everything)
2. Underlines and strikethroughs
3. Boxes
4. Text annotations (on top)

## Save Function Changes

### Updated Signatures

```typescript
saveAsNewFile(pages: PdfPage[], annotations: Annotation[]): Promise<boolean>
saveToFile(filePath: string, pages: PdfPage[], annotations: Annotation[]): Promise<boolean>
createPdfFromPages(pages: PdfPage[], annotations: Annotation[]): Promise<Uint8Array>
```

### Post-Save Reload

After successful save:
1. Clear all state (documents, pages, annotations, history)
2. Reload the saved file as if opening fresh
3. User sees document with annotations baked into pages

This ensures no confusion about annotation editability and resets undo history appropriately.

## IPC API Addition

```typescript
// preload.ts
loadSystemFont(fontName: string): Promise<Uint8Array | null>
```

Main process searches font directories, returns font bytes or null.
