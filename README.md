# DocuMint PDF Editor

A fresh, effortless desktop application for viewing PDFs, reordering pages, merging multiple documents, and adding annotations.

## Installation

Download the latest release for your platform from the [Releases page](../../releases).

---

### macOS

**Download:**
- `DocuMint PDF Editor-x.x.x-arm64.dmg` (Apple Silicon M1/M2/M3/M4) 
- `DocuMint PDF Editor-x.x.x-x64.dmg` (Intel)

**Steps:**
1. Open the downloaded `.dmg` file
2. Drag **DocuMint PDF Editor** to the **Applications** folder
3. Eject the DMG

**First launch (important!):**

The app is not signed with an Apple Developer certificate, so macOS will block it. To fix this:

1. Open **Terminal** (search "Terminal" in Spotlight)
2. Paste this command and press Enter:
   ```bash
   xattr -cr "/Applications/DocuMint PDF Editor.app"
   ```
3. Now open the app from Applications normally


---

### Windows

**Download:** `DocuMint PDF Editor Setup x.x.x.exe`

**Steps:**
1. Run the downloaded `.exe` installer
2. If Windows SmartScreen appears, click **More info** → **Run anyway**
3. Follow the installation wizard
4. Choose installation location (or keep default)
5. Click **Install**, then **Finish**

The app will be available in your Start Menu.

---

### Building from Source

If no pre-built release is available for your platform:

```bash
# Clone the repository
git clone https://github.com/melindamortimer/pdf-editor-app.git
cd pdf-editor-app

# Install dependencies
npm install

# Build for your platform
npm run package:mac    # macOS (.dmg)
npm run package:win    # Windows (.exe)
npm run package:linux  # Linux (.AppImage, .deb) - untested
```

Built installers will be in the `release/` folder.

## Tech Stack

- **Electron** - Cross-platform desktop wrapper
- **React + TypeScript** - UI framework with type safety
- **PDF.js** - Mozilla's PDF renderer for viewing
- **pdf-lib** - Pure JS library for PDF manipulation (reorder, delete, duplicate, merge, add annotations)
- **jsQR** - QR code detection for clickable QR code links
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
| **Highlight** | Semi-transparent rectangle over text. Colors: yellow, green, pink, orange. Clear option to erase. |
| **Underline** | Horizontal line under text. Colors: black, red, blue. Clear option to erase. |
| **Strikethrough** | Horizontal line through text. Colors: black, red, blue. Clear option to erase. |
| **Box** | Rectangle with customizable border color, fill color, and thickness (thin/medium/thick) |
| **Text** | Placed text with font selection, size, color, and formatting (bold, italic, underline) |
| **Pen** | Freehand drawing with customizable color and stroke width (1-10px) |
| **Eraser** | Select text to erase all text annotations (highlights, underlines, strikethroughs) |

**Text-based annotations** (highlight, underline, strikethrough):
- Click and drag over PDF text to select words
- Annotations snap to word boundaries
- Adjacent words on the same line are merged into one annotation
- Re-selecting already-annotated text with the same tool/color removes just that portion (toggle off)
- Clear/eraser option in color picker removes annotations of that type
- Partial erasing: selecting part of a merged annotation shrinks or splits it

**Box and Text annotations** can be selected, moved, and resized:
- Click to select, drag to move
- Use the bottom-right resize handle to resize
- Hold Shift while resizing to maintain aspect ratio
- Box resize handle is visible when selected or when the box tool is active

**Text formatting** (while editing a text annotation):
- Ctrl+B to toggle bold
- Ctrl+I to toggle italic
- Ctrl+U to toggle underline

### Clickable Links

The viewer automatically detects clickable links in PDFs:

- **PDF link annotations** - Standard hyperlinks embedded in the PDF
- **Text URLs** - URLs visible in the PDF text (e.g., "www.example.com")
- **QR codes** - QR codes containing URLs are detected and made clickable

**How to use:**
- Hover over a link to see a highlight and tooltip with the URL
- Hold **Ctrl** (or **Cmd** on Mac) and click to open the link in your default browser
- Links only become clickable when the modifier key is held (prevents accidental navigation)

### Text Fonts (8 options)
1. Arial - sans-serif, clean
2. Times New Roman - serif, traditional
3. Verdana - sans-serif, readable
4. Georgia - serif, readable
5. Trebuchet MS - sans-serif, modern
6. Palatino - serif, elegant
7. Courier New - monospace, for forms/code
8. Comic Sans MS - casual, informal

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar                                                │
│  [Open] [Close] [Save] [SaveAs] | [Highlight▼] [...]   │
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

1. Select tool from toolbar (highlight, underline, strikethrough, box, or text)
2. Click and drag on page to create annotation
3. Click existing annotation to select (shows resize handles at corners)
4. Drag annotation body to move, drag corner handles to resize
5. Press Delete/Backspace to remove selected annotation
6. Use color pickers in toolbar to change annotation colors
7. Ctrl+Z to undo, Ctrl+Y to redo any annotation changes

## File Operations

### Opening
- File → Open or Ctrl+O
- Native file dialog with `.pdf` filter
- Multi-select supported to open multiple PDFs at once

### Closing
- Close button or Ctrl+W
- Closes current document(s) without quitting the app
- Prompts to save if there are unsaved changes
- Clears all pages, annotations, and history
- Returns to empty state ready to open a new document

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
3. Bakes all annotations permanently into the PDF (highlights, underlines, strikethroughs, boxes, text)
4. Reloads the saved file fresh (annotations become part of the PDF content)
5. Writes to file

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open PDF(s) |
| Ctrl+W | Close document |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy selected page(s) |
| Ctrl+V | Paste copied page(s) |
| Delete / Backspace | Delete selected page or annotation |
| Escape | Deselect annotation |
| S | Select tool |
| P | Pen tool |
| H | Highlight tool |
| U | Underline tool |
| K | Strikethrough tool |
| B | Box tool |
| T | Text tool |
| E | Eraser tool |
| ↑/↓ | Navigate pages |
| Shift+↑/↓ | Extend page selection |
| Shift+Click | Select range of pages |
| Ctrl+↑ / Home | Go to first page |
| Ctrl+↓ / End | Go to last page |
| Ctrl+D | Duplicate selected page |
| Ctrl+=/+ | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom to 100% |
| Ctrl+Mouse Wheel | Zoom in/out |
| Shift+Drag resize handle | Maintain aspect ratio while resizing |
| Space+Drag | Pan around document (temporarily switches to grab tool) |
| Ctrl+B | Toggle bold (while editing text) |
| Ctrl+I | Toggle italic (while editing text) |
| Ctrl+U | Toggle underline (while editing text) |
| Ctrl+Click | Open link in browser (on detected URLs/QR codes) |

## Undo/Redo

Tracks:
- Page operations (reorder, delete, duplicate)
- Annotation changes (add, move, resize, delete, property changes)

Standard undo stack behavior.

## Window Behavior

- Window title displays the current document name (or "DocuMint PDF Editor" when no document is open)
- Save button shows asterisk (*) when there are unsaved changes
- First save to original file shows overwrite warning

## Project Structure

```
src/
  main/              # Electron main process
    main.ts          # App entry, window management
  renderer/          # React app
    App.tsx          # Main app component with state management
    components/
      Toolbar.tsx        # File ops, zoom, annotation tools
      Sidebar.tsx        # Page thumbnails, drag-and-drop
      PageThumbnail.tsx  # Individual page preview
      MainViewer.tsx     # PDF canvas and layers
      AnnotationLayer.tsx # Annotation rendering and interaction
      TextLayer.tsx      # PDF text selection layer
      LinkLayer.tsx      # Clickable URL links and QR codes
    hooks/
      useAnnotations.ts  # Annotation state and undo/redo
    services/
      pdfRenderer.ts     # PDF.js wrapper for viewing, link/QR detection
      pdfManipulator.ts  # pdf-lib for save operations
    types/
      pdf.ts             # PDF document/page types
      annotations.ts     # Annotation types
  preload/           # Electron preload scripts
  test/              # Test utilities and setup
```

## Not In Scope

- Multi-document tabs (all docs show in single sidebar)
- PDF text editing (changing original text content)
- Form filling
- Digital signatures
- Printing (use system PDF viewer)

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

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) - Free to use and modify, but not for commercial purposes.
