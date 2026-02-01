# Testing Checklist

## Quick Smoke Test (2 mins)

1. Open a PDF
2. Highlight some text
3. Draw a box with fill
4. Draw with pen tool
5. Add text annotation
6. Undo/redo
7. Zoom in, pan with space+drag
8. Save, close, reopen - annotations persist

---

## Full Testing Flow

### File Operations
1. Open a PDF (Ctrl+O)
2. Open a second PDF, check sidebar shows both
3. Switch between documents
4. Close one document
5. Save with annotations (Ctrl+S)
6. Save As to new file (Ctrl+Shift+S)

### Navigation & Zoom
1. Click thumbnails to navigate pages
2. Zoom in/out with Ctrl+scroll
3. Use zoom dropdown presets
4. Hold space and drag to pan
5. Resize window, check zoom adjusts

### Text Annotations
1. Highlight some text, try each colour
2. Underline text, change colour
3. Strikethrough text, change colour

### Box Tool
1. Draw a box
2. Change fill colour and border colour
3. Change thickness
4. Select and move the box
5. Resize the box using handles
6. Draw a box extending outside page bounds

### Pen Tool
1. Draw with pen
2. Change colour and width
3. Select and move the drawing
4. Draw extending outside page bounds

### Text Tool
1. Click to place text
2. Type something
3. Change font, size, colour
4. Move and resize the text box

### Eraser & Selection
1. Use eraser to delete an annotation
2. Select tool - click to select annotations
3. Delete key removes selected annotation
4. Click empty area to deselect

### Undo/Redo
1. Make some annotations
2. Undo several times (Ctrl+Z)
3. Redo (Ctrl+Shift+Z)
4. Discard all annotations button

### Links
1. Hover over a link with select tool (blue outline shows)
2. Ctrl+click to open link in browser
3. Check links don't interfere with other tools

### Save & Reload
1. Save the file
2. Close and reopen
3. Check all annotations are preserved
