/**
 * Simplified PDF to Word Converter JavaScript
 * Fixed for Replit environment with no auto-reload issues
 */

// Global state
let isUploading = false;

// Wait for DOM to be fully loaded with multiple fallbacks
document.addEventListener('DOMContentLoaded', function() {
    // Add multiple delays to ensure all elements are ready
    setTimeout(initializeApp, 100);
    setTimeout(initializeApp, 500); // Backup initialization
});

// Also try when window loads
window.addEventListener('load', function() {
    setTimeout(initializeApp, 100);
});

function initializeApp() {
    try {
        // Get elements (with null checks)
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');
        const selectedFile = document.getElementById('selectedFile');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFile = document.getElementById('removeFile');

        // Debug: List all elements with these IDs
        console.log('Looking for upload elements...');
        console.log('uploadArea:', uploadArea);
        console.log('fileInput:', fileInput);
        
        // Only initialize if elements exist
        if (!uploadArea || !fileInput) {
            console.log('Upload elements not found on this page - will retry');
            // Try again in case elements load later
            setTimeout(() => {
                const retryUploadArea = document.getElementById('uploadArea');
                const retryFileInput = document.getElementById('fileInput');
                if (retryUploadArea && retryFileInput) {
                    console.log('Found elements on retry - reinitializing');
                    initializeApp();
                }
            }, 1000);
            return;
        }

        // Only initialize once
        if (uploadArea.dataset.initialized) {
            console.log('Upload area already initialized');
            return;
        }
        uploadArea.dataset.initialized = 'true';
        console.log('Initializing upload area...');

        // File input change handler
        fileInput.addEventListener('change', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });

        // Upload area click handler
        uploadArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!isUploading) {
                fileInput.click();
            }
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });

        // Remove file handler
        if (removeFile) {
            removeFile.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                clearFileSelection();
            });
        }

        // Form submit handler
        if (uploadForm) {
            uploadForm.addEventListener('submit', function(e) {
                console.log('Form submit triggered');
                
                if (isUploading) {
                    e.preventDefault();
                    showMessage('Upload already in progress...', 'warning');
                    return;
                }

                const file = fileInput.files[0];
                if (!file) {
                    e.preventDefault();
                    showMessage('Please select a PDF file first.', 'error');
                    return;
                }

                // Validate file one more time
                if (!validateFile(file)) {
                    e.preventDefault();
                    return;
                }

                console.log('Starting upload for file:', file.name);
                
                // Start upload process
                isUploading = true;
                showUploadProgress();
                
                // Let the form submit naturally - don't prevent default here
            });
        }

        console.log('PDF Converter initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function handleFileSelection(file) {
    console.log('Handling file selection:', file.name);
    
    if (!validateFile(file)) {
        return;
    }

    try {
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const uploadArea = document.getElementById('uploadArea');
        const selectedFile = document.getElementById('selectedFile');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
        
        // Smoothly transition the UI
        if (uploadArea && selectedFile) {
            uploadArea.style.display = 'none';
            selectedFile.style.display = 'block';
        }

        // Update file input safely
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            try {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
            } catch (error) {
                console.warn('Could not update file input:', error);
                // Fallback: the file is still selected in the original input
            }
        }
        
        console.log('File selection completed successfully');
    } catch (error) {
        console.error('Error in handleFileSelection:', error);
        showMessage('Error selecting file. Please try again.', 'error');
    }
}

function validateFile(file) {
    // Check if PDF
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        showMessage('Please select a PDF file only.', 'error');
        return false;
    }

    // Check file size (5MB limit for Replit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showMessage(`File too large (${formatFileSize(file.size)}). Maximum size is 5MB.`, 'error');
        return false;
    }

    if (file.size === 0) {
        showMessage('File is empty. Please select a valid PDF.', 'error');
        return false;
    }

    return true;
}

function clearFileSelection() {
    try {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const selectedFile = document.getElementById('selectedFile');

        if (fileInput) fileInput.value = '';
        if (uploadArea) uploadArea.style.display = 'block';
        if (selectedFile) selectedFile.style.display = 'none';
        
        console.log('File selection cleared');
    } catch (error) {
        console.error('Error clearing file selection:', error);
    }
}

function showUploadProgress() {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showMessage(message, type) {
    // Create simple alert
    const alertClass = type === 'error' ? 'danger' : (type === 'warning' ? 'warning' : 'info');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${alertClass} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    // Auto remove
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Status page auto-refresh for conversion tracking
function initializeStatusTracking() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    const jobId = window.location.pathname.split('/').pop();
    if (!jobId || jobId === 'status') return;

    // Check status every 3 seconds
    const statusInterval = setInterval(() => {
        fetch(`/api/status/${jobId}`)
            .then(response => response.json())
            .then(data => {
                updateProgressUI(data);
                
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(statusInterval);
                    if (data.status === 'completed') {
                        setTimeout(() => window.location.reload(), 1000);
                    }
                }
            })
            .catch(error => {
                console.error('Status check failed:', error);
            });
    }, 3000);
}

function updateProgressUI(data) {
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');

    if (progressBar) {
        progressBar.style.width = data.progress + '%';
        progressBar.textContent = data.progress + '%';
    }

    if (statusMessage) {
        statusMessage.textContent = data.message || 'Processing...';
    }
}

// Initialize status tracking if on status page
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeStatusTracking, 200);
});