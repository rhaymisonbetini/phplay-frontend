// Stagger: ms between elements in the same intersection batch
const STAGGER = 80;

export function initReveal() {
  // Show everything immediately if reduced motion is preferred
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }

  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      // Sort by vertical position so stagger flows top → bottom
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      visible.forEach((entry, index) => {
        const el = entry.target;
        // data-reveal-delay attribute takes priority over auto-index stagger
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
