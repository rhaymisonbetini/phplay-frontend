// =====================================================================
// effects.js — Visual enhancements: section starfields, feature glows,
// scroll parallax on screenshots, button click ripple
// =====================================================================

// ─── 1. FEATURE ROW GLOW ORBS ────────────────────────────────────────
// Each feature row gets a colored ambient glow behind its screenshot,
// cycling purple → cyan → pink as spec §5.4 requires.

export function initFeatureGlows() {
  const colorCycle = [
    'purple', 'cyan', 'purple', 'pink',
    'purple', 'cyan', 'purple', 'pink', 'purple',
  ];

  document.querySelectorAll('.feature-row').forEach((row, i) => {
    const glow = document.createElement('div');
    glow.className = `feature-glow feature-glow--${colorCycle[i % colorCycle.length]}`;
    glow.setAttribute('aria-hidden', 'true');

    // Place glow on the media side of each row
    const isReversed = row.classList.contains('feature-row--reverse');
    glow.style.cssText = `
      ${isReversed ? 'left: -80px' : 'right: -80px'};
      top: 50%;
      transform: translateY(-50%);
    `;

    row.prepend(glow);
  });
}


// ─── 2. SECTION MINI-STARFIELDS ──────────────────────────────────────
// Low-density, no-parallax starfields for #open-source and #download.
// Spec §5.6: "Stars from the hero starfield can subtly continue here."
// Spec §5.7: "A subtle starfield creates atmosphere without redundancy."

class SectionStars {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.raf = null;
    this.w = 0;
    this.h = 0;

    this._loop = this._loop.bind(this);
    this._onVisibility = this._onVisibility.bind(this);

    this._measure();
    this._createStars();
    this._loop();

    // Resize via ResizeObserver (section height can change)
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        this._measure();
        this._createStars();
      }).observe(canvas.parentElement);
    }

    document.addEventListener('visibilitychange', this._onVisibility);
  }

  _measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = this.canvas.parentElement;
    const w = parent.offsetWidth || window.innerWidth;
    const h = parent.offsetHeight || 600;

    this.w = w;
    this.h = h;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  _createStars() {
    const isMobile = this.w < 768;
    const density = isMobile ? 0.3 : 0.55;
    const count = Math.min(Math.round((this.w * this.h / 14000) * density * 10), 55);

    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: Math.random() * 1.4 + 0.3,
      baseOp: Math.random() * 0.22 + 0.04,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.005 + Math.random() * 0.012,
      dy: 0.008 + Math.random() * 0.03,
      // A few get a subtle purple tint
      isPurple: Math.random() < 0.15,
    }));
  }

  _loop() {
    if (document.visibilityState === 'hidden') {
      this.raf = null;
      return;
    }

    const { ctx, w, h, stars } = this;
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      s.phase += s.twinkleSpeed;
      s.y += s.dy;
      if (s.y > h + 3) s.y = -3;

      const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.07);

      if (s.isPurple) {
        ctx.fillStyle = `rgba(157,91,255,${op * 1.5})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${op})`;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.raf = requestAnimationFrame(this._loop);
  }

  _onVisibility() {
    if (document.visibilityState === 'visible' && !this.raf) {
      this._loop();
    }
  }
}

export function initSectionStarfields() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = ['#open-source', '#download'];

  targets.forEach(selector => {
    const section = document.querySelector(selector);
    if (!section) return;

    // Ensure section is a positioning context
    const currentPosition = window.getComputedStyle(section).position;
    if (currentPosition === 'static') {
      section.style.position = 'relative';
    }

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position: absolute',
      'inset: 0',
      'width: 100%',
      'height: 100%',
      'pointer-events: none',
      'z-index: 0',
    ].join(';');

    // Insert before all content; content siblings need z-index > 0
    section.prepend(canvas);

    // Elevate all sibling children above the canvas
    Array.from(section.children).forEach(child => {
      if (child === canvas) return;
      const cs = window.getComputedStyle(child);
      if (cs.position === 'static') child.style.position = 'relative';
      if (!child.style.zIndex && cs.zIndex === 'auto') child.style.zIndex = '1';
    });

    new SectionStars(canvas);
  });
}


// ─── 3. SCROLL PARALLAX ON FEATURE SCREENSHOTS ───────────────────────
// Feature media containers shift at ~60% of scroll speed, creating
// a subtle depth illusion between the copy and the screenshot.

export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Disable on mobile — layout too tight for vertical shift
  if (window.innerWidth < 1024) return;

  const targets = document.querySelectorAll('.feature-media');
  if (!targets.length) return;

  let ticking = false;

  function update() {
    const viewH = window.innerHeight;

    targets.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Skip elements fully out of extended viewport
      if (rect.bottom < -300 || rect.top > viewH + 300) return;

      const centerOffset = (rect.top + rect.height * 0.5) - viewH * 0.5;
      // ±18px max — subtle, not nauseating
      const shift = (centerOffset / viewH) * -18;
      el.style.transform = `translateY(${shift.toFixed(1)}px)`;
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  // Re-check on resize breakpoint crossing
  window.addEventListener('resize', () => {
    if (window.innerWidth < 1024) {
      targets.forEach(el => (el.style.transform = ''));
    }
  }, { passive: true });

  update();
}


// ─── 4. BUTTON CLICK RIPPLE ──────────────────────────────────────────
// CSS ::before pseudo-element approach — zero DOM churn.
// The ripple keyframe is in animations.css.

export function initButtonRipple() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Communicate click origin to CSS via custom properties
      btn.style.setProperty('--rip-x', x + '%');
      btn.style.setProperty('--rip-y', y + '%');

      // Force reflow to restart animation if button clicked rapidly
      btn.classList.remove('rip');
      void btn.offsetWidth;
      btn.classList.add('rip');
    });

    btn.addEventListener('animationend', e => {
      if (e.animationName === 'ripple') btn.classList.remove('rip');
    });
  });
}
