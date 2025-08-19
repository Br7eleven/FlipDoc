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
                text = page.get_text("text")
                
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
                
                # Only add page break if there's substantial content and not the last page
                # Avoid excessive page breaks that cause formatting issues
                if page_num < total_pages - 1 and text.strip() and len(text.strip()) > 100:
                    # Add a section break instead of page break for better flow
                    paragraph = doc.add_paragraph()
                    paragraph.add_run("\n" + "="*50 + f" Page {page_num + 2} " + "="*50 + "\n")
            
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
        """Add text content to Word document with proper formatting"""
        try:
            if not text or not text.strip():
                return
            
            # Clean and normalize the text first
            text = text.strip()
            
            # Split into logical paragraphs (double newlines or significant breaks)
            # But be smarter about it to avoid too many small paragraphs
            paragraphs = text.split('\n\n')
            
            # Merge very short paragraphs that are probably continuation
            merged_paragraphs = []
            current_para = ""
            
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                    
                # Clean up line breaks within paragraph but preserve structure
                para = para.replace('\n', ' ')
                para = ' '.join(para.split())  # Remove extra whitespace
                
                # If paragraph is very short (< 50 chars), try to merge with previous
                if len(para) < 50 and current_para and not para.endswith('.') and not para.endswith(':'):
                    current_para += " " + para
                else:
                    # Save previous paragraph if exists
                    if current_para:
                        merged_paragraphs.append(current_para)
                    current_para = para
            
            # Don't forget the last paragraph
            if current_para:
                merged_paragraphs.append(current_para)
            
            # Add paragraphs to document
            for para_text in merged_paragraphs:
                if len(para_text.strip()) > 3:  # Only add substantial content
                    paragraph = doc.add_paragraph(para_text)
                    
                    # Apply basic formatting
                    if len(para_text) < 80 and (para_text.isupper() or para_text.count(' ') < 5):
                        # Likely a heading
                        paragraph.style = 'Heading 2'
                    elif para_text.strip().endswith(':') and len(para_text) < 150:
                        # Likely a subheading  
                        paragraph.style = 'Heading 3'
                        
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
