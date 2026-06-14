/**
 * FlipDoc v2 — Scroll Animations
 * IntersectionObserver-based reveal + stat counter animations.
 * Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Scroll Reveal ──────────────────────────────────────────
  // Toggles `.visible` class on elements with `.reveal` class
  // when they enter the viewport.
  function initScrollReveal() {
    if (prefersReducedMotion) {
      // Show all immediately — no animation
      document.querySelectorAll('.reveal').forEach(el => {
        el.classList.add('visible');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const revealElements = document.querySelectorAll('.reveal');
    if (!revealElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    });

    revealElements.forEach(el => observer.observe(el));
  }

  // ─── Stat Counter Animation ─────────────────────────────────
  // Animates stat-number elements when they scroll into view.
  // Supports formats: "500K+", "95%", "30s", "4.8★", "100%+"
  function initStatCounters() {
    if (prefersReducedMotion) return;

    const statNumbers = document.querySelectorAll('.stat-card .stat-number, .stat-card-hero .stat-number');
    if (!statNumbers.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateStatNumber(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => observer.observe(el));
  }

  function animateStatNumber(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = 'true';

    const rawText = el.textContent || '';
    // Extract numeric part
    const numMatch = rawText.match(/^([\d.]+)/);
    if (!numMatch) return;

    const target = parseFloat(numMatch[1]);
    const decimalPlaces = numMatch[1].includes('.') ? numMatch[1].split('.')[1].length : 0;
    const rest = rawText.slice(numMatch[0].length); // suffix like "K+", "%", "s", "★"

    let current = 0;
    const duration = 1500; // ms
    const steps = 45;
    const increment = target / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      const displayValue = decimalPlaces > 0
        ? parseFloat(current.toFixed(decimalPlaces)).toLocaleString()
        : Math.floor(current).toLocaleString();

      el.textContent = displayValue + rest;
    }, stepDuration);
  }

  // ─── Active TOC Link Highlight (Privacy Page) ──────────────
  function initTocHighlight() {
    const tocLinks = document.querySelectorAll('.toc-sidebar a[href^="#"]');
    if (!tocLinks.length) return;

    const sections = [];
    tocLinks.forEach(link => {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (section) sections.push({ link, section });
    });

    if (!sections.length) return;

    // Use IntersectionObserver for performance
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-80px 0px -60% 0px',
    });

    sections.forEach(({ section }) => observer.observe(section));
  }

  // ─── Navbar Scroll Effect ──────────────────────────────────
  function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ─── Init All ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initStatCounters();
    initTocHighlight();
    initNavbarScroll();
  });
})();
