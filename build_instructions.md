# Build Instructions

## Creating a Standalone Executable

### Quick Build

For a simple one-file executable:

```bash
pyinstaller --onefile --windowed --name "PDF-Editor" main.py
```

### Advanced Build with Custom Spec File

1. **Generate initial spec file:**
   ```bash
   pyinstaller --onefile --windowed --name "PDF-Editor" main.py
   ```

2. **Edit the generated `PDF-Editor.spec` file** to customize:
   - Icon (add `icon='icon.ico'`)
   - Version info
   - Data files to include

3. **Build from spec file:**
   ```bash
   pyinstaller PDF-Editor.spec
   ```

### Platform-Specific Notes

#### Windows
- The executable will be created as `PDF-Editor.exe`
- Use `--windowed` to hide the console window
- Optionally add an icon: `--icon=path/to/icon.ico`

#### macOS
- The app bundle will be created as `PDF-Editor.app`
- Use `--windowed` to create a proper .app bundle
- Optionally add an icon: `--icon=path/to/icon.icns`

#### Linux
- The executable will be a binary file
- May require additional system libraries on target machines
- Consider using AppImage or Flatpak for better distribution

### Build Output

After building, you'll find:
- `build/` - Temporary build files (can be deleted)
- `dist/` - Your executable application
- `PDF-Editor.spec` - Build specification file

### Testing the Executable

Before distribution:
1. Test on a clean machine without Python installed
2. Verify all features work (merge, annotate, sign)
3. Check file dialogs open correctly
4. Test with various PDF files

### Reducing Executable Size

To reduce the size of the executable:

```bash
pyinstaller --onefile --windowed --strip --name "PDF-Editor" main.py
```

Additional options:
- `--strip`: Strip symbols from executable (Linux/macOS)
- `--noupx`: Don't use UPX compression (if it causes issues)
- `--exclude-module`: Exclude unused modules

### Common Issues

**Issue: Executable won't start**
- Check for antivirus interference
- Run from command line to see error messages
- Verify all dependencies are included

**Issue: Missing modules**
- Use `--hidden-import` flag to include specific modules
- Example: `--hidden-import=PySide6.QtCore`

**Issue: Large file size**
- Normal for Python executables (50-150 MB is typical)
- Consider using virtual env approach instead for size-sensitive scenarios

## Alternative: Running from Source

For users comfortable with Python:

1. Install Python 3.10+
2. Clone repository
3. Run `pip install -r requirements.txt`
4. Run `python main.py` or `./run.sh`

This approach:
- ✅ Smaller download size
- ✅ Easier to update
- ✅ More transparent
- ❌ Requires Python installation