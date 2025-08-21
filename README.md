# PDF to Word Converter

## Overview

This is a Flask-based web application that converts PDF documents to Word format with OCR support for scanned documents. The application provides a user-friendly interface for uploading PDF files, processing them with advanced OCR technology, and downloading the converted Word documents. It features real-time progress tracking, automatic file cleanup, and comprehensive SEO optimization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **Flask** - Core web framework handling HTTP requests, file uploads, and template rendering
- **Python 3.x** - Primary programming language for backend logic and document processing
- **WSGI with ProxyFix** - Production-ready deployment configuration for handling proxy headers

### Document Processing Engine
- **PyMuPDF (fitz)** - Primary PDF parsing and text extraction library for handling standard PDFs
- **Tesseract OCR with pytesseract** - Optical Character Recognition for extracting text from scanned PDF images
- **python-docx** - Word document generation and formatting preservation
- **PIL (Pillow)** - Image processing and enhancement for OCR preprocessing

### File Management System
- **Structured directory organization** - Separate `uploads/` and `converted/` folders for input and output files
- **Automatic cleanup service** - Background thread removes files older than 1 hour to prevent storage bloat
- **Secure filename handling** - Uses werkzeug's secure_filename for safe file operations
- **File size limitations** - 20MB maximum upload size with validation

### Frontend Architecture
- **Server-side rendering** - Jinja2 templates with comprehensive SEO optimization
- **Bootstrap 5** - Responsive CSS framework for mobile-first design
- **Progressive JavaScript enhancement** - Drag-and-drop file uploads, real-time progress tracking
- **Font Awesome icons** - Consistent iconography throughout the interface

### Job Processing System
- **Asynchronous conversion** - Background processing prevents request timeouts for large files
- **Progress tracking** - Real-time status updates via global job dictionary
- **Unique job identifiers** - UUID-based job tracking for concurrent file processing

### SEO and Content Strategy
- **Comprehensive meta tags** - Open Graph, Twitter Cards, and structured data markup
- **Multi-page content architecture** - Dedicated pages for features, FAQ, how-to guides, and privacy policy
- **Schema.org structured data** - Software application markup for search engine understanding

## External Dependencies

### Core Libraries
- **Flask** - Web framework and routing
- **PyMuPDF (fitz)** - PDF document parsing and text extraction
- **python-docx** - Word document creation and formatting
- **pytesseract** - Python wrapper for Tesseract OCR engine
- **Pillow (PIL)** - Image processing for OCR preprocessing

### Frontend Assets
- **Bootstrap 5.3.0** - CSS framework via CDN
- **Font Awesome 6.4.0** - Icon library via CDN
- **Custom CSS/JS** - Application-specific styling and interactive features

### System Dependencies
- **Tesseract OCR engine** - External binary for optical character recognition
- **Operating system file handling** - Directory creation, file cleanup, and secure path operations

### Development and Deployment
- **Werkzeug** - WSGI utilities and development server
- **Python logging** - Comprehensive error tracking and debugging
- **Environment variables** - Configuration management for secrets and settings
