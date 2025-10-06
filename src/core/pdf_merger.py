"""PDF merging functionality using pikepdf."""

import logging
from pathlib import Path
from typing import List, Union

from pikepdf import Pdf, PdfError

logger = logging.getLogger(__name__)


class PDFMergerError(Exception):
    """Custom exception for PDF merger errors."""

    pass


class PDFMerger:
    """Handles merging of PDF files."""

    @staticmethod
    def merge_pdfs(
        input_files: List[Union[str, Path]], output_path: Union[str, Path]
    ) -> None:
        """
        Merge multiple PDF files into a single output file.

        Args:
            input_files: List of paths to PDF files to merge
            output_path: Path where the merged PDF should be saved

        Raises:
            PDFMergerError: If merging fails or files are invalid
        """
        if not input_files:
            raise PDFMergerError("No input files provided")

        if len(input_files) < 2:
            raise PDFMergerError("At least 2 PDF files are required for merging")

        try:
            pdf = Pdf.new()

            for file_path in input_files:
                file_path = Path(file_path)

                if not file_path.exists():
                    raise PDFMergerError(f"File not found: {file_path}")

                if not file_path.suffix.lower() == ".pdf":
                    raise PDFMergerError(f"Not a PDF file: {file_path}")

                try:
                    src = Pdf.open(file_path)
                    pdf.pages.extend(src.pages)
                    logger.info(f"Added {len(src.pages)} pages from {file_path}")
                except PdfError as e:
                    raise PDFMergerError(f"Failed to open {file_path}: {str(e)}")

            output_path = Path(output_path)
            pdf.save(output_path)
            logger.info(
                f"Successfully merged {len(input_files)} files to {output_path}"
            )

        except PdfError as e:
            raise PDFMergerError(f"PDF processing error: {str(e)}")
        except Exception as e:
            raise PDFMergerError(f"Unexpected error during merge: {str(e)}")


def merge_pdfs(
    input_files: List[Union[str, Path]], output_path: Union[str, Path]
) -> None:
    """
    Convenience function to merge PDFs.

    Args:
        input_files: List of paths to PDF files to merge
        output_path: Path where the merged PDF should be saved
    """
    merger = PDFMerger()
    merger.merge_pdfs(input_files, output_path)
