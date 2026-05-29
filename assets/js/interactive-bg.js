// =====================================================================
// interactive-bg.js — Hero interactive canvas background
//
// Three layers:
//   1. Starfield — small/medium/large stars drifting downward
//   2. Particles — large blurred orbs drifting upward
//   3. Data grid — mesh of dots+lines reacting to mouse/touch
//
// Mouse/touch proximity triggers repulsion; spring physics return
// everything smoothly to their base positions.
// =====================================================================

const REPEL_RADIUS    = 150;
const REPEL_FORCE     = 0.8;
const SPRING_STRENGTH = 0.05;
const DAMPING         = 0.85;
const GRID_SPACING    = 80;

export class InteractiveBackground {
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

  // ─── INIT ─────────────────────────────────────────────────────────

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

  // ─── CREATION ─────────────────────────────────────────────────────

  _createStars() {
    this.stars = [];
    const mobile = this.w < 768;
    const s = mobile ? 0.6 : 1;

    const layers = [
      // small — slow, white/dim
      { n: Math.round(150 * s), minR: 0.5, maxR: 1.5, minOp: 0.22, maxOp: 0.52, speed: 0.05, purple: 0,   glow: false },
      // medium — skip on mobile
      { n: mobile ? 0 : Math.round(80 * s), minR: 1.5, maxR: 2.5, minOp: 0.4, maxOp: 0.72, speed: 0.15, purple: 0.2, glow: false },
      // large — with glow halos, all purple-tinted
      { n: Math.round(28 * s), minR: 2.5, maxR: 4.0, minOp: 0.6, maxOp: 0.92, speed: 0.3, purple: 1.0, glow: true  },
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
        dy: -(0.08 + Math.random() * 0.14), // upward
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
        this.gridPoints.push({
          bx, by,
          x: bx, y: by,
          waveOffset: c * 0.5 + r * 0.3,
          vx: 0, vy: 0,
        });
        const idx = r * cols + c;
        if (c < cols - 1) this.gridConns.push([idx, idx + 1]);
        if (r < rows - 1) this.gridConns.push([idx, idx + cols]);
      }
    }

    this._cols = cols;
  }

  // ─── EVENTS ───────────────────────────────────────────────────────

  _attachEvents() {
    // Listen on the hero container so events work even when cursor is
    // over hero-content children (which have pointer-events: none on
    // the wrapper, but the hero itself still catches events).
    const hero = this.canvas.parentElement;

    const updateMouse = (cx, cy) => {
      const rect = hero.getBoundingClientRect();
      this.mouse.x = cx - rect.left;
      this.mouse.y = cy - rect.top;
    };
    const clearMouse = () => { this.mouse.x = -9999; this.mouse.y = -9999; };

    hero.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
    hero.addEventListener('mouseleave', clearMouse);

    hero.addEventListener('touchmove', e => {
      const t = e.touches[0];
      updateMouse(t.clientX, t.clientY);
    }, { passive: true });
    hero.addEventListener('touchend', clearMouse);

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
    if (document.visibilityState === 'visible' && !this.raf) {
      this._loop();
    }
  }

  // ─── RENDER LOOP ──────────────────────────────────────────────────

  _loop() {
    if (document.visibilityState === 'hidden') {
      this.raf = null;
      return;
    }

    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    this._drawStars();
    this._drawParticles();
    this._drawGrid();

    this.raf = requestAnimationFrame(this._loop);
  }

  // ─── STARS ────────────────────────────────────────────────────────

  _drawStars() {
    const { ctx, h } = this;

    // Advance all positions first
    for (const s of this.stars) {
      s.phase += s.twinkleSpeed;
      s.y += s.dy;
      if (s.y > h + 6) s.y = -6;
    }

    // White (non-purple, non-glow)
    for (const s of this.stars) {
      if (s.glow || s.isPurple) continue;
      const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.1);
      ctx.fillStyle = `rgba(255,255,255,${op.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Purple (no glow)
    for (const s of this.stars) {
      if (s.glow || !s.isPurple) continue;
      const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.1);
      ctx.fillStyle = `rgba(157,91,255,${op.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Large glow stars — save/restore once for the whole batch
    ctx.save();
    for (const s of this.stars) {
      if (!s.glow) continue;
      const op = Math.max(0.01, s.baseOp + Math.sin(s.phase) * 0.1);
      ctx.shadowColor = `rgba(157,91,255,${(op * 0.55).toFixed(2)})`;
      ctx.shadowBlur  = s.r * 6;
      ctx.fillStyle   = `rgba(210,170,255,${op.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── PARTICLES ────────────────────────────────────────────────────

  _drawParticles() {
    const { ctx, w, h } = this;
    const MX = this.mouse.x, MY = this.mouse.y;

    ctx.save();
    for (const p of this.particles) {
      p.phase     += p.phaseSpeed;
      p.swayPhase += p.swaySpeed;

      // Repulsion
      const dx = p.x - MX, dy = p.y - MY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPEL_RADIUS && dist > 0) {
        const f = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
        p.vx += (dx / dist) * f * 2.5;
        p.vy += (dy / dist) * f * 2.5;
      }

      // Damp accumulated velocity, then add natural drift
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x  += p.vx + Math.sin(p.swayPhase) * 0.3;
      p.y  += p.vy + p.dy;

      // Screen wrap
      if (p.y < -20)    { p.y = h + 20; p.x = Math.random() * w; }
      if (p.x < -30)      p.x = w + 30;
      if (p.x > w + 30)   p.x = -30;

      const op   = 0.15 + (Math.sin(p.phase) * 0.5 + 0.5) * 0.32;
      const cdx  = p.x - MX, cdy = p.y - MY;
      const cd   = Math.sqrt(cdx * cdx + cdy * cdy);
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

  // ─── DATA GRID ────────────────────────────────────────────────────

  _drawGrid() {
    const { ctx, w, h } = this;
    const MX   = this.mouse.x, MY = this.mouse.y;
    const time = performance.now() * 0.001;
    const GS   = GRID_SPACING;

    // Update positions
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
      pt.vx *= DAMPING;
      pt.vy *= DAMPING;
      pt.x  += pt.vx;
      pt.y  += pt.vy;
    }

    // Lines — single batched path
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(157,91,255,0.07)';
    ctx.lineWidth   = 0.5;
    for (const [ai, bi] of this.gridConns) {
      const a = this.gridPoints[ai], b = this.gridPoints[bi];
      // Skip fully off-screen connections
      if (a.x < -GS && b.x < -GS) continue;
      if (a.x > w + GS && b.x > w + GS) continue;
      if (a.y < -GS && b.y < -GS) continue;
      if (a.y > h + GS && b.y > h + GS) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Points — batch non-glow, draw glow individually
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

    // Glow points near cursor
    for (const { pt, t } of glowPoints) {
      const op = 0.28 + t * 0.72;
      const r  = 1.2 + t * 2.2;

      if (t > 0.35) {
        ctx.save();
        ctx.shadowBlur  = 8;
        ctx.shadowColor = `rgba(157,91,255,${(op * 0.6).toFixed(2)})`;
        ctx.fillStyle   = `rgba(157,91,255,${op.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(157,91,255,${op.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ─── CLEANUP ──────────────────────────────────────────────────────

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    document.removeEventListener('visibilitychange', this._onVisibility);
  }
}
