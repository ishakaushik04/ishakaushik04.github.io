(() => {
  const $ = id => document.getElementById(id), root = document.documentElement;
  const veil = $('veil'), hero = $('hero'), img = hero.querySelector('img'), typed = $('typed'), name = $('name'), nameWrap = name.parentElement;
  const TEXT = typed.dataset.text, words = TEXT.split(' '), cut = words.indexOf('Currently');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.add('ready'); return; }
  let timers = [], busy = false;
  const later = (f, ms) => timers.push(setTimeout(f, ms));
  const esc = a => a.join(' ');
  function type() {
    let i = 0;
    const tick = () => {
      i++;
      const a = words.slice(0, i), s = cut > -1 && i > cut ? esc(a.slice(0, cut)) + ' <em>' + esc(a.slice(cut)) + '</em>' : esc(a);
      typed.innerHTML = s + '<span class="caret"></span>';
      if (i < words.length) later(tick, 34); else later(exit, 3200);
    };
    tick();
  }
  async function enter() {
    busy = true; nameWrap.classList.remove('lit');
    hero.getAnimations().forEach(a => a.cancel());
    typed.innerHTML = ''; veil.hidden = hero.hidden = false; veil.style.opacity = 1;
    await Promise.race([img.decode().catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
    hero.animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    img.animate([{ opacity: 0, transform: 'scale(1.22) rotate(-6deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 420, delay: 200, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'both' });
    hero.animate([{ translate: '0 0' }, { translate: '-3px 3px' }, { translate: '2px -2px' }, { translate: '0 0' }], { duration: 160, delay: 600 });
    later(type, 260);
  }
  function exit() {
    timers.forEach(clearTimeout); timers = [];
    const h = hero.getBoundingClientRect(), n = name.getBoundingClientRect();
    const t = `translate(${n.left + n.width / 2 - h.left - h.width / 2}px,${n.top + n.height / 2 - h.top - h.height / 2}px) scale(${n.width / h.width},${n.height / h.height})`;
    root.classList.add('ready');
    hero.animate([{ transform: 'none', borderRadius: '28px', opacity: 1 }, { transform: t, borderRadius: '90px', opacity: 1, offset: .88 }, { transform: t, borderRadius: '90px', opacity: 0 }],
      { duration: 780, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }).onfinish = () => { hero.hidden = veil.hidden = true; busy = false; };
    later(() => { veil.style.opacity = 0; }, 180);
    later(() => nameWrap.classList.add('lit'), 560);
  }
  hero.addEventListener('click', exit);
  addEventListener('keydown', e => { if (!hero.hidden && busy) exit(); });
  name.addEventListener('click', e => { e.preventDefault(); if (!busy) enter(); });
  (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))]) : Promise.resolve()).then(enter);
})();
