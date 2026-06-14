/**
 * FlipDoc v2 — Upload Handler
 * Fixed click handler, keyboard shortcuts, 20MB validation, toast notifications
 */
(function () {
  'use strict';

  let isUploading = false;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Toast System ──────────────────────────────────────────
  function toast(message, type) {
    type = type || 'info';
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<span>${message}</span>`;
    container.appendChild(el);

    const duration = prefersReducedMotion ? 5000 : 4000;
    setTimeout(() => {
      el.classList.add('toast-removing');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ─── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeApp, 100);
  });

  function initializeApp() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const selectedFile = document.getElementById('selectedFile');
    const removeFile = document.getElementById('removeFile');

    if (!uploadArea || !fileInput) {
      setTimeout(initializeApp, 500);
      return;
    }

    // Prevent double-init
    if (uploadArea.dataset.initialized) return;
    uploadArea.dataset.initialized = 'true';

    // ── File Input Click ─────────────────────────────────────
    // Click anywhere on upload area triggers file dialog
    uploadArea.addEventListener('click', (e) => {
      if (!isUploading && fileInput) {
        fileInput.click();
      }
    });

    // Keyboard: Enter/Space on upload zone
    uploadArea.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isUploading && fileInput) {
        e.preventDefault();
        fileInput.click();
      }
    });

    // ── File Selection ───────────────────────────────────────
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });

    // ── Drag & Drop ──────────────────────────────────────────
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      uploadArea.addEventListener(evt, (e) => {
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

    uploadArea.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    // ── Remove File ──────────────────────────────────────────
    if (removeFile) {
      removeFile.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearFileSelection();
      });
    }

    // ── Form Submit ──────────────────────────────────────────
    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => {
        if (isUploading) {
          e.preventDefault();
          toast('Upload already in progress...', 'warning');
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

    // ── Keyboard Shortcuts ───────────────────────────────────
    document.addEventListener('keydown', (e) => {
      // Ctrl+U → upload
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        if (fileInput) fileInput.click();
      }
      // Escape → clear file selection
      if (e.key === 'Escape') {
        clearFileSelection();
      }
    });
  }

  // ─── File Handling ─────────────────────────────────────────
  function handleFileSelection(file) {
    if (!validateFile(file)) return;

    const fileNameEl = document.getElementById('fileName');
    const fileSizeEl = document.getElementById('fileSize');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');
    const fileInput = document.getElementById('fileInput');

    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);

    if (uploadArea && selectedFile) {
      uploadArea.style.display = 'none';
      selectedFile.style.display = 'block';
      selectedFile.setAttribute('aria-hidden', 'false');
    }

    // Assign file to input for form submission
    if (fileInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
    }

    toast(`File selected: ${file.name}`, 'success');
  }

  function clearFileSelection() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const selectedFile = document.getElementById('selectedFile');

    if (fileInput) fileInput.value = '';
    if (uploadArea) {
      uploadArea.style.display = '';
      uploadArea.querySelector('.upload-zone')?.focus();
    }
    if (selectedFile) {
      selectedFile.style.display = 'none';
      selectedFile.setAttribute('aria-hidden', 'true');
    }
  }

  // ─── Validation ────────────────────────────────────────────
  function validateFile(file) {
    // Check PDF type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      toast('Please select a PDF file only.', 'error');
      return false;
    }

    // Max size: 20MB (matching backend)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast(`File too large (${formatFileSize(file.size)}). Maximum size is 20MB.`, 'error');
      return false;
    }

    if (file.size === 0) {
      toast('File is empty. Please select a valid PDF.', 'error');
      return false;
    }

    return true;
  }

  // ─── Upload Progress ───────────────────────────────────────
  function showUploadProgress() {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton && !prefersReducedMotion) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }
  }

  // ─── Formatting ────────────────────────────────────────────
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
})();
