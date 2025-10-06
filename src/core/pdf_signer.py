"""PDF digital signing functionality using pyHanko."""

import logging
import subprocess
from pathlib import Path
from typing import Union, Optional

logger = logging.getLogger(__name__)


class PDFSignerError(Exception):
    """Custom exception for PDF signing errors."""

    pass


class PDFSigner:
    """Handles digital signing of PDF files."""

    @staticmethod
    def sign_pdf(
        input_pdf: Union[str, Path],
        cert_path: Union[str, Path],
        cert_password: str,
        output_pdf: Union[str, Path],
        reason: Optional[str] = None,
        location: Optional[str] = None,
        contact_info: Optional[str] = None,
    ) -> None:
        """
        Digitally sign a PDF using a PKCS#12 certificate.

        Args:
            input_pdf: Path to the input PDF file
            cert_path: Path to the PKCS#12 (.p12) certificate file
            cert_password: Password for the certificate
            output_pdf: Path for the signed output PDF
            reason: Optional reason for signing
            location: Optional location of signing
            contact_info: Optional contact information

        Raises:
            PDFSignerError: If signing fails
        """
        input_pdf = Path(input_pdf)
        cert_path = Path(cert_path)
        output_pdf = Path(output_pdf)

        # Validate inputs
        if not input_pdf.exists():
            raise PDFSignerError(f"Input PDF not found: {input_pdf}")

        if not cert_path.exists():
            raise PDFSignerError(f"Certificate file not found: {cert_path}")

        if not cert_path.suffix.lower() == ".p12":
            raise PDFSignerError(f"Certificate must be a .p12 file: {cert_path}")

        # Build the pyhanko command
        cmd = [
            "pyhanko",
            "sign",
            "addsig",
            "--p12-file",
            str(cert_path),
            "--p12-password",
            cert_password,
        ]

        # Add optional parameters
        if reason:
            cmd.extend(["--reason", reason])

        if location:
            cmd.extend(["--location", location])

        if contact_info:
            cmd.extend(["--contact-info", contact_info])

        # Add input and output files
        cmd.extend([str(input_pdf), "-o", str(output_pdf)])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            logger.info(f"Successfully signed PDF: {output_pdf}")
            if result.stdout:
                logger.debug(f"pyhanko output: {result.stdout}")

        except subprocess.CalledProcessError as e:
            error_msg = f"Failed to sign PDF: {e.stderr if e.stderr else str(e)}"
            logger.error(error_msg)
            raise PDFSignerError(error_msg)

        except FileNotFoundError:
            raise PDFSignerError(
                "pyhanko command not found. Please ensure pyHanko is installed."
            )

    @staticmethod
    def validate_signature(pdf_path: Union[str, Path]) -> None:
        """
        Validate signatures in a PDF file.

        Args:
            pdf_path: Path to the signed PDF file

        Raises:
            PDFSignerError: If validation fails
        """
        pdf_path = Path(pdf_path)

        if not pdf_path.exists():
            raise PDFSignerError(f"PDF file not found: {pdf_path}")

        cmd = ["pyhanko", "sign", "validate", str(pdf_path)]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            logger.info(f"Signature validation completed for: {pdf_path}")
            if result.stdout:
                logger.info(f"Validation result: {result.stdout}")

            return result.stdout

        except subprocess.CalledProcessError as e:
            error_msg = (
                f"Signature validation failed: {e.stderr if e.stderr else str(e)}"
            )
            logger.error(error_msg)
            raise PDFSignerError(error_msg)

        except FileNotFoundError:
            raise PDFSignerError(
                "pyhanko command not found. Please ensure pyHanko is installed."
            )


def sign_pdf(
    input_pdf: Union[str, Path],
    cert_path: Union[str, Path],
    cert_password: str,
    output_pdf: Union[str, Path],
) -> None:
    """
    Convenience function to sign a PDF.

    Args:
        input_pdf: Path to the input PDF file
        cert_path: Path to the PKCS#12 (.p12) certificate file
        cert_password: Password for the certificate
        output_pdf: Path for the signed output PDF
    """
    signer = PDFSigner()
    signer.sign_pdf(input_pdf, cert_path, cert_password, output_pdf)
