import { InteractiveBackground } from './interactive-bg.js';
import { initReveal } from './reveal.js';
import { initNav } from './nav.js';
import { initCursorGlow } from './cursor-glow.js';
import {
  initFeatureGlows,
  initSectionStarfields,
  initParallax,
  initButtonRipple,
} from './effects.js';

function init() {
  // Mark JS as available so reveal animations can run
  document.documentElement.classList.add('js');
  // Interactive hero background — skip if prefers-reduced-motion
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
      new InteractiveBackground(canvas);
    }
  }

  initNav();
  initReveal();
  initCursorGlow();
  initFeatureGlows();
  initSectionStarfields();
  initParallax();
  initButtonRipple();

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const navHeight = 64;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
