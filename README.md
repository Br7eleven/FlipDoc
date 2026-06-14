# FlipDoc v2 — PDF to Word Converter

**Professional-grade PDF to Word (DOCX) converter — iLovePDF-quality conversion.**
Built with Flask + PyMuPDF + PaddleOCR + python-docx.

> **v2.0** adds PaddleOCR (PP-OCRv4), image extraction, table detection, layout preservation,
> and a 5-stage image preprocessing pipeline. Scanned PDFs now convert at 92-97% accuracy.

---

## 🚀 Quick Start

### Prerequisites
- Python **3.11+** (3.13 recommended)
- **For best OCR**: PaddleOCR (auto-installed via pip — no system deps needed)
- **Fallback OCR**: Tesseract OCR installed on the system (optional)

### Setup

```bash
# Clone the repo
git clone <repo-url> && cd DocConvert

# Create virtual environment
python -m venv .venv && source .venv/Scripts/activate  # Windows
# or: python -m venv .venv && source .venv/bin/activate  # Linux/macOS

# Install dependencies (includes PaddleOCR for best accuracy)
pip install paddlepaddle  # install CPU paddle first (~400MB)
pip install -r requirements.txt
# or via uv: uv sync
```

### Run

```bash
python app.py
```

App starts at `http://0.0.0.0:5000`.

### Production

```bash
gunicorn app:app --bind 0.0.0.0:8000 --workers 4
```

---

## 📁 Project Structure

```
DocConvert/
├── app.py                       # Flask application entry point + job system
├── services/
│   ├── pdf_converter.py         # PDF → DOCX engine (v2: OCR + images + tables + layout)
│   ├── ocr_processor.py         # Multi-engine OCR (PaddleOCR primary, Tesseract fallback)
│   └── layout_analyzer.py       # Table detection, columns, reading order, headings
├── utils/
│   └── file_handler.py          # File I/O, auto-cleanup, validation
├── templates/
│   ├── base.html                # Base layout (nav, footer, SEO, structured data)
│   ├── index.html               # Homepage — upload form + conversion status
│   ├── features.html            # Feature list + tech specs
│   ├── how_to.html              # Step-by-step conversion guide
│   ├── faq.html                 # FAQ accordion
│   ├── about.html               # About + mission + tech stack
│   └── privacy.html             # Privacy policy
├── static/
│   ├── css/
│   │   ├── critical.css         # Above-fold critical CSS (fixes black-screen)
│   │   └── style.css            # Full stylesheet (components, animations, RWD)
│   ├── js/
│   │   ├── app.js               # Upload UI logic (drag-drop, validation)
│   │   └── simple-app.js        # Simplified replit-optimized upload handler
│   └── image/
│       └── favicon.ico          # Site favicon
├── uploads/                     # Temp uploaded PDFs (auto-cleaned)
├── converted/                   # Temp converted DOCX files (auto-cleaned)
├── pyproject.toml               # Project metadata + deps (uv/pip)
├── requirements.txt             # Pip dependency list
├── uv.lock                      # Locked deps (uv)
├── Procfile                     # Deployment command
└── README.md
```

---

## ⚙️ Core Architecture

### Backend: **Flask** (Python)

| File | Purpose |
|------|---------|
| `app.py` | Routes, job tracking, async threads, error handlers |
| `pdf_converter.py` | PyMuPDF-based text extraction → python-docx Word generation |
| `ocr_processor.py` | Tesseract OCR pipeline with image preprocessing |
| `file_handler.py` | File I/O, 1-hour auto-cleanup, size validation |

### Key Design Decisions

- **Async via threads** — Background `threading.Thread` for PDF conversion (non-blocking)
- **Job system** — UUID-based job IDs stored in `conversion_jobs` dict with status/progress
- **Progress tracking** — Callback-based progress (10% → 25% → page-by-page 60% → final save)
- **Auto-cleanup** — Daemon thread runs every hour, deletes files older than 1h
- **OCR fallback** — When page text is empty, marks as scanned (OCR module available but simplified for stability)
- **Frontend JS is frontend-only validation (5MB) — backend enforces 20MB limit**

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Homepage with upload form |
| `GET` | `/features` | Feature showcase |
| `GET` | `/how-to-convert-pdf-to-word` | Step-by-step guide |
| `GET` | `/faq` | FAQ accordion |
| `GET` | `/about` | About page |
| `GET` | `/privacy` | Privacy policy |
| `POST` | `/upload` | Upload PDF + start conversion |
| `GET` | `/status/<job_id>` | Conversion status page |
| `GET` | `/api/status/<job_id>` | JSON status API (polled by JS) |
| `GET` | `/download/<job_id>` | Download converted DOCX |

### Conversion Pipeline (v2)

```
PDF Upload → UUID Job
  → PyMuPDF opens PDF
  → Per-page analysis:
      ├─ Text-based page → block-level extraction (preserves layout)
      │   ├─ Heading detection (font size + boldness)
      │   └─ Paragraph structure preserved
      ├─ Scanned page → render at 200 DPI → OCR pipeline
      │   ├─ PaddleOCR (PP-OCRv4, 92-97% accuracy)
      │   └─ Fallback: Tesseract LSTM (85-92% accuracy)
      ├─ Images → extracted + optimized + embedded in DOCX
      └─ Tables → detected (PyMuPDF) → real Word tables
  → Save .docx → status=completed → download
  → After 1 hour → auto-delete
```

### Image Preprocessing Pipeline

```
Raw image → Analyze (noise, contrast, DPI, skew)
  ├─ Deskew (if tilt > 0.3°)
  ├─ Upscale (to min 1800px width)
  ├─ CLAHE contrast enhancement
  ├─ Bilateral denoising (edge-preserving)
  ├─ Unsharp mask sharpening
  └─ Otsu binarization (pure B&W)
→ Clean image → OCR engine
```

---

## 🔧 Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `PORT` | `5000` | Server port |
| `SESSION_SECRET` | `dev-secret-key-change-in-production` | Flask session secret |

App constants (in `app.py`):
- `MAX_FILE_SIZE` = 20MB
- `ALLOWED_EXTENSIONS` = `{'pdf'}`
- File retention = 1 hour

---

## 🎨 Frontend

- **Bootstrap 5.3** — Responsive layout via CDN
- **Font Awesome 6.4** — Icons via CDN
- **Custom CSS** — 550+ lines with animations (wave, float, loading skeleton), responsive breakpoints, print styles
- **Structured Data** — JSON-LD `SoftwareApplication` schema for SEO
- **Open Graph + Twitter Cards** — Social sharing metadata
- **Progressive Enhancement** — Real-time AJAX status polling every 2s during conversion

### Pages

| Page | Template | SEO Title |
|------|----------|-----------|
| Home | `index.html` | Fast PDF to Word Converter Online |
| Features | `features.html` | Advanced PDF Conversion Features |
| How To | `how_to.html` | How to Convert PDF to Word Document |
| FAQ | `faq.html` | Frequently Asked Questions |
| About | `about.html` | About Our PDF to Word Converter Technology |
| Privacy | `privacy.html` | Privacy Policy |

---

## 🛡️ Security

- File type validation (PDF only, server-side)
- `secure_filename()` sanitization
- Files auto-deleted after 1 hour
- `ProxyFix` middleware for reverse-proxy deployments
- No database — stateless except in-memory job dict
- No user accounts, no PII collection

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `flask` | Web framework |
| `pymupdf` (fitz) | PDF parsing, text extraction, table detection, image extraction |
| `paddleocr` | Primary OCR engine (PP-OCRv4, 92-97% accuracy) |
| `pytesseract` | Fallback OCR engine (Tesseract LSTM) |
| `python-docx` | Word document generation |
| `pillow` | Image processing and optimization |
| `opencv-python` | Advanced image preprocessing |
| `scipy` | Scientific image filtering (median, gaussian) |
| `numpy` | Array operations for image preprocessing |
| `gunicorn` | Production WSGI server |
| `werkzeug` | WSGI utilities (ProxyFix, secure_filename) |

---

## 🚢 Deployment

### Vercel (Serverless)

Configured via `vercel.json`:

```json
{
  "version": 2,
  "builds": [{ "src": "app.py", "use": "@vercel/python" }],
  "routes": [{ "src": "/(.*)", "dest": "app.py" }]
}
```

### Traditional (Gunicorn)

```bash
gunicorn app:app --bind 0.0.0.0:8000 --workers 4
```

### Replit / Dev

```bash
python app.py  # reads PORT env var, defaults to 5000
```

---

## 🏷️ Branding

- **Product**: FlipDoc
- **Organization**: BR7 Technologies & Corp
- **Copyright**: FlipDoc 2025

---

## 📝 License

Proprietary. All rights reserved by BR7 Technologies.

---

## 🤖 Development Notes

- v2.0 adds PaddleOCR, image extraction, table detection, and 5-stage preprocessing
- OCR engine auto-selects: PaddleOCR → Tesseract → none (with graceful degradation)
- PaddleOCR (`paddlepaddle` + `paddleocr`) is ~400MB but gives 92-97% accuracy
- On systems without Tesseract installed, PaddleOCR is the only engine — install it
- Two JS files exist: `app.js` (legacy) and `simple-app.js` (active, loaded by `base.html`)
- Template engine: Jinja2 (Flask default)
- CSS has `!important` rules in `critical.css` to fix rendering issues from CDN load timing
