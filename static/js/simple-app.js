/**
 * Simplified PDF to Word Converter JavaScript
 * Fixed for Replit environment with no auto-reload issues
 */

// Global state
let isUploading = false;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add small delay to ensure all elements are ready
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

        // Only initialize if elements exist
        if (!uploadArea || !fileInput) {
            console.log('Upload elements not found on this page');
            return;
        }

        // Only initialize once
        if (uploadArea.dataset.initialized) {
            return;
        }
        uploadArea.dataset.initialized = 'true';

        // File input change handler
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });

        // Upload area click handler
        uploadArea.addEventListener('click', function(e) {
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
            removeFile.addEventListener('click', function() {
                clearFileSelection();
            });
        }

        // Form submit handler
        if (uploadForm) {
            uploadForm.addEventListener('submit', function(e) {
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

                // Validate file
                if (!validateFile(file)) {
                    e.preventDefault();
                    return;
                }

                // Start upload
                isUploading = true;
                showUploadProgress();
            });
        }

        console.log('PDF Converter initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function handleFileSelection(file) {
    if (!validateFile(file)) {
        return;
    }

    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    
    if (uploadArea) uploadArea.style.display = 'none';
    if (selectedFile) selectedFile.style.display = 'block';

    // Update file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
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
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (selectedFile) selectedFile.style.display = 'none';
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