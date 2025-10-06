"""Main window for the PDF Editor application."""

import sys
import logging
from pathlib import Path
from typing import List, Optional

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
    QTabWidget,
    QListWidget,
    QTextEdit,
    QSpinBox,
    QDoubleSpinBox,
    QLineEdit,
    QComboBox,
    QGroupBox,
    QFormLayout,
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QAction

from src.core.pdf_merger import PDFMerger, PDFMergerError
from src.core.pdf_annotator import PDFAnnotator, PDFAnnotatorError
from src.core.pdf_signer import PDFSigner, PDFSignerError

logger = logging.getLogger(__name__)


class PDFToolMainWindow(QMainWindow):
    """Main window for the PDF Editor tool."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("PDF Editor Tool")
        self.setMinimumSize(800, 600)

        # Create menu bar
        self._create_menu_bar()

        # Create central widget with tabs
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)

        # Create tab widgets
        self.merge_tab = self._create_merge_tab()
        self.annotate_tab = self._create_annotate_tab()
        self.sign_tab = self._create_sign_tab()

        # Add tabs
        self.tabs.addTab(self.merge_tab, "Merge PDFs")
        self.tabs.addTab(self.annotate_tab, "Annotate PDFs")
        self.tabs.addTab(self.sign_tab, "Sign PDFs")

        # Status bar
        self.statusBar().showMessage("Ready")

    def _create_menu_bar(self):
        """Create the application menu bar."""
        menubar = self.menuBar()

        # File menu
        file_menu = menubar.addMenu("File")

        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)

        # Help menu
        help_menu = menubar.addMenu("Help")

        about_action = QAction("About", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)

    def _create_merge_tab(self) -> QWidget:
        """Create the PDF merge tab."""
        widget = QWidget()
        layout = QVBoxLayout()

        # Instructions
        label = QLabel("Select PDF files to merge:")
        layout.addWidget(label)

        # File list
        self.merge_file_list = QListWidget()
        layout.addWidget(self.merge_file_list)

        # Buttons
        button_layout = QHBoxLayout()

        add_files_btn = QPushButton("Add Files")
        add_files_btn.clicked.connect(self._add_merge_files)
        button_layout.addWidget(add_files_btn)

        remove_files_btn = QPushButton("Remove Selected")
        remove_files_btn.clicked.connect(self._remove_merge_files)
        button_layout.addWidget(remove_files_btn)

        clear_files_btn = QPushButton("Clear All")
        clear_files_btn.clicked.connect(self._clear_merge_files)
        button_layout.addWidget(clear_files_btn)

        layout.addLayout(button_layout)

        # Merge button
        merge_btn = QPushButton("Merge PDFs")
        merge_btn.clicked.connect(self._merge_pdfs)
        layout.addWidget(merge_btn)

        # Status label
        self.merge_status_label = QLabel("")
        layout.addWidget(self.merge_status_label)

        widget.setLayout(layout)
        return widget

    def _create_annotate_tab(self) -> QWidget:
        """Create the PDF annotation tab."""
        widget = QWidget()
        layout = QVBoxLayout()

        # PDF selection
        pdf_layout = QHBoxLayout()
        pdf_layout.addWidget(QLabel("PDF File:"))
        self.annotate_pdf_path = QLineEdit()
        self.annotate_pdf_path.setReadOnly(True)
        pdf_layout.addWidget(self.annotate_pdf_path)

        select_pdf_btn = QPushButton("Select PDF")
        select_pdf_btn.clicked.connect(self._select_annotate_pdf)
        pdf_layout.addWidget(select_pdf_btn)

        layout.addLayout(pdf_layout)

        # Annotation type selection
        self.annotation_type = QComboBox()
        self.annotation_type.addItems(
            [
                "Text Note",
                "Highlight",
                "Underline",
                "Strikeout",
                "Rectangle",
                "Circle",
                "Freehand Text",
            ]
        )
        layout.addWidget(QLabel("Annotation Type:"))
        layout.addWidget(self.annotation_type)

        # Parameters group
        params_group = QGroupBox("Annotation Parameters")
        params_layout = QFormLayout()

        self.annot_page_num = QSpinBox()
        self.annot_page_num.setMinimum(1)
        self.annot_page_num.setMaximum(9999)
        params_layout.addRow("Page Number:", self.annot_page_num)

        self.annot_x = QDoubleSpinBox()
        self.annot_x.setMaximum(9999)
        params_layout.addRow("X Position:", self.annot_x)

        self.annot_y = QDoubleSpinBox()
        self.annot_y.setMaximum(9999)
        params_layout.addRow("Y Position:", self.annot_y)

        self.annot_width = QDoubleSpinBox()
        self.annot_width.setMaximum(9999)
        self.annot_width.setValue(100)
        params_layout.addRow("Width (for shapes):", self.annot_width)

        self.annot_height = QDoubleSpinBox()
        self.annot_height.setMaximum(9999)
        self.annot_height.setValue(50)
        params_layout.addRow("Height (for shapes):", self.annot_height)

        self.annot_text = QTextEdit()
        self.annot_text.setMaximumHeight(80)
        params_layout.addRow("Text Content:", self.annot_text)

        params_group.setLayout(params_layout)
        layout.addWidget(params_group)

        # Add annotation button
        add_annot_btn = QPushButton("Add Annotation")
        add_annot_btn.clicked.connect(self._add_annotation)
        layout.addWidget(add_annot_btn)

        # Status
        self.annotate_status_label = QLabel("")
        layout.addWidget(self.annotate_status_label)

        widget.setLayout(layout)
        return widget

    def _create_sign_tab(self) -> QWidget:
        """Create the PDF signing tab."""
        widget = QWidget()
        layout = QVBoxLayout()

        # PDF selection
        pdf_layout = QHBoxLayout()
        pdf_layout.addWidget(QLabel("PDF to Sign:"))
        self.sign_pdf_path = QLineEdit()
        self.sign_pdf_path.setReadOnly(True)
        pdf_layout.addWidget(self.sign_pdf_path)

        select_pdf_btn = QPushButton("Select PDF")
        select_pdf_btn.clicked.connect(self._select_sign_pdf)
        pdf_layout.addWidget(select_pdf_btn)

        layout.addLayout(pdf_layout)

        # Certificate selection
        cert_layout = QHBoxLayout()
        cert_layout.addWidget(QLabel("Certificate (.p12):"))
        self.cert_path = QLineEdit()
        self.cert_path.setReadOnly(True)
        cert_layout.addWidget(self.cert_path)

        select_cert_btn = QPushButton("Select Certificate")
        select_cert_btn.clicked.connect(self._select_certificate)
        cert_layout.addWidget(select_cert_btn)

        layout.addLayout(cert_layout)

        # Certificate password
        pwd_layout = QHBoxLayout()
        pwd_layout.addWidget(QLabel("Certificate Password:"))
        self.cert_password = QLineEdit()
        self.cert_password.setEchoMode(QLineEdit.Password)
        pwd_layout.addWidget(self.cert_password)
        layout.addLayout(pwd_layout)

        # Optional fields
        optional_group = QGroupBox("Optional Information")
        optional_layout = QFormLayout()

        self.sign_reason = QLineEdit()
        optional_layout.addRow("Reason:", self.sign_reason)

        self.sign_location = QLineEdit()
        optional_layout.addRow("Location:", self.sign_location)

        self.sign_contact = QLineEdit()
        optional_layout.addRow("Contact:", self.sign_contact)

        optional_group.setLayout(optional_layout)
        layout.addWidget(optional_group)

        # Sign button
        sign_btn = QPushButton("Sign PDF")
        sign_btn.clicked.connect(self._sign_pdf)
        layout.addWidget(sign_btn)

        # Validate button
        validate_btn = QPushButton("Validate Signature")
        validate_btn.clicked.connect(self._validate_signature)
        layout.addWidget(validate_btn)

        # Status
        self.sign_status_label = QLabel("")
        layout.addWidget(self.sign_status_label)

        widget.setLayout(layout)
        return widget

    # Merge tab methods
    def _add_merge_files(self):
        """Add files to the merge list."""
        files, _ = QFileDialog.getOpenFileNames(
            self, "Select PDF files", "", "PDF Files (*.pdf)"
        )
        if files:
            for file in files:
                self.merge_file_list.addItem(file)
            self.merge_status_label.setText(f"Added {len(files)} file(s)")

    def _remove_merge_files(self):
        """Remove selected files from the merge list."""
        for item in self.merge_file_list.selectedItems():
            self.merge_file_list.takeItem(self.merge_file_list.row(item))
        self.merge_status_label.setText("Removed selected files")

    def _clear_merge_files(self):
        """Clear all files from the merge list."""
        self.merge_file_list.clear()
        self.merge_status_label.setText("Cleared all files")

    def _merge_pdfs(self):
        """Merge the selected PDF files."""
        if self.merge_file_list.count() < 2:
            QMessageBox.warning(
                self,
                "Insufficient Files",
                "Please select at least 2 PDF files to merge.",
            )
            return

        files = [
            self.merge_file_list.item(i).text()
            for i in range(self.merge_file_list.count())
        ]

        output_path, _ = QFileDialog.getSaveFileName(
            self, "Save Merged PDF", "", "PDF Files (*.pdf)"
        )

        if not output_path:
            return

        try:
            merger = PDFMerger()
            merger.merge_pdfs(files, output_path)

            QMessageBox.information(
                self,
                "Success",
                f"Successfully merged {len(files)} files to:\n{output_path}",
            )
            self.merge_status_label.setText(
                f"Merged {len(files)} files → {output_path}"
            )
            self.statusBar().showMessage(f"Merged PDFs saved to {output_path}")

        except PDFMergerError as e:
            QMessageBox.critical(self, "Merge Error", str(e))
            self.merge_status_label.setText(f"Error: {str(e)}")

    # Annotate tab methods
    def _select_annotate_pdf(self):
        """Select a PDF file for annotation."""
        file, _ = QFileDialog.getOpenFileName(
            self, "Select PDF file", "", "PDF Files (*.pdf)"
        )
        if file:
            self.annotate_pdf_path.setText(file)
            self.annotate_status_label.setText(f"Selected: {Path(file).name}")

    def _add_annotation(self):
        """Add an annotation to the selected PDF."""
        pdf_path = self.annotate_pdf_path.text()

        if not pdf_path:
            QMessageBox.warning(self, "No PDF", "Please select a PDF file first.")
            return

        output_path, _ = QFileDialog.getSaveFileName(
            self, "Save Annotated PDF", "", "PDF Files (*.pdf)"
        )

        if not output_path:
            return

        try:
            with PDFAnnotator(pdf_path) as annotator:
                page_num = self.annot_page_num.value() - 1  # Convert to 0-indexed
                x = self.annot_x.value()
                y = self.annot_y.value()
                width = self.annot_width.value()
                height = self.annot_height.value()
                text = self.annot_text.toPlainText()

                annot_type = self.annotation_type.currentText()

                if annot_type == "Text Note":
                    annotator.add_text_annotation(page_num, (x, y), text)
                elif annot_type == "Highlight":
                    annotator.add_highlight(page_num, (x, y, x + width, y + height))
                elif annot_type == "Underline":
                    annotator.add_underline(page_num, (x, y, x + width, y + height))
                elif annot_type == "Strikeout":
                    annotator.add_strikeout(page_num, (x, y, x + width, y + height))
                elif annot_type == "Rectangle":
                    annotator.add_rectangle(page_num, (x, y, x + width, y + height))
                elif annot_type == "Circle":
                    annotator.add_circle(page_num, (x, y, x + width, y + height))
                elif annot_type == "Freehand Text":
                    annotator.add_freehand_text(page_num, (x, y), text)

                annotator.save(output_path)

            QMessageBox.information(
                self, "Success", f"Annotation added successfully to:\n{output_path}"
            )
            self.annotate_status_label.setText(f"Annotated PDF saved to {output_path}")
            self.statusBar().showMessage(f"Annotation saved to {output_path}")

        except PDFAnnotatorError as e:
            QMessageBox.critical(self, "Annotation Error", str(e))
            self.annotate_status_label.setText(f"Error: {str(e)}")

    # Sign tab methods
    def _select_sign_pdf(self):
        """Select a PDF file to sign."""
        file, _ = QFileDialog.getOpenFileName(
            self, "Select PDF to Sign", "", "PDF Files (*.pdf)"
        )
        if file:
            self.sign_pdf_path.setText(file)

    def _select_certificate(self):
        """Select a certificate file."""
        file, _ = QFileDialog.getOpenFileName(
            self, "Select Certificate", "", "Certificate Files (*.p12)"
        )
        if file:
            self.cert_path.setText(file)

    def _sign_pdf(self):
        """Sign the selected PDF."""
        pdf_path = self.sign_pdf_path.text()
        cert_path = self.cert_path.text()
        cert_password = self.cert_password.text()

        if not pdf_path:
            QMessageBox.warning(self, "No PDF", "Please select a PDF file to sign.")
            return

        if not cert_path:
            QMessageBox.warning(
                self, "No Certificate", "Please select a certificate file."
            )
            return

        if not cert_password:
            QMessageBox.warning(
                self, "No Password", "Please enter the certificate password."
            )
            return

        output_path, _ = QFileDialog.getSaveFileName(
            self, "Save Signed PDF", "", "PDF Files (*.pdf)"
        )

        if not output_path:
            return

        try:
            signer = PDFSigner()
            signer.sign_pdf(
                pdf_path,
                cert_path,
                cert_password,
                output_path,
                reason=self.sign_reason.text() or None,
                location=self.sign_location.text() or None,
                contact_info=self.sign_contact.text() or None,
            )

            QMessageBox.information(
                self, "Success", f"PDF signed successfully:\n{output_path}"
            )
            self.sign_status_label.setText(f"Signed PDF saved to {output_path}")
            self.statusBar().showMessage(f"PDF signed and saved to {output_path}")

        except PDFSignerError as e:
            QMessageBox.critical(self, "Signing Error", str(e))
            self.sign_status_label.setText(f"Error: {str(e)}")

    def _validate_signature(self):
        """Validate the signature of a PDF."""
        file, _ = QFileDialog.getOpenFileName(
            self, "Select Signed PDF to Validate", "", "PDF Files (*.pdf)"
        )

        if not file:
            return

        try:
            signer = PDFSigner()
            result = signer.validate_signature(file)

            QMessageBox.information(
                self, "Validation Result", f"Signature validation result:\n\n{result}"
            )
            self.sign_status_label.setText("Signature validated")

        except PDFSignerError as e:
            QMessageBox.critical(self, "Validation Error", str(e))
            self.sign_status_label.setText(f"Validation error: {str(e)}")

    def _show_about(self):
        """Show the about dialog."""
        QMessageBox.about(
            self,
            "About PDF Editor Tool",
            "PDF Editor Tool v1.0.0\n\n"
            "A lightweight desktop application for:\n"
            "- Merging PDFs\n"
            "- Annotating PDFs\n"
            "- Digitally signing PDFs\n\n"
            "Built with Python, PySide6, pikepdf, PyMuPDF, and pyHanko",
        )


def main():
    """Main entry point for the application."""
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    app = QApplication(sys.argv)
    window = PDFToolMainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
