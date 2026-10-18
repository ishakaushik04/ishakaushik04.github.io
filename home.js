/* Homepage hero. Everything here is cosmetic: normal scrolling is never intercepted,
   and with JS off the hero simply shows its text and photo. */
(() => {
  const root = document.documentElement;
  const hero = document.getElementById('hero');
  const copy = document.getElementById('typed');
  const img = hero.querySelector('img');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Split the intro line into words so they can fade in one after another.
  // Words from "Currently" onward get the amber highlight.
  const words = copy.dataset.text.trim().split(/\s+/);
  const cut = words.indexOf('Currently');
  copy.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'w' + (cut > -1 && i >= cut ? ' hl' : '');
    span.style.setProperty('--i', i);
    span.textContent = word;
    copy.append(span, ' ');
  });

  // Start the entrance once the fonts and the photo are ready (or after 1.4s regardless),
  // so nothing reflows or pops in mid-animation.
  const start = () => {
    if (root.classList.contains('ready')) return;
    if (!reduce && scrollY < 40) root.classList.add('play');   // the sheet glide only makes sense from the top
    root.classList.add('ready');
  };
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const photo = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
  Promise.race([Promise.all([fonts, photo]), new Promise(r => setTimeout(r, 1400))]).then(start);

  // As the cream sheet slides up over the hero, let the hero drift and fade a little.
  if (!reduce) {
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.85)));
      hero.style.setProperty('--p', p.toFixed(3));
    };
    addEventListener('scroll', () => { frame = frame || requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
  }
})();
