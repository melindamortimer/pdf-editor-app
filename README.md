# PDF Viewer & Editor App

A desktop application for viewing PDFs, reordering pages, merging multiple documents, and adding annotations.

## Tech Stack

- **Electron** - Cross-platform desktop wrapper
- **React + TypeScript** - UI framework with type safety
- **PDF.js** - Mozilla's PDF renderer for viewing
- **pdf-lib** - Pure JS library for PDF manipulation (reorder, delete, duplicate, merge, add annotations)
- **@dnd-kit** - Drag-and-drop toolkit for page reordering
- **Vite** - Build tooling for fast development
- **Vitest** - Unit testing framework
- **electron-builder** - Packaging for distribution

## Features

### Core Capabilities
1. Open and view single or multiple PDF files
2. Reorder, delete, and duplicate pages via drag-and-drop thumbnails
3. Merge pages from multiple PDFs into a single document
4. Add annotations (highlight, underline, strikethrough, boxes, text)
5. Move/edit annotations freely until saved
6. Save changes to original file or Save As new file

### Page Management
- **Reorder:** Drag thumbnails to new positions
- **Delete:** Right-click → Delete, or select + Delete key
- **Duplicate:** Right-click → Duplicate (inserts copy after current)
- **Merge:** Open multiple PDFs, drag pages between them, Save As combined PDF

### Annotation Tools

| Tool | Description |
|------|-------------|
| **Highlight** | Semi-transparent rectangle. Colors: yellow, green, pink, blue |
| **Underline** | Horizontal line under text |
| **Strikethrough** | Horizontal line through text |
| **Box** | Outline rectangle (no fill). Customizable color + thickness (thin/medium/thick) |
| **Text** | Placed text with font selection, size, and color |

All annotations remain movable and editable until the document is saved.

### Text Fonts (7 formal options)
1. Arial - sans-serif, clean
2. Times New Roman - serif, traditional
3. Helvetica - sans-serif, professional
4. Georgia - serif, readable
5. Calibri - sans-serif, modern
6. Garamond - serif, elegant
7. Courier New - monospace, for forms/code

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar                                                │
│  [Open] [Save] [SaveAs] | [Highlight▼] [Underline]     │
│  [Strikethrough] [Box] [Text] | [Zoom: 100%▼] [+] [-]  │
├────────────┬────────────────────────────────────────────┤
│  Sidebar   │  Main Viewer                              │
│  (~150px)  │                                            │
│  ┌──────┐  │  ┌────────────────────────────────────┐   │
│  │ P1   │  │  │                                    │   │
│  └──────┘  │  │                                    │   │
│  ┌──────┐  │  │      Currently Selected Page       │   │
│  │ P2   │  │  │         (Full Size View)           │   │
│  └──────┘  │  │                                    │   │
│  ┌──────┐  │  │                                    │   │
│  │ P3   │  │  └────────────────────────────────────┘   │
│  └──────┘  │                                            │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

### Sidebar
- Scrollable list of page thumbnails
- Drag-and-drop to reorder (even across multiple open documents)
- Click to select (shows in main viewer)
- Right-click context menu: Delete, Duplicate
- Selected page has visible border highlight
- When multiple PDFs open, shows document labels/headers

### Multi-PDF Sidebar Example
```
┌──────────┐
│ doc1.pdf │  ← Document label
├──────────┤
│  P1      │
│  P2      │
├──────────┤
│ doc2.pdf │  ← Document label
├──────────┤
│  P1      │
│  P2      │
│  P3      │
└──────────┘
```

### Main Viewer
- Renders selected page at current zoom level
- Scrollable if page exceeds viewport
- Annotation layer overlays the PDF canvas
- Ctrl + mouse wheel to zoom

## Zoom Controls

- Toolbar: [−] [100%▼] [+]
- Dropdown options: 50%, 75%, 100%, 125%, 150%, 200%, Fit Width, Fit Page
- Mouse wheel + Ctrl: zoom in/out
- Fit Width: scales page to fill viewer width
- Fit Page: scales entire page to fit in viewport

## Annotation Workflow

1. Select tool from toolbar (cursor changes)
2. Draw/place annotation on page
3. Click existing annotation to select (shows resize handles)
4. Drag to move, drag handles to resize
5. Press Delete to remove selected annotation
6. Properties panel in toolbar when annotation selected (change color, font, etc.)
7. Annotations are baked into PDF only when saved

## File Operations

### Opening
- File → Open or Ctrl+O
- Native file dialog with `.pdf` filter
- Multi-select supported to open multiple PDFs at once

### Saving
- **Save (Ctrl+S):** Overwrites current file
  - First save shows warning: "This will overwrite the original file. Continue?"
  - Option: "Don't ask again this session"
  - Disabled when multiple documents are open (must use Save As)
- **Save As (Ctrl+Shift+S):** Choose new location/name
  - Creates single PDF with all pages in current order
  - Use this for merged documents

### Save Process
1. Uses pdf-lib to create new PDF document
2. Copies pages in current order (respecting deletions/duplications/reordering)
3. Bakes annotations into each page as PDF drawing operations
4. Writes to file

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open PDF(s) |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete / Backspace | Delete selected page or annotation |
| Escape | Deselect tool / cancel current action |
| ↑/↓ | Navigate pages |
| Ctrl+↑ / Home | Go to first page |
| Ctrl+↓ / End | Go to last page |
| Ctrl+D | Duplicate selected page |
| Ctrl+=/+ | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom to 100% |
| Ctrl+Mouse Wheel | Zoom in/out |

## Undo/Redo

Tracks:
- Page operations (reorder, delete, duplicate)
- Annotation changes (add, move, resize, delete, property changes)

Standard undo stack behavior.

## Window Behavior

- Remembers window size/position between sessions
- Title bar shows filename (with * if unsaved changes)
- Close with unsaved changes prompts: "Save changes before closing?"

## Project Structure

```
src/
  main/              # Electron main process
    main.ts          # App entry, window management
    ipc.ts           # IPC handlers for file operations
  renderer/          # React app
    components/
      Toolbar.tsx
      Sidebar.tsx
      PageThumbnail.tsx
      MainViewer.tsx
      AnnotationLayer.tsx
      annotations/   # Individual annotation components
    hooks/
      usePdfDocument.ts
      useAnnotations.ts
      useUndoRedo.ts
    services/
      pdfRenderer.ts    # PDF.js wrapper
      pdfManipulator.ts # pdf-lib operations
    store/           # State management
    types/           # TypeScript interfaces
  preload/           # Electron preload scripts
```

## Not In Scope

- Multi-document tabs (all docs show in single sidebar)
- PDF text editing (changing original text content)
- Form filling
- Digital signatures
- Printing (use system PDF viewer)

## Current Implementation Status

### Completed
- [x] Electron + React + TypeScript project setup
- [x] PDF viewing with PDF.js
- [x] Page thumbnails in sidebar
- [x] Page selection and navigation
- [x] Zoom controls (+/- buttons)
- [x] Drag-and-drop page reordering
- [x] Right-click context menu (Delete, Duplicate)
- [x] Click-and-drag panning in main viewer
- [x] Multi-document support (open multiple PDFs)
- [x] Toolbar component with file operation buttons
- [x] Zoom dropdown with preset levels (50%-300%)
- [x] Keyboard shortcuts (Ctrl+O, Ctrl+D, Arrow keys, Delete, etc.)
- [x] Save/Save As with pdf-lib (page reorder, delete, duplicate, merge)
- [x] Unsaved changes indicator (asterisk on Save button)
- [x] Overwrite warning on first Save

### In Progress
- [ ] Annotation tools

### Planned
- [ ] Undo/Redo

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Package for distribution
npm run package
```

## License

MIT
