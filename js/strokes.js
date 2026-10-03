// Stroke-order demos for Hebrew print letters (כתב דפוס).
// Each letter = ordered strokes; each stroke = polyline in a 0..1 box (x right, y down),
// where the box is the glyph's ink bounding box in "Varela Round" (see letterBox()).

// Points along an ellipse arc; angles in degrees, 0 = right, 90 = down.
function sArc(cx, cy, rx, ry, a0, a1, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

const LETTER_STROKES = {
  'א': [[[0.11, 0.07], [0.92, 0.93]], [[0.91, 0.08], [0.65, 0.6]], [[0.35, 0.37], [0.085, 0.925]]],
  'ב': [[[0.08, 0.11], [0.3, 0.08], [0.5, 0.075], ...sArc(0.5, 0.3, 0.255, 0.225, -90, 0, 5), [0.755, 0.93]],
        [[0.91, 0.93], [0.08, 0.93]]],
  'ג': [[[0.28, 0.09], [0.45, 0.065], [0.6, 0.065], ...sArc(0.6, 0.27, 0.24, 0.205, -90, 0, 5), [0.84, 0.93]],
        [[0.82, 0.72], [0.7, 0.83], [0.5, 0.88], [0.14, 0.885]]],
  'ד': [[[0.1, 0.07], [0.9, 0.07]], [[0.74, 0.08], [0.68, 0.25], [0.665, 0.45], [0.665, 0.93]]],
  'ה': [[[0.085, 0.105], [0.3, 0.075], [0.55, 0.07], ...sArc(0.55, 0.33, 0.353, 0.26, -90, 0, 6), [0.903, 0.926]],
        [[0.145, 0.48], [0.145, 0.926]]],
  'ו': [[[0.5, 0.085], [0.5, 0.915]]],
  'ז': [[[0.88, 0.065], [0.13, 0.065]], [[0.56, 0.1], [0.47, 0.45], [0.43, 0.92]]],
  'ח': [[[0.18, 0.12], [0.25, 0.07], [0.6, 0.063], ...sArc(0.6, 0.3, 0.318, 0.237, -90, 0, 6), [0.918, 0.925]],
        [[0.159, 0.13], [0.159, 0.925]]],
  'ט': [[[0.09, 0.07], [0.09, 0.45], ...sArc(0.5, 0.45, 0.41, 0.48, 180, 0, 14), [0.91, 0.28],
         ...sArc(0.7, 0.28, 0.21, 0.21, 0, -150, 7), [0.47, 0.25]]],
  'י': [[[0.5, 0.14], [0.5, 0.86]]],
  'כ': [[[0.09, 0.065], [0.5, 0.065], ...sArc(0.5, 0.5, 0.393, 0.435, -90, 90, 14), [0.09, 0.935]]],
  'ך': [[[0.147, 0.055], [0.55, 0.055], ...sArc(0.55, 0.3, 0.33, 0.245, -90, 0, 6), [0.88, 0.93]]],
  'ל': [[[0.11, 0.05], [0.11, 0.2], [0.16, 0.235], [0.82, 0.235], [0.88, 0.29], [0.38, 0.93]]],
  'מ': [[[0.086, 0.07], [0.086, 0.93]],
        [[0.13, 0.2], [0.25, 0.12], [0.4, 0.08], [0.6, 0.067], ...sArc(0.6, 0.33, 0.317, 0.263, -90, 0, 6),
         [0.917, 0.88], [0.89, 0.922], [0.8, 0.922], [0.5, 0.922]]],
  'ם': [[[0.07, 0.067], [0.62, 0.067], ...sArc(0.62, 0.3, 0.292, 0.233, -90, 0, 6), [0.912, 0.88], [0.88, 0.927],
         [0.21, 0.927], [0.165, 0.88], [0.165, 0.3], [0.18, 0.13]]],
  'נ': [[[0.33, 0.065], [0.6, 0.065], ...sArc(0.6, 0.2, 0.215, 0.135, -90, 0, 4), [0.815, 0.75],
         ...sArc(0.6, 0.75, 0.215, 0.175, 0, 90, 4), [0.16, 0.925]]],
  'ן': [[[0.5, 0.065], [0.5, 0.935]]],
  'ס': [[[0.07, 0.073], [0.45, 0.073], ...sArc(0.5, 0.5, 0.42, 0.427, -83, 90, 14), [0.32, 0.9], [0.21, 0.82],
         [0.16, 0.68], [0.146, 0.5], [0.155, 0.3], [0.19, 0.13]]],
  'ע': [[[0.904, 0.073], [0.904, 0.5], [0.88, 0.65], [0.8, 0.76], [0.65, 0.84], [0.09, 0.94]],
        [[0.18, 0.073], [0.5, 0.8]]],
  'פ': [[[0.47, 0.54], [0.3, 0.55], [0.17, 0.5], ...sArc(0.5, 0.5, 0.415, 0.43, 200, 450, 20), [0.15, 0.93]]],
  'ף': [[[0.5, 0.45], [0.35, 0.5], [0.2, 0.47], [0.12, 0.37], ...sArc(0.5, 0.33, 0.4, 0.265, 190, 360, 10),
         [0.9, 0.93]]],
  'צ': [[[0.083, 0.073], [0.85, 0.87], [0.86, 0.92], [0.8, 0.935], [0.1, 0.935]], [[0.906, 0.073], [0.63, 0.56]]],
  'ץ': [[[0.12, 0.06], [0.48, 0.55], [0.75, 0.935]], [[0.88, 0.06], [0.5, 0.52]]],
  'ק': [[[0.1, 0.073], [0.65, 0.073], ...sArc(0.65, 0.25, 0.23, 0.177, -90, 0, 4), [0.88, 0.5],
         ...sArc(0.66, 0.5, 0.22, 0.2, 0, 90, 5), [0.47, 0.7]],
        [[0.104, 0.37], [0.104, 0.93]]],
  'ר': [[[0.117, 0.096], [0.3, 0.075], [0.5, 0.07], ...sArc(0.5, 0.32, 0.37, 0.25, -90, 0, 6), [0.87, 0.93]]],
  'ש': [[[0.92, 0.07], [0.92, 0.5], ...sArc(0.5, 0.5, 0.42, 0.42, 0, 180, 14), [0.083, 0.07]],
        [[0.5, 0.07], [0.5, 0.6]]],
  'ת': [[[0.13, 0.067], [0.6, 0.067], ...sArc(0.6, 0.33, 0.317, 0.263, -90, 0, 6), [0.917, 0.926]],
        [[0.3, 0.1], [0.285, 0.25], [0.283, 0.88], [0.26, 0.925], [0.067, 0.925]]],
};

// Ink bounding box of `letter` as drawn by fillText(letter, x, baseline) with ctx's current
// font / textAlign / direction (set them like the guide does before calling).
function letterBox(ctx, letter, x, baseline) {
  const m = ctx.measureText(letter);
  return { x: x - m.actualBoundingBoxLeft, y: baseline - m.actualBoundingBoxAscent,
           w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
           h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
}

// Chaikin corner-cutting on gentle bends only; sharp corners (> ~60°) stay crisp.
function _smooth(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const t = Math.abs(Math.atan2((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]),
                                  (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])));
    if (t > 1.05) { out.push(b); continue; }
    out.push([b[0] + (a[0] - b[0]) * 0.25, b[1] + (a[1] - b[1]) * 0.25], [b[0] + (c[0] - b[0]) * 0.25, b[1] + (c[1] - b[1]) * 0.25]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Strokes mapped to canvas coords: [{pts:[[x,y]...], len, segs:[cumulative lengths]}]
function _strokePaths(letter, box) {
  return (LETTER_STROKES[letter] || []).map(s => {
    const pts = _smooth(_smooth(s.map(([u, v]) => [box.x + u * box.w, box.y + v * box.h])));
    const segs = [0];
    for (let i = 1; i < pts.length; i++) segs.push(segs[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, segs, len: segs[segs.length - 1] };
  });
}

// Point + heading at distance d along a path
function _along(p, d) {
  let i = 1;
  while (i < p.pts.length - 1 && p.segs[i] < d) i++;
  const a = p.pts[i - 1], b = p.pts[i], L = (p.segs[i] - p.segs[i - 1]) || 1;
  const t = Math.max(0, Math.min(1, (d - p.segs[i - 1]) / L));
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// Start-dot positions; a dot that would sit on an earlier one is pushed along its own stroke.
function _startDots(paths, r) {
  const dots = [];
  for (const p of paths) {
    let d = 0, q = _along(p, 0);
    while (dots.some(o => Math.hypot(o.x - q.x, o.y - q.y) < r * 2.1) && d < p.len * 0.5) q = _along(p, d += r * 0.5);
    dots.push(q);
  }
  return dots;
}

function _dotR(box) { return Math.max(9, Math.min(22, box.h * 0.055)); }

function _drawDot(ctx, q, n, r, color) {
  ctx.fillStyle = color || '#22b14c';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(r * 1.25)}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
  ctx.fillText(String(n), q.x, q.y + r * 0.06);
}

function _drawArrow(ctx, q, size, color) {
  ctx.save();
  ctx.translate(q.x, q.y); ctx.rotate(q.ang);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.6, -size * 0.75); ctx.lineTo(-size * 0.6, size * 0.75);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function _drawPartial(ctx, p, d) {
  ctx.beginPath();
  ctx.moveTo(p.pts[0][0], p.pts[0][1]);
  for (let i = 1; i < p.pts.length && p.segs[i - 1] < d; i++) {
    if (p.segs[i] <= d) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
    else { const q = _along(p, d); ctx.lineTo(q.x, q.y); }
  }
  ctx.stroke();
}

// Small numbered green dots at the start of every stroke ("start here").
function drawStartDots(ctx, letter, box, opts = {}) {
  const paths = _strokePaths(letter, box), r = opts.r || _dotR(box);
  ctx.save();
  _startDots(paths, r).forEach((q, i) => _drawDot(ctx, q, i + 1, r, opts.color));
  ctx.restore();
}

// Static overlay: every stroke with its direction arrow + numbered start dots.
function drawLetterStrokes(ctx, letter, box, opts = {}) {
  const paths = _strokePaths(letter, box), w = opts.width || Math.max(3, box.h * 0.035);
  const color = opts.color || 'rgba(214,41,118,0.85)';
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of paths) { _drawPartial(ctx, p, p.len); _drawArrow(ctx, _along(p, p.len), w * 1.8, color); }
  ctx.restore();
  drawStartDots(ctx, letter, box, opts);
}

// Snapshot the device-pixel area under the box (+ margin); returns a restore() function.
function _grab(ctx, box, pad) {
  const m = ctx.getTransform();
  const sx = Math.max(0, Math.floor((box.x - pad) * m.a + m.e)), sy = Math.max(0, Math.floor((box.y - pad) * m.d + m.f));
  const sw = Math.min(ctx.canvas.width - sx, Math.ceil((box.w + pad * 2) * m.a)), sh = Math.min(ctx.canvas.height - sy, Math.ceil((box.h + pad * 2) * m.d));
  const snap = sw > 0 && sh > 0 ? ctx.getImageData(sx, sy, sw, sh) : null;
  return () => { if (snap) ctx.putImageData(snap, sx, sy); };
}

// Animated demo: each stroke grows from its numbered start dot, led by a moving dot/arrow.
// The canvas area under the box is snapshotted and restored, so it can run on any canvas
// (guide or ink). opts: {color, width, speed (box-heights per second), pause (ms), keep, onDone}
// Returns {cancel()} — cancel restores the canvas and does not call onDone.
function playLetterDemo(ctx, letter, box, opts = {}) {
  const paths = _strokePaths(letter, box);
  const color = opts.color || '#d62976';
  const w = opts.width || Math.max(4, box.h * 0.06);
  const speed = (opts.speed || 0.8) * box.h, pause = opts.pause == null ? 350 : opts.pause;
  const r = _dotR(box), dots = _startDots(paths, r);
  const restore = _grab(ctx, box, r * 2 + w);
  // timeline: [pause, stroke0, pause, stroke1, ...]
  const durs = paths.map(p => p.len / speed * 1000);
  const total = durs.reduce((a, b) => a + b + pause, 0) + 500;
  let raf = 0, t0 = 0, done = false;

  const frame = now => {
    if (done) return;
    if (!t0) t0 = now;
    let t = now - t0;
    restore();
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let tip = null;
    for (let i = 0; i < paths.length; i++) {
      t -= pause;
      if (t < 0) { _drawDot(ctx, dots[i], i + 1, r * (1 + 0.15 * Math.sin(now / 90)), opts.dotColor); break; } // "start here" pulse
      const d = Math.min(paths[i].len, t / durs[i] * paths[i].len);
      ctx.strokeStyle = color; ctx.lineWidth = w;
      _drawPartial(ctx, paths[i], d);
      if (d < paths[i].len) tip = _along(paths[i], d);
      else _drawArrow(ctx, _along(paths[i], d), w * 1.3, color);
      t -= durs[i];
      if (t < 0) break;
    }
    // numbered start dots of the strokes reached so far stay on top
    let tt = now - t0;
    for (let i = 0; i < paths.length && (tt -= pause) >= 0; i++) { _drawDot(ctx, dots[i], i + 1, r, opts.dotColor); tt -= durs[i]; }
    if (tip) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, w * 0.35);
      ctx.beginPath(); ctx.arc(tip.x, tip.y, w * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      _drawArrow(ctx, { x: tip.x + Math.cos(tip.ang) * w * 1.9, y: tip.y + Math.sin(tip.ang) * w * 1.9, ang: tip.ang }, w * 0.9, color);
    }
    ctx.restore();
    if (now - t0 >= total) {
      done = true;
      if (!opts.keep) restore();
      if (opts.onDone) opts.onDone();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  if (!paths.length) { if (opts.onDone) setTimeout(opts.onDone, 0); return { cancel() {} }; }
  raf = requestAnimationFrame(frame);
  return { cancel() { if (done) return; done = true; cancelAnimationFrame(raf); restore(); } };
}

// Coaching pulse: stroke k's path + its numbered start dot breathe for opts.duration ms
// (default 2400; 0 = until cancel). opts: {color, width, duration, onDone}. Returns {cancel()}.
function highlightStroke(ctx, letter, box, k, opts = {}) {
  const paths = _strokePaths(letter, box), p = paths[k];
  if (!p) return { cancel() {} };
  const color = opts.color || '#22b14c', w = opts.width || Math.max(4, box.h * 0.06);
  const r = _dotR(box), dot = _startDots(paths, r)[k], dur = opts.duration == null ? 2400 : opts.duration;
  const restore = _grab(ctx, box, r * 2 + w);
  let raf = 0, t0 = 0, done = false;
  const frame = now => {
    if (done) return;
    if (!t0) t0 = now;
    const t = now - t0, s = 0.5 + 0.5 * Math.sin(t / 160);
    restore();
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.45 * s;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    _drawPartial(ctx, p, p.len);
    _drawArrow(ctx, _along(p, p.len), w * 1.3, color);
    ctx.globalAlpha = 1;
    _drawDot(ctx, dot, k + 1, r * (1 + 0.3 * s), color);
    ctx.restore();
    if (dur && t >= dur) { done = true; restore(); if (opts.onDone) opts.onDone(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { cancel() { if (done) return; done = true; cancelAnimationFrame(raf); restore(); } };
}

// ---------- checking the child's strokes ----------
// Child strokes are {pts:[{x,y}...]} (or arrays of [x,y]) in the same CSS-px space as `box`.

const STROKE_DIR_FREE = 'סם';   // closed loops: either direction around is accepted

function _xy(s) { return (s.pts || s).map(p => Array.isArray(p) ? p : [p.x, p.y]); }
function _dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function _plen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += _dist(p[i], p[i - 1]); return L; }

// n points evenly spaced by arc length
function _resample(p, n) {
  const L = _plen(p), step = L / (n - 1), out = [p[0]];
  if (!L) return Array(n).fill(p[0]);
  let acc = 0, next = step;
  for (let i = 1; i < p.length && out.length < n; i++) {
    const a = p[i - 1], b = p[i], d = _dist(a, b);
    if (!d) continue;
    while (acc + d >= next && out.length < n) {
      const t = (next - acc) / d;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); next += step;
    }
    acc += d;
  }
  while (out.length < n) out.push(p[p.length - 1]);
  return out;
}

// Mean point-to-point distance after shifting `a` by the centroid offset (clamped to `slop`)
function _aligned(a, b, slop) {
  let ox = 0, oy = 0;
  for (let i = 0; i < a.length; i++) { ox += b[i][0] - a[i][0]; oy += b[i][1] - a[i][1]; }
  ox /= a.length; oy /= a.length;
  const m = Math.hypot(ox, oy);
  if (m > slop) { ox *= slop / m; oy *= slop / m; }
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.hypot(a[i][0] + ox - b[i][0], a[i][1] + oy - b[i][1]);
  return { d: d / a.length, ox, oy };
}

// Nearest point on polyline p to q -> {s: arc length there, d: distance}
function _project(q, p) {
  let best = { s: 0, d: Infinity }, acc = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], L = _dist(a, b);
    const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / (L * L))) : 0;
    const d = Math.hypot(a[0] + (b[0] - a[0]) * t - q[0], a[1] + (b[1] - a[1]) * t - q[1]);
    if (d < best.d) best = { s: acc + t * L, d };
    acc += L;
  }
  return best;
}

// Piece of polyline p between arc lengths s0 < s1
function _sub(p, s0, s1) {
  const out = [];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], L = _dist(a, b);
    const at = s => { const t = L ? (s - acc) / L : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
    if (!out.length && acc + L >= s0) out.push(at(s0));
    if (out.length) { if (acc + L >= s1) { out.push(at(s1)); break; } out.push(b); }
    acc += L;
  }
  return out.length > 1 ? out : [p[0], p[p.length - 1]];
}

// Tolerances; strictness 0 (forgiving) .. 1 (strict), default 0.5
function _tol(box, E, opts) {
  const U = Math.max(box.w, box.h, opts.unit || 0);
  const s = Math.max(0, Math.min(1, opts.strictness == null ? 0.5 : opts.strictness)), f = 1.3 - 0.6 * s;
  const minLen = Math.min(...E.map(_plen));
  return { U, shape: 0.13 * U * f, start: 0.22 * U * f, slop: 0.12 * U * f, near: 0.3 * U * f,
           gap: 0.35 * U, tiny: Math.min(0.04 * U, 0.25 * minLen) };
}

// Damp hand tremor: 48 arc-length samples, 5-point moving average (ends kept)
function _soften(p) {
  const q = _resample(p, 48);
  return q.map((v, i) => {
    const a = Math.max(0, i - 2), b = Math.min(q.length - 1, i + 2), h = Math.min(i - a, b - i);
    let x = 0, y = 0;
    for (let t = i - h; t <= i + h; t++) { x += q[t][0]; y += q[t][1]; }
    return [x / (2 * h + 1), y / (2 * h + 1)];
  });
}

// Compare child path C with expected path E. type: ok | reversed | wrongStart | partial | shape | other
function _cmp(C, E, T, free) {
  const n = 32, c = _resample(_soften(C), n), e = _resample(E, n), r = c.slice().reverse();
  // complete enough? (coarse 10-point lengths, so tremor doesn't inflate a half stroke)
  const L = _plen(E), long = _plen(_resample(c, 10)) >= 0.75 * _plen(_resample(e, 10));
  const F = _aligned(c, e, T.slop), R = _aligned(r, e, T.slop);
  const off = (q, A, i, j) => Math.hypot(q[i][0] + A.ox - e[j][0], q[i][1] + A.oy - e[j][1]);
  let startDist = off(c, F, 0, 0);
  const res = (type, d) => ({ type, d, startDist, score: Math.max(0, Math.min(1, 1 - d / (2 * T.shape))) });
  if (long && F.d <= T.shape && Math.max(startDist, off(c, F, n - 1, n - 1)) <= T.start) return res('ok', F.d);
  if (long && R.d <= T.shape && Math.max(off(r, R, 0, 0), off(r, R, n - 1, n - 1)) <= T.start) return res(free ? 'ok' : 'reversed', R.d);
  // follows only part of the stroke (started in the middle, or lifted the pen early)?
  const s0 = _project(c[0], E).s, s1 = _project(c[n - 1], E).s;
  if (Math.abs(s1 - s0) >= 0.3 * L) {
    const sub = _resample(_sub(E, Math.min(s0, s1), Math.max(s0, s1)), n), S = _aligned(s0 < s1 ? c : r, sub, T.slop);
    startDist = Math.hypot(c[0][0] + S.ox - e[0][0], c[0][1] + S.oy - e[0][1]);
    if (S.d <= T.shape) return res(s0 > s1 && !free ? 'reversed' : startDist > T.start ? 'wrongStart' : 'partial', S.d);
  }
  let near = 0;
  for (const q of c) near += _project(q, E).d;
  near /= n;
  return res(near <= T.near ? 'shape' : 'other', near);
}

function _cat(list) {
  const out = [];
  for (const p of list) out.push(...p);
  return out;
}

// Can paths i..i+b-1 be drawn in one go? (each end close to the next start)
function _joinable(P, i, b, gap) {
  if (i + b > P.length) return false;
  for (let t = i; t < i + b - 1; t++) if (_dist(P[t][P[t].length - 1], P[t + 1][0]) > gap) return false;
  return true;
}

function _setup(letter, box, opts) {
  const E = _strokePaths(letter, box).map(p => p.pts);
  return { E, T: _tol(box, E.length ? E : [[[0, 0], [box.w, box.h]]], opts), free: STROKE_DIR_FREE.includes(letter) };
}

// Live check of one child stroke against expected stroke k (call on pointerup).
// `stroke` may also be an array of strokes (e.g. [pendingPart, newStroke] after a pen lift).
// match: 'ok'         drawn right; covers = expected strokes it completed (2-3 if merged; 0 with
//                     partial:true if it stopped early: keep it and pass [it, next] next time)
//        'reversed'   right stroke, wrong direction
//        'wrongStart' follows stroke k but did not begin at its start dot
//        'shape'      in the area of stroke k but the wrong shape
//        'other'      not stroke k: matchedIndex >= 0 = another stroke (order error, +reversed flag),
//                     -1 = unrelated scribble
//        'tiny'       accidental tap / dot, ignore it
// opts: {strictness, done: [bool per expected stroke] to skip strokes already written, unit}
function checkStroke(stroke, letter, box, k, opts = {}) {
  const { E, T, free } = _setup(letter, box, opts), done = opts.done || [];
  const C = _cat((Array.isArray(stroke) && stroke[0] && stroke[0].pts ? stroke : [stroke]).map(_xy));
  const out = (match, matchedIndex, r, extra) =>
    Object.assign({ match, matchedIndex, startDist: r ? r.startDist / T.U : 0, score: r ? r.score : 0 }, extra);
  if (!C.length || _plen(C) < T.tiny) return out('tiny', -1);
  let rk = null;
  for (let b = Math.min(3, E.length - k); b >= 1; b--) {
    if (!_joinable(E, k, b, T.gap)) continue;
    const r = _cmp(C, _cat(E.slice(k, k + b)), T, free);
    if (b === 1) rk = r;
    if (r.type === 'ok') return out('ok', k, r, { covers: b });
  }
  const others = E.map((e, j) => j === k || done[j] ? null : _cmp(C, e, T, free));
  const j = others.findIndex(r => r && r.type === 'ok');
  if (j >= 0) return out('other', j, others[j]);
  if (rk && rk.type === 'partial') return out('ok', k, rk, { covers: 0, partial: true });
  if (rk && (rk.type === 'reversed' || rk.type === 'wrongStart')) return out(rk.type, k, rk);
  const jr = others.findIndex(r => r && r.type === 'reversed');
  if (jr >= 0) return out('other', jr, others[jr], { reversed: true });
  return rk && rk.type === 'shape' ? out('shape', k, rk) : out('other', -1, rk);
}

// Full check when the child presses done. Handles merged strokes (one continuous line for
// consecutive strokes) and pen lifts (one stroke in two parts).
// -> {ok, issues:[{k, problem: missing|order|reversed|wrongStart|shape|extra}], matched, expected}
// opts: {strictness, unit, partial: true = letter not finished yet (no 'missing'; last stroke may be half done)}
function checkStrokeOrder(strokes, letter, box, opts = {}) {
  const { E, T, free } = _setup(letter, box, opts), m = E.length;
  const C = strokes.map(_xy).filter(p => p.length && _plen(p) >= T.tiny), n = C.length;
  const done = new Array(m).fill(false), issues = [];
  let i = 0, j = 0, matched = 0;
  while (j < n) {
    while (i < m && done[i]) i++;
    // 1) 1-2 child strokes vs 1-3 consecutive expected strokes, in order
    let best = null;
    for (let a = 1; a <= 2 && j + a <= n; a++) {
      if (a === 2 && _dist(C[j][C[j].length - 1], C[j + 1][0]) > T.gap) continue;
      for (let b = 1; b <= 3 && i + b <= m; b++) {
        if (done.slice(i, i + b).some(Boolean) || !_joinable(E, i, b, T.gap)) continue;
        const r = _cmp(_cat(C.slice(j, j + a)), _cat(E.slice(i, i + b)), T, free);
        if (r.type === 'ok' && (!best || b - a > best.b - best.a || (b - a === best.b - best.a && r.d < best.r.d))) best = { a, b, r };
      }
    }
    if (best) {
      for (let t = 0; t < best.b; t++) done[i + t] = true;
      matched += best.b; i += best.b; j += best.a;
      continue;
    }
    // 2) a later (or skipped) stroke drawn now -> order
    const rs = E.map((e, k) => k === i || done[k] ? null : _cmp(C[j], e, T, free));
    let k = rs.findIndex(r => r && r.type === 'ok');
    if (k >= 0) { issues.push({ k, problem: 'order' }); done[k] = true; j++; continue; }
    // 3) the expected stroke, but drawn wrongly
    const ri = i < m ? _cmp(C[j], E[i], T, free) : null;
    if (ri && ri.type === 'partial' && opts.partial && j === n - 1) break;   // still writing it
    if (ri && (ri.type === 'reversed' || ri.type === 'wrongStart')) { issues.push({ k: i, problem: ri.type }); done[i] = true; j++; continue; }
    k = rs.findIndex(r => r && r.type === 'reversed');
    if (k >= 0) { issues.push({ k, problem: 'order' }); done[k] = true; j++; continue; }
    if (ri && (ri.type === 'shape' || ri.type === 'partial')) { issues.push({ k: i, problem: 'shape' }); done[i] = true; j++; continue; }
    issues.push({ k: -1, problem: 'extra' });
    j++;
  }
  if (!opts.partial) done.forEach((d, k) => { if (!d) issues.push({ k, problem: 'missing' }); });
  return { ok: !issues.length && (opts.partial || matched === m), issues, matched, expected: m };
}
