const PHP_GLOW_RGB = [157, 91, 255];
const CYAN_RGB = [79, 195, 247];
const WHITE_RGB = [255, 255, 255];

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

class Star {
  constructor(w, h, layer) {
    this.layer = layer;
    this.reset(w, h, true);
  }

  reset(w, h, initial = false) {
    this.x = randBetween(0, w);
    this.y = initial ? randBetween(0, h) : -10;
    this.w = w;
    this.h = h;

    if (this.layer === 0) {
      this.size = randBetween(0.8, 1.8);
      this.baseOpacity = randBetween(0.3, 0.6);
      this.speed = randBetween(0.03, 0.08);
      this.rgb = WHITE_RGB;
    } else if (this.layer === 1) {
      this.size = randBetween(1.5, 2.8);
      this.baseOpacity = randBetween(0.5, 0.8);
      this.speed = randBetween(0.1, 0.2);
      this.rgb = Math.random() < 0.3 ? PHP_GLOW_RGB : WHITE_RGB;
    } else {
      this.size = randBetween(2.5, 4.5);
      this.baseOpacity = randBetween(0.7, 1.0);
      this.speed = randBetween(0.2, 0.4);
      this.rgb = Math.random() < 0.6 ? PHP_GLOW_RGB : CYAN_RGB;
    }

    this.twinklePhase = randBetween(0, Math.PI * 2);
    this.twinkleSpeed = randBetween(0.005, 0.025);
  }

  update() {
    this.y += this.speed;
    this.twinklePhase += this.twinkleSpeed;

    if (this.y > this.h + 10) {
      this.reset(this.w, this.h);
    }
  }

  getOpacity() {
    const twinkle = Math.sin(this.twinklePhase) * 0.2;
    return Math.max(0.1, Math.min(1, this.baseOpacity + twinkle));
  }

  draw(ctx) {
    const op = this.getOpacity();
    const [r, g, b] = this.rgb;

    if (this.layer === 2) {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
      grad.addColorStop(0, `rgba(${r},${g},${b},${op})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${op * 0.4})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = randBetween(0, this.w);
    this.y = initial ? randBetween(0, this.h) : this.h + 20;
    this.size = randBetween(3, 7);
    this.speed = randBetween(0.15, 0.45);
    this.baseOpacity = randBetween(0.2, 0.5);
    this.phase = randBetween(0, Math.PI * 2);
    this.sway = randBetween(0.3, 1.2);
    this.swaySpeed = randBetween(0.008, 0.02);
    this.opPhase = randBetween(0, Math.PI * 2);
    this.opSpeed = randBetween(0.01, 0.03);
    this.blur = randBetween(4, 10);
  }

  update() {
    this.y -= this.speed;
    this.phase += this.swaySpeed;
    this.opPhase += this.opSpeed;
    this.x += Math.sin(this.phase) * this.sway;

    if (this.y < -20) {
      this.reset();
    }
  }

  getOpacity() {
    return this.baseOpacity + Math.sin(this.opPhase) * 0.15;
  }

  draw(ctx) {
    const op = Math.max(0, Math.min(1, this.getOpacity()));
    const [r, g, b] = PHP_GLOW_RGB;

    ctx.save();
    ctx.filter = `blur(${this.blur}px)`;
    ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.particles = [];
    this.animFrameId = null;
    this.resizeTimer = null;
    this.w = 0;
    this.h = 0;

    this.handleResize = this.handleResize.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.animate = this.animate.bind(this);

    this.init();
  }

  init() {
    this.resize();
    this.createStars();
    this.createParticles();
    this.animate();

    window.addEventListener('resize', this.handleResize, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);

    this.w = w;
    this.h = h;
  }

  createStars() {
    this.stars = [];
    const isMobile = this.w < 768;
    const density = isMobile ? 0.6 : 1;

    const counts = [
      Math.round(150 * density),
      Math.round(80 * density),
      Math.round(30 * density),
    ];

    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < counts[layer]; i++) {
        this.stars.push(new Star(this.w, this.h, layer));
      }
    }
  }

  createParticles() {
    this.particles = [];
    const count = this.w < 768 ? 8 : 15;
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(this.w, this.h));
    }
  }

  handleResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resize();
      this.createStars();
      this.createParticles();
    }, 200);
  }

  handleVisibility() {
    if (document.visibilityState === 'visible' && !this.animFrameId) {
      this.animate();
    }
  }

  animate() {
    if (document.visibilityState === 'hidden') {
      this.animFrameId = null;
      return;
    }

    this.ctx.clearRect(0, 0, this.w, this.h);

    for (const star of this.stars) {
      star.update();
      star.draw(this.ctx);
    }

    for (const particle of this.particles) {
      particle.update();
      particle.draw(this.ctx);
    }

    this.animFrameId = requestAnimationFrame(this.animate);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    clearTimeout(this.resizeTimer);
  }
}
