/* VICE project page interactions. Standalone.
   Without JS: all tab panels show, both lens columns show, text still reads. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- tabs: [data-tabs] with [role=tab] buttons + .tab-panel, matched by order ---------- */
  $$('[data-tabs]').forEach(function (box, n) {
    var tabs = $$('[role=tab]', box), panels = $$('.tab-panel', box);
    tabs.forEach(function (t, i) {
      t.id = 't' + n + '-' + i; panels[i].id = 'p' + n + '-' + i;
      t.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('aria-labelledby', t.id);
      panels[i].setAttribute('role', 'tabpanel');
    });
    function show(i) {
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach(function (p, j) { p.hidden = j !== i; });
      box.style.setProperty('--p', ((i + 1) / tabs.length * 100) + '%');
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = i;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = tabs.length - 1;
        else return;
        e.preventDefault(); show(j); tabs[j].focus();
      });
    });
    show(0);
  });

  /* ---------- in-view helpers ---------- */
  function onView(els, fn, threshold) {
    if (!('IntersectionObserver' in window)) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } });
    }, { threshold: threshold || 0.3, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  onView($$('.reveal'), function (el) { el.classList.add('in'); }, 0.04);

  function countUp(el) {
    var target = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce || !isFinite(target)) { el.textContent = pre + target + suf; return; }
    var t0 = null, dur = 1300;
    function tick(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(target * eased) + (p === 1 ? suf : '');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  onView($$('[data-count]'), countUp, 0.6);

  /* ---------- 01 lens switch ---------- */
  (function () {
    var box = $('#lens'); if (!box) return;
    var sw = $('.switch', box), flag = $('#lensFlag'), labs = $$('.lens-lab', box);
    function set(india) {
      box.dataset.lens = india ? 'india' : 'west';
      sw.setAttribute('aria-checked', String(india));
      labs[0].classList.toggle('on', !india); labs[1].classList.toggle('on', india);
      flag.textContent = india
        ? 'Each of these is a recalibration, and with no Indian data to validate against, each is an explicit assumption.'
        : 'Most of the research VICE draws on looks through this lens.';
    }
    sw.addEventListener('click', function () { set(sw.getAttribute('aria-checked') !== 'true'); });
    labs[0].addEventListener('click', function () { set(false); });
    labs[1].addEventListener('click', function () { set(true); });
    set(false);
  })();

  /* ---------- 03 V: colour mood ---------- */
  (function () {
    var plate = $('#plate'); if (!plate) return;
    var text = $('#moodText'), btns = $$('#mood .seg button');
    var copy = { spice: 'Warm reds for spice.', fresh: 'Greens for fresh.', rich: 'Golden-brown for richness.' };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        plate.dataset.m = b.dataset.m; text.textContent = copy[b.dataset.m];
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  })();

  /* ---------- 03 I: layered detail ---------- */
  (function () {
    var card = $('#layerCard'); if (!card) return;
    var hint = $('#layerHint'), btns = $$('[data-l]');
    var copy = {
      1: 'Name and price first. Nothing else competes for attention.',
      2: 'Tap for the description.',
      3: 'Then nutrition and allergens, only for those who want them.'
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        card.dataset.level = b.dataset.l; hint.textContent = copy[b.dataset.l];
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  })();

  /* ---------- 03 I: trust score (equal weights, illustrative) ---------- */
  (function () {
    var box = $('#trust'); if (!box) return;
    var ins = $$('input', box), outs = $$('output', box), score = $('#trustScore'), mark = $('#trustMark'), txt = $('#trustText');
    function update() {
      var sum = 0;
      ins.forEach(function (i, k) { outs[k].textContent = i.value; sum += +i.value; });
      var s = Math.round(sum / ins.length);
      score.textContent = s; mark.style.left = s + '%';
      txt.textContent = s >= 70 ? 'High score: better placement in the listing.'
        : s >= 40 ? 'Middling score: placement stays around the middle.'
        : 'Low score: pushed down. Higher score earns better placement.';
    }
    ins.forEach(function (i) { i.addEventListener('input', update); });
    update();
  })();

  /* ---------- 03 C: compass + region-aware ranking ---------- */
  (function () {
    var out = $('#regionOut'); if (!out) return;
    var info = {
      north: 'Richness, spice, breads',
      south: 'Rice base, sambhar and chutney variety, filter coffee',
      east: 'Fish and seafood, mustard oil',
      west: 'Chaat and snack culture, sweet-savory balance'
    };
    var btns = $$('.compass button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.dataset.r;
        out.innerHTML = '<b></b> ';
        out.firstChild.textContent = b.textContent;
        out.appendChild(document.createTextNode(info[r]));
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });

    var list = $('#rank'), modes = $$('[data-o]');
    var els = $$('li', list), map = {};
    els.forEach(function (li) { map[li.dataset.id] = li; });
    function reorder(order) {
      var first = els.map(function (el) { return el.getBoundingClientRect().top; });
      order.forEach(function (id) { list.appendChild(map[id]); });
      els.forEach(function (el, i) {
        var dy = first[i] - el.getBoundingClientRect().top;
        if (!dy || reduce) return;
        el.style.transition = 'none'; el.style.transform = 'translateY(' + dy + 'px)';
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          el.style.transition = 'transform .5s ease'; el.style.transform = '';
        }); });
      });
    }
    modes.forEach(function (b) {
      b.addEventListener('click', function () {
        var region = b.dataset.o === 'region';
        reorder(region ? ['ben', 'goa', 'ker'] : ['goa', 'ker', 'ben']);
        map.ben.classList.toggle('hit', region);
        modes.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  })();

  /* ---------- 03 E: description richness ---------- */
  (function () {
    var range = $('#descRange'); if (!range) return;
    var dish = $('#dishText'), note = $('#descNote');
    var aF = $('#appealFill'), aV = $('#appealVal'), bF = $('#believeFill'), bV = $('#believeVal');
    var L = [
      { t: '“Chicken curry with rice”', a: 25, b: 85, n: 'Poor: says what the dish is, nothing about how it will feel.' },
      { t: '“Tender chicken curry with basmati rice”', a: 50, b: 88, n: 'Better: one sensory cue, still plain.' },
      { t: '“Tender chicken in aromatic, slow-simmered curry with fragrant basmati rice”', a: 85, b: 85, n: 'Optimized: sensory words that set expectations without overpromising.' },
      { t: '“Heavenly, impossibly succulent chicken in the most divine, mind-blowingly aromatic curry, with cloud-soft rice you will never forget”', a: 88, b: 30, n: 'Over-describing backfires. It starts to sound too good to be true.' }
    ];
    function update() {
      var l = L[+range.value];
      dish.textContent = l.t; note.textContent = l.n;
      aF.style.width = l.a + '%'; aV.textContent = l.a;
      bF.style.width = l.b + '%'; bV.textContent = l.b;
    }
    range.addEventListener('input', update);
    update();
  })();

  /* ---------- 04 compounding listing ---------- */
  (function () {
    var section = $('#compound'); if (!section) return;
    var W = { v: 0.35, i: 0.25, c: 0.20, e: 0.20 };
    var state = { v: false, i: false, c: false, e: false };
    var MUL_MAX = (1 + W.v) * (1 + W.i) * (1 + W.c) * (1 + W.e) - 1;
    var toggles = $$('[data-k]', section);
    var addFill = $('#addFill'), mulFill = $('#mulFill'), addVal = $('#addVal'), mulVal = $('#mulVal');
    var text = $('#liftText'), together = $('#together');

    function render() {
      var keys = Object.keys(W), n = 0, add = 0, mul = 1;
      keys.forEach(function (k) { if (state[k]) { n++; add += W[k]; mul *= (1 + W[k]); } });
      mul -= 1; if (!n) mul = 0;
      toggles.forEach(function (el) {
        var on = state[el.dataset.k];
        el.setAttribute('aria-pressed', String(on));
        if (el.classList.contains('layer')) el.classList.toggle('on', on);
      });
      addFill.style.width = (add / MUL_MAX * 100) + '%'; mulFill.style.width = (mul / MUL_MAX * 100) + '%';
      addVal.textContent = add.toFixed(2); mulVal.textContent = mul.toFixed(2);
      text.textContent = n === 0 ? 'Switch a pillar on to start.'
        : n === 1 ? 'With one pillar there is nothing to compound, so both views agree.'
        : 'Compounding adds ' + (mul - add).toFixed(2) + ' on top of simple addition. Each pillar makes the others work harder.';
      together.classList.toggle('on', n === 4);
    }
    function flip(k) { state[k] = !state[k]; render(); }
    toggles.forEach(function (el) {
      el.addEventListener('click', function () { flip(el.dataset.k); });
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(el.dataset.k); }
        });
      }
    });
    $('#allOn').addEventListener('click', function () { Object.keys(state).forEach(function (k) { state[k] = true; }); render(); });
    $('#allOff').addEventListener('click', function () { Object.keys(state).forEach(function (k) { state[k] = false; }); render(); });
    render();
  })();

  /* ---------- 05 rollout: audit dots, pilot split, personalised weights ---------- */
  (function () {
    var audit = $('#audit');
    if (audit) {
      var f = document.createDocumentFragment();
      for (var i = 0; i < 100; i++) {
        var d = document.createElement('i');
        d.style.setProperty('--d', (i * 12) + 'ms');
        f.appendChild(d);
      }
      audit.appendChild(f);
    }

    var pilot = $('#pilot');
    if (pilot) {
      var dots = [], pf = document.createDocumentFragment();
      for (var j = 0; j < 20; j++) { var p = document.createElement('i'); dots.push(p); pf.appendChild(p); }
      pilot.appendChild(pf);
      var order = dots.map(function (_, k) { return k; });
      var assign = function () {
        order.forEach(function (idx, k) { dots[idx].className = k < 10 ? 'v' : 'k'; });
      };
      var shuffle = function () {
        for (var k = order.length - 1; k > 0; k--) {
          var r = Math.floor(Math.random() * (k + 1)), t = order[k]; order[k] = order[r]; order[r] = t;
        }
        assign();
      };
      assign();
      $('#shuffle').addEventListener('click', shuffle);
    }

    var range = $('#persRange');
    if (range) {
      var segs = $$('#persBar span'), txt = $('#persText');
      var update = function () {
        var r = +range.value, v = 35 - r, inf = 25 + r;
        var w = [v, inf, 20, 20], names = ['V', 'I', 'C', 'E'];
        segs.forEach(function (s, k) { s.style.width = w[k] + '%'; s.textContent = names[k] + ' ' + w[k] + '%'; });
        txt.textContent = r === 0 ? 'Average user: the default 35 / 25 / 20 / 20.'
          : r < 0 ? 'Visual-driven user: Visual carries more weight, Informational less.'
          : 'Information-driven user: Informational carries more weight, Visual less.';
      };
      range.addEventListener('input', update);
      update();
    }
  })();

  /* ---------- lightbox ---------- */
  (function () {
    var dlg = $('#lightbox'); if (!dlg || !dlg.showModal) return;
    var big = $('img', dlg);
    $$('.zoom').forEach(function (z) {
      z.addEventListener('click', function () {
        var img = $('img', z);
        big.src = img.currentSrc || img.src; big.alt = img.alt;
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  })();

  /* ---------- scrollspy + progress ---------- */
  (function () {
    var links = $$('.topbar nav a'), bar = $('#progress');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) {
            if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-35% 0px -60% 0px' });
      links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
    }
    function prog() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, window.scrollY / h * 100) : 0) + '%';
    }
    window.addEventListener('scroll', prog, { passive: true }); prog();
  })();
})();
