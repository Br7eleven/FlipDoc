// app.js - Cleaned PDF to Word upload

let uploadInProgress = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeFileUpload();
    initializeKeyboardShortcuts();
});

// File upload initialization
function initializeFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const selectedFile = document.getElementById('selectedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFile = document.getElementById('removeFile');

    if (!uploadArea || !fileInput || uploadArea.dataset.initialized) return;
    uploadArea.dataset.initialized = 'true';

    // Drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        uploadArea.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(evt => {
        uploadArea.addEventListener(evt, () => uploadArea.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(evt => {
        uploadArea.addEventListener(evt, () => uploadArea.classList.remove('drag-over'));
    });

    uploadArea.addEventListener('drop', e => {
        if (e.dataTransfer.files.length) handleFileSelection(e.dataTransfer.files[0]);
    });

    // Single click listener for file input
    uploadArea.addEventListener('click', () => {
        if (!uploadInProgress) fileInput.click();
    });

    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleFileSelection(e.target.files[0]);
    });

    if (removeFile) {
        removeFile.addEventListener('click', clearFileSelection);
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFormSubmit);
    }
}

// Handle file selection
function handleFileSelection(file) {
    const validation = validateFile(file);
    if (!validation.valid) return showNotification(validation.message, 'error');

    const fileNameEl = document.getElementById('fileName');
    const fileSizeEl = document.getElementById('fileSize');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);

    if (uploadArea) uploadArea.style.display = 'none';
    if (selectedFile) selectedFile.style.display = 'block';

    // Assign file to the input
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('fileInput').files = dt.files;
}

// Validate file
function validateFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, message: 'Please select a PDF file.' };
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return { valid: false, message: 'File exceeds 5MB limit.' };
    if (file.size === 0) return { valid: false, message: 'File is empty.' };
    return { valid: true };
}

// Clear file
function clearFileSelection() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (selectedFile) selectedFile.style.display = 'none';
}

// Handle form submission
function handleFormSubmit(e) {
    if (uploadInProgress) {
        e.preventDefault();
        return showNotification('Upload in progress.', 'warning');
    }

    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        e.preventDefault();
        return showNotification('Please select a PDF file.', 'error');
    }

    const validation = validateFile(fileInput.files[0]);
    if (!validation.valid) {
        e.preventDefault();
        return showNotification(validation.message, 'error');
    }

    uploadInProgress = true;
    showUploadProgress();
}

// Show upload progress
function showUploadProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
    progressBar.style.width = '0%';
    progressBar.id = 'uploadProgressBar';

    const container = document.getElementById('selectedFile');
    if (container && !document.getElementById('uploadProgressBar')) {
        container.appendChild(progressBar);
    }

    simulateUploadProgress();
}

function simulateUploadProgress() {
    const progressBar = document.getElementById('uploadProgressBar');
    if (!progressBar) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
        progressBar.textContent = Math.round(progress) + '%';
        if (progress >= 90) clearInterval(interval);
    }, 200);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// Show notification
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notif.style.cssText = 'top:20px; right:20px; z-index:9999; min-width:300px;';
    notif.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            document.getElementById('fileInput').click();
        }
        if (e.key === 'Escape') clearFileSelection();
    });
}
