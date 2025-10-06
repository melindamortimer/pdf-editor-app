# Quick Start Guide

Get up and running with PDF Editor Tool in 5 minutes!

## Installation

### Option 1: Quick Start (Recommended)

```bash
# 1. Navigate to the project directory
cd pdf-editor-app

# 2. Run the launcher script
./run.sh          # Linux/macOS
run.bat           # Windows
```

The script will automatically activate the virtual environment and start the app.

### Option 2: Manual Start

```bash
# 1. Activate virtual environment
source .venv/bin/activate     # Linux/macOS
.venv\Scripts\activate        # Windows

# 2. Run the application
python main.py
```

## First-Time Setup

If this is your first time running the app and dependencies aren't installed:

```bash
# 1. Create virtual environment (if not already created)
python -m venv .venv

# 2. Activate it
source .venv/bin/activate     # Linux/macOS
.venv\Scripts\activate        # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python main.py
```

## Basic Usage

### Merging PDFs

1. Click the **Merge PDFs** tab
2. Click **Add Files** and select 2 or more PDF files
3. Files will be merged in the order they appear in the list
4. Click **Merge PDFs**
5. Choose where to save the merged file
6. Done! ✅

**Pro Tip:** Use the "Remove Selected" button to remove files you added by mistake.

### Annotating PDFs

1. Click the **Annotate PDFs** tab
2. Click **Select PDF** and choose your PDF
3. Select annotation type (e.g., "Highlight")
4. Set the page number (starts from 1)
5. Enter position coordinates:
   - **X**: Horizontal position (from left)
   - **Y**: Vertical position (from top)
   - **Width/Height**: Size of the annotation
6. For text annotations, enter your text in the text box
7. Click **Add Annotation**
8. Choose where to save the annotated PDF
9. Done! ✅

**Finding Coordinates:**
- Most PDF viewers show coordinates when you hover
- Coordinates are in points (1 point ≈ 1/72 inch)
- Try X=100, Y=100, Width=200, Height=50 as a starting point

### Signing PDFs

**Prerequisites:** You need a PKCS#12 certificate (.p12 file)

1. Click the **Sign PDFs** tab
2. Click **Select PDF** and choose your PDF
3. Click **Select Certificate** and choose your .p12 file
4. Enter your certificate password
5. (Optional) Fill in reason, location, and contact info
6. Click **Sign PDF**
7. Choose where to save the signed PDF
8. Done! ✅

**Getting a Certificate:**
- For testing: Create a self-signed certificate (see below)
- For production: Get one from a Certificate Authority

### Validating Signatures

1. Go to **Sign PDFs** tab
2. Click **Validate Signature**
3. Select a signed PDF
4. View the validation results
5. Done! ✅

## Creating a Test Certificate

For testing purposes only:

```bash
# Install OpenSSL if needed
# Then create a self-signed certificate

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
openssl pkcs12 -export -out test-cert.p12 -inkey key.pem -in cert.pem
```

**⚠️ Warning:** Self-signed certificates are for testing only and should not be used for legal documents.

## Troubleshooting

### App won't start
```bash
# Check Python version (need 3.10+)
python --version

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### "Module not found" errors
```bash
# Make sure virtual environment is activated
source .venv/bin/activate  # or .venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### "pyhanko not found" when signing
```bash
# Install pyHanko
pip install pyHanko

# Verify installation
pyhanko --version
```

### GUI looks weird or doesn't appear
```bash
# Reinstall PySide6
pip install --upgrade PySide6

# On Linux, you may need Qt dependencies
sudo apt-get install qt6-base-dev  # Debian/Ubuntu
```

### Can't find coordinates for annotations
- Open your PDF in a viewer that shows coordinates (Adobe Acrobat, etc.)
- Or use trial and error with small values
- Remember: (0, 0) is typically the bottom-left corner in PDF coordinates

## Next Steps

- 📖 Read the full [README.md](README.md) for detailed features
- 🔧 Check [DEVELOPMENT.md](DEVELOPMENT.md) if you want to contribute
- 🏗️ See [build_instructions.md](build_instructions.md) to create an executable

## Common Workflows

### Workflow 1: Merge and Sign
1. Merge multiple PDFs → Tab 1
2. Switch to Sign tab → Tab 3
3. Sign the merged PDF
4. Result: Single signed document ✅

### Workflow 2: Annotate and Sign
1. Annotate a PDF → Tab 2
2. Switch to Sign tab → Tab 3
3. Sign the annotated PDF
4. Result: Annotated, signed document ✅

### Workflow 3: Merge, Annotate, and Sign
1. Merge PDFs → Tab 1
2. Annotate merged PDF → Tab 2
3. Sign the final PDF → Tab 3
4. Result: Merged, annotated, signed document ✅

## Tips & Tricks

1. **Keep originals:** The app creates new files; originals are never modified
2. **Name outputs clearly:** Use descriptive names like "contract-merged.pdf", "invoice-signed.pdf"
3. **Batch annotations:** You'll need to save after each annotation (future update may support batching)
4. **File organization:** Create a folder structure like:
   ```
   my-pdfs/
   ├── originals/
   ├── merged/
   ├── annotated/
   └── signed/
   ```

## Getting Help

- 🐛 Found a bug? Check the [issues](../../issues)
- 💡 Have a feature idea? Create a new issue
- 📚 Need more info? Read the documentation files

## Video Tutorials

Coming soon! Check the project repository for video guides.

---

**Happy PDF editing!** 🎉