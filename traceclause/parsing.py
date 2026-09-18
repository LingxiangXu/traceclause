"""Parse source blocks without inventing page numbers or altering quotations."""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import re
import zipfile

from docx import Document
from docx.table import Table
from pypdf import PdfReader

MAX_BYTES = 10 * 1024 * 1024


def parse_document(filename: str, content: bytes) -> dict:
    if not content or len(content) > MAX_BYTES:
        raise ValueError("文件为空或超过 10 MB。")
    suffix = Path(filename).suffix.lower()
    blocks, warnings = [], []

    def add(text, location):
        text = text.strip()
        if text:
            blocks.append({"id": len(blocks), "text": text, "location": location})

    try:
        if suffix in {".txt", ".md"}:
            text = content.decode("utf-8-sig")
            for line, value in enumerate(text.splitlines(), 1):
                if value.strip() and not value.lstrip().startswith("#"):
                    add(value, f"第 {line} 行")
        elif suffix == ".pdf":
            reader = PdfReader(BytesIO(content))
            if reader.is_encrypted:
                raise ValueError("请先解除 PDF 密码保护。")
            if len(reader.pages) > 200:
                raise ValueError("第一版最多处理 200 页 PDF。")
            for page_no, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ""
                if not text.strip():
                    warnings.append(f"第 {page_no} 页无可提取文字，可能需要 OCR。")
                # Preserve complete paragraphs; avoid cutting a wrapped sentence into claims.
                for paragraph in re.split(r"\n\s*\n", text):
                    add(paragraph, f"第 {page_no} 页")
        elif suffix == ".docx":
            with zipfile.ZipFile(BytesIO(content)) as archive:
                if sum(i.file_size for i in archive.infolist()) > 50 * 1024 * 1024:
                    raise ValueError("DOCX 解压后过大。")
            doc = Document(BytesIO(content))
            paragraph_no, table_no = 0, 0
            for item in doc.iter_inner_content():
                if isinstance(item, Table):
                    table_no += 1
                    for row_no, row in enumerate(item.rows, 1):
                        add(" | ".join(cell.text for cell in row.cells), f"表 {table_no} · 第 {row_no} 行")
                else:
                    paragraph_no += 1
                    add(item.text, f"第 {paragraph_no} 段")
            warnings.append("DOCX 使用段落与表格定位；未推测分页。")
        else:
            raise ValueError("支持 PDF、DOCX、UTF-8 TXT 和 Markdown 文件。")
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("文件解析失败，请检查格式或文件是否损坏。") from exc
    if not blocks:
        raise ValueError("未提取到文字。扫描 PDF 请先进行 OCR。")
    if sum(len(b["text"]) for b in blocks) > 500_000 or len(blocks) > 5000:
        raise ValueError("文档过长，请拆分为不超过 50 万字、5000 个段落的文件。")
    return {"filename": filename.replace("\\", "/").split("/")[-1],
            "sha256": sha256(content).hexdigest(), "blocks": blocks, "warnings": warnings}


def extract_requirements(document: dict) -> list[dict]:
    """Heuristic extraction; retain exact text and offsets for auditability."""
    clauses = []
    marker = re.compile(r"应当|应支持|应提供|应具备|应实现|应记录|应保存|应满足|必须|须|需支持|要求|不得|至少|不少于|不超过|支持|\b(?:must|shall|required)\b", re.I)
    for block in document["blocks"]:
        for match in re.finditer(r"[^。！？!?\n]+[。！？!?]?", block["text"]):
            text = match.group().strip()
            if len(text) >= 6 and marker.search(text):
                start = match.start() + len(match.group()) - len(match.group().lstrip())
                clauses.append({"id": len(clauses), "text": text, "block_id": block["id"],
                                "location": block["location"], "start": start, "end": start + len(text)})
    if not clauses:
        raise ValueError("未识别出要求条款。请使用包含“必须”“应支持”“不得”等要求表述的文件。")
    if len(clauses) > 500:
        raise ValueError("第一版每次最多核验 500 条要求，请拆分需求文件。")
    return clauses
