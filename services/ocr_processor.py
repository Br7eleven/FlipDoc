import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import logging
import os

class OCRProcessor:
    """OCR processor for scanned PDF pages"""
    
    def __init__(self):
        # Configure tesseract path if needed (for different OS)
        self._configure_tesseract()
    
    def _configure_tesseract(self):
        """Configure tesseract executable path"""
        try:
            # Try to get tesseract version to check if it's available
            pytesseract.get_tesseract_version()
        except Exception as e:
            logging.warning(f"Tesseract not found or not configured properly: {e}")
            # You might need to set the path explicitly in production
            # pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'
    
    def extract_text(self, image):
        """
        Extract text from image using OCR
        
        Args:
            image (PIL.Image): Input image
            
        Returns:
            str: Extracted text
        """
        try:
            # Preprocess image for better OCR results
            processed_image = self._preprocess_image(image)
            
            # Configure OCR settings
            custom_config = r'--oem 3 --psm 6 -l eng'
            
            # Extract text
            text = pytesseract.image_to_string(processed_image, config=custom_config)
            
            # Clean up the text
            text = self._clean_ocr_text(text)
            
            return text
            
        except Exception as e:
            logging.error(f"OCR processing error: {e}")
            return ""
    
    def _preprocess_image(self, image):
        """Preprocess image to improve OCR accuracy"""
        try:
            # Convert to grayscale if needed
            if image.mode != 'L':
                image = image.convert('L')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.5)
            
            # Apply slight gaussian blur to reduce noise
            image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
            
            # Convert to numpy array for thresholding
            img_array = np.array(image)
            
            # Apply adaptive thresholding
            threshold = np.mean(img_array)
            img_array = np.where(img_array > threshold, 255, 0)
            
            # Convert back to PIL Image
            processed_image = Image.fromarray(img_array.astype(np.uint8))
            
            return processed_image
            
        except Exception as e:
            logging.error(f"Image preprocessing error: {e}")
            return image  # Return original image if preprocessing fails
    
    def _clean_ocr_text(self, text):
        """Clean and normalize OCR extracted text"""
        try:
            # Remove extra whitespace
            text = ' '.join(text.split())
            
            # Remove common OCR artifacts
            text = text.replace('|', 'I')
            text = text.replace('0', 'O')  # Only in specific contexts
            
            # Fix common character recognition errors
            replacements = {
                'rn': 'm',
                'vv': 'w',
                '1l': 'll',
                '1i': 'li',
                'cl': 'd'
            }
            
            for wrong, correct in replacements.items():
                text = text.replace(wrong, correct)
            
            # Remove single characters that are likely artifacts
            words = text.split()
            cleaned_words = []
            
            for word in words:
                if len(word) > 1 or word.isalnum():
                    cleaned_words.append(word)
            
            text = ' '.join(cleaned_words)
            
            return text
            
        except Exception as e:
            logging.error(f"Text cleaning error: {e}")
            return text
    
    def get_text_confidence(self, image):
        """Get OCR confidence score for the image"""
        try:
            # Get detailed OCR data including confidence
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            
            if confidences:
                avg_confidence = sum(confidences) / len(confidences)
                return avg_confidence
            else:
                return 0
                
        except Exception as e:
            logging.error(f"Confidence calculation error: {e}")
            return 0
