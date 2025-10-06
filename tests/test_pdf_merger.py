"""Tests for PDF merger functionality."""

import pytest
from pathlib import Path
from src.core.pdf_merger import PDFMerger, PDFMergerError, merge_pdfs


class TestPDFMerger:
    """Test cases for PDFMerger class."""

    def test_merge_pdfs_insufficient_files(self):
        """Test that merging requires at least 2 files."""
        merger = PDFMerger()

        with pytest.raises(PDFMergerError, match="No input files"):
            merger.merge_pdfs([], "output.pdf")

        with pytest.raises(PDFMergerError, match="At least 2 PDF files"):
            merger.merge_pdfs(["single.pdf"], "output.pdf")

    def test_merge_pdfs_file_not_found(self):
        """Test that merging fails with non-existent files."""
        merger = PDFMerger()

        with pytest.raises(PDFMergerError, match="File not found"):
            merger.merge_pdfs(["nonexistent1.pdf", "nonexistent2.pdf"], "output.pdf")

    def test_merge_pdfs_invalid_extension(self, tmp_path):
        """Test that merging fails with non-PDF files."""
        # Create dummy non-PDF files
        file1 = tmp_path / "file1.txt"
        file2 = tmp_path / "file2.txt"
        file1.write_text("test")
        file2.write_text("test")

        merger = PDFMerger()

        with pytest.raises(PDFMergerError, match="Not a PDF file"):
            merger.merge_pdfs([str(file1), str(file2)], "output.pdf")

    def test_convenience_function(self):
        """Test that the convenience function works."""
        with pytest.raises(PDFMergerError):
            merge_pdfs([], "output.pdf")


# Note: Full integration tests would require actual PDF files
# These tests focus on error handling and validation logic
