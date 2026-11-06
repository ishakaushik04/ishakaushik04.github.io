// Dim everything except the paragraph you're reading. Purely cosmetic: without JS (or with reduced motion) all text is simply shown.
(() => {
  const chapters = [...document.querySelectorAll('.chapter')];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    chapters.forEach(c => c.classList.add('on'));
    return;
  }
  // a wide band across the middle of the screen; chapters touch each other, so one is always lit
  const band = new IntersectionObserver(entries => {
    entries.forEach(e => {
      // the last chapter stays lit once reached, so it doesn't dim as the footer takes over
      const keep = e.target === chapters[chapters.length - 1] && e.boundingClientRect.top < innerHeight / 2;
      e.target.classList.toggle('on', e.isIntersecting || keep);
    });
  }, { rootMargin: '-35% 0px -35% 0px' });
  chapters.forEach(c => band.observe(c));
})();
