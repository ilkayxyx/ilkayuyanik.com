/* İlkay Uyanık portfolyo — canvas animasyon motoru. Tüm veriler uydurmadır. */
(function () {
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var FB = 'Figtree, system-ui, sans-serif', FH = 'Fraunces, Georgia, serif';
  var P = null;
  function pal() {
    if (P) return P;
    var s = getComputedStyle(document.documentElement);
    var g = function (n, d) { return (s.getPropertyValue(n) || '').trim() || d; };
    P = { bg: g('--color-bg', '#f5ead8'), surf: g('--color-surface', '#ebddc5'), ink: g('--color-text', '#201e1d'),
      acc: g('--color-accent', '#c67139'), sage: g('--color-accent-2', '#7a8a5e'), red: '#b5452f', amber: '#d9a032' };
    var D = { n: ['#f9f4ed','#eee7db','#dcd3c4','#c0b6a5','#a19786','#82796a','#645c50','#474238','#2e2b25'],
      a: ['#fff2eb','#ffe1d0','#ffc6a5','#f6a06b','#d67f48','#b2622d','#8c491a','#643312','#402310'],
      s: ['#f0fae1','#e1eecc','#ccdbb2','#aebf92','#8fa073','#728157','#56633f','#3d472b','#272e1b'] };
    [['n','neutral'],['a','accent'],['s','accent-2']].forEach(function (k) {
      for (var i = 1; i <= 9; i++) P[k[0] + i] = g('--color-' + k[1] + '-' + i + '00', D[k[0]][i - 1]);
    });
    return P;
  }
  var cl = function (v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.max(a, Math.min(b, v)); };
  var seg = function (t, a, b) { return cl((t - a) / (b - a)); };
  var eo = function (t) { return 1 - Math.pow(1 - t, 3); };
  var eio = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var back = function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function dot(c, x, y, r, col) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, 6.2832); c.fillStyle = col; c.fill(); }
  function ring(c, x, y, r, col, lw) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, 6.2832); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
  function tx(c, s, x, y, size, col, o) {
    o = o || {}; c.font = (o.w || 400) + ' ' + size + 'px ' + (o.h ? FH : FB); c.fillStyle = col;
    c.textAlign = o.al || 'left'; c.textBaseline = 'alphabetic';
    var ls = 'letterSpacing' in c; if (ls) c.letterSpacing = (o.ls || 0) + 'px';
    c.fillText(s, x, y); if (ls) c.letterSpacing = '0px';
  }
  function wrap(c, s, x, y, maxW, lh, size, col, o) {
    o = o || {}; c.font = (o.w || 400) + ' ' + size + 'px ' + (o.h ? FH : FB);
    var words = s.split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) { tx(c, line, x, yy, size, col, o); line = words[i]; yy += lh; } else line = test;
    }
    if (line) tx(c, line, x, yy, size, col, o);
  }
  var fmt = function (n) { return Math.round(n).toLocaleString('tr-TR'); };
  function mkPath(pts) { var L = [0]; for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts: pts, L: L, len: L[L.length - 1] }; }
  function at(p, d) {
    d = ((d % p.len) + p.len) % p.len; var i = 1;
    while (i < p.L.length - 1 && p.L[i] < d) i++;
    var a = p.pts[i - 1], b = p.pts[i], u = (d - p.L[i - 1]) / ((p.L[i] - p.L[i - 1]) || 1);
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  function trace(c, p, upto, tf) {
    upto = Math.min(upto, p.len); c.beginPath(); var a = tf(p.pts[0]); c.moveTo(a[0], a[1]);
    for (var i = 1; i < p.pts.length; i++) {
      if (p.L[i] <= upto) { var b = tf(p.pts[i]); c.lineTo(b[0], b[1]); }
      else { var A = p.pts[i - 1], B = p.pts[i], u = (upto - p.L[i - 1]) / (p.L[i] - p.L[i - 1]); var q = tf([lerp(A[0], B[0], u), lerp(A[1], B[1], u)]); c.lineTo(q[0], q[1]); break; }
    }
  }

  /* ───────── registry / loop ───────── */
  var items = [], ticks = [], raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame); pal();
    var still = RM.matches;
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (!it.vis) continue;
      var cv = it.canvas, cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) continue;
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cw * dpr), H = Math.round(ch * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; it.dirty = true; }
      if (still && !it.dirty) continue;
      it.dirty = false;
      var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch);
      c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 1; c.setLineDash([]);
      var t = still ? (it.opts.still != null ? it.opts.still : 6) : (now - it.t0) / 1000;
      try { D[it.name](c, cw, ch, t, it); } catch (e) { if (!it.err) { it.err = 1; console.warn(e); } }
    }
    if (!still) for (var j = 0; j < ticks.length; j++) ticks[j](now);
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(frame); }
  function dirtyAll() { items.forEach(function (it) { it.dirty = true; }); }
  if (RM.addEventListener) RM.addEventListener('change', dirtyAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(dirtyAll);
  function mount(canvas, name, opts) {
    var it = { canvas: canvas, name: name, opts: opts || {}, vis: true, dirty: true, t0: performance.now() };
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { it.vis = es[es.length - 1].isIntersecting; if (it.vis) it.dirty = true; }, { rootMargin: '120px' }) : null;
    if (io) io.observe(canvas);
    items.push(it); startLoop();
    return { stop: function () { if (io) io.disconnect(); items = items.filter(function (x) { return x !== it; }); }, refresh: function () { it.dirty = true; } };
  }
  function tick(fn) { ticks.push(fn); startLoop(); return function () { ticks = ticks.filter(function (f) { return f !== fn; }); }; }

  /* ───────── hero: hat haritası ───────── */
  var HL = [
    { k: 'acc', pts: [[-60,260],[320,260],[480,420],[1060,420]] },
    { k: 'sage', pts: [[380,-60],[380,180],[620,420],[620,650],[760,790],[760,860]] },
    { k: 'n8', pts: [[-60,600],[300,600],[480,420],[640,260],[1060,260]] },
    { k: 'a4', pts: [[1060,620],[840,620],[620,400],[620,-60]] },
    { k: 's4', pts: [[-60,100],[160,100],[320,260],[320,860]] }
  ].map(function (l) { l.p = mkPath(l.pts); return l; });
  var HX = [[320,260],[480,420],[620,410]];
  HL.forEach(function (l) {
    l.st = [];
    for (var d = 110; d < l.p.len - 60; d += 165) {
      var q = at(l.p, d), near = HX.some(function (x) { return Math.hypot(x[0] - q[0], x[1] - q[1]) < 60; });
      if (!near) l.st.push(d);
    }
  });
  function hero(c, w, h, t, it) {
    var o = it.opts.get ? it.opts.get() : {}, pings = o.pings !== false;
    var s = Math.max(w / 1000, h / 800), ox = (w - 1000 * s) / 2, oy = (h - 800 * s) / 2;
    var tf = function (p) { return [ox + p[0] * s, oy + p[1] * s]; };
    var lw = Math.max(6, 12 * s);
    HL.forEach(function (l, i) {
      var pr = eio(seg(t, .1 + i * .18, 2 + i * .18)); if (pr <= 0) return;
      c.strokeStyle = P[l.k]; c.lineWidth = lw; trace(c, l.p, l.p.len * pr, tf); c.stroke();
      l.st.forEach(function (d) {
        if (d > l.p.len * pr) return; var q = tf(at(l.p, d)); var k = back(seg(t, .1 + i * .18 + d / l.p.len * 1.9, .5 + i * .18 + d / l.p.len * 1.9));
        dot(c, q[0], q[1], lw * .62 * k, P.bg); ring(c, q[0], q[1], lw * .62 * k, P.ink, Math.max(2, lw * .28));
      });
    });
    HX.forEach(function (x, i) {
      var k = back(seg(t, 1.6 + i * .2, 2.1 + i * .2)); if (k <= 0) return; var q = tf(x), r = lw * 1.05 * k;
      dot(c, q[0], q[1], r, P.bg); ring(c, q[0], q[1], r, P.ink, Math.max(2.5, lw * .34));
    });
    var va = seg(t, 2.2, 2.9); if (va <= 0) return;
    c.globalAlpha = va;
    HL.forEach(function (l, i) {
      for (var j = 0; j < 3; j++) {
        var dir = (i + j) % 2 ? 1 : -1, d = (j / 3) * l.p.len + dir * t * 34 + i * 70, q = at(l.p, d), p = tf(q);
        if (pings) {
          var u = ((t + i * 1.9 + j * 3.3) % 10) / 1.8;
          if (u < 1) { c.globalAlpha = va * (1 - u) * .7; ring(c, p[0], p[1], lw * .6 + u * 40 * s + 6, P[l.k], Math.max(1.5, 3 * s)); c.globalAlpha = va; }
        }
        c.save(); c.translate(p[0], p[1]); c.rotate(q[2] + (dir < 0 ? Math.PI : 0));
        rr(c, -lw * 1.25, -lw * .62, lw * 2.5, lw * 1.24, lw * .62); c.fillStyle = P.ink; c.fill();
        c.lineWidth = Math.max(1.5, lw * .22); c.strokeStyle = P.bg; c.stroke(); dot(c, lw * .7, 0, lw * .2, P.a3); c.restore();
      }
    });
    c.globalAlpha = 1;
  }

  /* ───────── yön önerileri ───────── */
  function flow(c, w, h, t) {
    rr(c, 0, 0, w, h, 28); c.fillStyle = P.ink; c.fill();
    var N = 70, a = .72, cc = .12;
    for (var k = 0; k < 8; k++) {
      var base = h * (.22 + k * .085), sp = .035 * (1 + (k % 3) * .18);
      for (var i = 0; i < N; i++) {
        var u = (i / N + t * sp + k * .07) % 1, f = function (uu) { return uu + a * Math.sin(6.2832 * (uu - cc)) / 6.2832; };
        var x0 = f(u - .008) * w * 1.1 - w * .05, x1 = f(u) * w * 1.1 - w * .05;
        var dv = 1 + a * Math.cos(6.2832 * (u - cc));
        var yy = function (x) { return base + 16 * Math.sin(x / w * 5 + k * .9 + t * .25); };
        c.strokeStyle = dv < .6 ? P.red : dv < 1.1 ? P.amber : P.s3; c.lineWidth = 5;
        c.beginPath(); c.moveTo(x0, yy(x0)); c.lineTo(x1 + 1, yy(x1)); c.stroke();
      }
    }
  }
  function board(c, w, h, t) {
    rr(c, 0, 0, w, h, 28); c.fillStyle = P.ink; c.fill();
    var pad = w * .07, on = Math.sin(t * 5) > -.3;
    dot(c, pad + 6, pad + 10, 6, on ? P.acc : P.a8);
    tx(c, 'CANLI · 10 SN', pad + 22, pad + 15, 14, P.n3, { w: 700, ls: 2 });
    var secs = 10 - Math.floor(t % 10);
    tx(c, '0:' + String(secs).padStart(2, '0'), pad - 4, pad + h * .33, h * .26, P.a4, { h: 1 });
    tx(c, 'sonraki konum sinyaline', pad, pad + h * .33 + 30, 15, P.n4, { w: 600 });
    var R = [['A-1', 'Merkez yönü', 7, P.acc], ['B-7', 'Liman yönü', 11, P.s5], ['C-2', 'Kampüs yönü', 4, P.a4], ['D-5', 'Çarşı yönü', 9, P.n5]];
    var y0 = h * .62, rh = (h - y0 - pad * .6) / 4;
    R.forEach(function (r, i) {
      var y = y0 + i * rh, m = Math.ceil(((r[2] - t / 2.5) % 12 + 12) % 12);
      rr(c, pad, y, 58, rh - 12, (rh - 12) / 2); c.fillStyle = r[3]; c.fill();
      tx(c, r[0], pad + 29, y + rh / 2 + 1, 15, P.ink, { w: 700, al: 'center' });
      tx(c, r[1], pad + 76, y + rh / 2 + 1, 18, P.n2, { w: 600 });
      tx(c, m === 0 ? 'geliyor' : m + ' dk', w - pad, y + rh / 2 + 2, 22, m === 0 ? P.a4 : P.n2, { h: 1, al: 'right' });
    });
  }

  /* ───────── telefon: Veri Yolu ───────── */
  var u = function (pts) { return mkPath(pts); };
  var STREETS = [
    [[-.05,.18],[.4,.22],[.7,.15],[1.05,.2]], [[-.05,.5],[.3,.46],[.55,.55],[1.05,.5]], [[-.05,.82],[.45,.78],[1.05,.86]],
    [[.2,-.05],[.24,.4],[.18,1.05]], [[.62,-.05],[.58,.5],[.66,1.05]], [[.85,-.05],[.9,.6],[.82,1.05]], [[-.05,.3],[.5,.68],[1.05,.99]]
  ].map(u);
  var PH = { dur: [9, 8, 9, 8, 8], still: [3.6, 4.5, 6.8, 4.6, 3.5] };
  function streets(c, tf, lw) { c.strokeStyle = P.n1; c.lineWidth = lw; STREETS.forEach(function (p) { trace(c, p, p.len, tf); c.stroke(); }); }
  function head(c, a, b) { tx(c, a, 20, 66, 21, P.ink, { h: 1 }); tx(c, b, 20, 84, 10.5, P.n7, { w: 600 }); }
  function parks(c, x, y, w, h) { dot(c, x + w * .78, y + h * .33, w * .13, P.s2); dot(c, x + w * .12, y + h * .7, w * .1, P.s2); }
  function arrow(c, x, y, up, col) { c.beginPath(); if (up) { c.moveTo(x, y - 5); c.lineTo(x + 5, y + 3); c.lineTo(x - 5, y + 3); } else { c.moveTo(x, y + 4); c.lineTo(x + 5, y - 4); c.lineTo(x - 5, y - 4); } c.closePath(); c.fillStyle = col; c.fill(); }
  var VEH = (function () { var r = rng(3), a = []; for (var i = 0; i < 13; i++) a.push({ s: i % 7, o: r() * 2, v: .025 + r() * .03 }); return a; })();

  function mSefer(c, t) {
    head(c, 'Sefer İzleme', 'Canlı · gRPC akışı');
    [['TOPLAM', 1248, P.ink], ['İETT', 912, P.ink], ['GECİKME', 38, P.a7], ['ARIZA', 11, P.red]].forEach(function (k, i) {
      var x = 14 + i * 69; rr(c, x, 96, 64, 42, 12); c.fillStyle = P.surf; c.fill();
      tx(c, k[0], x + 9, 111, 7.5, P.n7, { w: 700, ls: .5 });
      tx(c, fmt(k[1] + Math.round(Math.sin(t * .9 + i) * (i < 2 ? 5 : 1))), x + 9, 130, 15, k[2], { w: 700 });
    });
    var mx = 0, my = 146, mw = 300, mh = 504, tf = function (p) { return [mx + p[0] * mw, my + p[1] * mh]; };
    c.save(); c.beginPath(); c.rect(mx, my, mw, mh); c.clip(); c.fillStyle = P.n2; c.fillRect(mx, my, mw, mh);
    parks(c, mx, my, mw, mh); streets(c, tf, 10);
    c.lineWidth = 4;
    STREETS.forEach(function (p, i) {
      for (var j = 1; j < p.pts.length; j++) {
        var v = Math.sin(t * .45 + i * 2.1 + j * 1.3); c.strokeStyle = v > .55 ? P.red : v > 0 ? P.amber : P.s6;
        var a = tf(p.pts[j - 1]), b = tf(p.pts[j]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      }
    });
    VEH.forEach(function (v) { var p = STREETS[v.s], q = tf(at(p, v.o + t * v.v)); dot(c, q[0], q[1], 6, P.n1); dot(c, q[0], q[1], 4.2, P.ink); });
    var sx = 165, sy = my + .55 * mh;
    dot(c, sx, sy, 10, P.n1); dot(c, sx, sy, 8, P.acc); dot(c, sx, sy, 3, P.n1);
    if (t > 1.5 && t < 2.3) { c.globalAlpha = .18 * (1 - seg(t, 2.05, 2.3)); dot(c, sx + 2, sy + 2, 16, P.ink); c.globalAlpha = 1; }
    var ru = seg(t, 1.8, 2.5); if (ru > 0 && ru < 1) { c.globalAlpha = 1 - ru; ring(c, sx, sy, 9 + ru * 22, P.acc, 3); c.globalAlpha = 1; }
    c.restore();
    var k = eo(seg(t, 2.1, 2.6)) * (1 - eio(seg(t, 8.3, 8.8)));
    if (k > 0) {
      var y = 650 - 262 * k;
      c.save(); c.shadowColor = 'rgba(46,43,37,.22)'; c.shadowBlur = 24; rr(c, 0, y, 300, 320, 26); c.fillStyle = P.n1; c.fill(); c.restore();
      rr(c, 132, y + 8, 36, 4, 2); c.fillStyle = P.n4; c.fill();
      tx(c, 'SIRADAKİ ARAÇLAR', 20, y + 32, 8.5, P.n7, { w: 700, ls: 1 });
      tx(c, 'Örnek Durak', 20, y + 54, 17, P.ink, { h: 1 });
      var R = [['A-1', 'Merkez yönü', '2 durak önce', 134, P.acc], ['B-7', 'Liman yönü', '5 durak önce', 402, P.s6], ['C-2', 'Kampüs yönü', '8 durak önce', 655, P.n8]];
      R.forEach(function (r, i) {
        var ry = y + 70 + i * 42; rr(c, 20, ry, 42, 26, 13); c.fillStyle = r[4]; c.fill();
        tx(c, r[0], 41, ry + 17, 11, P.n1, { w: 700, al: 'center' });
        tx(c, r[1], 72, ry + 12, 11.5, P.ink, { w: 600 }); tx(c, r[2], 72, ry + 25, 9.5, P.n6, { w: 400 });
        var s = Math.max(0, r[3] - Math.max(0, t - 2.1) * 7);
        tx(c, Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'), 280, ry + 18, 15, P.ink, { w: 700, al: 'right' });
      });
      var by = y + 202, pr = t > 4.6 && t < 5.05;
      rr(c, 20, by, 260, 40, 20); c.fillStyle = pr ? P.a7 : P.acc; c.fill();
      tx(c, 'Haber ver', 150, by + 26, 14, P.n1, { h: 1, al: 'center' });
      if (t > 4.3 && t < 5.1) { c.globalAlpha = .2; dot(c, 152, by + 22, 16, P.ink); c.globalAlpha = 1; }
    }
    var la = seg(t, 5.0, 5.4) * (1 - seg(t, 8.1, 8.6));
    if (la > 0) {
      c.globalAlpha = la; c.fillStyle = P.ink; c.fillRect(0, 0, 300, 650);
      tx(c, 'Perşembe', 150, 104, 15, P.n3, { w: 600, al: 'center' });
      tx(c, '09:41', 150, 178, 72, P.n1, { w: 700, al: 'center' });
      var cy = 462 + (1 - eo(seg(t, 5.3, 5.9))) * 30;
      rr(c, 12, cy, 276, 108, 26); c.fillStyle = P.n8; c.fill();
      rr(c, 26, cy + 18, 42, 24, 12); c.fillStyle = P.acc; c.fill(); tx(c, 'A-1', 47, cy + 34, 11, P.n1, { w: 700, al: 'center' });
      tx(c, 'Örnek Durak’a', 78, cy + 28, 11.5, P.n1, { w: 700 }); tx(c, 'yaklaşıyor', 78, cy + 42, 11, P.n3, { w: 400 });
      var eta = Math.max(1, Math.ceil((134 - (t - 2.1) * 7) / 60));
      tx(c, eta + ' dk', 272, cy + 40, 22, P.a3, { h: 1, al: 'right' });
      var ly = cy + 78, p = .3 + seg(t, 5.4, 8.2) * .45, x0 = 28, x1 = 272;
      c.strokeStyle = P.n6; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, ly); c.lineTo(x1, ly); c.stroke();
      c.strokeStyle = P.acc; c.beginPath(); c.moveTo(x0, ly); c.lineTo(lerp(x0, x1, p), ly); c.stroke();
      for (var i = 0; i < 5; i++) dot(c, lerp(x0, x1, i / 4), ly, 3.5, i / 4 <= p ? P.a3 : P.n5);
      dot(c, x1, ly, 6, P.n1);
      rr(c, lerp(x0, x1, p) - 13, ly - 8, 26, 16, 8); c.fillStyle = P.acc; c.fill(); c.strokeStyle = P.n8; c.lineWidth = 2; c.stroke();
      c.globalAlpha = 1;
    }
    return la > .5;
  }

  var KZ = (function () { var r = rng(7), C = [[.3,.3],[.72,.33],[.42,.7],[.78,.76]], pts = []; for (var i = 0; i < 64; i++) { var k = i % 4, a = r() * 6.28, d = Math.pow(r(), .7) * .14; pts.push({ k: k, x: C[k][0] + Math.cos(a) * d, y: C[k][1] + Math.sin(a) * d * 1.1, rec: i % 9 === 0 }); } return { C: C, pts: pts }; })();
  var H24 = [2,1,1,1,2,4,7,10,8,6,5,6,7,6,6,8,11,13,10,7,5,4,3,2];
  function zoomTf(mx, my, mw, mh, zs) { return function (p) { return [mx + (.5 + (p[0] - .5) * zs) * mw, my + (.5 + (p[1] - .5) * zs) * mh]; }; }
  function mKaza(c, t) {
    head(c, 'Kaza Takip', 'Bugün · düne göre değişim');
    [['Operatör A', 14, 1], ['Operatör B', 9, 0], ['Operatör C', 6, 1]].forEach(function (o, i) {
      var x = 14 + i * 92; rr(c, x, 96, 86, 44, 12); c.fillStyle = P.surf; c.fill();
      tx(c, o[0], x + 10, 111, 8.5, P.n7, { w: 700 }); tx(c, String(o[1]), x + 10, 131, 16, P.ink, { w: 700 });
      arrow(c, x + 72, 126, o[2], o[2] ? P.red : P.s6);
    });
    var mx = 14, my = 152, mw = 272, mh = 352;
    var z = eio(seg(t, .8, 3.2)) * (1 - eio(seg(t, 6.4, 7.8))), tf = zoomTf(mx, my, mw, mh, 1 + z * 1.15);
    c.save(); rr(c, mx, my, mw, mh, 20); c.clip(); c.fillStyle = P.n2; c.fillRect(mx, my, mw, mh);
    parks(c, mx, my, mw, mh); streets(c, tf, 7);
    var sp = eio(seg(z, .3, .75));
    if (sp < 1) { c.globalAlpha = 1 - sp; KZ.C.forEach(function (q) { var p = tf(q); dot(c, p[0], p[1], 24, P.a2); dot(c, p[0], p[1], 17, P.acc); tx(c, '16', p[0], p[1] + 4.5, 12.5, P.n1, { w: 700, al: 'center' }); }); }
    if (sp > 0) {
      KZ.pts.forEach(function (q, i) {
        var cc = KZ.C[q.k], p = tf([lerp(cc[0], q.x, sp), lerp(cc[1], q.y, sp)]);
        c.globalAlpha = sp;
        if (q.rec) { var uu = (t * .9 + i * .13) % 1; c.globalAlpha = sp * (1 - uu); ring(c, p[0], p[1], 4 + uu * 13, P.red, 2); c.globalAlpha = sp; dot(c, p[0], p[1], 4.5, P.red); }
        else { dot(c, p[0], p[1], 4.5, P.n1); dot(c, p[0], p[1], 3.2, P.a6); }
      });
    }
    c.globalAlpha = 1; c.restore();
    tx(c, 'Saatlik dağılım', 20, 528, 10, P.n7, { w: 700 });
    var bw = 272 / 24;
    H24.forEach(function (v, i) { var bh = v * 6.2 * eo(seg(t, .2 + i * .02, 1 + i * .02)); if (bh < .5) return; rr(c, 14 + i * bw + 1.5, 628 - bh, bw - 3, bh, 3); c.fillStyle = i === 17 ? P.acc : P.n4; c.fill(); });
    tx(c, '00', 14, 642, 8, P.n6, { w: 600 }); tx(c, '12', 150, 642, 8, P.n6, { w: 600, al: 'center' }); tx(c, '23', 286, 642, 8, P.n6, { w: 600, al: 'right' });
  }

  function jgrid(seed, cols, rows, jx, jy) {
    var r = rng(seed), V = [], I = [];
    for (var i = 0; i <= cols; i++) { V[i] = []; for (var j = 0; j <= rows; j++) V[i][j] = [-.1 + i * 1.2 / cols + ((i > 0 && i < cols) ? (r() - .5) * jx : 0), -.1 + j * 1.2 / rows + ((j > 0 && j < rows) ? (r() - .5) * jy : 0)]; }
    for (var a = 0; a < cols; a++) for (var b = 0; b < rows; b++) I.push({ i: a, j: b, v: r() });
    return { V: V, I: I };
  }
  function quad(c, G, cell, tf) { var V = G.V, a = tf(V[cell.i][cell.j]), b = tf(V[cell.i + 1][cell.j]), d = tf(V[cell.i + 1][cell.j + 1]), e = tf(V[cell.i][cell.j + 1]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath(); }
  function centroid(G, cell) { var V = G.V; return [(V[cell.i][cell.j][0] + V[cell.i + 1][cell.j][0] + V[cell.i + 1][cell.j + 1][0] + V[cell.i][cell.j + 1][0]) / 4, (V[cell.i][cell.j][1] + V[cell.i + 1][cell.j][1] + V[cell.i + 1][cell.j + 1][1] + V[cell.i][cell.j + 1][1]) / 4]; }
  var DG = jgrid(21, 5, 6, .12, .1);
  var KY = (function () { var r = rng(9), C = [[.25,.28],[.66,.22],[.5,.55],[.28,.78],[.76,.7]], pts = []; for (var i = 0; i < 55; i++) { var k = i % 5, a = r() * 6.28, d = i < 5 ? 0 : Math.pow(r(), .7) * .12; pts.push({ k: k, x: C[k][0] + Math.cos(a) * d, y: C[k][1] + Math.sin(a) * d, bs: i < 3 }); } return { C: C, pts: pts }; })();
  function peak(x, m, s) { return Math.exp(-Math.pow(x - m, 2) / (2 * s * s)); }
  function mYog(c, t) {
    head(c, 'Kaza Yoğunluğu', 'Dönem: son 30 gün');
    rr(c, 14, 96, 272, 58, 14); c.fillStyle = P.s2; c.fill();
    tx(c, 'BRİFİNG', 26, 113, 8, P.s8, { w: 700, ls: 1 });
    wrap(c, 'Kazalar akşam zirvesinde yoğunlaştı; en riskli bölge kuzey aksı.', 26, 130, 248, 14, 11.5, P.ink, { w: 600 });
    var ph = (seg(t, 2.6, 3.4) + seg(t, 5.2, 6)) * (1 - eio(seg(t, 8.1, 8.8)));
    var mx = 14, my = 164, mw = 272, mh = 306, tf = zoomTf(mx, my, mw, mh, 1 + ph * .45);
    c.save(); rr(c, mx, my, mw, mh, 20); c.clip(); c.fillStyle = P.n2; c.fillRect(mx, my, mw, mh);
    var da = cl(1 - ph), ca = cl(1 - Math.abs(ph - 1)), pa = cl(ph - 1);
    var RAMP = [P.a1, P.a2, P.a3, P.a4, P.a5];
    DG.I.forEach(function (cell) { quad(c, DG, cell, tf); c.globalAlpha = .35 + .65 * da; c.fillStyle = da > .02 ? RAMP[Math.floor(cell.v * 4.99)] : P.n2; c.fill(); c.globalAlpha = 1; c.strokeStyle = P.n1; c.lineWidth = 2; c.stroke(); });
    if (ca > 0) { c.globalAlpha = ca; KY.C.forEach(function (q, i) { var p = tf(q); dot(c, p[0], p[1], 21, P.a2); dot(c, p[0], p[1], 15, P.a6); tx(c, String(9 + i * 3), p[0], p[1] + 4.5, 12, P.n1, { w: 700, al: 'center' }); }); }
    if (pa > 0) {
      KY.pts.forEach(function (q) {
        var cc = KY.C[q.k], p = tf([lerp(cc[0], q.x, pa), lerp(cc[1], q.y, pa)]); c.globalAlpha = pa;
        if (q.bs) { dot(c, p[0], p[1], 5, P.ink); ring(c, p[0], p[1], 8, P.red, 2.2); ring(c, p[0], p[1], 12.5, P.red, 2.2); }
        else { dot(c, p[0], p[1], 3.6, P.n1); dot(c, p[0], p[1], 2.6, P.a7); }
      });
    }
    c.globalAlpha = 1; c.restore();
    tx(c, 'Gün × saat', 20, 494, 10, P.n7, { w: 700 });
    var days = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'], HR = [P.a1, P.a2, P.a3, P.a4, P.a5, P.a6, P.a7], nr = rng(4);
    for (var d = 0; d < 7; d++) {
      tx(c, days[d], 14, 517 + d * 17, 8.5, P.n7, { w: 600 });
      for (var hh = 0; hh < 24; hh++) {
        var v = d < 5 ? peak(hh, 8, 1.5) * .8 + peak(hh, 18, 2) : peak(hh, 14, 4) * .55; v = cl(v + nr() * .12);
        var a = seg(t, .3 + hh * .035, .7 + hh * .035); if (a <= 0) continue;
        c.globalAlpha = a; rr(c, 34 + hh * 10.5, 506 + d * 17, 9, 15, 3.5); c.fillStyle = HR[Math.floor(v * 6.99)]; c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  var AR = (function () { var r = rng(33), a = []; for (var i = 0; i < 90; i++) a.push([.06 + r() * .88, .08 + r() * .84]); return a; })();
  var A24 = [12,10,9,8,8,10,16,24,30,28,26,27,29,31,30,33,38,42,39,34,28,22,18,15];
  function mAriza(c, t) {
    head(c, 'Arıza Takip', 'Bugün · 24 saat');
    var cu = eo(seg(t, .1, 1.3)), f = 1 - seg(t, 7.3, 7.9);
    [['AKTİF', 42, P.red], ['KAPALI', 318, P.s6], ['ÇEKİCİ', 7, P.a6], ['ZAYİ', 2, P.n6]].forEach(function (k, i) {
      var x = 14 + (i % 2) * 139, y = 96 + Math.floor(i / 2) * 56; rr(c, x, y, 133, 50, 14); c.fillStyle = P.surf; c.fill();
      dot(c, x + 15, y + 15, 3.5, k[2]); tx(c, k[0], x + 23, y + 18, 8.5, P.n7, { w: 700, ls: .5 });
      tx(c, fmt(k[1] * cu), x + 12, y + 40, 18, P.ink, { w: 700 });
      if (i === 0) {
        var bx = x + 87, by = y + 9, uu = (t * 1.1) % 1;
        c.globalAlpha = 1 - uu; rr(c, bx - uu * 5, by - uu * 5, 36 + uu * 10, 17 + uu * 10, 9 + uu * 5); c.strokeStyle = P.red; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
        rr(c, bx, by, 36, 17, 8.5); c.fillStyle = P.red; c.fill(); tx(c, 'YENİ', bx + 18, by + 12, 8.5, P.n1, { w: 700, al: 'center', ls: .5 });
      }
    });
    var mx = 14, my = 212, mw = 272, mh = 290, tf = function (p) { return [mx + p[0] * mw, my + p[1] * mh]; };
    c.save(); rr(c, mx, my, mw, mh, 20); c.clip(); c.fillStyle = P.n2; c.fillRect(mx, my, mw, mh);
    parks(c, mx, my, mw, mh); streets(c, tf, 7);
    c.globalAlpha = f;
    AR.forEach(function (q, i) {
      var open = i >= 68, t0 = open ? 1.6 + (i - 68) / 22 * 1.1 : .3 + i / 68 * 1.2, k = back(seg(t, t0, t0 + .35)); if (k <= 0) return;
      var p = tf(q); dot(c, p[0], p[1], 5 * k, P.n1); dot(c, p[0], p[1], 3.7 * k, open ? P.red : P.s6);
    });
    var sw = seg(t, 2.9, 4.0);
    if (sw > 0 && sw < 1) { var sx = mx + mw * eio(sw); for (var j = 3; j >= 0; j--) { c.globalAlpha = f * (j ? .12 : 1); c.fillStyle = P.amber; c.fillRect(sx - 1.5 - j * 6, my, 3 + j * 6, mh); } }
    var ha = seg(t, 3.9, 4.3) * f;
    if (ha > 0) { c.globalAlpha = ha; rr(c, mx + mw - 72, my + 12, 60, 22, 11); c.fillStyle = P.amber; c.fill(); tx(c, 'HAZIR', mx + mw - 42, my + 27, 9.5, P.ink, { w: 700, al: 'center', ls: .8 }); }
    c.globalAlpha = 1; c.restore();
    tx(c, 'Son 24 saat · açık arıza', 20, 528, 10, P.n7, { w: 700 });
    var pr = eo(seg(t, 3.6, 5.4)) * f; if (pr <= 0) return;
    c.save(); c.beginPath(); c.rect(14, 530, 272 * pr, 112); c.clip();
    var X = function (i) { return 14 + i / 23 * 272; }, Y = function (v) { return 630 - v * 1.95; };
    c.beginPath(); c.moveTo(X(0), 630); A24.forEach(function (v, i) { c.lineTo(X(i), Y(v)); }); c.lineTo(X(23), 630); c.closePath(); c.fillStyle = P.a2; c.fill();
    c.beginPath(); A24.forEach(function (v, i) { if (i) c.lineTo(X(i), Y(v)); else c.moveTo(X(i), Y(v)); }); c.strokeStyle = P.acc; c.lineWidth = 2.5; c.stroke();
    c.restore();
  }

  function mDol(c, t) {
    head(c, 'Canlı Doluluk', 'Araç bazında anlık');
    var f = 1 - eio(seg(t, 7.3, 7.9)), BC = [P.s4, P.s6, P.amber, P.red], BW = [62, 66, 66, 66], x = 14;
    ['Boş', 'Orta', 'Yoğun', 'Kritik'].forEach(function (l, i) {
      var k = eo(seg(t, .1 + i * .2, .6 + i * .2)) * f; if (k > 0) { rr(c, x, 98, BW[i] * k, 10, 5); c.fillStyle = BC[i]; c.fill(); }
      tx(c, l, x, 124, 9, P.n7, { w: 700 }); x += BW[i] + 4;
    });
    var V = [24, 58, 81, 93, null, 41];
    V.forEach(function (v, i) {
      var cx = 59 + (i % 3) * 91, cy = 182 + Math.floor(i / 3) * 106, r = 30;
      if (v == null) {
        c.setLineDash([3.5, 5.5]); ring(c, cx, cy, r, P.n5, 7); c.setLineDash([]);
        tx(c, '—', cx, cy + 6, 16, P.n6, { w: 700, al: 'center' }); tx(c, 'Ölçüm güvenilmez', cx, cy + 49, 8.5, P.n7, { w: 600, al: 'center' }); return;
      }
      ring(c, cx, cy, r, P.n3, 7);
      var k = eo(seg(t, .4 + i * .12, 1.6 + i * .12)) * f, pv = v + Math.sin(t * 1.3 + i) * 2, col = BC[pv < 40 ? 0 : pv < 70 ? 1 : pv < 90 ? 2 : 3];
      if (k > 0) { c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * pv / 100 * k); c.strokeStyle = col; c.lineWidth = 7; c.stroke(); }
      tx(c, '%' + Math.round(pv * k), cx, cy + 5, 14, P.ink, { w: 700, al: 'center' });
      tx(c, 'Araç ' + String(i + 1).padStart(2, '0'), cx, cy + 49, 9, P.n7, { w: 600, al: 'center' });
    });
    tx(c, 'Biniş / iniş', 20, 412, 10, P.n7, { w: 700 });
    dot(c, 206, 409, 3.5, P.acc); tx(c, 'Biniş', 213, 412, 8.5, P.n7, { w: 600 }); dot(c, 248, 409, 3.5, P.s6); tx(c, 'İniş', 255, 412, 8.5, P.n7, { w: 600 });
    var B = [14, 22, 30, 18, 26, 12, 20, 9, 16, 6, 4, 2], I = [0, 3, 6, 10, 9, 14, 12, 18, 15, 20, 24, 28], bw = 272 / 12;
    c.fillStyle = P.n3; c.fillRect(14, 519, 272, 2);
    for (var i = 0; i < 12; i++) {
      var k = eo(seg(t, 1.6 + i * .08, 2.4 + i * .08)) * f, bx = 14 + i * bw + 3;
      if (k > 0) { var hu = B[i] * 3 * k, hd = I[i] * 2.7 * k; if (hu > 1) { rr(c, bx, 517 - hu, bw - 6, hu, 4); c.fillStyle = P.acc; c.fill(); } if (hd > 1) { rr(c, bx, 523, bw - 6, hd, 4); c.fillStyle = P.s6; c.fill(); } }
    }
    tx(c, 'Durak sırası →', 20, 638, 8.5, P.n6, { w: 600 });
  }
  var MODS = [mSefer, mKaza, mYog, mAriza, mDol];
  function phone(c, w, h, _t, it) {
    var g = it.opts.get(), m = g.m || 0, d = PH.dur[m];
    var lt = RM.matches ? PH.still[m] : ((performance.now() - g.start) / 1000) % d;
    if (g.prog) g.prog(RM.matches ? 1 : lt / d);
    var s = w / 300; c.save(); c.scale(s, s);
    c.fillStyle = P.n1; c.fillRect(0, 0, 300, 650);
    var dark = MODS[m](c, lt);
    var col = dark ? P.n1 : P.ink;
    rr(c, 108, 11, 84, 24, 12); c.fillStyle = '#121110'; c.fill();
    tx(c, '09:41', 34, 28, 12.5, col, { w: 700 });
    c.fillStyle = col; for (var i = 0; i < 4; i++) { rr(c, 228 + i * 5, 25 - i * 2.4, 3, 4 + i * 2.4, 1); c.fill(); }
    rr(c, 254, 17, 22, 11, 3.5); c.strokeStyle = col; c.lineWidth = 1.2; c.stroke(); rr(c, 256, 19, 15, 7, 2); c.fill();
    c.restore();
  }

  /* ───────── projeler ───────── */
  var RG = jgrid(5, 6, 4, .13, .14);
  function pRisk(c, w, h, t) {
    var pad = 14, tf = function (p) { return [pad + p[0] * (w - pad * 2), pad + p[1] * (h - pad * 2)]; }, CC = [P.s3, P.a3, P.a5];
    c.save(); rr(c, pad, pad, w - pad * 2, h - pad * 2, 18); c.clip();
    RG.I.forEach(function (cell) { quad(c, RG, cell, tf); c.fillStyle = CC[cell.v < .5 ? 0 : cell.v < .82 ? 1 : 2]; c.fill(); c.strokeStyle = P.bg; c.lineWidth = 3; c.stroke(); });
    var P0 = 1.4, idx = Math.floor(t / P0);
    for (var k = 7; k >= 0; k--) {
      var n = idx - k; if (n < 0) continue; var r = rng(n * 13 + 1), cell = RG.I[Math.floor(r() * RG.I.length)], ce = centroid(RG, cell), pt = tf([ce[0] + (r() - .5) * .08, ce[1] + (r() - .5) * .08]);
      if (k === 0) {
        var uu = (t % P0) / P0; quad(c, RG, cell, tf); c.globalAlpha = 1 - uu; c.strokeStyle = P.ink; c.lineWidth = 3; c.stroke();
        c.globalAlpha = 1; var dy = (1 - eo(seg(uu, 0, .3))) * -24; dot(c, pt[0], pt[1] + dy, 5.5, P.red);
        if (uu > .3) { var v = seg(uu, .3, 1); c.globalAlpha = 1 - v; ring(c, pt[0], pt[1], 6 + v * 20, P.red, 2.5); c.globalAlpha = 1; }
      } else { c.globalAlpha = 1 - k / 9; dot(c, pt[0], pt[1], 4, P.ink); c.globalAlpha = 1; }
    }
    c.restore();
  }
  function pFuel(c, w, h, t) {
    var pad = 22, X = function (x) { return pad + x * (w - pad * 2); }, Y = function (v) { return h - pad - v * (h - pad * 2.6); };
    var ex = function (x) { return .45 + .12 * Math.sin(x * 9) + .07 * Math.sin(x * 3.3); }, ac = function (x) { return ex(x) + .025 * Math.sin(x * 41) + .22 * peak(x, .68, .045); };
    var pr = RM.matches ? 1 : cl((t % 7) / 5.2);
    c.fillStyle = P.n4; rr(c, pad, h - pad + 4, w - pad * 2, 3, 1.5); c.fill();
    c.setLineDash([2, 7]); c.strokeStyle = P.n6; c.lineWidth = 3; c.beginPath();
    for (var i = 0; i <= 80; i++) { var x = i / 80; if (i) c.lineTo(X(x), Y(ex(x))); else c.moveTo(X(x), Y(ex(x))); } c.stroke(); c.setLineDash([]);
    c.strokeStyle = P.acc; c.lineWidth = 3.5; c.beginPath();
    for (i = 0; i <= 80 * pr; i++) { x = i / 80; if (i) c.lineTo(X(x), Y(ac(x))); else c.moveTo(X(x), Y(ac(x))); } c.stroke();
    if (pr > .7) { var a = seg(pr, .7, .78), px = X(.68), py = Y(ac(.68)); c.globalAlpha = a; dot(c, px, py, 6, P.red); ring(c, px, py, 12 + Math.sin(t * 4) * 2, P.red, 2.5); rr(c, px + 16, py - 26, 104, 24, 12); c.fillStyle = P.red; c.fill(); tx(c, 'yüksek tüketim', px + 68, py - 10, 11, P.n1, { w: 700, al: 'center' }); c.globalAlpha = 1; }
    dot(c, pad + 4, pad + 2, 4, P.acc); tx(c, 'gerçek', pad + 13, pad + 6, 11, P.n7, { w: 700 });
    c.setLineDash([2, 5]); c.strokeStyle = P.n6; c.lineWidth = 2.5; c.beginPath(); c.moveTo(pad + 66, pad + 2); c.lineTo(pad + 82, pad + 2); c.stroke(); c.setLineDash([]); tx(c, 'beklenen', pad + 88, pad + 6, 11, P.n7, { w: 700 });
  }
  var RAIN = (function () { var r = rng(17), a = []; for (var i = 0; i < 46; i++) a.push([r(), r(), .7 + r() * .6]); return a; })();
  var CARS = (function () { var r = rng(19), a = []; for (var i = 0; i < 10; i++) a.push({ o: r(), lane: i % 2, v: .05 + r() * .03 + (i % 4 === 0 ? .06 : 0), fast: i % 4 === 0 }); return a; })();
  function pRain(c, w, h, t) {
    var on = .5 + .5 * Math.sin(t * .55 - 1);
    c.strokeStyle = P.s6; c.lineWidth = 2;
    RAIN.forEach(function (d) { var y = ((d[1] + t * .55 * d[2]) % 1) * h * .58, x = d[0] * w * 1.1 - y * .18; c.globalAlpha = .75 * on; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 12); c.stroke(); });
    c.globalAlpha = 1;
    var ry = h * .64, rh = h * .26; rr(c, 12, ry, w - 24, rh, rh / 2); c.fillStyle = P.n3; c.fill();
    c.setLineDash([10, 12]); c.strokeStyle = P.n1; c.lineWidth = 2.5; c.beginPath(); c.moveTo(30, ry + rh / 2); c.lineTo(w - 30, ry + rh / 2); c.stroke(); c.setLineDash([]);
    CARS.forEach(function (k) {
      var x = ((k.o + t * k.v) % 1.1 - .05) * w, y = ry + rh * (k.lane ? .72 : .28), hot = k.fast && on > .45;
      if (hot) { var uu = (t * 1.2) % 1; c.globalAlpha = 1 - uu; ring(c, x, y, 7 + uu * 14, P.red, 2); c.globalAlpha = 1; }
      rr(c, x - 10, y - 5.5, 20, 11, 5.5); c.fillStyle = hot ? P.red : P.ink; c.fill();
    });
  }
  var POSTS = (function () { var r = rng(23), a = []; for (var i = 0; i < 26; i++) a.push({ y: r(), b: Math.floor(r() * 5), o: r() * 4 }); return a; })();
  function pSocial(c, w, h, t) {
    var pad = 20, bx0 = w * .56, bw = (w - pad - bx0) / 5, BH = [.55, .8, .4, .65, .3], CL = [P.acc, P.s6, P.a4, P.n7, P.s4];
    var bars = function (i) { return h * .2 + (h * .6) * (1 - BH[i]); };
    for (var i = 0; i < 5; i++) { var x = bx0 + i * bw + 4, top = bars(i); rr(c, x, top, bw - 8, h - pad - top, 10); c.fillStyle = P.n3; c.fill(); }
    var hits = [0, 0, 0, 0, 0];
    POSTS.forEach(function (p) {
      var uu = ((t + p.o) % 4) / 4, sx = pad + 6, sy = pad + 10 + p.y * (h - pad * 2 - 20), ex = bx0 + p.b * bw + bw / 2, ey = bars(p.b) + 10;
      if (uu < .8) { var k = eio(uu / .8), x = lerp(sx, ex, k), y = lerp(sy, ey, k) - Math.sin(k * Math.PI) * 30; dot(c, x, y, 4.5, CL[p.b]); }
      else hits[p.b] = Math.max(hits[p.b], 1 - (uu - .8) / .2);
    });
    for (i = 0; i < 5; i++) {
      var cx = bx0 + i * bw + bw / 2, cy = bars(i) - 16;
      dot(c, cx, cy, 9, hits[i] > 0 ? P.s6 : P.n4);
      c.strokeStyle = P.n1; c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx - 4, cy); c.lineTo(cx - 1, cy + 3); c.lineTo(cx + 4, cy - 3); c.stroke();
      if (hits[i] > 0) { c.globalAlpha = hits[i]; ring(c, cx, cy, 9 + (1 - hits[i]) * 8, P.s6, 2); c.globalAlpha = 1; }
    }
    rr(c, pad - 6, pad, 14, h - pad * 2, 7); c.fillStyle = P.n3; c.fill();
  }
  var DS = [[.5, .8, .35, .65, .9, .45, .6], [.7, .4, .85, .3, .55, .75, .5], [.35, .6, .5, .9, .4, .65, .8]];
  function pDash(c, w, h, t) {
    var per = 2.4, n = Math.floor(t / per), ai = n % 3, pi = (n + 2) % 3, k = eio(seg(t % per, 0, .6)), pad = 20;
    ['Garaj', 'Hat', 'Ay'].forEach(function (l, i) { var x = pad + i * 70; rr(c, x, pad, 62, 26, 13); if (i === ai) { c.fillStyle = P.acc; c.fill(); } else { c.strokeStyle = P.n4; c.lineWidth = 2; c.stroke(); } tx(c, l, x + 31, pad + 17.5, 11.5, i === ai ? P.n1 : P.n7, { w: 700, al: 'center' }); });
    var top = pad + 44, bh = h - pad - top, bw = (w - pad * 2) / 7;
    for (var i = 0; i < 7; i++) { var v = lerp(DS[pi][i], DS[ai][i], k), hh = v * bh; rr(c, pad + i * bw + 4, h - pad - hh, bw - 8, hh, 8); c.fillStyle = i === 4 ? P.acc : P.s5; c.fill(); }
  }
  function pTele(c, w, h, t) {
    var lt = RM.matches ? 4 : t % 8, f = 1 - seg(lt, 7, 7.6), pad = 18, bwid = Math.min(w * .62, 230);
    c.globalAlpha = f;
    var b1 = eo(seg(lt, .3, .7)), b2 = eo(seg(lt, 1.2, 1.6)), b3 = eo(seg(lt, 2.1, 2.5)), y = pad;
    if (b1 > 0) { c.globalAlpha = f * b1; rr(c, pad, y + (1 - b1) * 10, bwid, 40, 16); c.fillStyle = P.n1; c.fill(); dot(c, pad + 18, y + 20, 5, P.red); tx(c, 'Yeni kaza bildirimi', pad + 30, y + 24 + (1 - b1) * 10, 12, P.ink, { w: 700 }); }
    y += 48;
    if (b2 > 0) { c.globalAlpha = f * b2; rr(c, pad, y, bwid, 62, 16); c.fillStyle = P.n1; c.fill(); for (var i = 0; i < 8; i++) { var bh = (8 + ((i * 37) % 30)) * b2; rr(c, pad + 14 + i * ((bwid - 28) / 8), y + 50 - bh, (bwid - 28) / 8 - 5, bh, 3); c.fillStyle = i === 5 ? P.acc : P.n4; c.fill(); } }
    y += 70;
    if (b3 > 0 && y + 60 < h - 40) { c.globalAlpha = f * b3; rr(c, pad, y, bwid, 60, 16); c.fillStyle = P.n1; c.fill(); c.strokeStyle = P.s5; c.lineWidth = 4; c.beginPath(); c.moveTo(pad + 16, y + 44); c.lineTo(pad + bwid * .35, y + 20); c.lineTo(pad + bwid * .6, y + 38); c.lineTo(pad + bwid - 18, y + 16); c.stroke(); dot(c, pad + bwid * .6, y + 38, 5, P.red); }
    c.globalAlpha = 1;
    var my = h - pad - 14, k = eio(seg(lt, 2.8, 4.2)) * f + (1 - f), full = w - pad * 2;
    tx(c, 'yanıt süresi', pad, my - 10, 11, P.n7, { w: 700 });
    rr(c, pad, my, full, 12, 6); c.fillStyle = P.n3; c.fill();
    rr(c, pad, my, Math.max(12, lerp(full, 12, k)), 12, 6); c.fillStyle = k > .95 ? P.s6 : P.acc; c.fill();
    tx(c, k > .95 ? '< 1 sn' : '3,5 dk', w - pad, my - 10, 12, P.ink, { w: 700, al: 'right' });
  }
  function pMetro(c, w, h, t) {
    var pad = 20, off = t * 5, N = 56, X = function (i) { return pad + (i - (off % 1)) / (N - 1) * (w - pad * 2); };
    var f = function (xw) { var m = ((xw % 45) + 45) % 45; return .35 + .1 * Math.sin(xw * .5) + .06 * Math.sin(xw * 1.7) + .45 * peak(m, 38, 1.1); };
    var Y = function (v) { return h - pad - v * (h - pad * 3.4); };
    tx(c, 'Turnike geçişi', pad, pad + 8, 11, P.n7, { w: 700 });
    tx(c, fmt(124380 + t * 37), pad, pad + 32, 22, P.ink, { h: 1 });
    c.save(); c.beginPath(); c.rect(pad, 0, w - pad * 2, h); c.clip();
    c.beginPath(); var base = Math.floor(off);
    for (var i = 0; i <= N; i++) { var v = f(base + i); if (i) c.lineTo(X(i), Y(v)); else c.moveTo(X(i), Y(v)); }
    c.strokeStyle = P.acc; c.lineWidth = 3; c.stroke();
    for (i = 0; i <= N; i++) { var m = (((base + i) % 45) + 45) % 45; if (m === 38) { var px = X(i), py = Y(f(base + i)); dot(c, px, py, 5.5, P.red); var uu = (t * 1.3) % 1; c.globalAlpha = 1 - uu; ring(c, px, py, 7 + uu * 14, P.red, 2); c.globalAlpha = 1; var lx = Math.min(px - 34, w - pad - 72); rr(c, Math.max(pad, lx), py - 34, 70, 22, 11); c.fillStyle = P.red; c.fill(); tx(c, 'anomali', Math.max(pad, lx) + 35, py - 19, 11, P.n1, { w: 700, al: 'center' }); } }
    c.restore();
  }

  var D = { hero: hero, flow: flow, board: board, phone: phone, risk: pRisk, fuel: pFuel, rain: pRain, social: pSocial, dash: pDash, tele: pTele, metro: pMetro };
  window.VY = { mount: mount, tick: tick, PH: PH, reduced: function () { return RM.matches; } };
})();
