/* REMS & PTSD project page interactions. Standalone.
   Without JS: all tab panels show, bars are full, text still reads. */
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
  onView($$('.gauge'), function (el) { el.classList.add('in'); }, 0.4);

  function countUp(el) {
    var target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
    if (reduce || !isFinite(target)) { el.textContent = target + suffix; return; }
    var t0 = null, dur = 1300;
    function tick(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  onView($$('[data-count]'), countUp, 0.6);

  /* ---------- 01 cohort dots ---------- */
  (function () {
    var grid = $('#dotgrid'); if (!grid) return;
    var N = 1000, dots = [], frag = document.createDocumentFragment();
    for (var i = 0; i < N; i++) {
      var d = document.createElement('i');
      d.style.setProperty('--d', ((i % 40) * 6 + Math.floor(i / 40) * 4) + 'ms');
      frag.appendChild(d); dots.push(d);
    }
    grid.appendChild(frag);

    // counts per stage. Treated dots are picked from those who have not recovered.
    var EXPOSED = 700, PTSD = 39, REC = 16, TRT_FROM = 16, TRT_TO = 19;
    var texts = [
      'Start with <b>1,000 people</b>. Step through to follow what the figures mean.',
      '<b>70%</b> experience a potentially traumatic event. That is about <b>700</b> of the 1,000.',
      'Only <b>5.6%</b> of those go on to develop PTSD: about <b>39</b> people, in line with the <b>3.9%</b> global figure.',
      'At most <b>40%</b> recover within a year, so up to about <b>16</b> of the 39. The other <b>23 or more</b> carry it forward.',
      'Fewer than <b>1 in 10</b> receive treatment in the first year: under <b>4</b> people. This gap is what an early, low-cost signal is meant to help close.'
    ];
    var btns = $$('#cohortSteps button[data-s]'), playBtn = $('#cohortPlay'), out = $('#cohortText');
    var timer = null, cur = 0;

    function apply(s) {
      cur = s;
      dots.forEach(function (d, i) {
        var c = '';
        if (s >= 1 && i < EXPOSED) c = 'exp';
        if (s >= 2 && i < PTSD) c = 'ptsd';
        if (s >= 3 && i < REC) c = 'rec';
        if (s >= 4 && i >= TRT_FROM && i < TRT_TO) c = 'trt';
        d.className = c;
      });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.s === s)); });
      out.innerHTML = texts[s];
    }
    function stop() { clearInterval(timer); timer = null; playBtn.textContent = '▶ Play'; }
    btns.forEach(function (b) { b.addEventListener('click', function () { stop(); apply(+b.dataset.s); }); });
    playBtn.addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (cur >= 4) apply(0);
      playBtn.textContent = '❚❚ Pause';
      timer = setInterval(function () {
        if (cur >= 4) { stop(); return; }
        apply(cur + 1);
      }, 2600);
    });
    apply(0);
  })();

  /* ---------- 02 loop lab ---------- */
  (function () {
    var svg = $('#loopSvg'); if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    // node centres in the 400x400 viewBox (match the inline left/top percentages in the HTML)
    var P = [[200, 75], [318.9, 161.4], [273.5, 301.1], [126.5, 301.1], [81.1, 161.4]];
    var nodes = [
      { t: 'Stage 1 · Trauma', d: 'Stress response switches on. Most people recover; the stages that follow describe what happens when sleep does not.' },
      { t: 'Stage 2 · Sleep breaks', d: 'Insomnia and recurrent nightmares appear. Sleep problems sit at the centre of PTSD.' },
      { t: 'Stage 3 · REM lost', d: 'Emotional regulation weakens. NA has to drop for REM to form, so any rise in NA makes REM harder to get.' },
      { t: 'Stage 4 · NA rises', d: 'The locus coeruleus–NA pathway is overactive and brain NA climbs. Lower NPY and less sensitive alpha-2 autoreceptors amplify this.' },
      { t: 'Stage 5 · Hyperarousal', d: 'Wakefulness and further REM loss, which feeds straight back into stage 3. The loop sustains itself.' }
    ];
    var edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 2]]; // last one is the feedback edge

    svg.innerHTML =
      '<defs>' +
      '<marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3be9ff"/></marker>' +
      '<marker id="ahf" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffb23e"/></marker>' +
      '</defs>';
    var edgeEls = {};
    edges.forEach(function (e, k) {
      var a = P[e[0]], b = P[e[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len, inset = 36;
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', a[0] + ux * inset); ln.setAttribute('y1', a[1] + uy * inset);
      ln.setAttribute('x2', b[0] - ux * (inset + 2)); ln.setAttribute('y2', b[1] - uy * (inset + 2));
      var fb = k === edges.length - 1;
      ln.setAttribute('class', 'edge' + (fb ? ' fb' : ''));
      ln.setAttribute('marker-end', 'url(#' + (fb ? 'ahf' : 'ah') + ')');
      svg.appendChild(ln); edgeEls[e[0] + '-' + e[1]] = ln;
      if (fb) {
        var tx = document.createElementNS(NS, 'text');
        tx.setAttribute('x', (a[0] + b[0]) / 2 + 8); tx.setAttribute('y', (a[1] + b[1]) / 2 - 8);
        tx.setAttribute('class', 'fb-label'); tx.textContent = 'feedback';
        svg.appendChild(tx);
      }
    });
    var sig = document.createElementNS(NS, 'circle');
    sig.setAttribute('id', 'sig'); sig.setAttribute('r', '6'); sig.setAttribute('cx', '0'); sig.setAttribute('cy', '0');
    sig.style.transform = 'translate(' + P[0][0] + 'px,' + P[0][1] + 'px)';
    svg.appendChild(sig);

    var nodeEls = $$('.lnode'), info = $('#nodeInfo');
    var remFill = $('#remFill'), naFill = $('#naFill'), remVal = $('#remVal'), naVal = $('#naVal'), lapsEl = $('#laps'), insight = $('#insight');
    var amp1 = $('#amp1'), amp2 = $('#amp2'), stepBtn = $('#stepBtn'), runBtn = $('#runBtn'), resetBtn = $('#resetBtn');
    var START_NA = 0.2, START_REM = 0.82;
    var cur = -1, laps = 0, na = START_NA, rem = START_REM, timer = null, liveTimer = null;

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
    function gain() { return 1 + 0.45 * ((amp1.checked ? 1 : 0) + (amp2.checked ? 1 : 0)); }
    function setInfo(i) {
      info.innerHTML = '<h3></h3><p></p>';
      info.firstChild.textContent = nodes[i].t; info.lastChild.textContent = nodes[i].d;
      nodeEls.forEach(function (n, j) { n.classList.toggle('sel', j === i); });
    }
    function effects(i) {
      var g = gain();
      if (i === 1) rem -= 0.05;
      if (i === 2) rem -= 0.07 * g;
      if (i === 3) na += (1 - na) * 0.2 * g;
      if (i === 4) rem -= 0.04 * g;
      rem = clamp(rem, 0.04, 1); na = clamp(na, 0, 0.98);
    }
    function render() {
      var r = Math.round(rem * 100), n = Math.round(na * 100);
      remFill.style.width = r + '%'; naFill.style.width = n + '%';
      remVal.textContent = r; naVal.textContent = n; lapsEl.textContent = laps;
      var msg;
      if (cur === -1) msg = 'Press Step to begin.';
      else if (laps === 0) msg = 'First pass: trauma disrupts sleep, REM drops, NA starts to rise.';
      else if (rem <= 0.1 && na >= 0.6) msg = 'REM is near its floor and NA is high. In this toy model the loop now sustains itself.';
      else msg = 'Each lap through stages 3 → 4 → 5 pushes NA up and REM down' + (gain() > 1 ? ', and the amplifiers make every lap hit harder.' : '. Try switching on an amplifier and running more laps.');
      insight.textContent = msg;
    }
    function nextIndex() { return cur === -1 ? 0 : (cur === 4 ? 2 : cur + 1); }
    function step() {
      var prev = cur; cur = nextIndex();
      if (prev === 4) laps++;
      sig.classList.add('show');
      sig.style.transform = 'translate(' + P[cur][0] + 'px,' + P[cur][1] + 'px)';
      Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove('live'); });
      if (prev !== -1 && edgeEls[prev + '-' + cur]) {
        edgeEls[prev + '-' + cur].classList.add('live');
        clearTimeout(liveTimer);
        liveTimer = setTimeout(function () { Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove('live'); }); }, 1100);
      }
      nodeEls.forEach(function (n, j) { n.classList.toggle('cur', j === cur); });
      effects(cur); setInfo(cur); render();
      if (laps >= 12) stopRun();
    }
    function stopRun() { clearInterval(timer); timer = null; runBtn.textContent = 'Auto-run'; }
    function reset() {
      stopRun(); cur = -1; laps = 0; na = START_NA; rem = START_REM;
      sig.classList.remove('show'); sig.style.transform = 'translate(' + P[0][0] + 'px,' + P[0][1] + 'px)';
      Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove('live'); });
      nodeEls.forEach(function (n) { n.classList.remove('cur', 'sel'); });
      info.innerHTML = '<h3>Pick a stage, or press Step</h3><p>Each circle is one stage. Step sends a signal around the loop and shows what happens to REM sleep and NA.</p>';
      render();
    }

    stepBtn.addEventListener('click', function () { stopRun(); step(); });
    runBtn.addEventListener('click', function () {
      if (timer) { stopRun(); return; }
      runBtn.textContent = 'Pause'; step();
      timer = setInterval(step, 1500);
    });
    resetBtn.addEventListener('click', reset);
    nodeEls.forEach(function (n, i) { n.addEventListener('click', function () { setInfo(i); }); });
    [amp1, amp2].forEach(function (a) { a.addEventListener('change', render); });
    render();
  })();

  /* ---------- 05 risk calculator ---------- */
  (function () {
    var box = $('#calc'); if (!box) return;
    var inputs = $$('input', box), score = $('#score'), verdict = $('#verdict'), ring = $('#ringVal'), ringSvg = $('.ring', box);
    var C = 2 * Math.PI * 44, total = inputs.length;
    function update() {
      var n = inputs.filter(function (i) { return i.checked; }).length;
      score.textContent = n;
      ring.style.strokeDashoffset = C * (1 - n / total);
      var hi = n >= 3;
      ringSvg.classList.toggle('hi', hi);
      verdict.className = 'verdict' + (hi ? ' hi' : '');
      verdict.textContent = hi
        ? 'At 3 or more, the framework\u2019s proposed logic flags closer monitoring. This is a concept, not a validated result.'
        : (n === 0 ? '1 point per box. In the framework\u2019s proposed logic, 3 or more flags closer monitoring.' : 'Below the proposed threshold of 3. One point per box.');
    }
    inputs.forEach(function (i) { i.addEventListener('change', update); });
    update();
  })();

  /* ---------- 05 proxy filter ---------- */
  (function () {
    var list = $('#proxies'); if (!list) return;
    var btns = $$('.filter button'), items = $$('li', list);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.f;
        btns.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
        items.forEach(function (li) { li.classList.toggle('dim', f !== 'all' && li.dataset.g !== f); });
      });
    });
  })();

  /* ---------- 05 tier ladder ---------- */
  (function () {
    var box = $('#tiers'); if (!box) return;
    var radios = $$('input[name=tier]', box), items = $$('.caps li', box);
    function update() {
      var v = +(radios.filter(function (r) { return r.checked; })[0] || { value: 1 }).value;
      items.forEach(function (li) { li.classList.toggle('on', +li.dataset.t <= v); });
    }
    radios.forEach(function (r) { r.addEventListener('change', update); });
    update();
  })();

  /* ---------- diagram lightbox ---------- */
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
