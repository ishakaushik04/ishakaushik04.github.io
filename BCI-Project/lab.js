/* Fig. 2: convergence lab. Schematic and synthetic: values are illustrative, not device data.
   Three ads with fixed independent measures; a simulated device produces a neural index per ad.
   The four criteria of Table 1 are then checked live. If JS is off, the figure stays hidden. */
(function () {
  'use strict';
  var fig = document.getElementById('labFig');
  if (!fig) return;
  fig.hidden = false;

  /* ---------- model ---------- */
  var ADS = [
    { id: 'A', tag: 'memorable',   rec: 0.80, self: 0.82, beh: 0.76 },
    { id: 'B', tag: 'forgettable', rec: 0.30, self: 0.52, beh: 0.28 },
    { id: 'C', tag: 'average',     rec: 0.55, self: 0.50, beh: 0.58 }
  ];
  ADS.forEach(function (a) { a.ind = (a.rec + a.self + a.beh) / 3; });

  /* neural index the simulated device reports for ads A, B, C (before noise) */
  var MODES = {
    valid: [0.81, 0.40, 0.55],   /* tracks the independent measures */
    attn:  [0.78, 0.86, 0.50],   /* tracks attention only: B grabs attention but is forgotten */
    flat:  [0.55, 0.50, 0.52]    /* compressed: every ad looks “moderately engaging” */
  };
  var LIM = { conv: 0.20, disc: 0.25, rel: 0.12 };   /* illustrative thresholds */

  var st = { mode: 'valid', noise: 10, seed: 7, sel: 0, u1: [], u2: [] };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function f2(v) { return v.toFixed(2); }
  function f0(v) { return f2(v).replace(/^0/, ''); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function draws() { var r = rng(st.seed * 9301 + 49297); for (var i = 0; i < 3; i++) { st.u1[i] = r() * 2 - 1; st.u2[i] = r() * 2 - 1; } }
  function neural(run2) {
    var amp = st.noise / 100 * 0.32, u = run2 ? st.u2 : st.u1;
    return MODES[st.mode].map(function (b, i) { return clamp(b + u[i] * amp, 0.02, 0.98); });
  }
  function order(vals) {
    return ADS.map(function (a, i) { return { id: a.id, v: vals[i] }; })
      .sort(function (x, y) { return y.v - x.v; }).map(function (o) { return o.id; }).join(' > ');
  }

  function criteria(n1, n2) {
    var out = [], bad = [], i;
    for (i = 0; i < 3; i++) if (Math.abs(n1[i] - ADS[i].ind) > LIM.conv) bad.push('Ad ' + ADS[i].id + ': neural ' + f2(n1[i]) + ', independent mean ' + f2(ADS[i].ind));
    out.push({ n: 'Convergent', ok: !bad.length, why: bad.length ? bad.join('; ') + '.' : 'Neural index is within ' + f2(LIM.conv) + ' of the independent mean for every ad.' });

    var span = Math.max.apply(null, n1) - Math.min.apply(null, n1);
    out.push({ n: 'Discriminant', ok: span >= LIM.disc, why: 'Neural index spans ' + f2(span) + ' across ads (needs ≥ ' + f2(LIM.disc) + ').' });

    var dmax = 0; for (i = 0; i < 3; i++) dmax = Math.max(dmax, Math.abs(n1[i] - n2[i]));
    out.push({ n: 'Reliability', ok: dmax <= LIM.rel, why: 'Largest run-to-run change is ' + f2(dmax) + ' (limit ' + f2(LIM.rel) + ').' });

    var oN = order(n1), oI = order(ADS.map(function (a) { return a.ind; }));
    out.push({ n: 'Sensitivity', ok: oN === oI, why: oN === oI ? 'Ad ranking matches the independent ranking (' + oI + ').' : 'Neural ranking ' + oN + ' differs from the independent ranking ' + oI + '.' });
    return out;
  }

  /* ---------- chart ---------- */
  var chart = document.getElementById('labChart');
  var BAR = [
    { k: 'n',    c: '#7a4f1a' },   /* neural */
    { k: 'rec',  c: '#1d1c1a' },
    { k: 'self', c: '#5b574f' },
    { k: 'beh',  c: '#c9bfa8' }
  ];
  var X0 = 34, GW = 190, BW = 34, BG = 6, BASE = 170, HH = 134;
  function yv(v) { return BASE - v * HH; }

  function drawChart(n1, n2) {
    var s = '', i, j;
    [0, 0.5, 1].forEach(function (t) {
      s += '<line class="gr" x1="' + X0 + '" x2="630" y1="' + yv(t) + '" y2="' + yv(t) + '"/>' +
           '<text class="m s" x="' + (X0 - 6) + '" y="' + (yv(t) + 4) + '" text-anchor="end">' + (t === 0 ? '0' : t === 1 ? '1' : '.5') + '</text>';
    });
    for (i = 0; i < 3; i++) {
      var a = ADS[i], gx = X0 + i * GW + 18, ok = Math.abs(n1[i] - a.ind) <= LIM.conv;
      var vals = { n: n1[i], rec: a.rec, self: a.self, beh: a.beh };
      s += '<g class="gt" data-i="' + i + '">';
      s += '<rect x="' + (X0 + i * GW) + '" y="4" width="' + GW + '" height="' + (BASE + 40) + '" fill="' + (i === st.sel ? 'rgba(122,79,26,.06)' : 'transparent') + '"/>';
      for (j = 0; j < 4; j++) {
        var b = BAR[j], x = gx + j * (BW + BG), v = vals[b.k];
        var ty = (b.k === 'n') ? Math.min(yv(v), yv(n2[i]) - 1) : yv(v);
        s += '<rect x="' + x + '" y="' + yv(v) + '" width="' + BW + '" height="' + (v * HH) + '" fill="' + b.c + '"/>' +
             '<text class="s v" x="' + (x + BW / 2) + '" y="' + (ty - 5) + '" text-anchor="middle">' + f0(v) + '</text>';
      }
      var t2 = yv(n2[i]);
      s += '<line x1="' + (gx - 3) + '" x2="' + (gx + BW + 3) + '" y1="' + t2 + '" y2="' + t2 + '" stroke="#1d1c1a" stroke-width="2"/>';
      var my = yv(a.ind);
      s += '<line x1="' + (gx - 6) + '" x2="' + (gx + 4 * BW + 3 * BG + 6) + '" y1="' + my + '" y2="' + my + '" stroke="#1d1c1a" stroke-width="1.3" stroke-dasharray="4 3"/>';
      s += '<text class="b" x="' + (X0 + i * GW + GW / 2) + '" y="16" text-anchor="middle" fill="' + (ok ? '#1d1c1a' : '#7a4f1a') + '" style="fill:' + (ok ? '#1d1c1a' : '#7a4f1a') + '">' + (ok ? '✓ agrees' : '✕ diverges') + '</text>';
      s += '<text class="b" x="' + (X0 + i * GW + GW / 2) + '" y="' + (BASE + 18) + '" text-anchor="middle">Ad ' + a.id + '</text>';
      s += '<text class="m s" x="' + (X0 + i * GW + GW / 2) + '" y="' + (BASE + 37) + '" text-anchor="middle">' + a.tag + '</text>';
      s += '</g>';
    }
    s += '<line class="ln" x1="' + X0 + '" x2="630" y1="' + BASE + '" y2="' + BASE + '"/>';
    chart.innerHTML = s;
  }

  /* ---------- criteria list + verdict ---------- */
  var critEl = document.getElementById('labCrit'), verEl = document.getElementById('labVerdict');
  function drawCrit(list) {
    var failed = 0, h = '';
    list.forEach(function (c) {
      if (!c.ok) failed++;
      h += '<li class="' + (c.ok ? 'ok' : 'no') + '"><span class="mk" aria-hidden="true">' + (c.ok ? '✓' : '✕') + '</span>' +
           '<span class="nm">' + c.n + '<span class="sr" style="position:absolute;left:-9999px">' + (c.ok ? ' passed' : ' failed') + '</span></span><span class="why">' + c.why + '</span></li>';
    });
    critEl.innerHTML = h;
    verEl.className = 'verdict' + (failed ? ' no' : '');
    verEl.textContent = failed
      ? 'Provisional ground truth not established: ' + failed + ' of 4 criteria failed.'
      : 'Agreement across independent measures supports provisional ground truth for this device.';
  }

  /* ---------- render ---------- */
  var tabs = [].slice.call(fig.querySelectorAll('.tabs button'));
  var traceLabel = document.getElementById('labTraceLbl');
  function render() {
    var n1 = neural(false), n2 = neural(true);
    drawChart(n1, n2); drawCrit(criteria(n1, n2));
    tabs.forEach(function (b, i) { b.setAttribute('aria-pressed', i === st.sel ? 'true' : 'false'); });
    traceLabel.textContent = 'Neural signal, Ad ' + ADS[st.sel].id + ' (schematic)';
    chart.setAttribute('aria-label', 'Bar chart for three ads: neural index versus recall, self-report and behavior. ' + criteriaSummary(n1, n2));
    if (reduce) drawTrace(0);
  }
  function criteriaSummary(n1, n2) { return criteria(n1, n2).map(function (c) { return c.n + (c.ok ? ' passes' : ' fails'); }).join(', ') + '.'; }

  /* ---------- controls ---------- */
  [].forEach.call(fig.querySelectorAll('[data-m]'), function (b) {
    b.addEventListener('click', function () {
      st.mode = b.dataset.m;
      [].forEach.call(fig.querySelectorAll('[data-m]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    });
  });
  var nz = document.getElementById('labNz'), nzv = document.getElementById('labNzv');
  nz.addEventListener('input', function () { st.noise = +nz.value; nzv.textContent = st.noise + '%'; render(); });
  fig.querySelector('[data-act="rerun"]').addEventListener('click', function () { st.seed++; draws(); render(); });
  tabs.forEach(function (b, i) { b.addEventListener('click', function () { st.sel = i; render(); }); });
  chart.addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('.gt') : null;
    if (g) { st.sel = +g.getAttribute('data-i'); render(); }
  });

  /* ---------- signal strip (synthetic) ---------- */
  var cv = document.getElementById('labTrace'), ctx = cv.getContext('2d');
  var TW = 0, TH = 64, DPR = Math.min(window.devicePixelRatio || 1, 2), PXS = 90;
  function hsh(n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }
  function sample(t, lvl, nzf) {
    var a = 0.35 + lvl * 0.65;
    var v = a * (0.55 * Math.sin(6.283 * 9 * t) + 0.3 * Math.sin(6.283 * 17 * t + 1) + 0.25 * Math.sin(6.283 * 4 * t + 2));
    v += nzf * (hsh(Math.floor(t * 110)) - 0.5) * 1.5;
    var k = Math.floor(t / 1.7), ph = t - k * 1.7;
    if (hsh(k + 3.1) < nzf * 1.3) v += (hsh(k) > 0.5 ? 1 : -1) * nzf * 2.2 * Math.exp(-ph * 3) * Math.sin(ph * 15);
    return v;
  }
  function sizeTrace() {
    TW = cv.clientWidth || 300; cv.width = TW * DPR; cv.height = TH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function drawTrace(t0) {
    var lvl = neural(false)[st.sel], nzf = st.noise / 100;
    ctx.clearRect(0, 0, TW, TH);
    ctx.strokeStyle = '#e6e2d9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, TH / 2); ctx.lineTo(TW, TH / 2); ctx.stroke();
    ctx.strokeStyle = '#1d1c1a'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (var x = 0; x <= TW; x += 2) {
      var y = TH / 2 - clamp(sample(t0 + x / PXS, lvl, nzf), -1.25, 1.25) * (TH * 0.36);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  var visible = true, running = false, t00 = 0;
  function loop(now) {
    running = false;
    if (!visible || document.hidden || reduce) return;
    drawTrace(now / 1000); running = true; requestAnimationFrame(loop);
  }
  function wake() { if (!running && visible && !reduce) { running = true; requestAnimationFrame(loop); } }
  if (window.IntersectionObserver) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); }, { threshold: 0.05 }).observe(cv);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  if (window.ResizeObserver) new ResizeObserver(function () { sizeTrace(); if (reduce) drawTrace(t00); }).observe(cv); else window.addEventListener('resize', sizeTrace);

  draws(); sizeTrace(); render(); wake();
})();
