/* Homepage hero. Everything here is cosmetic: normal scrolling is never intercepted,
   and with JS off the hero simply shows its text and photo. */
(() => {
  const root = document.documentElement;
  const hero = document.getElementById('hero');
  if (!hero) return;

  // Entrance: start once fonts are ready (or after 1.2s regardless) so nothing reflows mid-animation.
  const go = () => root.classList.add('go');
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1200))]).then(() => requestAnimationFrame(go));

  // Soft amber glow that follows the cursor inside the hero.
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
})();
