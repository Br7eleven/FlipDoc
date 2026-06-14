"""
Layout Analyzer — Detects tables, columns, reading order, and document structure
for high-fidelity PDF to Word conversion.

Uses PyMuPDF's built-in table detection (v1.23+) plus custom analysis
for column layout, heading hierarchy, and reading order.
"""

import logging
import fitz  # PyMuPDF
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class TextBlock:
    """Represents a block of text with position and style info."""
    text: str
    bbox: tuple  # (x0, y0, x1, y1) in page coords
    block_type: str = 'paragraph'  # 'heading', 'paragraph', 'list', 'table_cell'
    font_name: str = ''
    font_size: float = 0.0
    is_bold: bool = False
    is_italic: bool = False
    reading_order: int = 0
    column: int = 0


@dataclass
class TableBlock:
    """Represents a detected table."""
    bbox: tuple
    rows: list[list[str]] = field(default_factory=list)
    col_count: int = 0
    row_count: int = 0
    confidence: float = 0.0


@dataclass
class PageLayout:
    """Full layout analysis of a single page."""
    page_num: int
    width: float
    height: float
    columns: list[tuple] = field(default_factory=list)  # [(x0, x1), ...]
    text_blocks: list[TextBlock] = field(default_factory=list)
    tables: list[TableBlock] = field(default_factory=list)
    is_scanned: bool = False
    has_images: bool = False
    reading_order: list[int] = field(default_factory=list)  # indices into text_blocks


class LayoutAnalyzer:
    """
    Analyzes PDF pages for layout structure:
    - Table detection
    - Column detection
    - Reading order inference
    - Heading hierarchy detection
    - Text/image region separation
    """

    def __init__(self):
        self._fitz_version = tuple(map(int, fitz.version[0].split('.')))
        self._has_table_detection = self._fitz_version >= (1, 23, 0)
        if not self._has_table_detection:
            logger.info("PyMuPDF < 1.23 — table detection disabled")

    # ─── Page Layout Analysis ───────────────────────────────────

    def analyze_page(self, page: fitz.Page, page_num: int) -> PageLayout:
        """
        Full page layout analysis.

        Args:
            page: PyMuPDF Page object
            page_num: 0-based page number

        Returns:
            PageLayout with complete analysis
        """
        rect = page.rect
        layout = PageLayout(
            page_num=page_num,
            width=rect.width,
            height=rect.height,
        )

        # 1. Extract text blocks with position and style info
        layout.text_blocks = self._extract_text_blocks(page)

        # 2. Detect columns from text block positions
        layout.columns = self._detect_columns(layout.text_blocks, layout.width)

        # 3. Assign blocks to columns
        self._assign_columns(layout.text_blocks, layout.columns)

        # 4. Detect tables
        if self._has_table_detection:
            layout.tables = self._detect_tables(page)

        # 5. Detect headings
        self._detect_headings(layout.text_blocks)

        # 6. Compute reading order
        layout.reading_order = self._compute_reading_order(layout.text_blocks, layout.columns)

        # 7. Check if page is scanned (no extractable text)
        layout.is_scanned = all(not b.text.strip() for b in layout.text_blocks)
        layout.has_images = bool(page.get_images())

        return layout

    # ─── Text Block Extraction ──────────────────────────────────

    def _extract_text_blocks(self, page: fitz.Page) -> list[TextBlock]:
        """Extract text blocks with detailed position and style information."""
        blocks = []

        # Use 'dict' mode for structured extraction
        try:
            text_dict = page.get_text("dict")
            block_num = 0

            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:  # Text block
                    for line in block.get("lines", []):
                        line_text_parts = []
                        font_name = ''
                        font_size = 0.0
                        is_bold = False
                        is_italic = False

                        for span in line.get("spans", []):
                            line_text_parts.append(span.get("text", ""))
                            if not font_name:
                                font_name = span.get("font", "")
                                font_size = span.get("size", 0.0)
                                # Check font flags for bold/italic
                                flags = span.get("flags", 0)
                                is_bold = bool(flags & 2**3)  # bit 3 = bold
                                is_italic = bool(flags & 2**1)  # bit 1 = italic

                        line_text = ''.join(line_text_parts).strip()
                        if line_text:
                            bbox = line["bbox"]
                            blocks.append(TextBlock(
                                text=line_text,
                                bbox=tuple(bbox),
                                font_name=font_name,
                                font_size=font_size,
                                is_bold=is_bold,
                                is_italic=is_italic,
                                block_type='paragraph',
                                reading_order=block_num,
                            ))
                            block_num += 1

                elif block.get("type") == 1:  # Image block
                    # Mark as having images but don't create text block
                    pass

        except Exception as e:
            logger.debug(f"Dict extraction failed, falling back to text: {e}")
            # Fallback: simple text extraction
            text = page.get_text("text")
            if text.strip():
                blocks.append(TextBlock(
                    text=text.strip(),
                    bbox=(50, 50, page.rect.width - 50, page.rect.height - 50),
                    block_type='paragraph',
                    reading_order=0,
                ))

        return blocks

    # ─── Column Detection ───────────────────────────────────────

    def _detect_columns(self, text_blocks: list[TextBlock], page_width: float) -> list[tuple]:
        """
        Detect column layout from text block positions.

        Uses x-coordinate clustering to find column boundaries.
        """
        if not text_blocks:
            return [(0, page_width)]

        # Collect all x positions (block centers)
        x_centers = []
        for block in text_blocks:
            cx = (block.bbox[0] + block.bbox[2]) / 2
            x_centers.append(cx)

        x_centers.sort()

        # Cluster x-centers — find gaps wider than 15% of page width
        gap_threshold = page_width * 0.15
        columns = []
        cluster_start = 0
        column_x_start = 0

        for i in range(1, len(x_centers)):
            gap = x_centers[i] - x_centers[i - 1]
            if gap > gap_threshold and x_centers[i - 1] > column_x_start + page_width * 0.05:
                # Found column boundary
                col_right = x_centers[i - 1] + page_width * 0.05
                columns.append((column_x_start, col_right))
                column_x_start = x_centers[i] - page_width * 0.05

        # Last column
        columns.append((column_x_start, page_width))

        # If only one column detected, check if it covers most of the page
        if len(columns) == 1:
            return [(0, page_width)]

        # Merge columns that are very close
        merged = [columns[0]]
        for col in columns[1:]:
            prev = merged[-1]
            if col[0] - prev[1] < gap_threshold * 0.5:
                merged[-1] = (prev[0], col[1])
            else:
                merged.append(col)

        return merged if len(merged) > 1 else [(0, page_width)]

    def _assign_columns(self, text_blocks: list[TextBlock], columns: list[tuple]):
        """Assign each text block to a column."""
        for block in text_blocks:
            cx = (block.bbox[0] + block.bbox[2]) / 2
            for i, (col_x0, col_x1) in enumerate(columns):
                if col_x0 - 10 <= cx <= col_x1 + 10:
                    block.column = i
                    break

    # ─── Table Detection ────────────────────────────────────────

    def _detect_tables(self, page: fitz.Page) -> list[TableBlock]:
        """
        Detect tables on the page using PyMuPDF's built-in table finder.

        Only available in PyMuPDF >= 1.23.0
        """
        tables = []

        try:
            found_tables = page.find_tables(
                strategy='lines',       # Detect from ruling lines
                vertical_strategy='lines',
                horizontal_strategy='lines',
            )

            if found_tables and found_tables.tables:
                for table in found_tables.tables:
                    # Extract cell content
                    rows = []
                    for row in table.extract():
                        # Each cell is a string or None
                        cleaned_row = [str(cell).strip() if cell else '' for cell in row]
                        rows.append(cleaned_row)

                    if rows:
                        tables.append(TableBlock(
                            bbox=tuple(table.bbox),
                            rows=rows,
                            row_count=len(rows),
                            col_count=len(rows[0]) if rows else 0,
                            confidence=0.9,  # PyMuPDF confidence
                        ))

        except Exception as e:
            logger.debug(f"Table detection failed for page {page.number}: {e}")

            # Fallback: try text-based table detection
            text_tables = self._detect_tables_from_text(page)
            if text_tables:
                tables.extend(text_tables)

        return tables

    def _detect_tables_from_text(self, page: fitz.Page) -> list[TableBlock]:
        """
        Fallback table detection from text patterns.
        Looks for aligned text that resembles tabular data.
        """
        # Get text with positions
        blocks = page.get_text("blocks")
        if len(blocks) < 3:
            return []

        # Sort blocks by y-position (top to bottom)
        blocks_sorted = sorted(blocks, key=lambda b: (b[1], b[0]))

        # Look for rows of blocks at the same y-position with 3+ entries
        tables = []
        y_tolerance = 15  # pixels — blocks within this y-range are "same row"

        rows = []
        current_row = []
        current_y = -1

        for block in blocks_sorted:
            x0, y0, x1, y1, text, *_ = block
            if not text.strip():
                continue

            if current_y < 0 or abs(y0 - current_y) > y_tolerance:
                if len(current_row) >= 3:
                    rows.append(current_row)
                elif current_row:
                    # Not a table row, reset
                    pass
                current_row = [(x0, text.strip())]
                current_y = y0
            else:
                current_row.append((x0, text.strip()))

        # Check last row
        if len(current_row) >= 3:
            rows.append(current_row)

        # If we have consistent columns, it's likely a table
        if len(rows) >= 2:
            # Sort each row by x-position
            sorted_rows = []
            for row in rows:
                sorted_row = [cell[1] for cell in sorted(row, key=lambda c: c[0])]
                sorted_rows.append(sorted_row)

            col_count = max(len(r) for r in sorted_rows) if sorted_rows else 0
            bbox = (
                min(r[0][0] for r in rows if r),
                min(r[0][1] for r in rows if r) if rows else 0,
                max(r[-1][0] for r in rows if r),
                max(r[-1][1] for r in rows if r) if rows else 0,
            )

            tables.append(TableBlock(
                bbox=bbox,
                rows=sorted_rows,
                row_count=len(sorted_rows),
                col_count=col_count,
                confidence=0.6,  # Text-based detection is lower confidence
            ))

        return tables

    # ─── Heading Detection ──────────────────────────────────────

    def _detect_headings(self, text_blocks: list[TextBlock]):
        """
        Detect heading blocks based on font size and boldness.

        Heuristics:
        - Largest font on page → likely H1
        - Bold + larger than body → likely H2
        - Bold + same size → likely H3
        - Short text (< 80 chars) + bold → likely heading
        """
        if not text_blocks:
            return

        # Find average body font size
        font_sizes = [b.font_size for b in text_blocks if b.font_size > 0]
        if not font_sizes:
            return

        avg_size = sum(font_sizes) / len(font_sizes)
        max_size = max(font_sizes)

        for block in text_blocks:
            if not block.font_size:
                continue

            text_len = len(block.text)

            # H1: Largest font, short text
            if block.font_size >= max_size * 0.95 and text_len < 120:
                block.block_type = 'heading'
                continue

            # H2: Bold + larger than average + short
            if block.is_bold and block.font_size > avg_size * 1.15 and text_len < 100:
                block.block_type = 'heading'
                continue

            # H3: Bold + average size + short
            if block.is_bold and text_len < 80 and not block.text.endswith('.'):
                block.block_type = 'heading'
                continue

            # Catchall: Short all-caps lines
            if text_len < 60 and block.text.isupper() and block.font_size >= avg_size:
                block.block_type = 'heading'

    # ─── Reading Order ──────────────────────────────────────────

    def _compute_reading_order(self, text_blocks: list[TextBlock],
                                columns: list[tuple]) -> list[int]:
        """
        Compute correct reading order: top-to-bottom, left-to-right within columns.

        For single-column: sort by y-position
        For multi-column: sort by column then y within each column
        """
        if not text_blocks:
            return []

        # Attach indices
        indexed = [(i, b) for i, b in enumerate(text_blocks)]

        if len(columns) <= 1:
            # Single column — sort by y (top to bottom), tie-break by x (left to right)
            indexed.sort(key=lambda x: (x[1].bbox[1], x[1].bbox[0]))
        else:
            # Multi-column — process column by column
            indexed.sort(key=lambda x: (
                x[1].column if x[1].column < len(columns) else 0,
                x[1].bbox[1],  # y-position within column
                x[1].bbox[0],  # x-position tiebreaker
            ))

        # Assign reading order numbers
        for order, (i, block) in enumerate(indexed):
            block.reading_order = order

        return [i for i, _ in indexed]

    # ─── Utility ────────────────────────────────────────────────

    @staticmethod
    def blocks_to_paragraphs(blocks: list[TextBlock],
                              reading_order: list[int] = None) -> list[dict]:
        """
        Convert ordered text blocks into structured paragraphs for DOCX generation.

        Returns list of dicts with keys:
            text, style ('heading'|'paragraph'), font_size, is_bold, column
        """
        if reading_order:
            ordered = [blocks[i] for i in reading_order if i < len(blocks)]
        else:
            ordered = sorted(blocks, key=lambda b: b.reading_order)

        paragraphs = []
        for block in ordered:
            style = 'heading' if block.block_type == 'heading' else 'paragraph'
            paragraphs.append({
                'text': block.text,
                'style': style,
                'font_size': block.font_size,
                'is_bold': block.is_bold,
                'is_italic': block.is_italic,
                'column': block.column,
                'bbox': block.bbox,
            })

        return paragraphs
