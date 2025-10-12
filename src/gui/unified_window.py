"""Unified main window with single-view interface."""

import sys
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QFileDialog,
    QMessageBox,
    QSplitter,
    QTextEdit,
    QGroupBox,
    QFormLayout,
    QLineEdit,
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QAction, QKeySequence

from src.core.pdf_merger import PDFMerger, PDFMergerError
from src.core.pdf_annotator import PDFAnnotator, PDFAnnotatorError
from src.core.pdf_signer import PDFSigner, PDFSignerError
from src.gui.page_list import VerticalPageList
from src.gui.full_pdf_viewer import FullPDFViewer
from src.gui.toolbar import AnnotationToolbar, ToolType

logger = logging.getLogger(__name__)


class AnnotationItem:
    """Simple annotation data class."""

    def __init__(
        self,
        x: float,
        y: float,
        text: str,
        font_size: int = 11,
        color: tuple = (0, 0, 0),
        page_num: int = 0,
    ):
        self.x = x
        self.y = y
        self.text = text
        self.font_size = font_size
        self.color = color
        self.page_num = page_num

    def __str__(self):
        return f"Annotation at ({self.x:.1f}, {self.y:.1f}): {self.text[:30]}"


class UnifiedPDFEditor(QMainWindow):
    """Unified PDF editor with single-view interface."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("PDF Editor")
        self.setMinimumSize(1200, 800)

        # State
        self.annotations: List[AnnotationItem] = []
        self.current_pdf_path: Optional[str] = None
        self.current_page_num: int = 0
        self.signature_info: Dict[str, Any] = {}

        self._create_menu_bar()
        self._setup_ui()

        self.statusBar().showMessage("Ready - Add PDF files to begin")

    def _create_menu_bar(self):
        """Create the menu bar."""
        menubar = self.menuBar()

        # File menu
        file_menu = menubar.addMenu("File")

        add_pdf_action = QAction("Add PDF Files...", self)
        add_pdf_action.setShortcut(QKeySequence("Ctrl+O"))
        add_pdf_action.triggered.connect(self._add_pdf_files)
        file_menu.addAction(add_pdf_action)

        file_menu.addSeparator()

        exit_action = QAction("Exit", self)
        exit_action.setShortcut(QKeySequence("Ctrl+Q"))
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)

        # Help menu
        help_menu = menubar.addMenu("Help")

        about_action = QAction("About", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)

        shortcuts_action = QAction("Keyboard Shortcuts", self)
        shortcuts_action.triggered.connect(self._show_shortcuts)
        help_menu.addAction(shortcuts_action)

    def _setup_ui(self):
        """Setup the main UI."""
        central_widget = QWidget()
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Toolbar at top
        self.toolbar = AnnotationToolbar()
        self.toolbar.tool_changed.connect(self._on_tool_changed)
        self.toolbar.apply_changes.connect(self._apply_changes)
        main_layout.addWidget(self.toolbar)

        # Main content area with splitter
        splitter = QSplitter(Qt.Horizontal)

        # Left side: Page list
        self.page_list = VerticalPageList()
        self.page_list.add_btn.clicked.connect(self._add_pdf_files)
        self.page_list.page_selected.connect(self._on_page_selected)
        self.page_list.page_deleted.connect(self._on_page_deleted)
        self.page_list.setMaximumWidth(160)
        splitter.addWidget(self.page_list)

        # Right side: PDF viewer
        self.pdf_viewer = FullPDFViewer()
        self.pdf_viewer.click_position.connect(self._on_pdf_click)
        splitter.addWidget(self.pdf_viewer)

        # Set splitter proportions (10% list, 90% viewer)
        splitter.setSizes([160, 1040])
        splitter.setCollapsible(0, False)
        splitter.setCollapsible(1, False)

        main_layout.addWidget(splitter)

        # Bottom panel for tool-specific controls (compact)
        self.bottom_panel = QWidget()
        self.bottom_panel.setMaximumHeight(45)  # Very compact
        bottom_layout = QVBoxLayout()
        bottom_layout.setContentsMargins(5, 2, 5, 2)  # Minimal margins
        bottom_layout.setSpacing(2)  # Minimal spacing

        # Text annotation input (single line, no group box)
        self.text_input_group = QWidget()
        text_layout = QHBoxLayout()
        text_layout.setContentsMargins(0, 0, 0, 0)
        text_layout.setSpacing(5)
        text_layout.addWidget(QLabel("Text:"))
        self.text_input = QLineEdit()  # Changed to single-line
        self.text_input.setPlaceholderText("Click PDF, type text here...")
        text_layout.addWidget(self.text_input)

        self.add_text_btn = QPushButton("Add")
        self.add_text_btn.setEnabled(False)
        self.add_text_btn.clicked.connect(self._add_text_annotation)
        self.add_text_btn.setStyleSheet("QPushButton { padding: 3px 10px; font-size: 9pt; }")  # Compact
        text_layout.addWidget(self.add_text_btn)

        self.text_input_group.setLayout(text_layout)
        bottom_layout.addWidget(self.text_input_group)

        # Signature panel (compact, no group box)
        self.signature_group = QWidget()
        sig_layout = QHBoxLayout()
        sig_layout.setContentsMargins(0, 0, 0, 0)
        sig_layout.setSpacing(5)

        sig_layout.addWidget(QLabel("Cert:"))
        self.cert_path_input = QLineEdit()
        self.cert_path_input.setReadOnly(True)
        sig_layout.addWidget(self.cert_path_input)

        select_cert_btn = QPushButton("Browse")
        select_cert_btn.setStyleSheet("QPushButton { padding: 3px 8px; font-size: 9pt; }")
        select_cert_btn.clicked.connect(self._select_certificate)
        sig_layout.addWidget(select_cert_btn)

        sig_layout.addWidget(QLabel("Password:"))
        self.cert_password_input = QLineEdit()
        self.cert_password_input.setEchoMode(QLineEdit.Password)
        sig_layout.addWidget(self.cert_password_input)

        self.signature_group.setLayout(sig_layout)
        self.signature_group.setVisible(False)
        bottom_layout.addWidget(self.signature_group)

        self.bottom_panel.setLayout(bottom_layout)
        main_layout.addWidget(self.bottom_panel)

        # Status label (compact)
        self.status_label = QLabel("Add PDF files to begin editing")
        self.status_label.setStyleSheet("padding: 2px 5px; background-color: #f0f0f0; border-top: 1px solid #ccc; font-size: 9pt;")
        self.status_label.setMaximumHeight(20)  # Minimal height
        main_layout.addWidget(self.status_label)

        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

    def _add_pdf_files(self):
        """Add PDF files to the page list."""
        files, _ = QFileDialog.getOpenFileNames(
            self, "Select PDF files", "", "PDF Files (*.pdf)"
        )
        if not files:
            return

        try:
            total_pages = 0
            for file_path in files:
                pages = self.page_list.add_pages_from_pdf(file_path)
                total_pages += pages

            self.status_label.setText(
                f"Loaded {total_pages} pages from {len(files)} file(s). "
                f"Use ↑↓ arrows to navigate, Delete/Backspace to remove pages."
            )
            self.statusBar().showMessage(f"Loaded {total_pages} pages")

            # Focus the page list for keyboard navigation
            self.page_list.setFocus()

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to load PDF files:\n{str(e)}")
            logger.error(f"Failed to load PDF files: {e}")

    def _on_page_selected(self, pdf_path: str, page_num: int):
        """Handle page selection."""
        self.current_pdf_path = pdf_path
        self.current_page_num = page_num

        # Load page in viewer
        self.pdf_viewer.load_page(pdf_path, page_num)

        # Show annotations for this page
        page_annotations = [
            {
                "type": "text",
                "x": a.x,
                "y": a.y,
                "text": a.text,
                "font_size": a.font_size,
                "color": a.color,
            }
            for a in self.annotations
            if a.page_num == page_num and a.page_num == page_num  # TODO: match by pdf_path too
        ]
        self.pdf_viewer.set_annotations(page_annotations)

        self.status_label.setText(
            f"Page {page_num + 1} of {Path(pdf_path).name} - "
            f"Total annotations: {len(self.annotations)}"
        )

    def _on_page_deleted(self, index: int):
        """Handle page deletion."""
        # Remove annotations for deleted page
        # Note: This is simplified - would need to track pdf_path+page_num properly
        remaining = self.page_list.get_page_count()
        self.status_label.setText(
            f"Page deleted. {remaining} pages remaining. "
            f"{len(self.annotations)} annotations."
        )

        if remaining == 0:
            self.pdf_viewer.close_document()
            self.status_label.setText("All pages removed. Add PDF files to continue.")

    def _on_pdf_click(self, x: float, y: float):
        """Handle click on PDF viewer."""
        if self.toolbar.get_current_tool() == ToolType.TEXT:
            self.add_text_btn.setEnabled(True)
            self.temp_click_pos = (x, y)
            self.status_label.setText(
                f"Position set: ({x:.1f}, {y:.1f}). Enter text and click 'Add Text'."
            )

    def _on_tool_changed(self, tool_type: ToolType):
        """Handle tool change."""
        # Show/hide appropriate panels
        self.text_input_group.setVisible(tool_type == ToolType.TEXT)
        self.signature_group.setVisible(tool_type == ToolType.SIGNATURE)

        if tool_type == ToolType.SELECT:
            self.status_label.setText("Select mode. Click pages or use arrow keys to navigate.")
        elif tool_type == ToolType.TEXT:
            self.status_label.setText("Text tool selected. Click on PDF to place text.")
        elif tool_type == ToolType.SIGNATURE:
            self.status_label.setText("Signature tool selected. Select certificate and password.")

    def _add_text_annotation(self):
        """Add a text annotation."""
        text = self.text_input.text().strip()  # Changed from toPlainText() to text()
        if not text:
            QMessageBox.warning(self, "No Text", "Please enter text for the annotation.")
            return

        if not hasattr(self, "temp_click_pos"):
            QMessageBox.warning(self, "No Position", "Please click on the PDF first.")
            return

        # Create annotation
        annotation = AnnotationItem(
            x=self.temp_click_pos[0],
            y=self.temp_click_pos[1],
            text=text,
            font_size=self.toolbar.get_font_size(),
            color=self.toolbar.get_text_color(),
            page_num=self.current_page_num,
        )

        self.annotations.append(annotation)

        # Preview on current page
        self.pdf_viewer.add_annotation_preview(
            {
                "type": "text",
                "x": annotation.x,
                "y": annotation.y,
                "text": annotation.text,
                "font_size": annotation.font_size,
                "color": annotation.color,
            }
        )

        # Enable Apply button
        self.toolbar.enable_apply_button(True)

        # Clear input
        self.text_input.clear()
        self.add_text_btn.setEnabled(False)

        self.status_label.setText(
            f"Added annotation. Total: {len(self.annotations)}. Click 'Apply Changes' to save."
        )
        logger.info(f"Added text annotation: {annotation}")

    def _select_certificate(self):
        """Select certificate file."""
        file, _ = QFileDialog.getOpenFileName(
            self, "Select Certificate", "", "Certificate Files (*.p12)"
        )
        if file:
            self.cert_path_input.setText(file)
            self.signature_info["cert_path"] = file

    def _apply_changes(self):
        """Apply all changes and save PDF."""
        if self.page_list.get_page_count() == 0:
            QMessageBox.warning(self, "No Pages", "Please add PDF files first.")
            return

        # Get output path
        output_path, _ = QFileDialog.getSaveFileName(
            self, "Save PDF", "", "PDF Files (*.pdf)"
        )
        if not output_path:
            return

        try:
            # First, merge pages
            page_list = self.page_list.get_all_page_info()

            if len(page_list) == 1:
                # Single page - just copy with annotations
                temp_pdf = page_list[0][0]
            else:
                # Multiple pages - merge first
                temp_pdf = output_path + ".temp.pdf"
                merger = PDFMerger()
                merger.merge_pages(page_list, temp_pdf)

            # Apply annotations if any
            if len(self.annotations) > 0:
                annot_dicts = [
                    {
                        "type": "text",
                        "page_num": a.page_num,
                        "x": a.x,
                        "y": a.y,
                        "text": a.text,
                        "font_size": a.font_size,
                        "color": a.color,
                    }
                    for a in self.annotations
                ]

                with PDFAnnotator(temp_pdf) as annotator:
                    annotator.add_batch_annotations(annot_dicts)
                    annotator.save(output_path if len(page_list) == 1 else output_path + ".annotated.pdf")

                if len(page_list) > 1:
                    import shutil
                    shutil.move(output_path + ".annotated.pdf", output_path)
                    Path(temp_pdf).unlink()

            # Apply signature if signature tool selected and cert provided
            if (
                self.toolbar.get_current_tool() == ToolType.SIGNATURE
                and self.cert_path_input.text()
                and self.cert_password_input.text()
            ):
                signed_path = output_path + ".signed.pdf"
                signer = PDFSigner()
                signer.sign_pdf(
                    output_path,
                    self.cert_path_input.text(),
                    self.cert_password_input.text(),
                    signed_path,
                )
                import shutil
                shutil.move(signed_path, output_path)

            QMessageBox.information(
                self,
                "Success",
                f"PDF saved successfully:\n{output_path}\n\n"
                f"Pages: {len(page_list)}\n"
                f"Annotations: {len(self.annotations)}",
            )

            self.statusBar().showMessage(f"Saved to {output_path}")
            self.toolbar.enable_apply_button(False)

        except (PDFMergerError, PDFAnnotatorError, PDFSignerError) as e:
            QMessageBox.critical(self, "Error", f"Failed to save PDF:\n{str(e)}")
            logger.error(f"Failed to save PDF: {e}")

    def _show_about(self):
        """Show about dialog."""
        QMessageBox.about(
            self,
            "About PDF Editor",
            "PDF Editor v2.0\n\n"
            "Unified interface for PDF editing:\n"
            "• Merge and reorder pages\n"
            "• Add text annotations\n"
            "• Digital signatures\n\n"
            "Built with Python, PySide6, PyMuPDF, pikepdf, and pyHanko\n\n"
            "Keyboard Shortcuts:\n"
            "• ↑↓ arrows: Navigate pages\n"
            "• Delete/Backspace: Remove page\n"
            "• Ctrl+O: Add PDF files\n"
            "• Ctrl+Q: Quit",
        )

    def _show_shortcuts(self):
        """Show keyboard shortcuts dialog."""
        QMessageBox.information(
            self,
            "Keyboard Shortcuts",
            "Page Navigation:\n"
            "• ↑ / ↓ arrows: Navigate pages in list\n"
            "• Delete / Backspace: Remove selected page\n\n"
            "File Operations:\n"
            "• Ctrl+O: Add PDF files\n"
            "• Ctrl+Q: Quit application\n\n"
            "Tips:\n"
            "• Click on page thumbnails to select\n"
            "• Click on PDF viewer to place annotations\n"
            "• Use toolbar to switch between tools",
        )


def main():
    """Main entry point."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    app = QApplication(sys.argv)
    window = UnifiedPDFEditor()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
