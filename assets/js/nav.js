export function initNav() {
  const nav = document.getElementById('site-nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileOverlay = document.getElementById('nav-mobile-overlay');
  const mobileClose = document.getElementById('nav-mobile-close');
  const mobileLinks = mobileOverlay ? mobileOverlay.querySelectorAll('.nav-link') : [];

  if (!nav) return;

  // Sticky nav on scroll
  const SCROLL_THRESHOLD = window.innerHeight * 0.15;

  function updateNav() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Mobile hamburger
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

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileOverlay && mobileOverlay.classList.contains('open');
      isOpen ? closeMenu() : openMenu();
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', closeMenu);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Active link highlight on scroll
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${id}`);
        });
      });
    },
    { threshold: 0.4, rootMargin: '-64px 0px -40% 0px' }
  );

  sections.forEach((section) => sectionObserver.observe(section));

  // Mobile download bar visibility
  const mobileBar = document.getElementById('mobile-download-bar');
  if (mobileBar) {
    const heroHeight = window.innerHeight;

    const barObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          mobileBar.classList.add('visible');
        } else {
          mobileBar.classList.remove('visible');
        }
      },
      { threshold: 0 }
    );

    const hero = document.querySelector('.hero');
    if (hero) barObserver.observe(hero);
  }
}
