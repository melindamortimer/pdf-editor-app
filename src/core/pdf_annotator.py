"""PDF annotation functionality using PyMuPDF (fitz)."""

import logging
from enum import Enum
from pathlib import Path
from typing import Union, Tuple, Optional

import fitz

logger = logging.getLogger(__name__)


class AnnotationType(Enum):
    """Supported annotation types."""

    TEXT = "text"
    HIGHLIGHT = "highlight"
    UNDERLINE = "underline"
    STRIKEOUT = "strikeout"
    SQUARE = "square"
    CIRCLE = "circle"


class PDFAnnotatorError(Exception):
    """Custom exception for PDF annotator errors."""

    pass


class PDFAnnotator:
    """Handles PDF annotation operations."""

    def __init__(self, pdf_path: Union[str, Path]):
        """
        Initialize the annotator with a PDF file.

        Args:
            pdf_path: Path to the PDF file to annotate
        """
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise PDFAnnotatorError(f"PDF file not found: {pdf_path}")

        try:
            self.doc = fitz.open(self.pdf_path)
        except Exception as e:
            raise PDFAnnotatorError(f"Failed to open PDF: {str(e)}")

    def add_text_annotation(
        self,
        page_num: int,
        position: Tuple[float, float],
        text: str,
        icon: str = "Comment",
    ) -> None:
        """
        Add a text annotation (sticky note) to a page.

        Args:
            page_num: Page number (0-indexed)
            position: (x, y) coordinates for the annotation
            text: The annotation text content
            icon: Icon type (Comment, Note, Help, etc.)
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            page.add_text_annot(position, text, icon=icon)
            logger.info(f"Added text annotation to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add text annotation: {str(e)}")

    def add_highlight(
        self,
        page_num: int,
        rect: Tuple[float, float, float, float],
        color: Tuple[float, float, float] = (1, 1, 0),
    ) -> None:
        """
        Add a highlight annotation to a page.

        Args:
            page_num: Page number (0-indexed)
            rect: Rectangle coordinates (x0, y0, x1, y1)
            color: RGB color tuple (values 0-1), default is yellow
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            highlight = page.add_highlight_annot(fitz.Rect(rect))
            highlight.set_colors(stroke=color)
            highlight.update()
            logger.info(f"Added highlight to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add highlight: {str(e)}")

    def add_underline(
        self,
        page_num: int,
        rect: Tuple[float, float, float, float],
        color: Tuple[float, float, float] = (0, 0, 1),
    ) -> None:
        """
        Add an underline annotation to a page.

        Args:
            page_num: Page number (0-indexed)
            rect: Rectangle coordinates (x0, y0, x1, y1)
            color: RGB color tuple (values 0-1), default is blue
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            underline = page.add_underline_annot(fitz.Rect(rect))
            underline.set_colors(stroke=color)
            underline.update()
            logger.info(f"Added underline to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add underline: {str(e)}")

    def add_strikeout(
        self,
        page_num: int,
        rect: Tuple[float, float, float, float],
        color: Tuple[float, float, float] = (1, 0, 0),
    ) -> None:
        """
        Add a strikeout annotation to a page.

        Args:
            page_num: Page number (0-indexed)
            rect: Rectangle coordinates (x0, y0, x1, y1)
            color: RGB color tuple (values 0-1), default is red
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            strikeout = page.add_strikeout_annot(fitz.Rect(rect))
            strikeout.set_colors(stroke=color)
            strikeout.update()
            logger.info(f"Added strikeout to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add strikeout: {str(e)}")

    def add_rectangle(
        self,
        page_num: int,
        rect: Tuple[float, float, float, float],
        color: Tuple[float, float, float] = (0, 0, 0),
        fill_color: Optional[Tuple[float, float, float]] = None,
        width: float = 1.0,
    ) -> None:
        """
        Add a rectangle annotation to a page.

        Args:
            page_num: Page number (0-indexed)
            rect: Rectangle coordinates (x0, y0, x1, y1)
            color: Border RGB color tuple (values 0-1), default is black
            fill_color: Optional fill RGB color tuple
            width: Border width
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            annot = page.add_rect_annot(fitz.Rect(rect))
            annot.set_colors(stroke=color, fill=fill_color)
            annot.set_border(width=width)
            annot.update()
            logger.info(f"Added rectangle to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add rectangle: {str(e)}")

    def add_circle(
        self,
        page_num: int,
        rect: Tuple[float, float, float, float],
        color: Tuple[float, float, float] = (0, 0, 0),
        fill_color: Optional[Tuple[float, float, float]] = None,
        width: float = 1.0,
    ) -> None:
        """
        Add a circle annotation to a page.

        Args:
            page_num: Page number (0-indexed)
            rect: Bounding rectangle coordinates (x0, y0, x1, y1)
            color: Border RGB color tuple (values 0-1), default is black
            fill_color: Optional fill RGB color tuple
            width: Border width
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            annot = page.add_circle_annot(fitz.Rect(rect))
            annot.set_colors(stroke=color, fill=fill_color)
            annot.set_border(width=width)
            annot.update()
            logger.info(f"Added circle to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add circle: {str(e)}")

    def add_freehand_text(
        self,
        page_num: int,
        position: Tuple[float, float],
        text: str,
        fontsize: int = 11,
        color: Tuple[float, float, float] = (0, 0, 0),
    ) -> None:
        """
        Add freehand text directly to a page.

        Args:
            page_num: Page number (0-indexed)
            position: (x, y) coordinates for the text
            text: The text to add
            fontsize: Font size
            color: RGB color tuple (values 0-1), default is black
        """
        try:
            if page_num < 0 or page_num >= len(self.doc):
                raise PDFAnnotatorError(f"Invalid page number: {page_num}")

            page = self.doc[page_num]
            page.insert_text(position, text, fontsize=fontsize, color=color)
            logger.info(f"Added freehand text to page {page_num}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to add freehand text: {str(e)}")

    def save(self, output_path: Union[str, Path]) -> None:
        """
        Save the annotated PDF to a file.

        Args:
            output_path: Path where the annotated PDF should be saved
        """
        try:
            output_path = Path(output_path)
            self.doc.save(output_path)
            logger.info(f"Saved annotated PDF to {output_path}")

        except Exception as e:
            raise PDFAnnotatorError(f"Failed to save PDF: {str(e)}")

    def close(self) -> None:
        """Close the PDF document."""
        if self.doc:
            self.doc.close()
            logger.info("Closed PDF document")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Convenience functions
def add_text_annotation(
    pdf_path: Union[str, Path],
    page_num: int,
    x: float,
    y: float,
    text: str,
    output_path: Union[str, Path],
) -> None:
    """
    Add a text annotation to a PDF (convenience function).

    Args:
        pdf_path: Path to the input PDF
        page_num: Page number (0-indexed)
        x: X coordinate
        y: Y coordinate
        text: Annotation text
        output_path: Path for the output PDF
    """
    with PDFAnnotator(pdf_path) as annotator:
        annotator.add_text_annotation(page_num, (x, y), text)
        annotator.save(output_path)
