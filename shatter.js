/* Заголовок из осколков: слова рисуются в канвас, режутся на треугольные осколки, которые летят из глубины и в один момент выравниваются в читаемый текст.
   Идея – блок «Shattered Title Assembly» (21st.dev), код написан заново. Настоящий <h1> остаётся в разметке: canvas только поверх, на время сборки. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = document.querySelectorAll('[data-shatter]'); if (!els.length) return;
  var cs0 = getComputedStyle(document.documentElement);
  var accent = (cs0.getPropertyValue('--c-accent') || '#e9b872').trim();

  function words(el) {
    var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var re = /\S+/g, m, t = n.nodeValue;
      while ((m = re.exec(t))) {
        var r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        var b = r.getClientRects()[0]; if (b) out.push({ s: m[0], x: b.left, y: b.top, h: b.height });
      }
    }
    return out;
  }
  function ease(t) { return 1 - Math.pow(1 - t, 4); }

  function run(el) {
    var rect = el.getBoundingClientRect(); if (rect.width < 40) return;
    var cs = getComputedStyle(el), dpr = Math.min(devicePixelRatio || 1, 2), pad = 90;
    var W = Math.ceil(rect.width), H = Math.ceil(rect.height), CW = W + pad * 2, CH = H + pad * 2;
    var font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var ws = words(el); if (!ws.length) return;

    function layer(color) {
      var c = document.createElement('canvas'); c.width = CW * dpr; c.height = CH * dpr;
      var x = c.getContext('2d'); x.scale(dpr, dpr); x.font = font; x.fillStyle = color; x.textBaseline = 'alphabetic';
      if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      ws.forEach(function (w) {
        var m = x.measureText(w.s), asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * .9;
        var lh = (m.fontBoundingBoxAscent || 0) + (m.fontBoundingBoxDescent || 0);
        x.fillText(w.s, w.x - rect.left + pad, w.y - rect.top + pad + asc + (w.h - lh) / 2);
      });
      return c;
    }
    var ink = layer(cs.color), hot = layer(accent);
    var mask = ink.getContext('2d').getImageData(0, 0, ink.width, ink.height).data;
    function covered(x0, y0, x1, y1) {
      for (var y = y0; y < y1; y += 3) for (var x = x0; x < x1; x += 3) {
        var px = Math.round(x * dpr), py = Math.round(y * dpr);
        if (px >= 0 && px < ink.width && py >= 0 && py < ink.height && mask[(py * ink.width + px) * 4 + 3] > 20) return true;
      }
      return false;
    }

    // осколки: сетка с дрожащими узлами, каждая ячейка – два треугольника; только там, где есть буквы
    var step = Math.max(14, Math.round(Math.sqrt(W * H / 520))), cols = Math.ceil(CW / step), rows = Math.ceil(CH / step), nodes = [], shards = [];
    for (var j = 0; j <= rows; j++) { nodes[j] = []; for (var i = 0; i <= cols; i++) nodes[j][i] = [i * step + (Math.random() - .5) * step * .7, j * step + (Math.random() - .5) * step * .7]; }
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      if (!covered(i * step - step * .4, j * step - step * .4, (i + 1) * step + step * .4, (j + 1) * step + step * .4)) continue;
      var a = nodes[j][i], b = nodes[j][i + 1], c = nodes[j + 1][i + 1], d = nodes[j + 1][i];
      [[a, b, c], [a, c, d]].forEach(function (p) {
        var cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
        var far = Math.random();
        shards.push({
          p: p, cx: cx, cy: cy, hot: Math.random() < .35,
          dx: (Math.random() - .5) * 520 * (.4 + far), dy: (Math.random() - .5) * 360 * (.4 + far) - 80,
          rot: (Math.random() - .5) * 2.4, sc: .5 + far * 1.6,
          delay: (cx / CW) * .35 + Math.random() * .35, dur: .85 + Math.random() * .35
        });
      });
    }

    var cv = document.createElement('canvas'); cv.className = 'shatter-cv'; cv.setAttribute('aria-hidden', 'true');
    cv.width = CW * dpr; cv.height = CH * dpr; cv.style.cssText = 'position:absolute;pointer-events:none;z-index:3;left:' + (-pad) + 'px;top:' + (-pad) + 'px;width:' + CW + 'px;height:' + CH + 'px';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var ctx = cv.getContext('2d'); el.appendChild(cv); el.style.color = 'transparent';
    var inner = el; var origColor = ''; el.style.removeProperty('color'); origColor = cs.color;
    el.style.setProperty('color', 'transparent', 'important');

    var T0 = performance.now(), TOTAL = 2200;
    function frame(now) {
      var t = (now - T0) / 1000, done = true;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, CW, CH);
      for (var k = 0; k < shards.length; k++) {
        var s = shards[k], u = Math.min(1, Math.max(0, (t - s.delay) / s.dur));
        if (u < 1) done = false;
        var e = ease(u), inv = 1 - e;
        ctx.save();
        ctx.translate(s.cx + s.dx * inv, s.cy + s.dy * inv);
        ctx.rotate(s.rot * inv); var sc = 1 + (s.sc - 1) * inv; ctx.scale(sc, sc);
        ctx.translate(-s.cx, -s.cy);
        ctx.beginPath();
        for (var q = 0; q < 3; q++) {
          var vx = s.cx + (s.p[q][0] - s.cx) * 1.06, vy = s.cy + (s.p[q][1] - s.cy) * 1.06;
          q ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
        }
        ctx.closePath(); ctx.clip();
        ctx.globalAlpha = Math.min(1, u * 2.2);
        var tint = s.hot ? Math.max(0, 1 - u * 1.25) : 0;
        ctx.drawImage(ink, 0, 0, CW, CH);
        if (tint > 0) { ctx.globalAlpha = Math.min(1, u * 2.2) * tint; ctx.drawImage(hot, 0, 0, CW, CH); }
        ctx.restore();
      }
      if (!done && now - T0 < TOTAL) requestAnimationFrame(frame);
      else { el.style.removeProperty('color'); cv.style.transition = 'opacity .18s'; cv.style.opacity = '0'; setTimeout(function () { cv.remove(); }, 220); }
    }
    requestAnimationFrame(frame);
  }

  window.shatterReplay = function (el) { run(el || els[0]); };
  function start() {
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
    }, { threshold: .5 }) : null;
    els.forEach(function (el) { io ? io.observe(el) : run(el); });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(start, 120); });
})();
