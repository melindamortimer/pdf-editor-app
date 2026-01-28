# Pen Tool Design

## Summary

Add a freehand pen tool for drawing on PDFs, with numeric width options (1px, 2px, 4px, 8px) and a full color picker. Also upgrade all existing color pickers to full color pickers.

## New Annotation Type

```typescript
interface PenAnnotation {
  id: string
  pageId: string
  type: 'pen'
  // Array of points as [x, y] normalized coordinates (0-1)
  points: [number, number][]
  color: string      // hex color
  width: number      // pixel width (1, 2, 4, 8)
  // Bounding box for hit testing (computed from points)
  x: number
  y: number
  width: number
  height: number
}
```

## Changes

### types/annotations.ts
- Add `PenAnnotation` type
- Add `'pen'` to `AnnotationTool` union
- Add `PenWidth` type: `1 | 2 | 4 | 8`
- Remove `HighlightColor` preset type - all colors become hex strings

### Toolbar.tsx
- Add pen tool button
- Add pen width selector (dropdown or button group: 1px, 2px, 4px, 8px)
- Add pen color picker (full color picker)
- Replace all preset color dropdowns with full color picker component

### AnnotationLayer.tsx
- Handle pen tool mouse events:
  - mousedown: start collecting points
  - mousemove: add points to path, render preview
  - mouseup: create annotation with collected points
- Render pen annotations as SVG paths or canvas strokes

### pdfManipulator.ts
- Add pen annotation rendering when saving PDF (draw paths)

### Color Picker Component
- Create reusable `ColorPicker` component using `<input type="color">`
- Show color swatch button that opens native color picker

## UI Layout

Toolbar order: Select | Highlight | Underline | Strikethrough | Box | Pen | Text | Eraser

Pen options (when pen selected): [Color picker] [Width: 1px ▼]
