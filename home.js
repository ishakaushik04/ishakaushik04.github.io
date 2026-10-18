(() => {
  const $ = id => document.getElementById(id), root = document.documentElement;
  const veil = $('veil'), hero = $('hero'), cue = $('cue'), img = hero.querySelector('img'), typed = $('typed'), name = $('name'), nameWrap = name.parentElement;
  const words = typed.dataset.text.split(' '), cut = words.indexOf('Currently');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let timers = [], busy = false, armed = false, cooldown = 0;
  const later = (f, ms) => timers.push(setTimeout(f, ms));
  function type() {
    let i = 0;
    const tick = () => {
      i++;
      const a = words.slice(0, i), s = cut > -1 && i > cut ? a.slice(0, cut).join(' ') + ' <em>' + a.slice(cut).join(' ') + '</em>' : a.join(' ');
      typed.innerHTML = s + '<span class="caret"></span>';
      if (i < words.length) later(tick, 34);
      else later(() => { armed = true; cue.hidden = false; requestAnimationFrame(() => cue.classList.add('show')); }, 500);
    };
    tick();
  }
  async function enter() {
    busy = true; armed = false; nameWrap.classList.remove('lit'); root.classList.add('locked');
    hero.getAnimations().forEach(a => a.cancel());
    typed.innerHTML = ''; cue.classList.remove('show'); cue.hidden = true; veil.hidden = hero.hidden = false; veil.style.opacity = 1;
    await Promise.race([img.decode().catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
    hero.animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    img.animate([{ opacity: 0, transform: 'scale(1.22) rotate(-6deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 420, delay: 200, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'both' });
    hero.animate([{ translate: '0 0' }, { translate: '-3px 3px' }, { translate: '2px -2px' }, { translate: '0 0' }], { duration: 160, delay: 600 });
    later(type, 260);
  }
  function exit() {
    if (!armed) return;
    armed = false; timers.forEach(clearTimeout); timers = []; cue.classList.remove('show');
    const h = hero.getBoundingClientRect(), n = name.getBoundingClientRect();
    const t = `translate(${n.left + n.width / 2 - h.left - h.width / 2}px,${n.top + n.height / 2 - h.top - h.height / 2}px) scale(${n.width / h.width},${n.height / h.height})`;
    root.classList.remove('locked'); scrollTo(0, 0);
    hero.animate([{ transform: 'none', borderRadius: '28px', opacity: 1 }, { transform: t, borderRadius: '90px', opacity: 1, offset: .88 }, { transform: t, borderRadius: '90px', opacity: 0 }],
      { duration: 780, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }).onfinish = () => { hero.hidden = veil.hidden = cue.hidden = true; busy = false; cooldown = Date.now() + 900; };
    later(() => { veil.style.opacity = 0; }, 180);
    later(() => nameWrap.classList.add('lit'), 560);
  }
  const open = () => { if (!busy && Date.now() > cooldown) enter(); };
  let y0 = 0;
  hero.addEventListener('click', exit); veil.addEventListener('click', exit); cue.addEventListener('click', exit);
  addEventListener('wheel', e => { if (busy) { if (e.deltaY > 4) exit(); } else if (e.deltaY < -4 && scrollY <= 0) open(); }, { passive: true });
  addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => { if (busy && y0 - e.touches[0].clientY > 30) exit(); }, { passive: true });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (busy) exit(); else if ((e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'PageUp') && scrollY <= 0) open();
  });
  name.addEventListener('click', e => { e.preventDefault(); open(); });
  (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))]) : Promise.resolve()).then(enter);
})();
