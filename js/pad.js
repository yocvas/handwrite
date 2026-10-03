// Writing pad: tracing guide, Apple Pencil ink, and scoring.

const GUIDE_FONT = '"Varela Round", "Arial Hebrew", Arial, sans-serif';

class WritingPad {
  constructor({ paper, inner, guide, ink }) {
    this.paper = paper;
    this.inner = inner;
    this.guide = guide;
    this.ink = ink;
    this.gctx = guide.getContext('2d');
    this.ictx = ink.getContext('2d');
    this.strokes = [];
    this.current = null;
    this.color = INK_COLORS[0];
    this.penOnly = false;     // set from settings
    this.penLast = -1e9;      // last Apple Pencil event time, for auto palm rejection
    this.W = 0; this.H = 0;
    this.layout = null;
    this.onChange = () => {};
    this.onStroke = () => {}; // called with each finished stroke (live stroke-order coaching)
    this._bind();
  }

  // ---------- setup ----------

  // Measure the available paper area and lay out the guide text.
  // `item` = { text, guideAlpha, maxFontRatio, lines: bool } or null for free draw.
  setup(item) {
    this.item = item;
    this.strokes = [];
    this.current = null;
    this.W = Math.max(200, this.paper.clientWidth);
    this.H = Math.max(160, this.paper.clientHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (const c of [this.guide, this.ink]) {
      c.width = Math.round(this.W * this.dpr);
      c.height = Math.round(this.H * this.dpr);
    }
    this.layout = item ? this._layoutText(item) : null;
    this.fit();
    this._drawGuide();
    this._redraw();
  }

  // Keep the logical canvas size; just scale its CSS box to fit the paper (handles rotation).
  fit() {
    if (!this.W) return;
    const k = Math.min(this.paper.clientWidth / this.W, this.paper.clientHeight / this.H) || 1;
    this.inner.style.width = this.W * k + 'px';
    this.inner.style.height = this.H * k + 'px';
  }

  _layoutText(item) {
    const ctx = this.gctx;
    const padX = this.W * 0.06, padY = this.H * 0.08;
    const maxW = this.W - padX * 2, maxH = this.H - padY * 2;
    // Paragraphs: one sentence per line when possible
    const chunks = (item.text.match(/[^.!?]+[.!?]*/g) || []).map(c => c.trim()).filter(Boolean);
    if (!chunks.length) return null;
    // maxFontRatio = how much of the paper height a single line's letters may fill
    const glyphMax = maxH * (item.maxFontRatio || 0.8);
    const lineGap = 1.55;
    let size = 1000, lines, asc, desc;
    for (;; size *= 0.95) {
      ctx.font = `${size}px ${GUIDE_FONT}`;
      lines = [];
      for (const ch of chunks) lines.push(...this._wrap(ctx, ch, maxW));
      // measure real ink extents (Hebrew glyphs are much shorter than the em size)
      asc = 0; desc = 0;
      for (const l of lines) {
        const m = ctx.measureText(l);
        asc = Math.max(asc, m.actualBoundingBoxAscent);
        desc = Math.max(desc, m.actualBoundingBoxDescent);
      }
      const total = lines.length === 1 ? asc + desc : size * lineGap * (lines.length - 1) + asc + desc;
      const limit = lines.length === 1 ? glyphMax : maxH;
      if ((total <= limit && lines.every(l => ctx.measureText(l).width <= maxW)) || size * 0.95 <= 18) break;
    }
    const lineH = size * lineGap;
    const total = lineH * (lines.length - 1) + asc + desc;
    const first = (this.H - total) / 2 + asc;
    // x-height of a plain letter, for the notebook top line
    const xh = ctx.measureText('ב').actualBoundingBoxAscent;
    return { size, lines, xh, baselines: lines.map((_, i) => first + lineH * i) };
  }

  _wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const out = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  _drawGuide() {
    const ctx = this.gctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    const L = this.layout;
    if (!L) {
      // free draw: dotted notebook
      ctx.fillStyle = '#e6e6ee';
      for (let y = 30; y < this.H; y += 36) for (let x = 30; x < this.W; x += 36) {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    const a = this.item.guideAlpha;
    // notebook lines: baseline + top line
    ctx.lineWidth = 2;
    for (const b of L.baselines) {
      ctx.strokeStyle = 'rgba(79,91,213,0.35)';
      ctx.beginPath(); ctx.moveTo(this.W * 0.03, b); ctx.lineTo(this.W * 0.97, b); ctx.stroke();
      ctx.fillStyle = 'rgba(79,91,213,0.04)'; ctx.fillRect(this.W * 0.03, b - L.xh, this.W * 0.94, L.xh);
      ctx.strokeStyle = 'rgba(79,91,213,0.3)';
      ctx.beginPath(); ctx.moveTo(this.W * 0.03, b - L.xh); ctx.lineTo(this.W * 0.97, b - L.xh); ctx.stroke();
    }
    ctx.font = `${L.size}px ${GUIDE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = 'rtl';
    ctx.fillStyle = `rgba(120,120,140,${a})`;
    ctx.strokeStyle = `rgba(90,90,120,${Math.min(1, a * 2.2)})`;
    ctx.lineWidth = Math.max(1.5, L.size * 0.012);
    ctx.setLineDash([Math.max(4, L.size * 0.04), Math.max(4, L.size * 0.035)]);
    L.lines.forEach((line, i) => {
      ctx.fillText(line, this.W / 2, L.baselines[i]);
      ctx.strokeText(line, this.W / 2, L.baselines[i]);
    });
    ctx.setLineDash([]);
  }

  // ---------- input ----------

  _bind() {
    const c = this.ink;
    c.addEventListener('pointerdown', e => this._down(e));
    c.addEventListener('pointermove', e => this._move(e));
    c.addEventListener('pointerup', e => this._up(e));
    c.addEventListener('pointercancel', e => this._up(e, true));
    c.addEventListener('lostpointercapture', e => this._up(e)); // no-op after a normal pointerup
    // stop iOS magnifier / scrolling / callouts / Scribble while writing
    for (const t of ['touchstart', 'touchmove', 'gesturestart']) {
      c.addEventListener(t, e => e.preventDefault(), { passive: false });
    }
  }

  // Palm rejection: once the Pencil is used, ignore fingers (for 30s after the last pen event,
  // so a dead Pencil battery doesn't lock the child out).
  _accept(e) {
    if (e.pointerType === 'pen') { this.penLast = performance.now(); return true; }
    if (e.pointerType === 'touch' && (this.penOnly || performance.now() - (this.penLast || -1e9) < 30000)) return false;
    return true;
  }

  _pt(e, prev, r = this.ink.getBoundingClientRect()) {
    let p = 0.5;
    if (e.pointerType === 'pen') {
      // smooth noisy pressure; a 0 sample (touch-down / lift-off) keeps the previous value
      const raw = e.pressure > 0 ? e.pressure : (prev ? prev.p : 0.35);
      p = prev ? prev.p * 0.65 + raw * 0.35 : raw;
    }
    return { x: (e.clientX - r.left) * this.W / r.width, y: (e.clientY - r.top) * this.H / r.height, p };
  }

  _width(p) {
    const base = this.layout ? Math.min(22, Math.max(5, this.layout.size * 0.07)) : 9;
    return base * (0.55 + p * 0.9);
  }

  _down(e) {
    if (!this._accept(e)) return;               // runs first so a pen is always noticed
    if (this.current) {
      // a resting palm started a stroke before the Pencil touched: the pen takes over
      if (e.pointerType !== 'pen' || this.current.type === 'pen') return;
      this.current = null; this._redraw();
    }
    e.preventDefault();
    try { this.ink.setPointerCapture(e.pointerId); } catch (err) {}
    this.current = { id: e.pointerId, type: e.pointerType, color: this.color, pts: [this._pt(e)] };
    this._drawDot(this.current.pts[0], this.current.color);
  }

  _move(e) {
    const s = this.current;
    if (!s || e.pointerId !== s.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const rect = this.ink.getBoundingClientRect();
    for (const ev of (evs.length ? evs : [e])) {
      const last = s.pts[s.pts.length - 1];
      const q = this._pt(ev, last, rect);
      if ((q.x - last.x) ** 2 + (q.y - last.y) ** 2 < 0.5) continue; // skip near-duplicates
      s.pts.push(q);
      this._drawSegment(s, s.pts.length - 1);
    }
  }

  _up(e, cancelled) {
    const s = this.current;
    if (!s || e.pointerId !== s.id) return;
    this.current = null;
    // iOS cancels touches it decides were a palm: drop that ink
    if (cancelled && s.type !== 'pen') { this._redraw(); return; }
    this._drawTail(s);
    this.strokes.push(s);
    this.onStroke(s);
    this.onChange();
  }

  // ---------- rendering ----------

  _drawDot(p, color) {
    const ctx = this.ictx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, this._width(p.p) / 2, 0, Math.PI * 2); ctx.fill();
  }

  // Smooth quadratic segment through midpoints ending at point i
  _drawSegment(s, i) {
    if (i < 1) return;
    const ctx = this.ictx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.strokeStyle = s.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const p0 = s.pts[i - 2] || s.pts[i - 1], p1 = s.pts[i - 1], p2 = s.pts[i];
    const m0 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    ctx.lineWidth = this._width((p1.p + p2.p) / 2);
    ctx.beginPath();
    ctx.moveTo(m0.x, m0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, m1.x, m1.y);
    ctx.stroke();
  }

  // The midpoint scheme stops half a segment short; finish the stroke at its last point
  _drawTail(s) {
    const n = s.pts.length;
    if (n < 2) return;
    const a = s.pts[n - 2], b = s.pts[n - 1], ctx = this.ictx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineWidth = this._width(b.p);
    ctx.beginPath(); ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  _redraw() {
    const ctx = this.ictx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.ink.width, this.ink.height);
    for (const s of this.strokes) {
      this._drawDot(s.pts[0], s.color);
      for (let i = 1; i < s.pts.length; i++) this._drawSegment(s, i);
      this._drawTail(s);
    }
  }

  setColor(c) { this.color = c; }
  undo() { this.strokes.pop(); this._redraw(); this.onChange(); }
  clear() { this.strokes = []; this.current = null; this._redraw(); this.onChange(); }
  isEmpty() { return this.strokes.length === 0; }

  // ---------- scoring ----------

  // Compares ink to the guide glyphs on a low-res grid, tuned on simulated 5-year-old tracing
  // (tests/scoring.html). coverage = how much of the letters was traced (a centerline trace is
  // enough), precision = how much ink stayed on the letters, faded when there is far more ink than
  // a trace needs (colouring the area in / scribbling).
  // leniency < 1 lowers the bar (easy / after misses), > 1 raises it (adaptive difficulty)
  score({ leniency = 1 } = {}) {
    if (!this.layout) return { stars: 3, coverage: 1, precision: 1 };
    const s = 0.25;
    const gw = Math.ceil(this.W * s), gh = Math.ceil(this.H * s);
    const target = this._rasterTarget(gw, gh, s);
    const ink = this._rasterInk(gw, gh);
    const size = this.layout.size;
    const sw = size * 0.10;                     // stroke width of the guide font (Varela Round)
    const iw = this._avgInkWidth();             // pen width the child actually used
    const tol = Math.max(size * 0.02, 7);       // wobble allowance, px
    // a centerline trace leaves (sw - iw) / 2 of each glyph stroke bare, or spills (iw - sw) / 2 over
    const rc = Math.max(1, Math.round((Math.max(0, sw - iw) / 2 + tol) * s));
    const rp = Math.max(1, Math.round((Math.max(0, iw - sw) / 2 + tol) * s));
    const inkFat = dilate(ink, gw, gh, rc);
    const targetFat = dilate(target, gw, gh, rp);
    let t = 0, tc = 0, k = 0, kc = 0;
    for (let i = 0; i < target.length; i++) {
      if (target[i]) { t++; if (inkFat[i]) tc++; }
      if (ink[i]) { k++; if (targetFat[i]) kc++; }
    }
    const coverage = t ? tc / t : 0;
    // overdraw = ink area / area of an ideal centerline trace; going over a line twice is ~2,
    // colouring the whole box in is 4-13. Fade precision from 2.0 down to 0 at 4.8.
    const overdraw = k / Math.max(1, t * iw / sw);
    const fade = Math.min(1, Math.max(0, (4.8 - overdraw) / 2.8));
    const precision = (k ? kc / k : 0) * fade;
    let stars = 0;
    const q = v => Math.min(0.95, v * leniency);
    if (coverage >= q(0.85) && precision >= q(0.75)) stars = 3;
    else if (coverage >= q(0.65) && precision >= q(0.65)) stars = 2;
    else if (coverage >= q(0.35) && precision >= q(0.6)) stars = 1;
    return { stars, coverage, precision, overdraw };
  }

  // Average ink width over all pen samples (pressure-aware), CSS px
  _avgInkWidth() {
    let n = 0, w = 0;
    for (const st of this.strokes) for (const p of st.pts) { w += this._width(p.p); n++; }
    return n ? w / n : this._width(0.5);
  }

  _rasterTarget(gw, gh, s) {
    const c = makeCanvas(gw, gh);
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    ctx.font = `${this.layout.size}px ${GUIDE_FONT}`;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = '#000';
    this.layout.lines.forEach((l, i) => ctx.fillText(l, this.W / 2, this.layout.baselines[i]));
    return alphaMask(ctx, gw, gh);
  }

  _rasterInk(gw, gh) {
    const c = makeCanvas(gw, gh);
    const ctx = c.getContext('2d');
    ctx.drawImage(this.ink, 0, 0, gw, gh);
    return alphaMask(ctx, gw, gh);
  }

  // Snapshot for the feed post: paper + lines + ink (no guide, it's the child's own writing)
  snapshot(maxW = 600) {
    const k = Math.min(1, maxW / this.W);
    const w = Math.round(this.W * k), h = Math.round(this.H * k);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    if (this.layout) {
      ctx.strokeStyle = 'rgba(79,91,213,0.25)';
      ctx.lineWidth = 2 * k;
      for (const b of this.layout.baselines) {
        ctx.beginPath(); ctx.moveTo(w * 0.03, b * k); ctx.lineTo(w * 0.97, b * k); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.03, (b - this.layout.xh) * k); ctx.lineTo(w * 0.97, (b - this.layout.xh) * k); ctx.stroke();
      }
    }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.ink, 0, 0, w, h);
    return c;
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function alphaMask(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  return m;
}

// Square dilation via two separable sliding-window passes
function dilate(src, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let cnt = 0;
    const row = y * w;
    for (let x = 0; x < Math.min(r, w); x++) cnt += src[row + x];
    for (let x = 0; x < w; x++) {
      if (x + r < w) cnt += src[row + x + r];
      if (x - r - 1 >= 0) cnt -= src[row + x - r - 1];
      tmp[row + x] = cnt > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let cnt = 0;
    for (let y = 0; y < Math.min(r, h); y++) cnt += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      if (y + r < h) cnt += tmp[(y + r) * w + x];
      if (y - r - 1 >= 0) cnt -= tmp[(y - r - 1) * w + x];
      out[y * w + x] = cnt > 0 ? 1 : 0;
    }
  }
  return out;
}
