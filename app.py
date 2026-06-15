import os
import logging
from flask import Flask, render_template, request, send_file, send_from_directory, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
import uuid
import threading
from pathlib import Path
import time
from datetime import datetime, timedelta
from services.pdf_converter import PDFConverter
from utils.file_handler import FileHandler

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)



# Configuration
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {'pdf'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CONVERTED_FOLDER'] = CONVERTED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
app.config['TEMPLATES_AUTO_RELOAD'] = True  # Always reload templates from disk

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

# Global variables for job tracking
conversion_jobs = {}
file_handler = FileHandler(UPLOAD_FOLDER, CONVERTED_FOLDER)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files():
    """Background task to cleanup old files"""
    while True:
        try:
            file_handler.cleanup_old_files()
            time.sleep(3600)  # Run every hour
        except Exception as e:
            logging.error(f"Error in cleanup task: {e}")

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()

# Startup health check — verify OCR engine availability
_ocr = PDFConverter().ocr
logging.info(f"🚀 FlipDoc v2.0 started — OCR Engine: {_ocr.engine_name}")

@app.route('/')
def index():
    """Homepage with converter interface"""
    return render_template('index.html',
                         canonical_url='https://flipdocconverter.vercel.app/',
                         title="Fast PDF to Word Converter Online - Convert PDF to DOCX",
                         description="Convert PDF files to Word documents quickly and securely. Supports text and scanned PDFs with OCR technology. Free online converter.")

@app.route('/features')
def features():
    """Features page"""
    return render_template('features.html',
                         canonical_url='https://flipdocconverter.vercel.app/features',
                         title="Advanced PDF Conversion Features - PDF to Word Converter",
                         description="Discover powerful features of our PDF to Word converter including OCR support, batch processing, and format preservation.")

@app.route('/how-to-convert-pdf-to-word')
def how_to():
    """How-to guide page"""
    return render_template('how_to.html',
                         canonical_url='https://flipdocconverter.vercel.app/how-to-convert-pdf-to-word',
                         title="How to Convert PDF to Word Document - Step by Step Guide",
                         description="Learn how to convert PDF files to Word documents easily. Complete tutorial with tips for best results.")

@app.route('/faq')
def faq():
    """FAQ page"""
    return render_template('faq.html',
                         canonical_url='https://flipdocconverter.vercel.app/faq',
                         title="Frequently Asked Questions - PDF to Word Converter",
                         description="Find answers to common questions about PDF to Word conversion, file formats, and troubleshooting.")

@app.route('/privacy')
def privacy():
    """Privacy policy page"""
    return render_template('privacy.html',
                         canonical_url='https://flipdocconverter.vercel.app/privacy',
                         title="Privacy Policy - FlipDoc",
                         description="Learn how FlipDoc protects your data and privacy. Files encrypted, auto-deleted after 1 hour. No registration required. Your documents stay private.")

# Static asset fallback routes for Vercel (serves public/ files when CDN doesn't intercept)
@app.route('/image/<path:filename>')
def serve_image(filename):
    return send_from_directory('public/image', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('public/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('public/js', filename)

@app.route('/favicon.ico')
def serve_favicon_ico():
    return send_from_directory('public/image/favicon', 'favicon.ico')

@app.route('/favicon.png')
def serve_favicon_png():
    return send_from_directory('public/image/favicon', 'favicon-96x96.png')

@app.route("/__debug_assets")
def debug_assets():
    base_dir = Path(__file__).resolve().parent
    cwd = Path.cwd()

    paths = [
        cwd / "public" / "image" / "flipdoc.svg",
        base_dir / "public" / "image" / "flipdoc.svg",
        base_dir.parent / "public" / "image" / "flipdoc.svg",
    ]

    return jsonify({
        "cwd": str(cwd),
        "__file__": str(Path(__file__).resolve()),
        "base_dir": str(base_dir),
        "exists_checks": [
            {"path": str(p), "exists": p.exists()} for p in paths
        ],
        "cwd_files": [str(x) for x in cwd.rglob("*") if "public" in str(x)][:100],
        "base_files": [str(x) for x in base_dir.rglob("*") if "public" in str(x)][:100],
        "parent_files": [str(x) for x in base_dir.parent.rglob("*") if "public" in str(x)][:100],
    })

@app.route('/about')
def about():
    """About page"""
    return render_template('about.html',
                         canonical_url='https://flipdocconverter.vercel.app/about',
                         title="About Our PDF to Word Converter Technology",
                         description="Learn about the advanced technology behind our PDF to Word converter and why it's the best choice for your conversion needs.")

@app.route('/blog')
def blog():
    """Blog index page — coming soon"""
    return render_template('blog.html',
                         canonical_url='https://flipdocconverter.vercel.app/blog',
                         title="FlipDoc Blog — PDF Tips & Guides",
                         description="Guides on PDF conversion, OCR technology, and document editing tips from the FlipDoc team.")

@app.route('/sitemap.xml')
def sitemap():
    """Dynamic XML sitemap for search engines"""
    from flask import Response
    import datetime
    pages = [
        ('https://flipdocconverter.vercel.app/', '1.0', 'daily'),
        ('https://flipdocconverter.vercel.app/features', '0.8', 'monthly'),
        ('https://flipdocconverter.vercel.app/how-to-convert-pdf-to-word', '0.9', 'monthly'),
        ('https://flipdocconverter.vercel.app/faq', '0.8', 'monthly'),
        ('https://flipdocconverter.vercel.app/about', '0.6', 'monthly'),
        ('https://flipdocconverter.vercel.app/privacy', '0.4', 'yearly'),
        ('https://flipdocconverter.vercel.app/blog', '0.7', 'monthly'),
    ]
    today = datetime.date.today().isoformat()
    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for loc, priority, changefreq in pages:
        xml.append(f'''  <url>
    <loc>{loc}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>''')
    xml.append('</urlset>')
    return Response('\n'.join(xml), mimetype='application/xml')

@app.route('/robots.txt')
def robots():
    """Robots.txt for search engine crawling directives"""
    from flask import Response
    content = """User-agent: *
Allow: /
Disallow: /api/
Disallow: /upload
Disallow: /download/
Disallow: /status/

Sitemap: https://flipdocconverter.vercel.app/sitemap.xml"""
    return Response(content, mimetype='text/plain')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and start conversion"""
    if 'file' not in request.files:
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    if not allowed_file(file.filename):
        flash('Only PDF files are allowed', 'error')
        return redirect(url_for('index'))
    
    try:
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Save uploaded file
        filename = secure_filename(file.filename or "uploaded_file.pdf")
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_filename = f"{timestamp}{job_id}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Initialize job tracking
        conversion_jobs[job_id] = {
            'status': 'uploaded',
            'progress': 0,
            'message': 'File uploaded successfully',
            'original_filename': filename,
            'uploaded_file': filepath,
            'converted_file': None,
            'created_at': datetime.now(),
            'error': None
        }
        
        # Start conversion in background thread
        thread = threading.Thread(target=convert_pdf_async, args=(job_id, filepath, filename))
        thread.daemon = True
        thread.start()
        
        flash('File uploaded successfully! Conversion started.', 'success')
        return redirect(url_for('conversion_status', job_id=job_id))
        
    except Exception as e:
        logging.error(f"Upload error: {e}")
        flash('Error uploading file. Please try again.', 'error')
        return redirect(url_for('index'))

def convert_pdf_async(job_id, filepath, original_filename):
    """Async PDF conversion function"""
    try:
        # Update status
        conversion_jobs[job_id]['status'] = 'processing'
        conversion_jobs[job_id]['progress'] = 10
        conversion_jobs[job_id]['message'] = 'Analyzing PDF structure...'
        
        # Initialize converter
        converter = PDFConverter()
        
        # Convert PDF to Word
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}.docx"
        output_path = os.path.join(app.config['CONVERTED_FOLDER'], f"{job_id}_{output_filename}")
        
        # Perform conversion with progress updates
        def progress_callback(progress, message):
            conversion_jobs[job_id]['progress'] = progress
            conversion_jobs[job_id]['message'] = message
        
        success = converter.convert_pdf_to_word(filepath, output_path, progress_callback)
        
        if success:
            conversion_jobs[job_id]['status'] = 'completed'
            conversion_jobs[job_id]['progress'] = 100
            conversion_jobs[job_id]['message'] = 'Conversion completed successfully!'
            conversion_jobs[job_id]['converted_file'] = output_path
        else:
            conversion_jobs[job_id]['status'] = 'failed'
            conversion_jobs[job_id]['error'] = 'Conversion failed. Please try again.'
            
    except Exception as e:
        logging.error(f"Conversion error for job {job_id}: {e}")
        conversion_jobs[job_id]['status'] = 'failed'
        conversion_jobs[job_id]['error'] = str(e)

@app.route('/status/<job_id>')
def conversion_status(job_id):
    """Show conversion status page"""
    if job_id not in conversion_jobs:
        flash('Invalid job ID', 'error')
        return redirect(url_for('index'))
    
    job = conversion_jobs[job_id]
    return render_template('index.html', 
                         job=job, 
                         job_id=job_id,
                         title="PDF Conversion Status",
                         description="Track your PDF to Word conversion progress in real-time.")

@app.route('/api/status/<job_id>')
def api_status(job_id):
    """API endpoint for status updates"""
    if job_id not in conversion_jobs:
        return jsonify({'error': 'Invalid job ID'}), 404
    
    job = conversion_jobs[job_id]
    return jsonify({
        'status': job['status'],
        'progress': job['progress'],
        'message': job['message'],
        'error': job.get('error'),
        'can_download': job['status'] == 'completed' and job['converted_file']
    })

@app.route('/download/<job_id>')
def download_file(job_id):
    """Download converted file"""
    if job_id not in conversion_jobs:
        flash('Invalid job ID', 'error')
        return redirect(url_for('index'))
    
    job = conversion_jobs[job_id]
    if job['status'] != 'completed' or not job['converted_file']:
        flash('File not ready for download', 'error')
        return redirect(url_for('conversion_status', job_id=job_id))
    
    try:
        original_name = os.path.splitext(job['original_filename'])[0] + '.docx'
        return send_file(job['converted_file'], 
                        as_attachment=True, 
                        download_name=original_name,
                        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    except Exception as e:
        logging.error(f"Download error: {e}")
        flash('Error downloading file', 'error')
        return redirect(url_for('conversion_status', job_id=job_id))

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    flash('File too large. Maximum size is 20MB.', 'error')
    return redirect(url_for('index'))

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return render_template('index.html', 
                         title="Page Not Found - PDF to Word Converter",
                         description="The requested page was not found. Return to our PDF to Word converter."), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    logging.error(f"Internal server error: {e}")
    flash('An internal error occurred. Please try again.', 'error')
    return redirect(url_for('index'))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)