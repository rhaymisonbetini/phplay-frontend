export function initCursorGlow() {
  // Disabled on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const glow = document.getElementById('cursor-glow');
  if (!glow) return;

  let mouseX = -200;
  let mouseY = -200;
  let currentX = -200;
  let currentY = -200;
  let rafId = null;
  let visible = false;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function animate() {
    currentX = lerp(currentX, mouseX, 0.12);
    currentY = lerp(currentY, mouseY, 0.12);
    glow.style.left = currentX + 'px';
    glow.style.top = currentY + 'px';
    rafId = requestAnimationFrame(animate);
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!visible) {
      visible = true;
      glow.classList.add('visible');
    }
  });

  document.addEventListener('mouseleave', () => {
    visible = false;
    glow.classList.remove('visible');
  });

  animate();
}
