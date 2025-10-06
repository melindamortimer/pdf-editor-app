# Development Guide

## Project Overview

PDF Editor Tool is a desktop application built with Python and Qt (PySide6) for local PDF manipulation.

## Architecture

```
┌─────────────────────────────────────┐
│         GUI Layer (PySide6)         │
│      src/gui/main_window.py         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Core Business Logic         │
├─────────────────────────────────────┤
│  pdf_merger.py    - Merge PDFs      │
│  pdf_annotator.py - Annotate PDFs   │
│  pdf_signer.py    - Sign PDFs       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       External Libraries            │
├─────────────────────────────────────┤
│  pikepdf      - PDF manipulation    │
│  PyMuPDF      - Annotation engine   │
│  pyHanko      - Digital signing     │
└─────────────────────────────────────┘
```

## Code Style

### Python Version
- Minimum: Python 3.10
- Target: Python 3.12+

### Formatting
Use Black for code formatting:
```bash
black src/ tests/
```

### Linting
Use Pylint for code quality:
```bash
pylint src/
```

### Type Hints
- All functions should have type hints
- Use `typing` module for complex types
- Example:
  ```python
  def merge_pdfs(input_files: List[Path], output: Path) -> None:
      ...
  ```

## Development Workflow

### 1. Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd pdf-editor-app

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install -e .
```

### 2. Making Changes

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run tests: `pytest tests/`
5. Format code: `black src/ tests/`
6. Check with linter: `pylint src/`
7. Commit changes

### 3. Testing

#### Unit Tests
```bash
pytest tests/ -v
```

#### Test Coverage
```bash
pytest --cov=src tests/
```

#### Manual Testing
```bash
python main.py
```

## Adding New Features

### Adding a New PDF Operation

1. **Create core module** in `src/core/`:
   ```python
   # src/core/pdf_rotator.py
   class PDFRotator:
       def rotate_pages(self, pdf_path, angle):
           # Implementation
           pass
   ```

2. **Add GUI tab** in `src/gui/main_window.py`:
   ```python
   def _create_rotate_tab(self) -> QWidget:
       # Create UI elements
       pass
   ```

3. **Wire up the functionality**:
   ```python
   def _rotate_pdf(self):
       # Call core functionality
       rotator = PDFRotator()
       rotator.rotate_pages(...)
   ```

4. **Add tests**:
   ```python
   # tests/test_pdf_rotator.py
   def test_rotate_pages():
       assert ...
   ```

### Adding a New Annotation Type

1. Add method to `PDFAnnotator` class in [pdf_annotator.py](src/core/pdf_annotator.py)
2. Add enum value to `AnnotationType`
3. Update GUI dropdown in [main_window.py](src/gui/main_window.py)
4. Add handler in `_add_annotation()` method

## Error Handling

All custom exceptions should inherit from base error classes:
- `PDFMergerError`
- `PDFAnnotatorError`
- `PDFSignerError`

Example:
```python
try:
    merge_pdfs(files, output)
except PDFMergerError as e:
    logger.error(f"Merge failed: {e}")
    QMessageBox.critical(self, "Error", str(e))
```

## Logging

Use the logging module:
```python
import logging

logger = logging.getLogger(__name__)

logger.info("Operation successful")
logger.warning("Potential issue")
logger.error("Operation failed")
```

## GUI Guidelines

### Layout Structure
- Use layouts (QVBoxLayout, QHBoxLayout) instead of absolute positioning
- Group related controls with QGroupBox
- Use QFormLayout for form-like interfaces

### User Feedback
- Always show status messages for operations
- Use QMessageBox for errors and confirmations
- Update status bar for background information

### File Dialogs
```python
file, _ = QFileDialog.getOpenFileName(
    self,
    "Dialog Title",
    "",  # Starting directory (empty = last used)
    "PDF Files (*.pdf)"
)
```

## Performance Considerations

### Large PDFs
- Process pages in chunks when possible
- Use progress dialogs for long operations
- Consider background threads for heavy processing

### Memory Management
- Use context managers (`with` statements) for file handling
- Close PDF documents when done
- Don't load entire PDFs into memory unnecessarily

## Security Best Practices

1. **Input Validation**
   - Validate all file paths
   - Check file extensions
   - Verify file existence before operations

2. **Certificate Handling**
   - Never log certificate passwords
   - Use password input fields (masked)
   - Clear sensitive data after use

3. **File Operations**
   - Use Path objects for path manipulation
   - Avoid shell injection (use subprocess safely)
   - Validate output paths

## Debugging

### Enable Debug Logging
```python
logging.basicConfig(level=logging.DEBUG)
```

### Qt Debugging
Set environment variable:
```bash
export QT_DEBUG_PLUGINS=1
```

### Common Issues

**Import errors:**
- Check virtual environment is activated
- Verify dependencies installed: `pip list`

**GUI doesn't appear:**
- Check if running in WSL without X server
- Verify PySide6 installation
- Check for Qt platform plugin errors

**PDF operations fail:**
- Verify PDF is not corrupted
- Check file permissions
- Ensure PDF is not password-protected

## Contributing

### Code Review Checklist
- [ ] Code follows Black formatting
- [ ] Type hints added
- [ ] Tests written and passing
- [ ] Error handling implemented
- [ ] Logging added where appropriate
- [ ] Documentation updated
- [ ] No hardcoded paths or credentials

### Commit Messages
Use conventional commits format:
```
feat: add page rotation feature
fix: resolve PDF merge ordering issue
docs: update installation instructions
test: add tests for annotation module
```

## Resources

### Documentation
- [PySide6 Docs](https://doc.qt.io/qtforpython/)
- [pikepdf Docs](https://pikepdf.readthedocs.io/)
- [PyMuPDF Docs](https://pymupdf.readthedocs.io/)
- [pyHanko Docs](https://pyhanko.readthedocs.io/)

### Tools
- [Qt Designer](https://doc.qt.io/qt-6/qtdesigner-manual.html) - GUI design tool
- [PyInstaller](https://pyinstaller.readthedocs.io/) - Executable bundler

## Release Process

1. Update version in `src/__init__.py`
2. Update CHANGELOG.md
3. Run full test suite
4. Build executable
5. Test executable on clean system
6. Create release tag
7. Build for all platforms
8. Create release notes

## Future Roadmap

See [README.md](README.md) for planned enhancements.

## Support

For questions or issues:
1. Check existing issues
2. Review documentation
3. Create new issue with details