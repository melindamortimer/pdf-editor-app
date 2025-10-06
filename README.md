# PDF Editor Tool

A lightweight, local desktop application for merging, annotating, and digitally signing PDF files. No server required—all operations are performed locally on your machine.

## Features

### 📄 Merge PDFs
- Combine multiple PDF files into a single document
- Drag-and-drop interface for easy file management
- Preserves document quality and metadata

### ✏️ Annotate PDFs
- **Text Notes**: Add sticky note annotations
- **Highlight**: Highlight important text sections
- **Underline**: Underline text
- **Strikeout**: Strike through text
- **Shapes**: Add rectangles and circles
- **Freehand Text**: Add custom text directly to pages

### 🔐 Digital Signing
- Sign PDFs with PKCS#12 (.p12) certificates
- Add optional metadata (reason, location, contact)
- Validate existing signatures
- Fully compliant with PDF signing standards

## Installation

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Setup

1. **Clone or download this repository**

2. **Create a virtual environment** (recommended)
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment**
   - Windows:
     ```bash
     .venv\Scripts\activate
     ```
   - Linux/macOS:
     ```bash
     source .venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Running the Application

```bash
python main.py
```

### Merging PDFs

1. Navigate to the **Merge PDFs** tab
2. Click **Add Files** to select PDF files
3. Arrange files in the desired order (first added = first in merged PDF)
4. Click **Merge PDFs**
5. Choose where to save the merged file

### Annotating PDFs

1. Navigate to the **Annotate PDFs** tab
2. Click **Select PDF** to choose a PDF file
3. Select the annotation type from the dropdown
4. Set the page number and position coordinates
5. Enter text content (for text-based annotations)
6. Click **Add Annotation**
7. Choose where to save the annotated PDF

**Annotation Tips:**
- Page numbers start from 1
- Coordinates are in PDF points (1 point ≈ 1/72 inch)
- For shapes, specify the top-left corner (X, Y) and dimensions

### Signing PDFs

1. Navigate to the **Sign PDFs** tab
2. Select the PDF file to sign
3. Select your PKCS#12 certificate (.p12 file)
4. Enter the certificate password
5. Optionally add signing metadata (reason, location, contact)
6. Click **Sign PDF**
7. Choose where to save the signed PDF

**Note:** You'll need a valid PKCS#12 certificate for signing. These can be obtained from certificate authorities or created for testing purposes.

### Validating Signatures

1. Navigate to the **Sign PDFs** tab
2. Click **Validate Signature**
3. Select a signed PDF to validate
4. View the validation results

## Project Structure

```
pdf-editor-app/
├── src/
│   ├── core/               # Core PDF processing modules
│   │   ├── pdf_merger.py   # PDF merging functionality
│   │   ├── pdf_annotator.py # PDF annotation functionality
│   │   └── pdf_signer.py   # PDF signing functionality
│   └── gui/                # GUI components
│       └── main_window.py  # Main application window
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Building a Standalone Executable

To create a single-file executable that doesn't require Python installation:

```bash
pyinstaller --onefile --windowed main.py
```

The executable will be created in the `dist/` folder.

**Note:** The executable will be platform-specific (Windows .exe, macOS .app, Linux binary).

## Development

### Code Formatting

Format code with Black:
```bash
black src/
```

### Linting

Check code quality with Pylint:
```bash
pylint src/
```

### Testing

Run tests with pytest:
```bash
pytest tests/
```

## Technical Stack

- **Python**: 3.10+
- **pikepdf**: PDF merging
- **PyMuPDF (fitz)**: PDF annotation and manipulation
- **pyHanko**: Digital signing and validation
- **PySide6**: Qt-based GUI framework
- **PyInstaller**: Executable packaging

## Features & Improvements

This implementation includes several enhancements beyond the basic requirements:

✅ **Error Handling**: Comprehensive error handling with user-friendly messages
✅ **Logging**: Detailed logging for debugging and tracking operations
✅ **Type Hints**: Full type annotations for better code quality
✅ **Context Managers**: Safe resource management for PDF files
✅ **Modular Design**: Separated core logic from GUI for maintainability
✅ **Multiple Annotation Types**: Support for 7 different annotation types
✅ **User-Friendly GUI**: Tabbed interface with clear instructions
✅ **Validation**: Input validation and file existence checks
✅ **Status Updates**: Real-time feedback on operations

## Security & Privacy

🔒 **All operations are performed locally** - no data is sent to external servers
🔒 **Certificate passwords are handled securely** - displayed as masked input
🔒 **No telemetry or tracking** - complete privacy

## License

This project is provided as-is for educational and personal use.

## Troubleshooting

### "pyhanko command not found"
Ensure pyHanko is installed: `pip install pyHanko`

### GUI doesn't launch
Check that PySide6 is properly installed and your system has GUI support

### Certificate errors when signing
Verify your .p12 certificate is valid and the password is correct

### PDF files won't open
Ensure PDF files are not corrupted or password-protected

## Future Enhancements

Potential additions for future versions:
- Page reordering with thumbnail preview
- Custom signature appearance/images
- Annotation flattening
- PDF rotation and cropping
- Batch processing
- Configuration file for default settings
- Dark mode theme
- Internationalization support

## Support

For issues, questions, or contributions, please refer to the project repository.
