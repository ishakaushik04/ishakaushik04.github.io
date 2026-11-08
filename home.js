// Two small things, both cosmetic: sections fade up once as they arrive, and the lines framing the text fill with your scroll.
(() => {
  const chapters = [...document.querySelectorAll('.chapter')];
  const frame = document.querySelector('.frame');

  // fade up once, then stay put
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    chapters.forEach(c => c.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    chapters.forEach(c => io.observe(c));
  }

  // side lines: how far through the text you are (grows going down, shrinks going back up)
  if (!frame) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = frame.getBoundingClientRect();
    const vh = innerHeight;
    // the reading line sits about 60% down the screen, easing lower near the page's end so the line always finishes full
    const max = document.documentElement.scrollHeight - vh;
    const tail = document.documentElement.scrollHeight - (r.bottom + scrollY);
    const extra = Math.max(0, vh - tail - vh * 0.6);
    const ref = vh * 0.6 + (max > 0 ? Math.min(1, scrollY / max) : 0) * extra;
    const p = Math.min(1, Math.max(0, (ref - r.top) / r.height));
    frame.style.setProperty('--p', p.toFixed(4));
  };
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  if (document.fonts) document.fonts.ready.then(request);
  update();
})();
