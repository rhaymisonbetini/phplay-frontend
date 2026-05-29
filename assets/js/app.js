// =====================================================================
// app.js — Single non-module bundle for file:// and HTTP compatibility
// All modules concatenated here without import/export syntax.
// =====================================================================

(function () {
  'use strict';

  // ===================================================================
  // INTERACTIVE BACKGROUND (hero canvas)
  // Stars (3 layers) + floating particles + reactive data grid
  // ===================================================================

  const REPEL_RADIUS    = 150;
  const REPEL_FORCE     = 0.8;
  const SPRING_STRENGTH = 0.05;
  const DAMPING         = 0.85;
  const GRID_SPACING    = 80;

  class InteractiveBackground {
    constructor(canvas) {
      this.canvas  = canvas;
      this.ctx     = canvas.getContext('2d');
      this.dpr     = Math.min(window.devicePixelRatio || 1, 2);
      this.w = 0;
      this.h = 0;
      this.mouse = { x: -9999, y: -9999 };
      this.stars         = [];
      this.particles     = [];
      this.gridPoints    = [];
      this.gridConns     = [];
      this._cols         = 0;
      this.raf          = null;
      this._loop        = this._loop.bind(this);
      this._onVisibility = this._onVisibility.bind(this);
      this._init();
    }

    _init() {
      this._resize();
      this._createStars();
      this._createParticles();
      this._createGrid();
      this._attachEvents();
      this._loop();
    }

    _resize() {
      const dpr = this.dpr;
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width  = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.canvas.style.width  = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    _createStars() {
      this.stars = [];
      const mobile = this.w < 768;
      const s = mobile ? 0.6 : 1;
      const layers = [
        { n: Math.round(150 * s), minR: 0.5, maxR: 1.5, minOp: 0.22, maxOp: 0.52, speed: 0.05,  purple: 0,   glow: false },
        { n: mobile ? 0 : Math.round(80 * s), minR: 1.5, maxR: 2.5, minOp: 0.4,  maxOp: 0.72, speed: 0.15, purple: 0.2, glow: false },
        { n: Math.round(28 * s),  minR: 2.5, maxR: 4.0, minOp: 0.6,  maxOp: 0.92, speed: 0.3,  purple: 1.0, glow: true  },
      ];
      for (const l of layers) {
        for (let i = 0; i < l.n; i++) {
          this.stars.push({
            x: Math.random() * this.w,
            y: Math.random() * this.h,
            r: l.minR + Math.random() * (l.maxR - l.minR),
            baseOp: l.minOp + Math.random() * (l.maxOp - l.minOp),
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.006 + Math.random() * 0.014,
            dy: l.speed * (0.6 + Math.random() * 0.8),
            isPurple: Math.random() < l.purple,
            glow: l.glow,
          });
        }
      }
    }

    _createParticles() {
      this.particles = [];
      const mobile = this.w < 768;
      const count  = mobile ? 8 : 20;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          r: 5 + Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.004 + Math.random() * 0.006,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.004 + Math.random() * 0.005,
          dy: -(0.08 + Math.random() * 0.14),
          vx: 0,
          vy: 0,
        });
      }
    }

    _createGrid() {
      this.gridPoints = [];
      this.gridConns  = [];
      const cols = Math.ceil(this.w / GRID_SPACING) + 2;
      const rows = Math.ceil(this.h / GRID_SPACING) + 2;
      const ox   = -GRID_SPACING + ((this.w % GRID_SPACING) / 2);
      const oy   = -GRID_SPACING + ((this.h % GRID_SPACING) / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = ox + c * GRID_SPACING;
          const by = oy + r * GRID_SPACING;
          this.gridPoints.push({ bx, by, x: bx, y: by, waveOffset: c * 0.5 + r * 0.3, vx: 0, vy: 0 });
          const idx = r * cols + c;
          if (c < cols - 1) this.gridConns.push([idx, idx + 1]);
          if (r < rows - 1) this.gridConns.push([idx, idx + cols]);
        }
      }
      this._cols = cols;
    }

    _attachEvents() {
      const updateMouse = (cx, cy) => { this.mouse.x = cx; this.mouse.y = cy; };
      const clearMouse = () => { this.mouse.x = -9999; this.mouse.y = -9999; };
      document.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
      window.addEventListener('blur', clearMouse);
      document.addEventListener('touchmove', e => {
        const t = e.touches[0];
        updateMouse(t.clientX, t.clientY);
      }, { passive: true });
      document.addEventListener('touchend', clearMouse);
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._createStars();
          this._createParticles();
          this._createGrid();
        }, 200);
      });
      document.addEventListener('visibilitychange', this._onVisibility);
    }

    _onVisibility() {
      if (document.visibilityState === 'visible' && !this.raf) this._loop();
    }

    _loop() {
      if (document.visibilityState === 'hidden') { this.raf = null; return; }
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      this._drawStars();
      this._drawParticles();
      this._drawGrid();
      this.raf = requestAnimationFrame(this._loop);
    }

    _drawStars() {
      const { ctx, h } = this;
      for (const s of this.stars) {
        s.phase += s.twinkleSpeed;
        s.y += s.dy;
        if (s.y > h + 6) s.y = -6;
      }
      for (const s of this.stars) {
        if (s.glow || s.isPurple) continue;
        const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.1);
        ctx.fillStyle = `rgba(255,255,255,${op.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      for (const s of this.stars) {
        if (s.glow || !s.isPurple) continue;
        const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.1);
        ctx.fillStyle = `rgba(157,91,255,${op.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      for (const s of this.stars) {
        if (!s.glow) continue;
        const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.1);
        ctx.shadowColor = `rgba(157,91,255,${(op * 0.55).toFixed(2)})`;
        ctx.shadowBlur  = s.r * 6;
        ctx.fillStyle   = `rgba(210,170,255,${op.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    _drawParticles() {
      const { ctx, w, h } = this;
      const MX = this.mouse.x, MY = this.mouse.y;
      ctx.save();
      for (const p of this.particles) {
        p.phase += p.phaseSpeed; p.swayPhase += p.swaySpeed;
        const dx = p.x - MX, dy = p.y - MY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0) {
          const f = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
          p.vx += (dx / dist) * f * 2.5;
          p.vy += (dy / dist) * f * 2.5;
        }
        p.vx *= DAMPING; p.vy *= DAMPING;
        p.x += p.vx + Math.sin(p.swayPhase) * 0.3;
        p.y += p.vy + p.dy;
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
        if (p.x < -30)   p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        const op  = 0.15 + (Math.sin(p.phase) * 0.5 + 0.5) * 0.32;
        const cdx = p.x - MX, cdy = p.y - MY;
        const cd  = Math.sqrt(cdx * cdx + cdy * cdy);
        const boost = cd < REPEL_RADIUS ? 1 + (1 - cd / REPEL_RADIUS) * 1.2 : 1;
        const finalOp = Math.min(0.85, op * boost);
        ctx.shadowBlur  = 14 * boost;
        ctx.shadowColor = `rgba(157,91,255,${(finalOp * 0.65).toFixed(2)})`;
        ctx.fillStyle   = `rgba(157,91,255,${finalOp.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * Math.min(1.3, boost), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawGrid() {
      const { ctx, w, h } = this;
      const MX = this.mouse.x, MY = this.mouse.y;
      const time = performance.now() * 0.001;
      const GS   = GRID_SPACING;
      for (const pt of this.gridPoints) {
        const waveY = Math.sin(time * 0.7 + pt.waveOffset) * 3.5;
        const tx = pt.bx, ty = pt.by + waveY;
        const dx = pt.x - MX, dy = pt.y - MY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0) {
          const f = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
          pt.vx += (dx / dist) * f * 1.8;
          pt.vy += (dy / dist) * f * 1.8;
        }
        pt.vx += (tx - pt.x) * SPRING_STRENGTH;
        pt.vy += (ty - pt.y) * SPRING_STRENGTH;
        pt.vx *= DAMPING; pt.vy *= DAMPING;
        pt.x += pt.vx; pt.y += pt.vy;
      }
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(157,91,255,0.07)';
      ctx.lineWidth   = 0.5;
      for (const [ai, bi] of this.gridConns) {
        const a = this.gridPoints[ai], b = this.gridPoints[bi];
        if (a.x < -GS && b.x < -GS) continue;
        if (a.x > w + GS && b.x > w + GS) continue;
        if (a.y < -GS && b.y < -GS) continue;
        if (a.y > h + GS && b.y > h + GS) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(157,91,255,0.28)';
      ctx.beginPath();
      const glowPoints = [];
      for (const pt of this.gridPoints) {
        if (pt.x < -GS || pt.x > w + GS || pt.y < -GS || pt.y > h + GS) continue;
        const dx = pt.x - MX, dy = pt.y - MY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS) {
          glowPoints.push({ pt, t: 1 - dist / REPEL_RADIUS });
        } else {
          ctx.moveTo(pt.x + 1.2, pt.y);
          ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      for (const { pt, t } of glowPoints) {
        const op = 0.28 + t * 0.72;
        const r  = 1.2 + t * 2.2;
        if (t > 0.35) {
          ctx.save();
          ctx.shadowBlur  = 8;
          ctx.shadowColor = `rgba(157,91,255,${(op * 0.6).toFixed(2)})`;
          ctx.fillStyle   = `rgba(157,91,255,${op.toFixed(2)})`;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(157,91,255,${op.toFixed(2)})`;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      document.removeEventListener('visibilitychange', this._onVisibility);
    }
  }


  // ===================================================================
  // SECTION MINI-STARFIELDS (open-source + download sections)
  // ===================================================================

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
      if (window.ResizeObserver) {
        new ResizeObserver(() => { this._measure(); this._createStars(); }).observe(document.documentElement);
      }
      document.addEventListener('visibilitychange', this._onVisibility);
    }

    _measure() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.w = w; this.h = h;
      this.canvas.width  = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width  = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    _createStars() {
      const isMobile = this.w < 768;
      const density  = isMobile ? 0.3 : 0.55;
      const count    = Math.min(Math.round((this.w * this.h / 14000) * density * 10), 55);
      this.stars = Array.from({ length: count }, () => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: Math.random() * 1.4 + 0.3,
        baseOp: Math.random() * 0.22 + 0.04,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.005 + Math.random() * 0.012,
        dy: 0.008 + Math.random() * 0.03,
        isPurple: Math.random() < 0.15,
      }));
    }

    _loop() {
      if (document.visibilityState === 'hidden') { this.raf = null; return; }
      const { ctx, w, h, stars } = this;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.phase += s.twinkleSpeed;
        s.y += s.dy;
        if (s.y > h + 3) s.y = -3;
        const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.07);
        ctx.fillStyle = s.isPurple ? `rgba(157,91,255,${op * 1.5})` : `rgba(255,255,255,${op})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      this.raf = requestAnimationFrame(this._loop);
    }

    _onVisibility() {
      if (document.visibilityState === 'visible' && !this.raf) this._loop();
    }
  }

  function initSectionStarfields() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ['#open-source', '#download'].forEach(selector => {
      const section = document.querySelector(selector);
      if (!section) return;
      if (window.getComputedStyle(section).position === 'static') {
        section.style.position = 'relative';
      }
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
      section.prepend(canvas);
      Array.from(section.children).forEach(child => {
        if (child === canvas) return;
        const cs = window.getComputedStyle(child);
        if (cs.position === 'static') child.style.position = 'relative';
        if (!child.style.zIndex && cs.zIndex === 'auto') child.style.zIndex = '1';
      });
      new SectionStars(canvas);
    });
  }


  // ===================================================================
  // FEATURE ROW GLOW ORBS
  // ===================================================================

  function initFeatureGlows() {
    const colorCycle = ['purple','cyan','purple','pink','purple','cyan','purple','pink','purple'];
    document.querySelectorAll('.feature-row').forEach((row, i) => {
      const glow = document.createElement('div');
      glow.className = `feature-glow feature-glow--${colorCycle[i % colorCycle.length]}`;
      glow.setAttribute('aria-hidden', 'true');
      const isReversed = row.classList.contains('feature-row--reverse');
      glow.style.cssText = `${isReversed ? 'left:-80px' : 'right:-80px'};top:50%;transform:translateY(-50%);`;
      row.prepend(glow);
    });
  }


  // ===================================================================
  // SCROLL PARALLAX ON FEATURE SCREENSHOTS
  // ===================================================================

  function initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 1024) return;
    const targets = document.querySelectorAll('.feature-media');
    if (!targets.length) return;
    let ticking = false;
    function update() {
      const viewH = window.innerHeight;
      targets.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -300 || rect.top > viewH + 300) return;
        const shift = ((rect.top + rect.height * 0.5) - viewH * 0.5) / viewH * -18;
        el.style.transform = `translateY(${shift.toFixed(1)}px)`;
      });
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (window.innerWidth < 1024) targets.forEach(el => (el.style.transform = ''));
    }, { passive: true });
    update();
  }


  // ===================================================================
  // BUTTON CLICK RIPPLE
  // ===================================================================

  function initButtonRipple() {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--rip-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
        btn.style.setProperty('--rip-y', ((e.clientY - rect.top)  / rect.height * 100) + '%');
        btn.classList.remove('rip');
        void btn.offsetWidth;
        btn.classList.add('rip');
      });
      btn.addEventListener('animationend', e => {
        if (e.animationName === 'ripple') btn.classList.remove('rip');
      });
    });
  }


  // ===================================================================
  // SCROLL REVEALS
  // ===================================================================

  const STAGGER = 80;

  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        visible.forEach((entry, index) => {
          const el = entry.target;
          const delay = el.dataset.revealDelay !== undefined
            ? parseInt(el.dataset.revealDelay, 10)
            : index * STAGGER;
          setTimeout(() => el.classList.add('visible'), Math.min(delay, 500));
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    elements.forEach(el => observer.observe(el));
  }


  // ===================================================================
  // NAV (sticky + mobile menu + active links + mobile download bar)
  // ===================================================================

  function initNav() {
    const nav           = document.getElementById('site-nav');
    const hamburger     = document.getElementById('nav-hamburger');
    const mobileOverlay = document.getElementById('nav-mobile-overlay');
    const mobileClose   = document.getElementById('nav-mobile-close');
    const mobileLinks   = mobileOverlay ? mobileOverlay.querySelectorAll('.nav-link') : [];
    if (!nav) return;

    const SCROLL_THRESHOLD = window.innerHeight * 0.15;
    function updateNav() {
      nav.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    function openMenu() {
      if (!mobileOverlay || !hamburger) return;
      mobileOverlay.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      if (!mobileOverlay || !hamburger) return;
      mobileOverlay.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    if (hamburger) hamburger.addEventListener('click', () => {
      mobileOverlay && mobileOverlay.classList.contains('open') ? closeMenu() : openMenu();
    });
    if (mobileClose) mobileClose.addEventListener('click', closeMenu);
    mobileLinks.forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks  = document.querySelectorAll('.nav-link[href^="#"]');
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
        });
      },
      { threshold: 0.4, rootMargin: '-64px 0px -40% 0px' }
    );
    sections.forEach(s => sectionObserver.observe(s));

    const mobileBar = document.getElementById('mobile-download-bar');
    if (mobileBar) {
      const hero = document.querySelector('.hero');
      if (hero) {
        new IntersectionObserver(([entry]) => {
          mobileBar.classList.toggle('visible', !entry.isIntersecting);
        }, { threshold: 0 }).observe(hero);
      }
    }
  }


  // ===================================================================
  // CURSOR GLOW
  // ===================================================================

  function initCursorGlow() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;
    let mouseX = -200, mouseY = -200;
    let currentX = -200, currentY = -200;
    let visible = false;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function animate() {
      currentX = lerp(currentX, mouseX, 0.12);
      currentY = lerp(currentY, mouseY, 0.12);
      glow.style.left = currentX + 'px';
      glow.style.top  = currentY + 'px';
      requestAnimationFrame(animate);
    }
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX; mouseY = e.clientY;
      if (!visible) { visible = true; glow.classList.add('visible'); }
    });
    document.addEventListener('mouseleave', () => {
      visible = false; glow.classList.remove('visible');
    });
    animate();
  }


  // ===================================================================
  // INIT
  // ===================================================================

  function init() {
    document.documentElement.classList.add('js');

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const canvas = document.getElementById('hero-canvas');
      if (canvas) new InteractiveBackground(canvas);
    }

    initNav();
    initReveal();
    initCursorGlow();
    initFeatureGlows();
    initParallax();
    initButtonRipple();

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
