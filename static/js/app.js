/**
 * PDF to Word Converter - Main JavaScript Application
 * Handles file upload, drag & drop, progress tracking, and UI interactions
 */

// Global variables
let uploadInProgress = false;
let statusCheckInterval = null;
let currentJobId = null;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    initializeFormValidation();
    initializeTooltips();
    initializeProgressTracking();
    initializeMobileOptimizations();
    
    // Show success message if redirected after upload
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('uploaded') === 'true') {
        showNotification('File uploaded successfully! Conversion in progress...', 'success');
    }
});

/**
 * Initialize file upload functionality
 */
function initializeFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const selectedFile = document.getElementById('selectedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFile = document.getElementById('removeFile');

    if (!uploadArea || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);

    // Handle click to browse files
    uploadArea.addEventListener('click', (e) => {
        if (!uploadInProgress) {
            fileInput.click();
        }
    });

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Handle remove file button
    if (removeFile) {
        removeFile.addEventListener('click', () => {
            clearFileSelection();
        });
    }

    // Handle form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Prevent default drag and drop behaviors
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Handle file drop event
 */
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
}

/**
 * Handle file selection (both drag & drop and click)
 */
function handleFileSelection(file) {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        showNotification(validation.message, 'error');
        return;
    }

    // Update UI
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    
    if (uploadArea) uploadArea.style.display = 'none';
    if (selectedFile) selectedFile.style.display = 'block';

    // Store file for form submission
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        // Create a new FileList with the selected file
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
    }

    // Show file preview if possible
    showFilePreview(file);
}

/**
 * Validate uploaded file
 */
function validateFile(file) {
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return {
            valid: false,
            message: 'Please select a PDF file. Only PDF files are supported.'
        };
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
        return {
            valid: false,
            message: `File size (${formatFileSize(file.size)}) exceeds the 20MB limit. Please choose a smaller file.`
        };
    }

    // Check for empty file
    if (file.size === 0) {
        return {
            valid: false,
            message: 'The selected file is empty. Please choose a valid PDF file.'
        };
    }

    return {
        valid: true,
        message: 'File is valid'
    };
}

/**
 * Clear file selection
 */
function clearFileSelection() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (selectedFile) selectedFile.style.display = 'none';

    // Clear any preview
    const previewContainer = document.getElementById('filePreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

/**
 * Show file preview (basic info)
 */
function showFilePreview(file) {
    const previewContainer = document.getElementById('filePreview');
    if (!previewContainer) return;

    const previewContent = `
        <div class="file-preview-info">
            <div class="d-flex align-items-center mb-2">
                <i class="fas fa-file-pdf text-danger me-2"></i>
                <strong>${file.name}</strong>
            </div>
            <small class="text-muted">
                Size: ${formatFileSize(file.size)} | 
                Type: PDF Document | 
                Last Modified: ${new Date(file.lastModified).toLocaleDateString()}
            </small>
        </div>
    `;

    previewContainer.innerHTML = previewContent;
    previewContainer.style.display = 'block';
}

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    if (uploadInProgress) {
        e.preventDefault();
        showNotification('Upload already in progress. Please wait...', 'warning');
        return;
    }

    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        e.preventDefault();
        showNotification('Please select a PDF file to convert.', 'error');
        return;
    }

    // Validate file one more time
    const file = fileInput.files[0];
    const validation = validateFile(file);
    if (!validation.valid) {
        e.preventDefault();
        showNotification(validation.message, 'error');
        return;
    }

    // Show upload progress
    uploadInProgress = true;
    showUploadProgress();
}

/**
 * Show upload progress
 */
function showUploadProgress() {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    }

    // Show progress indicator
    const progressHtml = `
        <div class="upload-progress mt-3">
            <div class="progress mb-2">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 0%" id="uploadProgressBar">
                    0%
                </div>
            </div>
            <small class="text-muted">Uploading file...</small>
        </div>
    `;

    const selectedFile = document.getElementById('selectedFile');
    if (selectedFile && !selectedFile.querySelector('.upload-progress')) {
        selectedFile.insertAdjacentHTML('beforeend', progressHtml);
    }

    // Simulate upload progress (since we can't track real upload progress with regular forms)
    simulateUploadProgress();
}

/**
 * Simulate upload progress
 */
function simulateUploadProgress() {
    const progressBar = document.getElementById('uploadProgressBar');
    if (!progressBar) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90; // Stop at 90% until real response

        progressBar.style.width = progress + '%';
        progressBar.textContent = Math.round(progress) + '%';

        if (progress >= 90) {
            clearInterval(interval);
        }
    }, 200);
}

/**
 * Initialize progress tracking for conversion status
 */
function initializeProgressTracking() {
    // Check if we're on a status page
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    
    if (progressBar && statusMessage) {
        // Extract job ID from URL or page data
        const pathParts = window.location.pathname.split('/');
        const jobId = pathParts[pathParts.length - 1];
        
        if (jobId && jobId !== 'status') {
            currentJobId = jobId;
            startStatusTracking(jobId);
        }
    }
}

/**
 * Start tracking conversion status
 */
function startStatusTracking(jobId) {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }

    statusCheckInterval = setInterval(() => {
        updateConversionStatus(jobId);
    }, 2000); // Check every 2 seconds

    // Initial status check
    updateConversionStatus(jobId);
}

/**
 * Update conversion status
 */
function updateConversionStatus(jobId) {
    fetch(`/api/status/${jobId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch status');
            }
            return response.json();
        })
        .then(data => {
            updateStatusUI(data);
            
            // Stop tracking if conversion is complete or failed
            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
                
                if (data.status === 'completed') {
                    showNotification('Conversion completed successfully!', 'success');
                    // Reload page to show download button
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else if (data.status === 'failed') {
                    showNotification('Conversion failed. Please try again.', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Status update error:', error);
            // Don't show error to user for status updates
        });
}

/**
 * Update status UI elements
 */
function updateStatusUI(data) {
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const statusBadge = document.querySelector('.status-badge');

    if (progressBar) {
        progressBar.style.width = data.progress + '%';
        progressBar.textContent = data.progress + '%';
        
        // Update progress bar color based on status
        progressBar.className = 'progress-bar progress-bar-striped';
        if (data.status === 'processing') {
            progressBar.classList.add('progress-bar-animated', 'bg-primary');
        } else if (data.status === 'completed') {
            progressBar.classList.add('bg-success');
        } else if (data.status === 'failed') {
            progressBar.classList.add('bg-danger');
        }
    }

    if (statusMessage) {
        statusMessage.textContent = data.message;
    }

    if (statusBadge) {
        statusBadge.textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
        statusBadge.className = `status-badge status-${data.status}`;
    }
}

/**
 * Initialize form validation
 */
function initializeFormValidation() {
    // Add real-time validation to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
                showNotification('Please correct the errors in the form.', 'error');
            }
            form.classList.add('was-validated');
        });
    });
}

/**
 * Initialize tooltips
 */
function initializeTooltips() {
    // Initialize Bootstrap tooltips if available
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

/**
 * Initialize mobile-specific optimizations
 */
function initializeMobileOptimizations() {
    // Handle mobile viewport changes
    function handleViewportChange() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    handleViewportChange();

    // Optimize touch interactions
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Improve touch targets
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.style.minHeight = '44px'; // iOS recommendation
        });
    }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility function to throttle function calls
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Handle network errors gracefully
 */
function handleNetworkError(error) {
    console.error('Network error:', error);
    showNotification('Network error. Please check your connection and try again.', 'error');
}

/**
 * Check if user is online
 */
function checkOnlineStatus() {
    if (!navigator.onLine) {
        showNotification('You appear to be offline. Please check your internet connection.', 'warning');
        return false;
    }
    return true;
}

// Listen for online/offline events
window.addEventListener('online', () => {
    showNotification('Connection restored!', 'success');
});

window.addEventListener('offline', () => {
    showNotification('You are now offline. Some features may not work.', 'warning');
});

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + U to trigger file upload
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            if (fileInput && !uploadInProgress) {
                fileInput.click();
            }
        }
        
        // Escape to clear file selection
        if (e.key === 'Escape') {
            const selectedFile = document.getElementById('selectedFile');
            if (selectedFile && selectedFile.style.display !== 'none') {
                clearFileSelection();
            }
        }
    });
}

// Initialize keyboard shortcuts
document.addEventListener('DOMContentLoaded', initializeKeyboardShortcuts);

/**
 * Performance monitoring
 */
function initializePerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }
        }
    });
}

// Initialize performance monitoring
initializePerformanceMonitoring();

/**
 * Accessibility enhancements
 */
function initializeAccessibility() {
    // Add keyboard navigation for upload area
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.setAttribute('tabindex', '0');
        uploadArea.setAttribute('role', 'button');
        uploadArea.setAttribute('aria-label', 'Click or drag and drop to upload PDF file');
        
        uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const fileInput = document.getElementById('fileInput');
                if (fileInput && !uploadInProgress) {
                    fileInput.click();
                }
            }
        });
    }

    // Add screen reader announcements for dynamic content
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);

    // Function to announce messages to screen readers
    window.announceToScreenReader = function(message) {
        announcer.textContent = message;
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    };
}

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', initializeAccessibility);

/**
 * Error boundary for JavaScript errors
 */
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    
    // Don't show all JS errors to users, but log them
    if (e.error && e.error.message && e.error.message.includes('network')) {
        handleNetworkError(e.error);
    }
});

/**
 * Service worker registration (for future PWA features)
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// Uncomment when service worker is implemented
// registerServiceWorker();

// Export functions for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatFileSize,
        validateFile,
        showNotification,
        debounce,
        throttle
    };
}
