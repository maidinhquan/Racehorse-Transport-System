"""Bind the reference DOCX without flattening its runs, then render using an explicit runtime.

Phase-1 fictional runtime/layout spike only: no Word/WPS COM, online upload or SQL writes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import uuid
import zipfile
from copy import deepcopy
from datetime import datetime, timezone
from lxml import etree
from pypdf import PdfReader

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
TOKEN = re.compile(r"\{\{([^{}]+)\}\}")


def bind_xml(data: bytes, values: dict[str, str], footer: bool = False) -> tuple[bytes, int]:
    root = etree.fromstring(data, etree.XMLParser(resolve_entities=False, no_network=True))
    replaced = 0
    for paragraph in root.xpath("//w:p", namespaces=NS):
        nodes = paragraph.xpath(".//w:t", namespaces=NS)
        original = [node.text or "" for node in nodes]
        text = "".join(original)
        offsets, end = [], 0
        for part in original:
            offsets.append((end, end + len(part)))
            end += len(part)
        # Later replacements do not move the original prefix positions of earlier tokens.
        for match in reversed(list(TOKEN.finditer(text))):
            key = match.group(1)
            if key not in values:
                raise ValueError(f"Missing fixture value for {key}")
            first = next(i for i, (a, b) in enumerate(offsets) if a <= match.start() < b)
            last = next(i for i, (a, b) in enumerate(offsets) if a < match.end() <= b)
            prefix = (nodes[first].text or "")[:match.start() - offsets[first][0]]
            suffix = (nodes[last].text or "")[match.end() - offsets[last][0]:]
            nodes[first].text = prefix + values[key] + (suffix if first == last else "")
            if first != last:
                for i in range(first + 1, last):
                    nodes[i].text = ""
                nodes[last].text = suffix
            nodes[first].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            replaced += 1
        if TOKEN.search("".join(n.text or "" for n in nodes)):
            raise ValueError("A visible placeholder remains after binding")
    # Template-only QA fixes on the generated copy, never on the retained reference:
    # do not leave half a bilingual table label on the next page.
    for row in root.xpath("//w:tr", namespaces=NS):
        properties = row.find("w:trPr", NS)
        if properties is None:
            properties = etree.Element("{" + NS["w"] + "}trPr")
            row.insert(0, properties)
        if properties.find("w:cantSplit", NS) is None:
            etree.SubElement(properties, "{" + NS["w"] + "}cantSplit")
    if footer:
        for paragraph in root.xpath("//w:p", namespaces=NS):
            text = "".join(paragraph.xpath(".//w:t/text()", namespaces=NS))
            if "Trang / Page" in text and not paragraph.xpath(".//w:fldSimple|.//w:instrText", namespaces=NS):
                field = etree.SubElement(paragraph, "{" + NS["w"] + "}fldSimple")
                field.set("{" + NS["w"] + "}instr", "PAGE")
                run = etree.SubElement(field, "{" + NS["w"] + "}r")
                styles = paragraph.xpath(".//w:rPr", namespaces=NS)
                if styles:
                    run.append(deepcopy(styles[0]))
                etree.SubElement(run, "{" + NS["w"] + "}t").text = "1"
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True), replaced


def main() -> None:
    cli = argparse.ArgumentParser()
    cli.add_argument("--template", required=True, type=Path)
    cli.add_argument("--fixture", required=True, type=Path)
    cli.add_argument("--soffice", required=True, type=Path)
    cli.add_argument("--output", required=True, type=Path)
    args = cli.parse_args()
    template, engine, out = args.template.resolve(), args.soffice.resolve(), args.output.resolve()
    if not template.is_file() or not engine.is_file():
        raise FileNotFoundError("Template and explicit LibreOffice executable must exist")
    out.mkdir(parents=True, exist_ok=True)
    docx = out / "flow1-render-spike.docx"
    pdf = docx.with_suffix(".pdf")
    if docx == template:
        raise ValueError("Output cannot overwrite the source template")
    if pdf.exists():
        raise FileExistsError("Use a new output directory to avoid validating a stale PDF")
    values = json.loads(args.fixture.read_text(encoding="utf-8-sig"))
    count = 0
    with zipfile.ZipFile(template) as source, zipfile.ZipFile(docx, "w") as target:
        for item in source.infolist():
            data = source.read(item.filename)
            if item.filename.startswith("word/") and item.filename.endswith(".xml"):
                data, bound = bind_xml(data, values, footer=item.filename.startswith("word/footer"))
                count += bound
            target.writestr(item, data)
    profile = out / ("profile-" + uuid.uuid4().hex)
    command = [str(engine), "-env:UserInstallation=" + profile.as_uri(), "--headless",
               "--nologo", "--nodefault", "--norestore", "--convert-to", "pdf:writer_pdf_Export",
               "--outdir", str(out), str(docx)]
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    result = subprocess.run(command, capture_output=True, timeout=90, creationflags=flags)
    (out / "conversion.log").write_bytes(result.stdout + b"\n" + result.stderr)
    if result.returncode != 0 or not pdf.is_file() or pdf.stat().st_size == 0:
        raise RuntimeError("LibreOffice did not produce a PDF; inspect conversion.log")
    reader = PdfReader(pdf)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    (out / "pdf-text.txt").write_text(text, encoding="utf-8")
    if TOKEN.search(text):
        raise RuntimeError("PDF still contains unresolved placeholders")
    for required in ["DEMO-FLOW1-001", "115.000.000", "46.000.000", "Nguyễn Văn Demo"]:
        if required not in text:
            raise RuntimeError(f"Expected bound PDF content not found: {required}")
    version = subprocess.run([str(engine), "--version"], capture_output=True, timeout=15,
                             creationflags=flags).stdout.decode("utf-8", "replace").strip()
    summary = {
        "runtime": version, "executable": str(engine), "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "templateSha256": hashlib.sha256(template.read_bytes()).hexdigest(),
        "pdfSha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
        "placeholdersBound": count, "pages": len(reader.pages), "pdfBytes": pdf.stat().st_size,
        "docx": str(docx), "pdf": str(pdf), "visualQa": "PENDING - inspect rendered page images",
        "layoutAdjustments": ["Prevent split table rows in generated copy", "Fill PAGE field in the existing footer"]
    }
    (out / "spike-result.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
