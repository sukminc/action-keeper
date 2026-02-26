from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from fpdf import FPDF
from fpdf.enums import XPos, YPos


class AgreementPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "ActionKeeper Agreement Receipt", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def render_agreement_pdf(
    *,
    agreement_id: str,
    agreement_type: str,
    status: str,
    terms: Dict[str, Any],
    hash_value: str,
    verification_url: str,
    output_dir: str,
) -> Path:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    file_path = Path(output_dir) / f"{agreement_id}.pdf"

    pdf = AgreementPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Basic Info
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, f"Agreement ID: {agreement_id}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, f"Type: {agreement_type}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.cell(0, 8, f"Status: {status}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.ln(5)
    
    # Verification Info
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Verification Info:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("Helvetica", "", 10)
    # Use a fixed safe width (e.g., 180mm) instead of 0 to avoid space calculation errors
    pdf.multi_cell(180, 8, f"Hash: {hash_value}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(180, 6, f"URL: {verification_url}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(10)

    # Terms
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Agreement Terms:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("Helvetica", "", 10)

    def add_terms(data, indent=0):
        for key in sorted(data.keys()):
            val = data[key]
            prefix = "  " * indent + "- "
            if isinstance(val, dict):
                pdf.cell(0, 8, f"{prefix}{key}:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                add_terms(val, indent + 1)
            else:
                text = f"{prefix}{key}: {val}"
                pdf.multi_cell(180, 8, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    add_terms(terms)

    pdf.output(str(file_path))
    return file_path
