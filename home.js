/* Homepage hero. Everything here is cosmetic: with JS off the hero simply shows its text and photo. */
(() => {
  const root = document.documentElement;
  const hero = document.getElementById('hero');
  if (!hero) return;

  // Curtain: after the hero has settled, lift it so the page beneath slides into view.
  // (CSS keeps the page hidden and scrolling paused while the .intro class is on.)
  const HOLD = 1500;                       // ms the hero stays alone on screen once it has appeared
  const lift = () => {
    root.classList.add('curtain');
    root.classList.remove('intro');
    setTimeout(() => root.classList.remove('curtain'), 1400);
  };

  // Entrance: start once fonts are ready (or after 1.2s regardless) so nothing reflows mid-animation.
  const go = () => {
    root.classList.add('go');
    if (root.classList.contains('intro')) setTimeout(lift, HOLD);
  };
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1200))]).then(() => requestAnimationFrame(go));

  // Soft amber glow that follows the cursor inside the hero.
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
})();
