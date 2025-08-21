import os
import logging
import uuid
import threading
import time
from datetime import datetime
from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from services.pdf_converter import PDFConverter
from utils.file_handler import FileHandler

# Logging config
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Config
UPLOAD_FOLDER = "uploads"
CONVERTED_FOLDER = "converted"
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {"pdf"}

app.config.update(
    UPLOAD_FOLDER=UPLOAD_FOLDER,
    CONVERTED_FOLDER=CONVERTED_FOLDER,
    MAX_CONTENT_LENGTH=MAX_FILE_SIZE
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

# Job tracking
conversion_jobs = {}
file_handler = FileHandler(UPLOAD_FOLDER, CONVERTED_FOLDER)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_old_files():
    """Runs every hour to remove old files"""
    while True:
        try:
            file_handler.cleanup_old_files()
        except Exception as e:
            logging.error(f"Cleanup error: {e}")
        time.sleep(3600)


# Run cleanup in background
threading.Thread(target=cleanup_old_files, daemon=True).start()


@app.route("/")
def index():
    return render_template("index.html",
        title="Fast PDF to Word Converter Online - Convert PDF to DOCX",
        description="Convert PDF files to Word documents quickly and securely. Free online converter."
    )


@app.route("/features")
def features():
    return render_template("features.html",
        title="Advanced PDF Conversion Features",
        description="OCR support, batch processing, and format preservation."
    )


@app.route("/how-to-convert-pdf-to-word")
def how_to():
    return render_template("how_to.html",
        title="How to Convert PDF to Word Document",
        description="Step by step guide for converting PDF to Word."
    )


@app.route("/faq")
def faq():
    return render_template("faq.html",
        title="Frequently Asked Questions",
        description="Answers about PDF to Word conversion."
    )


@app.route("/privacy")
def privacy():
    return render_template("privacy.html",
        title="Privacy Policy",
        description="How we protect your data during conversion."
    )


@app.route("/about")
def about():
    return render_template("about.html",
        title="About Our PDF to Word Converter",
        description="Learn about the technology powering this converter."
    )


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        flash("No file uploaded", "error")
        return redirect(url_for("index"))

    file = request.files["file"]
    if file.filename == "":
        flash("No file selected", "error")
        return redirect(url_for("index"))

    if not allowed_file(file.filename):
        flash("Only PDF files allowed", "error")
        return redirect(url_for("index"))

    try:
        job_id = str(uuid.uuid4())
        filename = secure_filename(file.filename or "uploaded.pdf")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_")
        unique_filename = f"{timestamp}{job_id}_{filename}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
        file.save(filepath)

        conversion_jobs[job_id] = {
            "status": "uploaded",
            "progress": 0,
            "message": "File uploaded successfully",
            "original_filename": filename,
            "uploaded_file": filepath,
            "converted_file": None,
            "created_at": datetime.now(),
            "error": None
        }

        threading.Thread(
            target=convert_pdf_async,
            args=(job_id, filepath, filename),
            daemon=True
        ).start()

        flash("File uploaded successfully! Conversion started.", "success")
        return redirect(url_for("conversion_status", job_id=job_id))

    except Exception as e:
        logging.error(f"Upload error: {e}")
        flash("Upload failed. Try again.", "error")
        return redirect(url_for("index"))


def convert_pdf_async(job_id, filepath, original_filename):
    try:
        conversion_jobs[job_id].update({
            "status": "processing",
            "progress": 10,
            "message": "Analyzing PDF..."
        })

        converter = PDFConverter()
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}.docx"
        output_path = os.path.join(app.config["CONVERTED_FOLDER"], f"{job_id}_{output_filename}")

        def progress_callback(progress, message):
            conversion_jobs[job_id].update({"progress": progress, "message": message})

        success = converter.convert_pdf_to_word(filepath, output_path, progress_callback)

        if success:
            conversion_jobs[job_id].update({
                "status": "completed",
                "progress": 100,
                "message": "Conversion completed",
                "converted_file": output_path
            })
        else:
            conversion_jobs[job_id].update({
                "status": "failed",
                "error": "Conversion failed. Try again."
            })

    except Exception as e:
        logging.error(f"Conversion error ({job_id}): {e}")
        conversion_jobs[job_id].update({"status": "failed", "error": str(e)})


@app.route("/status/<job_id>")
def conversion_status(job_id):
    if job_id not in conversion_jobs:
        flash("Invalid job ID", "error")
        return redirect(url_for("index"))

    return render_template("index.html",
        job=conversion_jobs[job_id],
        job_id=job_id,
        title="PDF Conversion Status",
        description="Track PDF to Word conversion progress."
    )


@app.route("/api/status/<job_id>")
def api_status(job_id):
    if job_id not in conversion_jobs:
        return jsonify({"error": "Invalid job ID"}), 404

    job = conversion_jobs[job_id]
    return jsonify({
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "error": job.get("error"),
        "can_download": job["status"] == "completed" and job["converted_file"]
    })


@app.route("/download/<job_id>")
def download_file(job_id):
    if job_id not in conversion_jobs:
        flash("Invalid job ID", "error")
        return redirect(url_for("index"))

    job = conversion_jobs[job_id]
    if job["status"] != "completed" or not job["converted_file"]:
        flash("File not ready", "error")
        return redirect(url_for("conversion_status", job_id=job_id))

    try:
        original_name = os.path.splitext(job["original_filename"])[0] + ".docx"
        return send_file(
            job["converted_file"],
            as_attachment=True,
            download_name=original_name,
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        logging.error(f"Download error: {e}")
        flash("Download failed", "error")
        return redirect(url_for("conversion_status", job_id=job_id))


@app.errorhandler(413)
def too_large(e):
    flash("File too large. Max size 20MB.", "error")
    return redirect(url_for("index"))


@app.errorhandler(404)
def not_found(e):
    return render_template("index.html",
        title="Page Not Found",
        description="The page you requested was not found."
    ), 404


@app.errorhandler(500)
def internal_error(e):
    logging.error(f"Server error: {e}")
    flash("Internal server error. Try again.", "error")
    return redirect(url_for("index"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
