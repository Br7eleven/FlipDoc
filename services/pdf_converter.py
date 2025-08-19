import pymupdf as fitz  # PyMuPDF
import docx
from docx.shared import Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
import io
import os
import logging
from PIL import Image
# OCR processor removed for simplified processing

class PDFConverter:
    """Main PDF to Word converter class"""
    
    def __init__(self):
        # OCR processor removed for simplified processing
        pass
    
    def convert_pdf_to_word(self, pdf_path, output_path, progress_callback=None):
        """
        Convert PDF to Word document
        
        Args:
            pdf_path (str): Path to input PDF file
            output_path (str): Path for output Word document
            progress_callback (function): Optional callback for progress updates
            
        Returns:
            bool: True if conversion successful, False otherwise
        """
        try:
            if progress_callback:
                progress_callback(15, "Opening PDF document...")
            
            # Open PDF document
            pdf_document = fitz.open(pdf_path)
            
            if progress_callback:
                progress_callback(25, "Creating Word document...")
            
            # Create Word document
            doc = docx.Document()
            
            # Set document properties
            doc.core_properties.title = "Converted from PDF"
            doc.core_properties.subject = "PDF to Word Conversion"
            
            total_pages = len(pdf_document)
            
            for page_num in range(total_pages):
                if progress_callback:
                    progress = 25 + (page_num / total_pages) * 60
                    progress_callback(progress, f"Processing page {page_num + 1} of {total_pages}...")
                
                page = pdf_document.load_page(page_num)
                
                # Try to extract text first
                text = page.get_text()
                
                if text.strip():
                    # Page has extractable text
                    self._add_text_to_document(doc, text, page_num)
                else:
                    # Page appears to be scanned - show warning
                    warning_text = f"[Scanned PDF detected - Page {page_num + 1}: Text extraction limited. For better results, use text-based PDFs.]\n\n"
                    self._add_text_to_document(doc, warning_text, page_num)
                    
                    if progress_callback:
                        progress = 25 + (page_num / total_pages) * 60
                        progress_callback(progress, f"Scanned page detected {page_num + 1} of {total_pages}...")
                
                # Image extraction simplified for stability
                
                # Add page break (except for last page)
                if page_num < total_pages - 1:
                    doc.add_page_break()
            
            if progress_callback:
                progress_callback(90, "Saving Word document...")
            
            # Save the document
            doc.save(output_path)
            
            if progress_callback:
                progress_callback(95, "Cleaning up...")
            
            # Close PDF document
            pdf_document.close()
            
            if progress_callback:
                progress_callback(100, "Conversion completed successfully!")
            
            return True
            
        except Exception as e:
            logging.error(f"PDF conversion error: {e}")
            if progress_callback:
                progress_callback(0, f"Error: {str(e)}")
            return False
    
    def _add_text_to_document(self, doc, text, page_num):
        """Add text content to Word document"""
        try:
            # Split text into paragraphs
            paragraphs = text.split('\n\n')
            
            for para_text in paragraphs:
                para_text = para_text.strip()
                if para_text:
                    # Clean up the text
                    para_text = para_text.replace('\n', ' ')
                    para_text = ' '.join(para_text.split())  # Remove extra whitespace
                    
                    # Add paragraph to document
                    paragraph = doc.add_paragraph(para_text)
                    
                    # Basic formatting based on text characteristics
                    if len(para_text) < 100 and para_text.isupper():
                        # Likely a heading
                        paragraph.style = 'Heading 1'
                    elif len(para_text) < 200 and para_text.strip().endswith(':'):
                        # Likely a subheading
                        paragraph.style = 'Heading 2'
                        
        except Exception as e:
            logging.error(f"Error adding text to document: {e}")
    
    # OCR extraction removed for simplified processing
    
    def _extract_images_from_page(self, doc, page, page_num):
        """Simplified image extraction - disabled for stability"""
        # Image extraction disabled for Replit stability
        pass
    
    def validate_pdf(self, pdf_path):
        """Validate PDF file"""
        try:
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            doc.close()
            
            if page_count == 0:
                return False, "PDF file contains no pages"
            
            if page_count > 100:
                return False, "PDF file has too many pages (maximum 100)"
            
            return True, f"Valid PDF with {page_count} pages"
            
        except Exception as e:
            return False, f"Invalid PDF file: {str(e)}"
