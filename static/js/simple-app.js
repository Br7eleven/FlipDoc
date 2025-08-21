/**
 * Simplified PDF to Word Converter JavaScript
 * Fixed for Replit environment with no double event listeners
 */

// Global state
let isUploading = false;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Debounced single initialization
    setTimeout(initializeApp, 100);
});

// Initialize the app
function initializeApp() {
    try {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');
        const selectedFile = document.getElementById('selectedFile');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFile = document.getElementById('removeFile');

        if (!uploadArea || !fileInput) {
            console.log('Upload elements not found - retrying...');
            setTimeout(initializeApp, 500);
            return;
        }

        // Prevent double initialization
        if (uploadArea.dataset.initialized) return;
        uploadArea.dataset.initialized = 'true';
        fileInput.dataset.initialized = 'true';

        console.log('Initializing upload area');

        // Configure invisible file input
        fileInput.style.cssText = `
            position:absolute; top:0; left:0; width:100%; height:100%;
            opacity:0; cursor:pointer; z-index:20;
        `;

        // File input change listener
        fileInput.addEventListener('change', e => {
            console.log('File input changed, files:', e.target.files?.length);
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });

        /*// Upload area click listener
        uploadArea.addEventListener('click', e => {
            e.stopPropagation();
            if (!isUploading && fileInput) {
                fileInput.click();
            }
        });*/

        // Drag & drop listeners
        uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', e => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });

        // Remove file button
        if (removeFile) {
            removeFile.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                clearFileSelection();
            });
        }

        // Form submit
        if (uploadForm) {
            uploadForm.addEventListener('submit', e => {
                if (isUploading) {
                    e.preventDefault();
                    showMessage('Upload already in progress...', 'warning');
                    return;
                }

                const file = fileInput.files[0];
                if (!file || !validateFile(file)) {
                    e.preventDefault();
                    return;
                }

                isUploading = true;
                showUploadProgress();
            });
        }

        console.log('PDF Converter initialized successfully');

    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Handle file selection
function handleFileSelection(file) {
    if (!validateFile(file)) return;

    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');
    const fileInput = document.getElementById('fileInput');

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);

    if (uploadArea && selectedFile) {
        uploadArea.style.display = 'none';
        selectedFile.style.display = 'block';
    }

    if (fileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
    }
}

// Validate PDF file
function validateFile(file) {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        showMessage('Please select a PDF file only.', 'error');
        return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage(`File too large (${formatFileSize(file.size)}). Max size 5MB.`, 'error');
        return false;
    }

    if (file.size === 0) {
        showMessage('File is empty. Please select a valid PDF.', 'error');
        return false;
    }

    return true;
}

// Clear file selection
function clearFileSelection() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (selectedFile) selectedFile.style.display = 'none';
}

// Show upload progress
function showUploadProgress() {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show message
function showMessage(message, type) {
    const alertClass = type === 'error' ? 'danger' : (type === 'warning' ? 'warning' : 'info');
    const alert = document.createElement('div');
    alert.className = `alert alert-${alertClass} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top:20px; right:20px; z-index:9999; min-width:300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => { if (alert.parentNode) alert.remove(); }, 5000);
}
