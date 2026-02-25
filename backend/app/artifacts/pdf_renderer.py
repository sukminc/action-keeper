from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Iterable


def _escape(text: str) -> str:
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _lines_from_terms(terms: Dict[str, Any]) -> Iterable[str]:
    for key in sorted(terms.keys()):
        value = terms[key]
        if isinstance(value, dict):
            yield f"- {key}:"
            for inner_line in _lines_from_terms(value):
                yield f"  {inner_line}"
        else:
            yield f"- {key}: {value}"


def _build_content(lines: list[tuple[str, int, float]]) -> str:
    cursor_y = 792 - 72
    ops = ["BT"]
    for text, size, leading in lines:
        cursor_y -= leading
        ops.append(f"/F1 {size} Tf")
        ops.append(f"1 0 0 1 72 {cursor_y:.2f} Tm")
        ops.append(f"({_escape(text)}) Tj")
    ops.append("ET")
    return "\n".join(ops)


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

    lines: list[tuple[str, int, float]] = []
    lines.append(("ActionKeeper Agreement Receipt", 20, 32.0))
    lines.append((f"Agreement ID: {agreement_id}", 12, 18.0))
    lines.append((f"Type: {agreement_type}", 12, 14.0))
    lines.append((f"Status: {status}", 12, 14.0))
    lines.append((f"Hash: {hash_value}", 12, 14.0))
    lines.append(("Verification URL:", 12, 16.0))
    lines.append((verification_url, 10, 12.0))
    lines.append(("Terms:", 12, 18.0))
    for term_line in _lines_from_terms(terms):
        lines.append((term_line, 10, 12.0))

    content_stream = _build_content(lines)
    content_bytes = content_stream.encode("latin-1")

    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content_bytes)} >>\nstream\n{content_stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf_parts = ["%PDF-1.4\n"]
    offsets: list[int] = []
    for idx, obj in enumerate(objects, start=1):
        offsets.append(sum(len(part.encode("latin-1")) for part in pdf_parts))
        pdf_parts.append(f"{idx} 0 obj\n{obj}\nendobj\n")
    pdf_body = "".join(pdf_parts)
    xref_offset = len(pdf_body.encode("latin-1"))
    xref_lines = [
        "xref",
        f"0 {len(objects) + 1}",
        "0000000000 65535 f \n",
    ]
    for off in offsets:
        xref_lines.append(f"{off:010d} 00000 n \n")
    xref_lines.append("trailer")
    xref_lines.append(f"<< /Size {len(objects)+1} /Root 1 0 R >>")
    xref_lines.append("startxref")
    xref_lines.append(str(xref_offset))
    xref_lines.append("%%EOF")
    pdf_data = pdf_body + "\n".join(xref_lines)

    file_path.write_bytes(pdf_data.encode("latin-1"))
    return file_path
