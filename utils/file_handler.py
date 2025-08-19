import os
import shutil
import logging
from datetime import datetime, timedelta

class FileHandler:
    """Handle file operations and cleanup"""
    
    def __init__(self, upload_dir, converted_dir):
        self.upload_dir = upload_dir
        self.converted_dir = converted_dir
    
    def cleanup_old_files(self, max_age_hours=1):
        """
        Clean up files older than specified hours
        
        Args:
            max_age_hours (int): Maximum age in hours before cleanup
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
            
            # Clean upload directory
            self._cleanup_directory(self.upload_dir, cutoff_time)
            
            # Clean converted directory
            self._cleanup_directory(self.converted_dir, cutoff_time)
            
            logging.info(f"Cleaned up files older than {max_age_hours} hours")
            
        except Exception as e:
            logging.error(f"Error during file cleanup: {e}")
    
    def _cleanup_directory(self, directory, cutoff_time):
        """Clean up files in a specific directory"""
        try:
            for filename in os.listdir(directory):
                if filename == '.gitkeep':
                    continue
                    
                filepath = os.path.join(directory, filename)
                
                # Check if it's a file and get modification time
                if os.path.isfile(filepath):
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                    
                    if file_mtime < cutoff_time:
                        os.remove(filepath)
                        logging.debug(f"Removed old file: {filepath}")
                        
        except Exception as e:
            logging.error(f"Error cleaning directory {directory}: {e}")
    
    def validate_file_size(self, filepath, max_size_mb=20):
        """
        Validate file size
        
        Args:
            filepath (str): Path to file
            max_size_mb (int): Maximum size in MB
            
        Returns:
            tuple: (is_valid, message)
        """
        try:
            file_size = os.path.getsize(filepath)
            max_size_bytes = max_size_mb * 1024 * 1024
            
            if file_size > max_size_bytes:
                return False, f"File size ({file_size / 1024 / 1024:.1f} MB) exceeds maximum allowed size ({max_size_mb} MB)"
            
            return True, f"File size OK ({file_size / 1024 / 1024:.1f} MB)"
            
        except Exception as e:
            return False, f"Error checking file size: {str(e)}"
    
    def get_safe_filename(self, original_filename, job_id):
        """Generate safe filename with job ID"""
        try:
            # Remove any path components
            filename = os.path.basename(original_filename)
            
            # Get file extension
            name, ext = os.path.splitext(filename)
            
            # Create safe filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = f"{timestamp}_{job_id}_{name}{ext}"
            
            return safe_filename
            
        except Exception as e:
            logging.error(f"Error generating safe filename: {e}")
            return f"{job_id}_{original_filename}"
    
    def delete_file(self, filepath):
        """Safely delete a file"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                logging.debug(f"Deleted file: {filepath}")
                return True
            return False
        except Exception as e:
            logging.error(f"Error deleting file {filepath}: {e}")
            return False
    
    def get_file_info(self, filepath):
        """Get file information"""
        try:
            if not os.path.exists(filepath):
                return None
            
            stat = os.stat(filepath)
            
            return {
                'size': stat.st_size,
                'size_mb': stat.st_size / 1024 / 1024,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime),
                'exists': True
            }
            
        except Exception as e:
            logging.error(f"Error getting file info for {filepath}: {e}")
            return None
