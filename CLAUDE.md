# CLAUDE.md — FlipDoc PDF to Word Converter v2

## Project identity
- **Name**: FlipDoc (branded as "PDF to Word Converter")
- **Org**: BR7 Technologies & Corp
- **Version**: 2.0.0
- **Stack**: Python 3.11+ / Flask 3.x monolith
- **Purpose**: Online PDF → DOCX converter with PaddleOCR + layout preservation
- **Deployment**: Vercel (serverless) or Gunicorn (Procfile: `web: python app.py`)

## Architecture (v2)

### Entry point
- `app.py` — Module-level Flask app. Routes + job system + cleanup thread.
- Job system is **in-memory** (`conversion_jobs: dict[str, dict]`). UUID-keyed. No persistence.
- Background conversion via `threading.Thread(target=convert_pdf_async, daemon=True)`.
- Cleanup daemon runs every 3600s, deletes files >1h old from `uploads/` and `converted/`.
- Startup logs which OCR engine is active (`PDFConverter().ocr.engine_name`).

### Services (3 modules)

| File | Class | Role |
|------|-------|------|
| `services/pdf_converter.py` | `PDFConverter` | Main orchestrator — PyMuPDF extraction → OCR routing → DOCX generation |
| `services/ocr_processor.py` | `OCRProcessor` + `ImagePreprocessor` | Multi-engine OCR: PaddleOCR primary, Tesseract fallback. Preprocessing pipeline. |
| `services/layout_analyzer.py` | `LayoutAnalyzer` | Table detection, column analysis, reading order, heading detection |
| `utils/file_handler.py` | `FileHandler` | File I/O, cleanup, size validation |

### OCR Engine hierarchy
```
OCRProcessor.extract_text()
  ├─ PaddleOCR (PP-OCRv4)  ← primary, 92-97% accuracy
  │   └─ Falls back to Tesseract on error
  └─ Tesseract LSTM         ← fallback, 85-92% accuracy
      └─ Returns empty on error
```

### Image preprocessing pipeline (`ImagePreprocessor.full_pipeline()`)
```
Analyze → Deskew (if tilted) → Upscale (if <1800px) →
CLAHE contrast → Bilateral denoise → Unsharp mask →
Otsu binarization → Final image
```

## Conversion flow (v2)
```
POST /upload → save PDF → create job → spawn thread
  → convert_pdf_async():
      fitz.open() → page loop:
        ┌─ _extract_text_page(page)          # block-level extraction
        │   ├─ Text found → _add_text_blocks_to_doc()
        │   │   ├─ _mark_headings()           # auto-detect H1/H2/H3
        │   │   └─ _split_block_into_paragraphs()
        │   └─ No text → _ocr_page_to_doc()
        │       ├─ Render page to image (200 DPI)
        │       ├─ OCRProcessor.extract_text_blocks() or extract_text()
        │       └─ _group_ocr_blocks_into_paragraphs()
        ├─ _extract_and_embed_images()        # PyMuPDF image extraction
        └─ _detect_and_create_tables()        # PyMuPDF table detection (v1.23+)
      → _progress() callback per step
      → doc.save(output_path) → status=completed
```

## Key numbers
- Max upload: 20MB (backend), 5MB (frontend JS validation)
- Max pages: 100 (enforced in `convert_pdf_to_word()` and `validate_pdf()`)
- File retention: 1 hour
- Allowed extensions: `{'pdf'}`
- Default port: 5000
- OCR render DPI: 200
- Max image embed width: 6 inches / 1200px

## Routes map (unchanged)
| Route | Template | Purpose |
|-------|----------|---------|
| `GET /` | index.html | Upload form + status display |
| `GET /features` | features.html | Feature list |
| `GET /how-to-convert-pdf-to-word` | how_to.html | Tutorial |
| `GET /faq` | faq.html | FAQ accordion |
| `GET /about` | about.html | About/tech |
| `GET /privacy` | privacy.html | Privacy policy |
| `POST /upload` | redirect | File upload → conversion |
| `GET /status/<job_id>` | index.html (with job) | Status page |
| `GET /api/status/<job_id>` | JSON | AJAX status polling (2s interval) |
| `GET /download/<job_id>` | file download | Download DOCX |

## Dependencies (new in v2)
- `paddleocr>=2.7.0` — Primary OCR engine (PP-OCRv4 models)
- `paddlepaddle` — PaddleOCR backend (CPU version, ~400MB)
- `scipy>=1.13.0` — median_filter, gaussian_filter for image preprocessing
- All v1 deps retained (pymupdf, python-docx, pytesseract, pillow, opencv-python, numpy)

## Gotchas
1. **PaddleOCR is heavy** — `paddlepaddle` is ~400MB CPU wheel. If not installed, falls back to Tesseract automatically.
2. **Tesseract needs system install** — On Windows: install from github.com/UB-Mannheim/tesseract. On Linux: `apt install tesseract-ocr`.
3. **Table detection needs PyMuPDF ≥1.23** — Older versions skip table creation silently (just log debug).
4. **OCR runs at 200 DPI** — Higher = better accuracy but slower. Balanced for web use.
5. **Images embedded as PNG** — Converted from source format, resized to max 1200px dimension.
6. **Font preservation is heuristic** — `_mark_headings()` uses font size + boldness, not semantic structure.
7. **Scanned page confidence <70% triggers warning** — Injects reviewer note into DOCX.
8. **Flask secret_key** defaults to hardcoded dev key — MUST set `SESSION_SECRET` env var in production.
9. **CSS specificity conflicts** — `critical.css` uses `!important` to beat CDN-loaded Bootstrap. Two JS files exist; `base.html` loads `simple-app.js` (not `app.js`).
10. **No async/await** — Uses threads for background work. Not suitable for high-concurrency without Gunicorn workers.
11. **No test suite** — All quality is manual.
