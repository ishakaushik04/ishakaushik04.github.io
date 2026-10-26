/* Fig. 3: interactive listing simulation.
   Procedural biryani rendered with three.js (r128). Illustrative, not measured data.
   If three.js or WebGL is unavailable the figure stays hidden and Table 2 carries the content. */
(function () {
  'use strict';
  var fig = document.getElementById('simFig');
  if (!fig || typeof THREE === 'undefined') return;

  var box = document.getElementById('simBox');
  var canvas = document.getElementById('simCanvas');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;
  fig.hidden = false;

  /* ---------- helpers ---------- */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rand = rng(20260);
  function hash(x, y, z) { var s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    function s(t) { return t * t * (3 - 2 * t); }
    var u = s(xf), v = s(yf), w = s(zf);
    return lerp(
      lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
      lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  /* r128 treats hex as linear; convert so colors match what is written */
  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  /* ---------- scene, camera, lights ---------- */
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 60);
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function makeEnv() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.5, '#e6dcc8'); gr.addColorStop(0.53, '#b8a688'); gr.addColorStop(1, '#5a4a36');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    g.fillStyle = 'rgba(255,255,255,.98)'; g.fillRect(60, 36, 100, 56); g.fillRect(320, 28, 120, 46);
    g.fillStyle = 'rgba(255,236,205,.9)'; g.fillRect(230, 70, 40, 24);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
    var pm = new THREE.PMREMGenerator(renderer);
    var env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return env;
  }
  scene.environment = makeEnv();
  var envMats = [];
  function mat(opts) { var m = new THREE.MeshStandardMaterial(opts); envMats.push(m); return m; }

  var amb = new THREE.AmbientLight(0xffffff, 1.0);
  var key = new THREE.DirectionalLight(0xfff0dc, 0);
  key.position.set(-4, 6.5, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  var sc = key.shadow.camera; sc.left = -3.6; sc.right = 3.6; sc.top = 3.6; sc.bottom = -3.6; sc.near = 1; sc.far = 20;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.035; key.shadow.radius = 4;
  var rim = new THREE.DirectionalLight(0xffd9b0, 0);
  rim.position.set(4.5, 3, -5);
  scene.add(amb, key, rim);

  var catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0, color: 0x2a2018 }));
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);

  /* ---------- mound height field ---------- */
  var A = 1.6, B = 1.0;
  function hf(x, z) {
    var r = Math.sqrt(x * x + z * z), t = clamp(1 - (r / A) * (r / A), 0, 1);
    return B * Math.pow(t, 0.7) + 0.09 * (vnoise(x * 2.1, 3.3, z * 2.1) - 0.5) * Math.min(1, t * 3);
  }
  function nrm(x, z) {
    var e = 0.02, dx = (hf(x + e, z) - hf(x - e, z)) / (2 * e), dz = (hf(x, z + e) - hf(x, z - e)) / (2 * e);
    return new THREE.Vector3(-dx, 1, -dz).normalize();
  }
  var UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);

  var food = new THREE.Group(); scene.add(food);

  /* inner solid so the grains never show gaps */
  (function () {
    var rings = 26, seg = 72, pos = [], nor = [], idx = [];
    function push(x, z, y) { pos.push(x, y, z); var n = nrm(x, z); nor.push(n.x, n.y, n.z); }
    push(0, 0, hf(0, 0) - 0.07);
    for (var i = 1; i <= rings; i++) {
      var r = A * i / rings;
      for (var j = 0; j < seg; j++) { var a = j / seg * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a); push(x, z, hf(x, z) - 0.07); }
    }
    for (var j2 = 0; j2 < seg; j2++) idx.push(0, 1 + j2, 1 + (j2 + 1) % seg);
    for (var i2 = 1; i2 < rings; i2++) for (var k = 0; k < seg; k++) {
      var a0 = 1 + (i2 - 1) * seg + k, a1 = 1 + (i2 - 1) * seg + (k + 1) % seg, b0 = 1 + i2 * seg + k, b1 = 1 + i2 * seg + (k + 1) % seg;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    window.__moundMat = mat({ color: C('#cdbd96'), roughness: 0.9, side: THREE.DoubleSide });
    var m = new THREE.Mesh(g, window.__moundMat); m.receiveShadow = true; food.add(m);
  })();
  var moundMat = window.__moundMat; delete window.__moundMat;

  /* ---------- rice grains (instanced) ---------- */
  var NG = 9500;
  var grainGeo = new THREE.SphereGeometry(0.5, 6, 4);
  var grains = new THREE.InstancedMesh(grainGeo, mat({ color: 0xffffff, roughness: 0.62 }), NG);
  grains.castShadow = true; grains.receiveShadow = true;
  var colPlain = [], colStyled = [];
  var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  (function () {
    var cPale = [0.88, 0.83, 0.70], cSaf = [0.90, 0.55, 0.15], cYel = [0.92, 0.74, 0.32], cMas = [0.52, 0.28, 0.11];
    for (var i = 0; i < NG; i++) {
      var rr = A * Math.pow(rand(), 0.42) * 0.995, a = rand() * Math.PI * 2;
      var x = rr * Math.cos(a), z = rr * Math.sin(a), n = nrm(x, z);
      var depth = rand() * 0.14;
      tmpP.set(x - n.x * depth, hf(x, z) - n.y * depth - 0.04, z - n.z * depth);
      var rv = new THREE.Vector3(rand() - .5, rand() - .5, rand() - .5);
      var t = new THREE.Vector3().crossVectors(n, rv).normalize();
      t.lerp(n, 0.15 + rand() * 0.2).normalize();
      tmpQ.setFromUnitVectors(FWD, t);
      var len = 0.2 + rand() * 0.07, wid = 0.05 + rand() * 0.012;
      tmpS.set(wid, wid, len);
      tmpM.compose(tmpP, tmpQ, tmpS); grains.setMatrixAt(i, tmpM);
      var v = 0.96 + rand() * 0.08;
      var p = [cPale[0] * v, cPale[1] * v, cPale[2] * v];
      colPlain.push(new THREE.Color(p[0], p[1], p[2]).convertSRGBToLinear());
      var s = vnoise(x * 1.9 + 4, hf(x, z) * 1.5, z * 1.9 - 2) * 0.7 + vnoise(x * 5.5, 9, z * 5.5) * 0.3;
      var base = p, rnd = rand(), out;
      if (rnd > 0.955) out = cMas;
      else if (s > 0.64) { var k = smooth((s - 0.64) / 0.2); out = [lerp(p[0], cSaf[0], k), lerp(p[1], cSaf[1], k), lerp(p[2], cSaf[2], k)]; }
      else if (s > 0.5) { var k2 = smooth((s - 0.5) / 0.14) * 0.55; out = [lerp(p[0], cYel[0], k2), lerp(p[1], cYel[1], k2), lerp(p[2], cYel[2], k2)]; }
      else out = base;
      colStyled.push(new THREE.Color(out[0], out[1], out[2]).convertSRGBToLinear());
      grains.setColorAt(i, colPlain[i]);
    }
    grains.instanceMatrix.needsUpdate = true; grains.instanceColor.needsUpdate = true;
  })();
  food.add(grains);
  var tmpC = new THREE.Color();
  var lastRiceV = -1;
  function setRice(v) {
    if (Math.abs(v - lastRiceV) < 0.004) return; lastRiceV = v;
    for (var i = 0; i < NG; i++) { tmpC.copy(colPlain[i]).lerp(colStyled[i], v); grains.setColorAt(i, tmpC); }
    grains.instanceColor.needsUpdate = true;
    moundMat.color.copy(C('#cdbd96')).lerp(C('#d6a45a'), v);
  }

  /* ---------- meat (visible only with the Visual pillar) ---------- */
  var meat = new THREE.Group(); food.add(meat);
  (function () {
    var meatMat = mat({ color: C('#7a3a17'), roughness: 0.66 });
    var boneMat = mat({ color: C('#eadfc8'), roughness: 0.6 });
    for (var k = 0; k < 8; k++) {
      var g = new THREE.SphereGeometry(1, 22, 16), p = g.attributes.position, sd = k * 7.3;
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = vnoise(x * 2.1 + sd, y * 2.1, z * 2.1) * 0.62 - 0.3;
        p.setXYZ(i, x * (1 + n), y * (1 + n), z * (1 + n));
      }
      g.computeVertexNormals();
      var piece = new THREE.Group();
      var body = new THREE.Mesh(g, meatMat); body.scale.set(0.29 + rand() * 0.05, 0.17, 0.21 + rand() * 0.04);
      body.castShadow = true; body.receiveShadow = true; piece.add(body);
      if (k % 2 === 0) {
        var bone = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.26, 8), boneMat);
        bone.rotation.z = Math.PI / 2; bone.position.set(0.33, 0.0, 0); bone.castShadow = true; piece.add(bone);
      }
      var ang = k / 8 * Math.PI * 2 + rand() * 0.6, rr = A * (0.22 + rand() * 0.55);
      var x = rr * Math.cos(ang), z = rr * Math.sin(ang);
      piece.position.set(x, hf(x, z) - 0.07, z);
      piece.rotation.set((rand() - .5) * 0.5, rand() * Math.PI * 2, (rand() - .5) * 0.5);
      meat.add(piece);
    }
  })();

  /* ---------- garnish: fried onion, mint, saffron strands ---------- */
  var garnish = new THREE.Group(); food.add(garnish);
  function surfaceXform(x, z, lift, tilt) {
    var n = nrm(x, z);
    tmpP.set(x + n.x * lift, hf(x, z) + n.y * lift - 0.04, z + n.z * lift);
    tmpQ.setFromUnitVectors(UP, n);
    tmpQ2.setFromAxisAngle(UP, rand() * Math.PI * 2); tmpQ.multiply(tmpQ2);
    if (tilt) { tmpQ2.setFromEuler(new THREE.Euler((rand() - .5) * tilt, 0, (rand() - .5) * tilt)); tmpQ.multiply(tmpQ2); }
  }
  function scatter(count, geo, material, rmax, lift, scaleFn, colorFn, tilt) {
    var im = new THREE.InstancedMesh(geo, material, count);
    for (var i = 0; i < count; i++) {
      var rr = A * rmax * Math.sqrt(rand()), a = rand() * Math.PI * 2;
      surfaceXform(rr * Math.cos(a), rr * Math.sin(a), lift, tilt);
      scaleFn(tmpS); tmpM.compose(tmpP, tmpQ, tmpS); im.setMatrixAt(i, tmpM);
      im.setColorAt(i, colorFn());
    }
    im.castShadow = true; im.receiveShadow = true; garnish.add(im); return im;
  }
  scatter(150, new THREE.SphereGeometry(1, 8, 5), mat({ color: 0xffffff, roughness: 0.6 }), 0.93, 0.012,
    function (s) { s.set(0.12 + rand() * 0.08, 0.012, 0.028 + rand() * 0.014); },
    function () { return C(['#b9852f', '#9c6a22', '#7a4d17', '#c79a45'][Math.floor(rand() * 4)]); }, 0.5);
  scatter(18, new THREE.SphereGeometry(1, 10, 6), mat({ color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide }), 0.7, 0.03,
    function (s) { var k = 0.8 + rand() * 0.5; s.set(0.14 * k, 0.008, 0.075 * k); },
    function () { return C(['#4d7c3a', '#5f8c43', '#3f6d31'][Math.floor(rand() * 3)]); }, 0.9);
  (function () {
    var curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 0.02, 0.012), new THREE.Vector3(0.17, 0.0, 0.05), new THREE.Vector3(0.27, -0.015, 0.02)]);
    scatter(44, new THREE.TubeGeometry(curve, 8, 0.009, 5, false), mat({ color: 0xffffff, roughness: 0.4 }), 0.82, 0.025,
      function (s) { var k = 0.8 + rand() * 0.5; s.set(k, k, k); },
      function () { return C(['#d2361a', '#e2531d', '#bd2a14'][Math.floor(rand() * 3)]); }, 0.2);
  })();

  /* ---------- vessels ---------- */
  function lathe(pts) { return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 96); }
  var plateGroup = new THREE.Group(), handiGroup = new THREE.Group();
  scene.add(plateGroup, handiGroup);

  var plate = new THREE.Mesh(
    lathe([[0, -0.16], [1.9, -0.16], [2.3, -0.12], [2.58, 0.02], [2.64, 0.09], [2.58, 0.095], [2.5, 0.04], [2.28, -0.075], [1.9, -0.105], [0, -0.105]]),
    mat({ color: C('#f3efe6'), roughness: 0.32, side: THREE.DoubleSide }));
  plate.receiveShadow = true; plate.castShadow = true; plateGroup.add(plate);
  var loose = new THREE.InstancedMesh(grainGeo, mat({ color: 0xffffff, roughness: 0.5 }), 70);
  for (var li = 0; li < 70; li++) {
    var lr = A * 0.98 + rand() * 0.55, la = rand() * Math.PI * 2;
    tmpP.set(lr * Math.cos(la), -0.085, lr * Math.sin(la));
    tmpQ.setFromAxisAngle(UP, rand() * Math.PI * 2); tmpS.set(0.056, 0.05, 0.23);
    tmpM.compose(tmpP, tmpQ, tmpS); loose.setMatrixAt(li, tmpM);
    var lv = 0.94 + rand() * 0.1; loose.setColorAt(li, new THREE.Color(0.93 * lv, 0.89 * lv, 0.8 * lv).convertSRGBToLinear());
  }
  loose.receiveShadow = true; loose.castShadow = true; plateGroup.add(loose);

  var copper = mat({ color: C('#8d5a2b'), roughness: 0.42, metalness: 0.82, side: THREE.DoubleSide });
  var handi = new THREE.Mesh(
    lathe([[1.5, -0.14], [1.6, -0.005], [1.72, 0.02], [1.83, -0.04], [1.9, -0.28], [2.03, -0.72], [2.02, -1.08], [1.78, -1.42], [1.2, -1.64], [0.5, -1.72], [0, -1.73]]), copper);
  handi.castShadow = true; handi.receiveShadow = true; handiGroup.add(handi);
  (function () {
    var g = new THREE.TorusGeometry(1.67, 0.085, 12, 72), p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = (vnoise(x * 4, y * 4, z * 4) - 0.5) * 0.06;
      p.setXYZ(i, x * (1 + n), y * (1 + n * 1.6), z + n * 0.3);
    }
    g.computeVertexNormals();
    var seal = new THREE.Mesh(g, mat({ color: C('#d6bf95'), roughness: 0.88 }));
    seal.rotation.x = Math.PI / 2; seal.position.y = 0.035; seal.scale.set(1, 1, 1.15); seal.castShadow = true; seal.receiveShadow = true; handiGroup.add(seal);
    [-1, 1].forEach(function (s) {
      var h = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 24), copper);
      h.position.set(s * 2.2, -0.45, 0); h.scale.set(0.8, 1, 1); h.castShadow = true; handiGroup.add(h);
    });
  })();

  /* ---------- steam (Experiential) ---------- */
  var steam = [];
  (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    for (var i = 0; i < 20; i++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xcfc4ae, transparent: true, opacity: 0, depthWrite: false }));
      s.userData = { x: (rand() - .5) * 1.4, z: (rand() - .5) * 1.4, ph: rand(), sp: 0.16 + rand() * 0.1 };
      scene.add(s); steam.push(s);
    }
  })();

  /* ---------- annotation overlay ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var leads = document.createElementNS(NS, 'svg'); leads.setAttribute('class', 'sim-leads'); leads.setAttribute('aria-hidden', 'true');
  box.insertBefore(leads, box.querySelector('.hud-tl'));
  var cos = [
    { el: document.getElementById('co1'), side: 'l', pillar: 'i', a: new THREE.Vector3(0.3, hf(0.3, 0.1) + 0.02, 0.1) },
    { el: document.getElementById('co2'), side: 'l', pillar: 'i', a: new THREE.Vector3(-1.05, hf(-1.05, 0.85), 0.85) },
    { el: document.getElementById('co3'), side: 'l', pillar: 'i', a: new THREE.Vector3(1.35, hf(1.35, 0.5), 0.5) },
    { el: document.getElementById('co4'), side: 'r', pillar: 'c', a: new THREE.Vector3(1.32, 0.03, -1.0) }
  ];
  cos.forEach(function (c) {
    c.line = document.createElementNS(NS, 'line'); c.dot = document.createElementNS(NS, 'circle'); c.dot.setAttribute('r', 3);
    leads.appendChild(c.line); leads.appendChild(c.dot);
    c.n = c.pillar === 'c' ? new THREE.Vector3(c.a.x, 0.3, c.a.z).normalize() : nrm(c.a.x, c.a.z);
  });

  /* ---------- state ---------- */
  var tgt = { v: 0, i: 0, c: 0, e: 0 }, cur = { v: 0, i: 0, c: 0, e: 0 };
  var ctl = { az: 0.55, el: 0.5, dist: 8.6, ty: -0.05 };
  var user = false, idleT = 0, visible = true, W = 1, H = 1, pr = 0, dirty = true, seqTimers = [];
  var elTitle = document.getElementById('capT'), elDesc = document.getElementById('capD'), elTag = document.getElementById('tagV'), elSt = document.getElementById('simSt');
  var btns = {}; [].forEach.call(fig.querySelectorAll('.pb'), function (b) { btns[b.dataset.p] = b; });

  var TXT = {
    desc0: '', desc1: 'Fragrant, slow-cooked biryani with tender meat, aromatic spices, and perfectly steamed basmati rice',
    tag0: 'low-res, flat lighting', tag1: 'layered rice, visible meat, saffron garnish'
  };
  function swapText(el, txt) {
    if (reduce) { el.textContent = txt; el.style.display = txt ? '' : 'none'; return; }
    el.classList.add('sw');
    setTimeout(function () { el.textContent = txt; el.style.display = txt ? '' : 'none'; el.classList.remove('sw'); }, 220);
  }
  function setTarget(k, on) {
    tgt[k] = on ? 1 : 0;
    btns[k].setAttribute('aria-pressed', on ? 'true' : 'false');
    if (k === 'v') elTag.lastChild.textContent = on ? TXT.tag1 : TXT.tag0;
    if (k === 'e') swapText(elDesc, on ? TXT.desc1 : TXT.desc0);
    if (k === 'i') cos.forEach(function (c) { if (c.pillar === 'i') c.el.classList.toggle('on', on); });
    if (k === 'c') cos.forEach(function (c) { if (c.pillar === 'c') c.el.classList.toggle('on', on); });
    var n = tgt.v + tgt.i + tgt.c + tgt.e;
    elSt.textContent = n + ' of 4 pillars applied';
    dirty = true; wake();
  }
  function clearSeq() { seqTimers.forEach(clearTimeout); seqTimers = []; }
  ['v', 'i', 'c', 'e'].forEach(function (k) {
    btns[k].addEventListener('click', function () { clearSeq(); setTarget(k, btns[k].getAttribute('aria-pressed') !== 'true'); });
  });
  fig.querySelector('[data-act="reset"]').addEventListener('click', function () { clearSeq(); ['v', 'i', 'c', 'e'].forEach(function (k) { setTarget(k, false); }); });
  fig.querySelector('[data-act="all"]').addEventListener('click', function () { clearSeq(); ['v', 'i', 'c', 'e'].forEach(function (k) { setTarget(k, true); }); });
  fig.querySelector('[data-act="seq"]').addEventListener('click', function () {
    clearSeq(); ['v', 'i', 'c', 'e'].forEach(function (k) { setTarget(k, false); });
    ['v', 'i', 'c', 'e'].forEach(function (k, n) { seqTimers.push(setTimeout(function () { setTarget(k, true); }, 500 + n * 1700)); });
  });
  elDesc.style.display = 'none';

  /* ---------- orbit interaction ---------- */
  var drag = null, hint = box.querySelector('.hint');
  function touched() { user = true; idleT = 0; if (hint) hint.classList.add('gone'); wake(); }
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); touched(); });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    ctl.az -= (e.clientX - drag.x) * 0.0085; ctl.el = clamp(ctl.el + (e.clientY - drag.y) * 0.006, 0.16, 1.25);
    drag.x = e.clientX; drag.y = e.clientY; touched();
  });
  function end() { drag = null; }
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', function (e) {
    var d = { ArrowLeft: [0.14, 0], ArrowRight: [-0.14, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    if (!d) return; e.preventDefault(); ctl.az += d[0]; ctl.el = clamp(ctl.el + d[1], 0.16, 1.25); touched();
  });

  /* ---------- sizing ---------- */
  function resize() {
    var r = box.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    leads.setAttribute('viewBox', '0 0 ' + W + ' ' + H); pr = 0; dirty = true; wake();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(box); else window.addEventListener('resize', resize);
  function setRes(p) { if (Math.abs(p - pr) < 0.03) return; pr = p; renderer.setPixelRatio(p); renderer.setSize(W, H, false); }

  /* ---------- frame ---------- */
  var anchorV = new THREE.Vector3(), viewV = new THREE.Vector3();
  function update(dt, time) {
    var k = reduce ? 1 : 1 - Math.exp(-dt * 5.5), moving = false;
    ['v', 'i', 'c', 'e'].forEach(function (p) {
      var d = tgt[p] - cur[p]; if (Math.abs(d) > 0.002) { cur[p] += d * k; moving = true; } else cur[p] = tgt[p];
    });
    var v = cur.v, vs = smooth(v), cs = smooth(cur.c);

    amb.intensity = lerp(0.92, 0.34, vs); key.intensity = lerp(0, 2.4, vs); rim.intensity = lerp(0, 1.25, vs);
    renderer.toneMappingExposure = lerp(1.0, 1.08, vs);
    envMats.forEach(function (m) { m.envMapIntensity = lerp(0, 0.65, vs); });
    catcher.material.opacity = lerp(0, 0.2, vs);
    setRice(vs);
    var ms = smooth((v - 0.1) / 0.8), gs = smooth((v - 0.35) / 0.65);
    meat.scale.setScalar(Math.max(0.0001, ms)); meat.visible = ms > 0.001;
    garnish.scale.setScalar(Math.max(0.0001, gs)); garnish.visible = gs > 0.001;
    setRes(lerp(0.17, DPR, smooth((v - 0.25) / 0.5)));

    var pS = 1 - cs, hS = cs;
    plateGroup.scale.setScalar(Math.max(0.0001, pS)); plateGroup.visible = pS > 0.001;
    handiGroup.scale.setScalar(Math.max(0.0001, hS)); handiGroup.visible = hS > 0.001;
    catcher.position.y = lerp(-0.17, -1.74, cs);
    var tyT = lerp(-0.05, -1.0, cs), dT = lerp(8.6, 10.2, cs) * Math.max(1, 1.24 / camera.aspect);
    ctl.ty = lerp(ctl.ty, tyT, reduce ? 1 : k); ctl.dist = lerp(ctl.dist, dT, reduce ? 1 : k);

    if (!reduce && !user) ctl.az += dt * 0.16;

    var ce = Math.cos(ctl.el);
    camera.position.set(ce * Math.sin(ctl.az) * ctl.dist, ctl.ty + Math.sin(ctl.el) * ctl.dist, ce * Math.cos(ctl.az) * ctl.dist);
    camera.lookAt(0, ctl.ty, 0);

    var es = cur.e;
    for (var i = 0; i < steam.length; i++) {
      var s = steam[i], u = (time * s.userData.sp + s.userData.ph) % 1;
      s.position.set(s.userData.x * (0.6 + u * 0.8), 0.9 + u * 1.9, s.userData.z * (0.6 + u * 0.8));
      var sz = 0.5 + u * 1.3; s.scale.set(sz, sz, 1); s.material.opacity = es * 0.3 * Math.sin(Math.PI * u);
    }

    /* leader lines */
    var br = box.getBoundingClientRect();
    cos.forEach(function (c) {
      var amt = c.pillar === 'i' ? cur.i : cur.c;
      if (amt < 0.01) { c.line.style.opacity = 0; c.dot.style.opacity = 0; return; }
      var r = c.el.getBoundingClientRect();
      var x0 = (c.side === 'l' ? r.right : r.left) - br.left, y0 = r.top + r.height / 2 - br.top;
      anchorV.copy(c.a).project(camera);
      var x1 = (anchorV.x * 0.5 + 0.5) * W, y1 = (-anchorV.y * 0.5 + 0.5) * H;
      viewV.copy(camera.position).sub(c.a).normalize();
      var facing = clamp(viewV.dot(c.n) * 4 + 0.6, 0.18, 1) * amt;
      c.line.setAttribute('x1', x0); c.line.setAttribute('y1', y0); c.line.setAttribute('x2', x1); c.line.setAttribute('y2', y1);
      c.dot.setAttribute('cx', x1); c.dot.setAttribute('cy', y1);
      c.line.style.opacity = facing * 0.7; c.dot.style.opacity = facing;
    });
    return moving;
  }

  var last = 0, running = false;
  function frame(now) {
    running = false;
    if (!visible || document.hidden) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    var moving = update(dt, now / 1000);
    renderer.render(scene, camera);
    /* keep drawing while anything moves; otherwise sleep until something wakes us */
    dirty = moving || !!drag || (!reduce && !user) || seqTimers.length > 0 || cur.e > 0.01;
    if (dirty) { running = true; requestAnimationFrame(frame); }
  }
  function wake() { if (!running && visible) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  if (window.IntersectionObserver) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); }, { threshold: 0.05 }).observe(box);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });

  resize(); wake();
})();
