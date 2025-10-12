"""Full-size PDF viewer with annotation overlay."""

import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import fitz
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QScrollArea
from PySide6.QtCore import Qt, Signal, QPoint
from PySide6.QtGui import QPixmap, QImage, QPainter, QPen, QColor, QMouseEvent, QFont, QCursor

logger = logging.getLogger(__name__)


class FullPDFViewer(QWidget):
    """Full-size PDF viewer for the main editing area."""

    click_position = Signal(float, float)  # Emits (x, y) in PDF coordinates

    def __init__(self, parent=None):
        super().__init__(parent)
        self.pdf_path: Optional[str] = None
        self.current_page: int = 0
        self.doc: Optional[fitz.Document] = None
        self.pixmap: Optional[QPixmap] = None
        self.annotations: List[Dict[str, Any]] = []

        # Text preview state
        self.text_preview_mode: bool = False
        self.preview_font_size: int = 12
        self.preview_color: tuple = (0, 0, 0)
        self.mouse_pos: Optional[QPoint] = None

        self._setup_ui()

    def _setup_ui(self):
        """Setup the widget UI."""
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)

        # Scroll area
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(False)  # Changed to False to show actual size
        self.scroll_area.setAlignment(Qt.AlignCenter)
        self.scroll_area.setStyleSheet("QScrollArea { background-color: #2b2b2b; }")

        # Label to display PDF
        self.pdf_label = QLabel()
        self.pdf_label.setAlignment(Qt.AlignCenter)
        self.pdf_label.setScaledContents(False)  # Don't scale, show actual size
        self.pdf_label.setText("No page loaded\n\nAdd PDF files to begin")
        self.pdf_label.setStyleSheet(
            "QLabel { background-color: #2b2b2b; color: #888; font-size: 14pt; }"
        )
        self.pdf_label.mousePressEvent = self._on_label_click

        self.scroll_area.setWidget(self.pdf_label)
        layout.addWidget(self.scroll_area)

        self.setLayout(layout)

    def load_page(self, pdf_path: str, page_num: int):
        """
        Load and display a specific page.

        Args:
            pdf_path: Path to the PDF file
            page_num: Page number (0-indexed)
        """
        try:
            # Close previous document if different file
            if self.pdf_path != pdf_path:
                if self.doc:
                    self.doc.close()
                self.doc = fitz.open(pdf_path)
                self.pdf_path = pdf_path

            if page_num >= len(self.doc):
                logger.error(f"Page {page_num} not found in {pdf_path}")
                self.pdf_label.setText("Error: Page not found")
                return

            self.current_page = page_num
            self._render_page()

            logger.info(f"Loaded page {page_num} from {pdf_path}")

        except Exception as e:
            logger.error(f"Failed to load page: {e}")
            self.pdf_label.setText(f"Error loading page:\n{str(e)}")
            self.pdf_label.setStyleSheet(
                "QLabel { background-color: #2b2b2b; color: #ff5555; font-size: 12pt; }"
            )

    def _render_page(self):
        """Render the current page with annotations."""
        if not self.doc or self.current_page >= len(self.doc):
            return

        try:
            page = self.doc[self.current_page]

            # Calculate zoom to fit BOTH width AND height in available space
            available_width = self.scroll_area.width() - 20  # Account for scrollbar/padding
            available_height = self.scroll_area.height() - 20  # Account for padding
            page_width = page.rect.width
            page_height = page.rect.height

            # Calculate zoom to fit width and height
            zoom_to_fit_width = available_width / page_width if page_width > 0 else 1.5
            zoom_to_fit_height = available_height / page_height if page_height > 0 else 1.5

            # Use the SMALLER zoom to ensure entire page fits without scrolling
            zoom_factor = min(zoom_to_fit_width, zoom_to_fit_height)

            # Use minimum zoom of 0.5 and maximum of 3.0
            zoom_factor = max(0.5, min(3.0, zoom_factor))

            # Render page to pixmap at calculated zoom
            mat = fitz.Matrix(zoom_factor, zoom_factor)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            # Convert to QPixmap
            img_data = pix.tobytes("png")
            qimage = QImage()
            qimage.loadFromData(img_data)
            self.pixmap = QPixmap.fromImage(qimage)

            # Store the zoom factor for annotation drawing
            self.current_zoom_factor = zoom_factor

            # Draw pending annotations
            if self.annotations:
                painter = QPainter(self.pixmap)
                painter.setRenderHint(QPainter.Antialiasing)
                for annot in self.annotations:
                    self._draw_annotation(painter, annot)
                painter.end()

            self.pdf_label.setPixmap(self.pixmap)
            self.pdf_label.adjustSize()
            self.pdf_label.setStyleSheet("QLabel { background-color: #2b2b2b; }")

        except Exception as e:
            logger.error(f"Failed to render page: {e}")
            self.pdf_label.setText(f"Error rendering:\n{str(e)}")

    def _draw_annotation(self, painter: QPainter, annot: Dict[str, Any]):
        """
        Draw an annotation on the painter.

        Args:
            painter: QPainter object
            annot: Annotation dictionary
        """
        try:
            annot_type = annot.get("type", "text")
            zoom = getattr(self, 'current_zoom_factor', 1.5)
            x = annot["x"] * zoom
            y = annot["y"] * zoom

            if annot_type == "text":
                # Draw text annotation
                color = QColor(*[int(c * 255) for c in annot.get("color", (0, 0, 0))])
                font = QFont()
                font.setPointSize(int(annot.get("font_size", 11) * zoom / 2))
                painter.setFont(font)
                painter.setPen(QPen(color))
                painter.drawText(int(x), int(y), annot.get("text", ""))

                # Draw position marker
                painter.setPen(QPen(QColor(255, 0, 0, 100), 2))
                painter.drawEllipse(int(x) - 4, int(y) - 4, 8, 8)

            elif annot_type == "highlight":
                # Draw highlight rectangle
                color = QColor(*[int(c * 255) for c in annot.get("color", (1, 1, 0))])
                color.setAlpha(100)
                painter.fillRect(
                    int(x),
                    int(y),
                    int(annot.get("width", 100) * zoom),
                    int(annot.get("height", 20) * zoom),
                    color,
                )

        except Exception as e:
            logger.error(f"Failed to draw annotation: {e}")

    def _on_label_click(self, event: QMouseEvent):
        """Handle mouse click on the PDF."""
        if not self.doc or not self.pixmap:
            return

        click_pos = event.pos()
        label_rect = self.pdf_label.rect()
        pixmap_rect = self.pixmap.rect()

        # Calculate offset for centered pixmap
        x_offset = (label_rect.width() - pixmap_rect.width()) / 2
        y_offset = (label_rect.height() - pixmap_rect.height()) / 2

        # Convert to pixmap coordinates
        x_pixmap = click_pos.x() - x_offset
        y_pixmap = click_pos.y() - y_offset

        # Check if click is within pixmap bounds
        if 0 <= x_pixmap <= pixmap_rect.width() and 0 <= y_pixmap <= pixmap_rect.height():
            # Convert to PDF coordinates using current zoom factor
            zoom = getattr(self, 'current_zoom_factor', 1.5)
            x_pdf = x_pixmap / zoom
            y_pdf = y_pixmap / zoom

            self.click_position.emit(x_pdf, y_pdf)

    def add_annotation_preview(self, annot_dict: Dict[str, Any]):
        """Add an annotation preview."""
        self.annotations.append(annot_dict)
        self._render_page()

    def clear_annotations(self):
        """Clear all annotation previews."""
        self.annotations.clear()
        self._render_page()

    def set_annotations(self, annotations: List[Dict[str, Any]]):
        """Set the full list of annotations to display."""
        self.annotations = annotations.copy()
        self._render_page()

    def close_document(self):
        """Close the current document."""
        if self.doc:
            self.doc.close()
            self.doc = None
        self.pdf_path = None
        self.pixmap = None
        self.annotations.clear()
        self.pdf_label.setText("No page loaded\n\nAdd PDF files to begin")
        self.pdf_label.setStyleSheet(
            "QLabel { background-color: #2b2b2b; color: #888; font-size: 14pt; }"
        )
