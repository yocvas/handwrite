// כותבים — Instagram-style Hebrew handwriting game for kids.

const $ = s => document.querySelector(s);
const STORE_KEY = 'kotvim-state-v2';
const FREE = { id: 'free', name: 'ציור חופשי', icon: '🎨', grad: ['#4f5bd5', '#d62976'] };
const BONUS = { id: 'bonus', name: 'בונוס', icon: '🎁', grad: ['#20b26b', '#4f5bd5'] };
const BONUS_EVERY = 5;                               // successful lessons per bonus game
const DIFF_ICONS = ['🌱', '🌿', '🌳', '🚀', '👑'];  // adaptive difficulty 0..4
const TILE_G = [['#feda75', '#fa7e1e'], ['#fa7e1e', '#d62976'], ['#d62976', '#962fbf'], ['#962fbf', '#4f5bd5'], ['#4f5bd5', '#22c1c3'], ['#20b26b', '#c3e83d']];

// ---------------- state ----------------

const defaultState = () => ({
  profile: { name: 'כוכב', avatar: '🦄' },
  settings: { penOnly: false, unlockAll: false, sound: true, voice: true },
  progress: {},   // { levelId: { itemText: bestStars } }
  posts: [],      // newest first; img = ImageStore id (or a data: URL fallback)
  adapt: {},      // { levelId | 'game': difficulty 0..4 } — adaptive learning
  fails: {},      // { 'levelId:itemText': misses in a row }
  demoSeen: {},   // letters whose stroke-order demo was already shown
  bonus: 0,       // successful lessons since the last bonus game
  gameMode: 'hunting',
  lastL: -1,      // level of the last lesson (to interleave letters and words)
  seenActivity: 0,
});

let state = load();

function load() {
  const d = defaultState();
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && typeof s === 'object') {
      const out = { ...d, ...s, profile: { ...d.profile, ...s.profile }, settings: { ...d.settings, ...s.settings } };
      for (const k of ['progress', 'adapt', 'fails', 'demoSeen']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
      out.posts = Array.isArray(s.posts) ? s.posts.filter(p => p && p.img && Array.isArray(p.comments)) : [];
      return out;
    }
  } catch (e) {}
  return d;
}

// Images live in IndexedDB, so the JSON here stays small
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('save failed', e); }
}

const item = (l, i) => LEVELS[l].items[i];
const progressOf = l => state.progress[LEVELS[l].id] || {};
const stars = (l, i) => progressOf(l)[item(l, i).t] || 0;
const doneCount = l => LEVELS[l].items.filter((_, i) => stars(l, i) > 0).length;
const totalStars = () => LEVELS.reduce((sum, lv, l) => sum + lv.items.reduce((a, _, i) => a + stars(l, i), 0), 0);
const needed = l => Math.ceil(LEVELS[l].items.length * 0.5);
const unlocked = l => state.settings.unlockAll || l === 0 || (unlocked(l - 1) && doneCount(l - 1) >= needed(l - 1));
const levelDone = l => doneCount(l) === LEVELS[l].items.length;
const grad = g => `linear-gradient(45deg, ${g[0]}, ${g[1]})`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];
const starStr = n => '⭐'.repeat(n);
const sentencesOf = text => (text.match(/[^.!?]+[.!?]*/g) || [text]).map(s => s.trim()).filter(Boolean);
const levelMeta = id => LEVELS.find(x => x.id === id) || (id === 'bonus' ? BONUS : FREE);

// ---------------- adaptive learning ----------------

const diff = id => state.adapt[id] ?? 1;
const failKey = (l, i) => LEVELS[l].id + ':' + item(l, i).t;
const failsOf = (l, i) => state.fails[failKey(l, i)] || 0;

// How the next attempt is tuned. Harder: fainter guide, smaller letters, stricter scoring, no start dots.
// After misses on the same item: stronger guide, gentler scoring, and the stroke-order demo again.
function tuning(l, i) {
  const L = LEVELS[l], d = Math.round(diff(L.id)), f = failsOf(l, i), help = f >= 2;
  return {
    d, f,
    guideAlpha: Math.min(0.5, L.guide * [1.6, 1.25, 1, 0.72, 0.5][d] * (help ? 1.6 : 1)),
    maxFontRatio: L.font * [1.12, 1.05, 1, 0.93, 0.86][d],
    leniency: [0.75, 0.88, 1, 1.08, 1.15][d] * (help ? 0.8 : 1),
    strictness: help ? 0.2 : 0.3 + d * 0.175,
    demo: l === 0 && (!state.demoSeen[item(l, i).t] || f >= 1),
    dots: l === 0 && d < 3,
  };
}

// Correct (2-3★) → a bit harder; wrong (0★) → easier. Returns the change in difficulty step.
function adapt(l, i, s) {
  const id = LEVELS[l].id, before = Math.round(diff(id));
  state.adapt[id] = Math.max(0, Math.min(4, diff(id) + (s >= 2 ? 0.5 : s === 0 ? -1 : 0)));
  const k = failKey(l, i);
  if (s === 0) state.fails[k] = (state.fails[k] || 0) + 1;
  else delete state.fails[k];
  return Math.round(state.adapt[id]) - before;
}

// On high difficulty skip what's already mastered (3★)
function nextIndex(l, i) {
  const n = LEVELS[l].items.length, skip = diff(LEVELS[l].id) >= 3;
  for (let k = i + 1; k < n; k++) if (!skip || stars(l, k) < 3) return k;
  return -1;
}

const letterKnown = ch => (state.progress.letters || {})[ch] > 0;
const wordReady = it => [...it.t.replace(/[^א-ת]/g, '')].every(letterKnown);

// The "+" lesson: struggling → review a shaky item first; words whose letters are all learned
// come first; alternate levels so a new letter is soon followed by a word.
function nextLesson() {
  const cands = [];
  for (let l = 0; l < LEVELS.length && unlocked(l); l++) {
    const items = LEVELS[l].items;
    let i = -1;
    if (diff(LEVELS[l].id) < 1) i = items.findIndex((_, k) => stars(l, k) === 1);
    if (i < 0 && l === 1) i = items.findIndex((it, k) => !stars(l, k) && wordReady(it));
    if (i < 0) i = items.findIndex((_, k) => !stars(l, k));
    if (i >= 0) cands.push({ l, i });
  }
  if (cands.length > 1 && cands[0].l === state.lastL) return cands[1];
  return cands[0] || null;
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return m === 1 ? 'לפני דקה' : m === 2 ? 'לפני שתי דקות' : `לפני ${m} דקות`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'אתמול' : d === 2 ? 'לפני יומיים' : `לפני ${d} ימים`;
}

// ---------------- sound & voice ----------------

let audioCtx;
function tone(freqs, dur = 0.12, type = 'sine') {
  if (!state.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
    freqs.forEach((f, k) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      const t = audioCtx.currentTime + k * dur;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.8);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + dur * 2);
    });
  } catch (e) {}
}
const sfx = {
  pop: () => tone([880], 0.06, 'triangle'),
  win: () => tone([523, 659, 784, 1047], 0.11),
  ok: () => tone([523, 659], 0.12),
  oops: () => tone([392, 330], 0.15, 'triangle'),
};

// Prefer the parent's choice, then natural/enhanced voices (Edge "Hila/Avri Online (Natural)",
// iOS "Carmit (Enhanced)") over the robotic compact defaults.
let heVoice = null;
const hebrewVoices = () => speechSynthesis.getVoices().filter(v => /^(he|iw)/i.test(v.lang));
const voiceRank = v => (/natural|neural/i.test(v.name) ? 4 : 0) + (/enhanced|premium|משופר|מתקדם/i.test(v.name) ? 4 : 0) +
  (/online/i.test(v.name) ? 2 : 0) + (v.localService === false ? 1 : 0);
function pickVoice() {
  const vs = hebrewVoices();
  heVoice = vs.find(v => v.name === state.settings.voiceName) || vs.sort((a, b) => voiceRank(b) - voiceRank(a))[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

function speak(text, pitch = 1) {
  if (!text || !state.settings.voice || !('speechSynthesis' in window)) return;
  const ss = speechSynthesis;
  const go = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL'; if (heVoice) u.voice = heVoice;
    u.rate = 0.9; u.pitch = pitch;
    ss.speak(u);
  };
  ss.resume();
  // iOS drops an utterance queued in the same tick as cancel()
  if (ss.speaking || ss.pending) { ss.cancel(); setTimeout(go, 80); } else go();
}

// iOS only allows audio/speech that was first started from a tap
let speechUnlocked = false;
document.addEventListener('pointerdown', () => {
  if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
  if (!speechUnlocked && 'speechSynthesis' in window) {
    speechUnlocked = true;
    const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u);
  }
}, true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && 'speechSynthesis' in window) speechSynthesis.cancel();
});

// ---------------- effects ----------------

function burst(x, y, emojis = ['❤️', '💖', '⭐', '✨', '💜', '🧡'], n = 18) {
  const host = $('#burst');
  for (let k = 0; k < n; k++) {
    const e = document.createElement('span');
    e.textContent = pick(emojis);
    const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 220;
    e.style.left = x + 'px'; e.style.top = y + 'px';
    e.style.setProperty('--dx', Math.cos(a) * d + 'px');
    e.style.setProperty('--dy', Math.sin(a) * d - 120 + 'px');
    e.style.fontSize = 22 + Math.random() * 26 + 'px';
    host.appendChild(e);
    setTimeout(() => e.remove(), 1300);
  }
}

function bigHeart(el) {
  const h = document.createElement('div');
  h.className = 'big-heart';
  h.textContent = '❤️';
  el.appendChild(h);
  setTimeout(() => h.remove(), 900);
}

// Toasts are also spoken: the child can't read them
function toast(msg, say) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  document.body.appendChild(t);
  if (say) speak(say);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

// ---------------- posts ----------------

const imgTag = (p, cls = '') =>
  p.img.startsWith('data:') ? `<img class="${cls}" src="${p.img}" alt="" draggable="false">`
    : `<img class="${cls}" data-img="${p.img}" alt="" draggable="false">`;

async function addPost({ level, key, text, emoji, stars: s, canvas }) {
  const id = Date.now().toString(36) + rand(1000);
  let img = id;
  try {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.75));
    await ImageStore.put(id, blob);
  } catch (e) {
    img = canvas.toDataURL('image/jpeg', 0.6);   // IndexedDB unavailable: inline fallback
  }
  const fans = [...FRIENDS.keys()].sort(() => Math.random() - 0.5);
  // praise the effort, not the score: same amount of love for every post
  const comments = fans.slice(0, 2 + rand(2)).map(f => ({ f, text: pick(COMMENTS[s || 2]) }));
  if (level === 'letters') comments.unshift({ f: fans[3], text: `האות ${text} יצאה יפה! ✨` });
  else if (level === 'words' || level === 'sentences') comments.unshift({ f: fans[3], text: `קראתי: "${text}" 📖` });
  const post = { id, ts: Date.now(), level, key, text, emoji, stars: s, img, likes: 6 + rand(6), liked: false, comments };
  state.posts.unshift(post);
  save();
  return post;
}

// A picture card for bonus-game posts
function cardCanvas(emoji, text, g) {
  const c = document.createElement('canvas');
  c.width = c.height = 600;
  const ctx = c.getContext('2d');
  const lg = ctx.createLinearGradient(0, 600, 600, 0);
  lg.addColorStop(0, g[0]); lg.addColorStop(1, g[1]);
  ctx.fillStyle = lg; ctx.fillRect(0, 0, 600, 600);
  ctx.textAlign = 'center'; ctx.direction = 'rtl';
  ctx.font = '220px serif'; ctx.fillText(emoji, 300, 330);
  ctx.fillStyle = '#fff'; ctx.font = `64px ${GUIDE_FONT}`; ctx.fillText(text, 300, 480);
  return c;
}

// Paragraph pages stacked into one picture
function stackCanvases(cs) {
  const w = Math.max(...cs.map(c => c.width)), h = cs.reduce((a, c) => a + c.height, 0);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  let y = 0;
  for (const c of cs) { ctx.drawImage(c, (w - c.width) / 2, y); y += c.height; }
  return out;
}

// ---------------- views ----------------

let tab = 'home';
let exploreFilter = -1;

function render() {
  $('#tabAvatar').textContent = state.profile.avatar;
  $('#activityDot').classList.toggle('hidden', !(state.posts[0] && state.posts[0].ts > state.seenActivity));
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const lg = $('.logo');
  lg.textContent = tab === 'profile' ? state.profile.name : 'כותבים';
  lg.classList.toggle('as-user', tab === 'profile');
  const v = $('#view');
  v.innerHTML = tab === 'explore' ? viewExplore() : tab === 'profile' ? viewProfile() : viewHome();
  ImageStore.hydrate(v);
}

function storiesBar() {
  const me = `
    <button class="story-item" data-act="next">
      <div class="ring me"><div class="ring-inner">${state.profile.avatar}</div><span class="plus">+</span></div>
      <span class="story-name">השיעור הבא</span>
    </button>`;
  const lv = LEVELS.map((L, l) => {
    const cls = !unlocked(l) ? 'locked' : levelDone(l) ? 'seen' : '';
    return `
    <button class="story-item" data-act="level" data-l="${l}">
      <div class="ring ${cls}"><div class="ring-inner">${unlocked(l) ? L.icon : '🔒'}</div></div>
      <span class="story-name">${L.name}</span>
      <span class="story-count">${doneCount(l)}/${L.items.length}</span>
    </button>`;
  }).join('');
  const ready = state.bonus >= BONUS_EVERY;
  const bonus = `
    <button class="story-item" data-act="bonus">
      <div class="ring ${ready ? 'pulse' : 'seen'}"><div class="ring-inner">${BONUS.icon}</div></div>
      <span class="story-name">${BONUS.name}</span>
      <span class="story-count">${ready ? '!' : `${state.bonus}/${BONUS_EVERY}`}</span>
    </button>`;
  const free = `
    <button class="story-item" data-act="free">
      <div class="ring"><div class="ring-inner">${FREE.icon}</div></div>
      <span class="story-name">${FREE.name}</span>
    </button>`;
  return `<div class="stories">${me}${lv}${bonus}${free}</div>`;
}

function suggestedCard() {
  const n = nextLesson();
  if (!n) return `
    <article class="post suggest">
      <div class="suggest-body"><div class="suggest-emoji">🏆</div>
      <div class="suggest-title">סיימנו את כל השיעורים!</div>
      <div class="muted">אפשר לחזור על כל שיעור דרך הגלריה 🔍 או לצייר ציור חופשי 🎨</div>
      <button class="btn primary" data-act="free">ציור חופשי 🎨</button></div>
    </article>`;
  const L = LEVELS[n.l], it = item(n.l, n.i);
  return `
    <article class="post suggest">
      <div class="post-head">
        <div class="ring tiny"><div class="ring-inner">${L.icon}</div></div>
        <div class="post-who"><b>${L.name}</b><div class="muted">מומלץ בשבילך ✨</div></div>
      </div>
      <button class="suggest-body" data-act="open" data-l="${n.l}" data-i="${n.i}" style="--g:${grad(L.grad)}">
        <div class="suggest-emoji">${it.emoji}</div>
        <div class="suggest-text">${esc(it.t)}</div>
        <span class="btn white">בואו נכתוב! ✏️</span>
      </button>
    </article>`;
}

const HEART = '<svg viewBox="0 0 24 24"><path d="M16.8 3.5c-1.9 0-3.6 1-4.8 2.6C10.8 4.5 9.1 3.5 7.2 3.5 4 3.5 1.8 6 1.8 9.2c0 5.4 7.4 10.1 10.2 11.3 2.8-1.2 10.2-5.9 10.2-11.3 0-3.2-2.2-5.7-5.4-5.7z"/></svg>';

const friendSay = c => `data-say="${esc(c.text)}" data-pitch="${(0.8 + (c.f % 5) * 0.2).toFixed(1)}"`;

function postHTML(p, { hideComments = false } = {}) {
  const L = levelMeta(p.level);
  const nLikes = p.likes + (p.liked ? 1 : 0);
  const fans = [...new Set(p.comments.map(c => c.f))].slice(0, 3).map(f => FRIENDS[f]);
  const shown = hideComments ? '' : p.comments.slice(0, 2).map(c =>
    `<button class="comment" ${friendSay(c)}><b>${FRIENDS[c.f].emoji} ${FRIENDS[c.f].name}</b> ${esc(c.text)}</button>`).join('');
  const more = !hideComments && p.comments.length > 2 ? `<button class="muted link" data-act="post" data-id="${p.id}">הצגת כל ${p.comments.length} התגובות</button>` : '';
  return `
  <article class="post" data-id="${p.id}">
    <div class="post-head">
      <div class="ring tiny"><div class="ring-inner">${state.profile.avatar}</div></div>
      <div class="post-who"><b>${esc(state.profile.name)}</b><div class="muted">${L.icon} ${L.name}</div></div>
      ${hideComments ? '' : `<button class="icon-btn more" data-act="post" data-id="${p.id}" aria-label="עוד">•••</button>`}
    </div>
    <div class="post-media" data-act="dbl" data-id="${p.id}">${imgTag(p)}</div>
    <div class="post-actions">
      <button class="icon-btn like ${p.liked ? 'on' : ''}" data-act="like" data-id="${p.id}" aria-label="לייק">${HEART}<span class="cnt">${nLikes}</span></button>
      <button class="icon-btn" data-act="post" data-id="${p.id}" aria-label="תגובות">
        <svg viewBox="0 0 24 24"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.6A8.5 8.5 0 1 1 20.5 11.5z"/></svg><span class="cnt">${p.comments.length}</span>
      </button>
      <button class="icon-btn" data-act="speak" data-say="${esc(p.text)}" aria-label="הקראה">
        <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>
      </button>
      <span class="spacer"></span>
      <span class="post-stars">${starStr(p.stars)}</span>
    </div>
    ${fans.length ? `<div class="likes"><span class="likers">${fans.map(f => `<i>${f.emoji}</i>`).join('')}</span>
      <span><b>${fans[0].name}</b> ועוד <b>${nLikes - 1}</b> אהבו ❤️</span></div>` : ''}
    <div class="caption"><b>${esc(state.profile.name)}</b> ${esc(p.text)} ${p.emoji || ''}</div>
    ${shown}${more}
    <div class="time">${timeAgo(p.ts)}</div>
  </article>`;
}

function viewHome() {
  const welcome = state.posts.length ? '' : `
    <article class="post welcome">
      <div class="welcome-emoji">✏️🍎📚</div>
      <div class="welcome-title">שלום ${esc(state.profile.name)}!</div>
      <div class="muted">לוקחים את העט, כותבים על האותיות האפורות, והכתיבה מתפרסמת כאן ❤️</div>
    </article>`;
  return `<div class="feed">${storiesBar()}${suggestedCard()}${welcome}${state.posts.map(p => postHTML(p)).join('')}</div>`;
}

function viewExplore() {
  const chips = [-1, 0, 1, 2, 3].map(l => `
    <button class="chip ${exploreFilter === l ? 'on' : ''}" data-act="filter" data-l="${l}" data-say="${l < 0 ? 'הכל' : LEVELS[l].name}">
      ${l < 0 ? 'הכל' : LEVELS[l].icon + ' ' + LEVELS[l].name}</button>`).join('');
  let tiles = '', n = 0;
  LEVELS.forEach((L, l) => {
    if (exploreFilter >= 0 && exploreFilter !== l) return;
    const open = unlocked(l);
    L.items.forEach((it, i) => {
      // Instagram mosaic: in every 5 tiles one is tall, alternating sides
      const k = n % 5, blk = Math.floor(n / 5);
      const tall = k === (blk % 2 ? 0 : 2) ? 'tall' : '';
      const g = TILE_G[(l + i) % TILE_G.length]; n++;
      tiles += `
      <button class="tile lv${l} ${tall} ${open ? '' : 'locked'}" style="--g:${grad(g)}" data-act="open" data-l="${l}" data-i="${i}">
        <span class="tile-emoji">${it.emoji}</span>
        <span class="tile-text">${esc(it.t)}</span>
        ${stars(l, i) ? `<span class="tile-stars">${starStr(stars(l, i))}</span>` : ''}
        ${open ? '' : '<span class="tile-lock">🔒</span>'}
      </button>`;
    });
  });
  return `<div class="explore"><div class="chips">${chips}</div><div class="egrid">${tiles}</div></div>`;
}

function viewProfile() {
  const ts = totalStars();
  const hl = LEVELS.map((L, l) => {
    const pct = Math.round(100 * doneCount(l) / L.items.length);
    return `<button class="story-item" data-act="level" data-l="${l}">
      <div class="ring"><div class="ring-inner">${levelDone(l) ? '🏅' : unlocked(l) ? L.icon : '🔒'}</div></div>
      <span class="story-name">${L.name}</span><span class="story-count">${pct}% ${DIFF_ICONS[Math.round(diff(L.id))]}</span></button>`;
  }).join('');
  const grid = state.posts.map(p => `
    <button class="pthumb" data-act="post" data-id="${p.id}">${imgTag(p)}
    ${p.stars ? `<span class="pthumb-stars">${starStr(p.stars)}</span>` : ''}</button>`).join('');
  return `<div class="profile">
    <div class="profile-top">
      <div class="ring big"><div class="ring-inner">${state.profile.avatar}</div></div>
      <div class="ptop-side">
        <div class="pname">${esc(state.profile.name)}</div>
        <div class="pstats">
          <div><b>${state.posts.length}</b><span>פוסטים</span></div>
          <div><b>${ts}</b><span>כוכבים</span></div>
          <div><b>${doneCount(0)}</b><span>אותיות</span></div>
        </div>
      </div>
    </div>
    <div class="bio">מתאמנים בכתיבה ✏️</div>
    <div class="pbtns">
      <button class="btn soft" data-act="editProfile">עריכת פרופיל</button>
      <button class="btn soft" data-act="parents">הורים ⚙️</button>
    </div>
    <div class="stories highlights">${hl}</div>
    <div class="ptabs"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg></div>
    <div class="pgrid">${grid || '<div class="empty muted">עוד אין פוסטים. בואו נכתוב משהו! ✏️</div>'}</div>
  </div>`;
}

// ---------------- story (writing) ----------------

const pad = new WritingPad({ paper: $('#paper'), inner: $('#paperInner'), guide: $('#guideCanvas'), ink: $('#inkCanvas') });
let cur = null;          // { l, i, page, pages } or { free: true }
let openSeq = 0, storyReady = false;
let demo = null, coach = null, coachedK = -1, lastIssue = null;

function openLevel(l) {
  if (!unlocked(l)) return lockedToast(l);
  const i = LEVELS[l].items.findIndex((_, k) => !stars(l, k));
  openStory(l, i < 0 ? 0 : i);
}

function lockedToast(l) {
  sfx.oops();
  const left = needed(l - 1) - doneCount(l - 1);
  if (!unlocked(l - 1)) return toast(`🔒 ${LEVELS[l].name}`, `קודם ${LEVELS[l - 1].name}`);
  toast(`🔒 עוד ${left} ב${LEVELS[l - 1].name} ← ${LEVELS[l].icon}`, `עוד ${left} ${LEVELS[l - 1].name}, ונפתח את ה${LEVELS[l].name}!`);
}

const pagesOf = (l, i) => l === 3 ? sentencesOf(item(l, i).t) : [item(l, i).t];
function sayOf(l, i, page) {
  const it = item(l, i);
  // "הָאוֹת" gives the voice context, so it reads letter names (בית = bet, not bayit)
  if (l === 0) return `הָאוֹת ${it.say}. ${it.say}, כְּמוֹ ${it.wordSay || it.word}`;
  if (l === 3) return sentencesOf(it.say || it.t)[page] || pagesOf(l, i)[page];
  return it.say || it.t;
}

async function openStory(l, i, page = 0) {
  if (l >= 0 && !unlocked(l)) return lockedToast(l);
  const seq = ++openSeq;
  storyReady = false;
  stopDemo(); stopCoach();
  pad.clear();
  const keepPages = cur && !cur.free && cur.l === l && cur.i === i && page > 0;
  cur = l < 0 ? { free: true } : { l, i, page, pages: keepPages ? cur.pages : [] };
  coachedK = -1;
  const L = l < 0 ? FREE : LEVELS[l];
  const it = l < 0 ? null : item(l, i);
  const st = $('#story');
  st.style.setProperty('--g', grad(L.grad));
  st.classList.remove('hidden');
  document.body.classList.add('no-scroll');

  const pages = it ? pagesOf(l, i) : [];
  $('#storyIcon').textContent = L.icon;
  $('#storyTitle').textContent = L.name;
  $('#storySub').textContent = !it ? 'מה שבא לך' : pages.length > 1 ? `עמוד ${page + 1} מתוך ${pages.length}` : `${i + 1} מתוך ${L.items.length}`;
  $('#storyLevel').textContent = it ? DIFF_ICONS[tuning(l, i).d] : '';
  $('#btnPrev').style.visibility = it && i > 0 ? 'visible' : 'hidden';
  $('#btnNext').style.visibility = it && i < L.items.length - 1 ? 'visible' : 'hidden';
  $('#storyProgress').innerHTML = it ? L.items.map((_, k) =>
    `<span class="${k === i ? 'cur' : stars(l, k) ? 'done' : ''}"></span>`).join('') : '';
  $('#doneAv').textContent = state.profile.avatar;
  $('#btnDemo').classList.toggle('hidden', l !== 0);

  $('#promptEmoji').textContent = it ? it.emoji : '🎨';
  const pt = $('#promptText');
  pt.className = 'prompt-text lv' + l;
  if (!it) pt.textContent = 'ציור חופשי! מה נצייר היום?';
  else if (l === 0) pt.innerHTML = `<span class="big-letter">${it.t}</span><span class="as-in">כמו <b>${it.word}</b></span>`;
  else if (l === 3) pt.innerHTML = `<span class="pages">${pages.map((_, k) => `<i class="${k < page ? 'done' : k === page ? 'cur' : ''}"></i>`).join('')}</span> ${esc(pages[page])}`;
  else pt.textContent = it.t;

  sayPrompt();   // still inside the tap — iOS requires it for the first utterance

  // wait for the guide font and layout before measuring the paper
  try { await document.fonts.load(`40px "Varela Round"`, 'אב .!'); } catch (e) {}
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (seq !== openSeq || !cur) return;   // superseded or closed meanwhile
  setupPad();
  storyReady = true;
}

function setupPad() {
  pad.penOnly = state.settings.penOnly;
  if (cur.free) return pad.setup(null);
  const t = tuning(cur.l, cur.i);
  pad.setup({ text: pagesOf(cur.l, cur.i)[cur.page], guideAlpha: t.guideAlpha, maxFontRatio: t.maxFontRatio });
  if (cur.l !== 0) return;
  if (lastIssue && lastIssue.l === cur.l && lastIssue.i === cur.i) { coachStroke(lastIssue.k); lastIssue = null; }
  else if (t.demo) playDemo();
  else if (t.dots) drawDots();
}

function sayPrompt() {
  if (!cur || cur.free) return speak('ציור חופשי');
  speak(sayOf(cur.l, cur.i, cur.page));
}

// ----- stroke order (letters level) -----

const hasStrokes = () => typeof LETTER_STROKES !== 'undefined' && cur && cur.l === 0 && pad.layout && LETTER_STROKES[pad.layout.lines[0]];

function letterGeom() {
  const L = pad.layout, ctx = pad.gctx;
  ctx.setTransform(pad.dpr, 0, 0, pad.dpr, 0, 0);
  ctx.font = `${L.size}px ${GUIDE_FONT}`; ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
  const ch = L.lines[0];
  return { ctx, ch, box: letterBox(ctx, ch, pad.W / 2, L.baselines[0]) };
}

function drawDots() {
  if (!hasStrokes()) return;
  const { ctx, ch, box } = letterGeom();
  drawStartDots(ctx, ch, box);
}

function playDemo() {
  if (!hasStrokes()) return;
  stopDemo(); stopCoach();
  const { ctx, ch, box } = letterGeom();
  state.demoSeen[ch] = 1; save();
  demo = playLetterDemo(ctx, ch, box, { onDone: () => { demo = null; drawStartDots(ctx, ch, box); } });
}

function stopDemo(redrawDots) {
  if (!demo) return;
  demo.cancel(); demo = null;
  if (redrawDots) drawDots();
}

function coachStroke(k) {
  if (!hasStrokes() || typeof highlightStroke !== 'function') return;
  stopCoach();
  const { ctx, ch, box } = letterGeom();
  coach = highlightStroke(ctx, ch, box, k, {});
}
function stopCoach() { if (coach) { coach.cancel(); coach = null; } }

// Live coaching: check each stroke as soon as the pencil lifts
// (partial mode tolerates a half-drawn last stroke, pen lifts and merged strokes)
const LIVE_HINT = {
  reversed: 'הפוך! מתחילים מהנקודה הירוקה, בכיוון החץ',
  order: 'רגע! קודם הקו עם הנקודה הירוקה הזאת',
  wrongStart: 'מתחילים מהנקודה הירוקה',
};
pad.onStroke = () => {
  if (!hasStrokes() || typeof checkStrokeOrder !== 'function') return;
  const { ch, box } = letterGeom();
  const r = checkStrokeOrder(pad.strokes, ch, box, { partial: true, strictness: tuning(cur.l, cur.i).strictness });
  const iss = r.issues.find(x => LIVE_HINT[x.problem]);
  if (!iss || iss.k === coachedK) return;   // don't nag twice about the same stroke
  coachedK = iss.k;
  coachStroke(Math.max(0, iss.k));
  speak(LIVE_HINT[iss.problem]);
};
pad.onChange = () => { if (pad.isEmpty()) coachedK = -1; };
$('#inkCanvas').addEventListener('pointerdown', () => { stopDemo(true); stopCoach(); });

function closeStory() {
  openSeq++; storyReady = false;
  stopDemo(); stopCoach();
  $('#story').classList.add('hidden');
  $('#result').classList.add('hidden');
  document.body.classList.remove('no-scroll');
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  cur = null;
  render();
}

function step(d) {
  if (!cur || cur.free) return;
  const n = d > 0 ? nextIndex(cur.l, cur.i) : cur.i - 1;
  if (n < 0 || n >= LEVELS[cur.l].items.length) return closeStory();
  openStory(cur.l, n);
}

async function finish() {
  if (!cur || !storyReady) return;
  if (pad.isEmpty()) {
    sfx.oops();
    $('#paper').classList.remove('shake'); void $('#paper').offsetWidth; $('#paper').classList.add('shake');
    speak('קודם כותבים עם העט');
    return;
  }
  stopDemo(); stopCoach();
  storyReady = false;   // no double submit
  const c = cur;
  const snap = pad.snapshot();

  if (c.free) {
    const post = await addPost({ level: 'free', key: 'free', text: 'ציור חופשי', emoji: '🎨', stars: 0, canvas: snap });
    return showResult({ s: 3, free: true, canvas: snap, post });
  }

  const t = tuning(c.l, c.i);
  const res = pad.score({ leniency: t.leniency });
  let s = res.stars, order = null;
  // Beginner level: the letter must also be written in the right stroke order and direction
  if (c.l === 0 && typeof checkStrokeOrder === 'function' && hasStrokes()) {
    const { ch, box } = letterGeom();
    order = checkStrokeOrder(pad.strokes, ch, box, { strictness: t.strictness });
    if (!order.ok && s > 0) s = 0;
  }
  const levelStep = adapt(c.l, c.i, s);
  state.lastL = c.l;
  const wasUnlocked = LEVELS.map((_, l) => unlocked(l));
  const it = item(c.l, c.i), pages = pagesOf(c.l, c.i);
  let canvas = snap, post = null;

  if (s > 0 && c.page < pages.length - 1) {
    // paragraph: next page; the post is made from all pages at the end
    c.pages[c.page] = { canvas: snap, s };
    save(); sfx.ok();
    toast(`${starStr(s)} ← עמוד ${c.page + 2}`, 'יפה! עכשיו השורה הבאה');
    return openStory(c.l, c.i, c.page + 1);
  }
  if (s > 0) {
    if (pages.length > 1) {
      c.pages[c.page] = { canvas: snap, s };
      canvas = stackCanvases(c.pages.map(p => p.canvas));
      s = Math.round(c.pages.reduce((a, p) => a + p.s, 0) / c.pages.length);
    }
    const p = state.progress[LEVELS[c.l].id] = state.progress[LEVELS[c.l].id] || {};
    p[it.t] = Math.max(p[it.t] || 0, s);
    state.bonus = Math.min(BONUS_EVERY, state.bonus + 1);
    post = await addPost({ level: LEVELS[c.l].id, key: it.t, text: it.t, emoji: it.emoji, stars: s, canvas });
  }
  save();
  if (order && !order.ok) {
    const iss = order.issues[0] || { k: 0 };
    lastIssue = { l: c.l, i: c.i, k: iss.k || 0, problem: iss.problem };
  }
  showResult({ s, res, order, canvas, post, wasUnlocked, levelStep });
}

const TITLES = ['כמעט!','יפה מאוד! 😊', 'כל הכבוד! 👏', 'מושלם! 🤩'];
const SPOKEN = ['', 'כוכב אחד! יפה מאוד!', 'שני כוכבים! כל הכבוד!', 'שלושה כוכבים! מושלם!'];
const ORDER_HINT = {
  reversed: ['🔄 כיוון הקו', 'כמעט! כותבים את הקו מהנקודה הירוקה, בכיוון החץ'],
  order: ['🔢 סדר הקווים', 'כמעט! קודם הקו עם המספר אחת, ואחר כך הבא'],
  wrongStart: ['🟢 מתחילים מהנקודה', 'כמעט! מתחילים מהנקודה הירוקה'],
  missing: ['✏️ חסר קו', 'כמעט! חסר עוד קו אחד'],
};

function showResult({ s, free, res, order, canvas, post, wasUnlocked, levelStep }) {
  const c = cur;
  $('#resultStars').innerHTML = free ? '<span class="on">🎨</span>' : s === 0 ? '<span class="on">🌱</span>' :
    [0, 1, 2].map(k => `<span class="${k < s ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.2}s">⭐</span>`).join('');
  $('#resultTitle').textContent = free ? 'איזה ציור יפה! 🎨' : TITLES[s];
  $('#resultImg').src = canvas.toDataURL('image/jpeg', 0.7);
  const orderIssue = order && !order.ok && ORDER_HINT[(order.issues[0] || {}).problem];
  let spoken;
  if (free) { $('#resultSub').textContent = 'פורסם בפיד ❤️'; spoken = 'איזה ציור יפה!'; }
  else if (s > 0) { $('#resultSub').textContent = 'פורסם בפיד ❤️'; spoken = SPOKEN[s]; }
  else if (orderIssue) { $('#resultSub').textContent = orderIssue[0]; spoken = orderIssue[1]; }
  else {
    const missing = res && res.coverage < 0.5;
    $('#resultSub').textContent = missing ? 'חסר עוד קצת ✏️' : 'לאט לאט, על הקו האפור ✏️';
    spoken = missing ? 'כמעט! חסר עוד קצת. בואו נראה איך כותבים, וננסה שוב' : 'כמעט! לאט לאט, נשארים על הקו האפור';
  }
  // bonus progress: 5 gifts
  const ready = state.bonus >= BONUS_EVERY;
  $('#resultBonus').innerHTML = free ? '' : [...Array(BONUS_EVERY)].map((_, k) => `<i class="${k < state.bonus ? 'on' : ''}">🎁</i>`).join('');
  $('#btnBonus').classList.toggle('hidden', !ready || free);

  const last = free || nextIndex(c.l, c.i) < 0;
  const retry = $('#btnRetry'), next = $('#btnResultNext');
  const stuck = !free && s === 0 && failsOf(c.l, c.i) >= 3;
  if (s === 0 && !free) {
    retry.className = stuck ? 'btn ghost' : 'btn primary'; retry.textContent = '🔁 ננסה שוב';
    next.className = stuck ? 'btn primary' : 'btn ghost'; next.textContent = '⬅️ דלג';
  } else {
    retry.className = 'btn ghost'; retry.textContent = free ? '🎨 ציור חדש' : '🔁 שוב';
    next.className = 'btn primary'; next.textContent = last ? '🏁 סיום' : '⬅️ הבא';
  }
  $('#result').classList.remove('hidden');

  if (s > 0 || free) {
    sfx.win();
    setTimeout(() => burst(innerWidth / 2, innerHeight / 2, s === 3 ? ['⭐', '🌟', '❤️', '🎉', '✨'] : undefined, 10 + s * 8), 250);
  } else sfx.ok();   // gentle — not a failure sound
  speak(spoken);

  let delay = 1800;
  if (levelStep > 0) {
    setTimeout(() => toast(`${DIFF_ICONS[Math.round(diff(LEVELS[c.l].id))]} עולים רמה!`, 'עולים רמה!'), delay);
    delay += 2400;
  }
  if (ready) { setTimeout(() => { toast('🎁 משחק בונוס!', 'יש משחק בונוס!'); sfx.win(); }, delay); delay += 2400; }
  if (wasUnlocked) LEVELS.forEach((L, l) => {
    if (!wasUnlocked[l] && unlocked(l)) setTimeout(() => { toast(`🎉 ${L.icon} ${L.name}`, `נפתח שלב חדש: ${L.name}!`); sfx.win(); }, delay);
  });
}

// ---------------- bonus mini-game ----------------

function openBonus() {
  const left = BONUS_EVERY - state.bonus;
  if (left > 0) return toast(`🎁 ${'●'.repeat(state.bonus)}${'○'.repeat(left)}`, `עוד ${left} שיעורים, ומקבלים משחק בונוס!`);
  if (typeof MiniGame === 'undefined') return;
  state.bonus = 0;
  state.gameMode = state.gameMode === 'fishing' ? 'hunting' : 'fishing';
  save();
  const mode = state.gameMode;
  MiniGame.open({
    mode,
    letters: LETTERS.filter(x => letterKnown(x.t)).map(x => x.t),
    words: WORDS.filter(w => (state.progress.words || {})[w.t] > 0),
    letterSay: Object.fromEntries(LETTERS.map(x => [x.t, x.say])),
    difficulty: state.adapt.game ?? 1,
    speak, sfx, burst,
    onDone: async ({ hits, difficulty }) => {
      state.adapt.game = difficulty;
      save();
      if (hits > 0) {
        const fish = mode === 'fishing';
        const text = fish ? `תפסתי ${hits === 1 ? 'דג אחד' : hits + ' דגים'}!` : `תפסתי ${hits === 1 ? 'פרפר אחד' : hits + ' פרפרים'}!`;
        await addPost({ level: 'bonus', key: mode, text, emoji: fish ? '🎣' : '🦋', stars: 0, canvas: cardCanvas(fish ? '🐟' : '🦋', `${hits} ×`, BONUS.grad) });
      }
      render();
    },
  });
}

// ---------------- sheets ----------------

function openSheet(html) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.remove('hidden');
  $('#sheetBackdrop').classList.remove('hidden');
  ImageStore.hydrate($('#sheetBody'));
}
function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheetBackdrop').classList.add('hidden');
}

function sheetActivity() {
  state.seenActivity = Date.now(); save();
  const rows = [];
  for (const p of state.posts.slice(0, 25)) {
    for (const c of p.comments) rows.push(`
      <div class="act-row" ${friendSay(c)}><span class="act-av">${FRIENDS[c.f].emoji}</span>
      <div class="act-text"><b>${FRIENDS[c.f].name}</b>: ${esc(c.text)}<div class="muted">${timeAgo(p.ts)}</div></div>
      <button data-act="post" data-id="${p.id}">${imgTag(p)}</button></div>`);
    rows.push(`
      <div class="act-row"><span class="act-av">❤️</span>
      <div class="act-text"><b>${p.likes}</b> ❤️ "${esc(p.text.slice(0, 20))}"<div class="muted">${timeAgo(p.ts)}</div></div>
      <button data-act="post" data-id="${p.id}">${imgTag(p)}</button></div>`);
  }
  openSheet(`<h2>פעילות</h2>${rows.join('') || '<div class="muted center">עוד אין פעילות. כותבים משהו? ✏️</div>'}`);
  render();
}

function sheetPost(id) {
  const p = state.posts.find(x => x.id === id);
  if (!p) return;
  const all = p.comments.map(c => `<button class="cmt" ${friendSay(c)}><span class="act-av">${FRIENDS[c.f].emoji}</span>
    <div class="act-text"><b>${FRIENDS[c.f].name}</b> <span class="muted small">${timeAgo(p.ts)}</span><div>${esc(c.text)}</div></div>
    <svg class="cmt-heart" viewBox="0 0 24 24"><path d="M16.8 3.5c-1.9 0-3.6 1-4.8 2.6C10.8 4.5 9.1 3.5 7.2 3.5 4 3.5 1.8 6 1.8 9.2c0 5.4 7.4 10.1 10.2 11.3 2.8-1.2 10.2-5.9 10.2-11.3 0-3.2-2.2-5.7-5.4-5.7z"/></svg></button>`).join('');
  openSheet(`<div class="sheet-post">${postHTML(p, { hideComments: true })}<h3>תגובות</h3>${all}
    <button class="btn danger wide" data-act="delPost" data-id="${p.id}">🔐 מחיקת הפוסט</button></div>`);
}

function sheetEditProfile() {
  openSheet(`<h2>עריכת פרופיל</h2>
    <label class="field">שם<input id="inName" maxlength="20" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(state.profile.name)}"></label>
    <div class="avatars">${AVATARS.map(a =>
      `<button class="av ${a === state.profile.avatar ? 'on' : ''}" data-act="avatar" data-a="${a}">${a}</button>`).join('')}</div>
    <button class="btn primary wide" data-act="saveProfile">שמירה</button>`);
}

// Parent gate: a multiplication question a 5-year-old can't answer
let gate = 0, gateNext = null;
function sheetParentGate(next) {
  const a = 3 + rand(7), b = 3 + rand(7);
  gate = a * b; gateNext = next;
  openSheet(`<h2>להורים בלבד 🔐</h2>
    <p class="muted center">כמה זה ${a} × ${b}?</p>
    <form id="gateForm"><input id="inGate" class="gate" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" enterkeyhint="go">
    <button class="btn primary wide">כניסה</button></form>`);
  const g = $('#inGate');
  g.focus({ preventScroll: true });   // synchronous: iOS only shows the keyboard inside the tap
  $('#gateForm').onsubmit = e => {
    e.preventDefault();
    if (+g.value === gate) return gateNext && gateNext();
    sfx.oops(); g.value = ''; g.classList.add('shake');
    setTimeout(() => g.classList.remove('shake'), 500);
  };
}

// "Microsoft הילה Online (Natural) - Hebrew (Israel)" → "הילה Online (Natural)"
const voiceLabel = v => v.name.replace(/^Microsoft\s+/, '').replace(/\s*-\s*Hebrew.*$/, '');

function voicePicker() {
  if (!('speechSynthesis' in window)) return '';
  const vs = hebrewVoices().sort((a, b) => voiceRank(b) - voiceRank(a));
  const note = 'iPad: הגדרות › נגישות › תוכן מוקרא › קולות › עברית › Carmit (משופר) — להוריד ולבחור כאן';
  if (!vs.length) return `<div class="switch-row"><div><div>קול עברי</div><div class="muted small">לא נמצא קול עברי. ${note}</div></div></div>`;
  return `<div class="switch-row"><div><div>קול עברי</div><div class="muted small">${note}</div></div>
    <div class="voice-pick"><select id="voiceSel">${vs.map(v => `<option value="${esc(v.name)}" ${heVoice && v.name === heVoice.name ? 'selected' : ''}>${esc(voiceLabel(v))}${voiceRank(v) >= 4 ? " ⭐" : ""}</option>`).join('')}</select>
    <button class="tool" data-say="שָׁלוֹם! בּוֹאוּ נִכְתֹּב אֶת הָאוֹת אָלֶף" aria-label="בדיקה">🔊</button></div></div>`;
}

function sheetSettings() {
  const sw = (key, label, note) => `
    <label class="switch-row"><div><div>${label}</div>${note ? `<div class="muted small">${note}</div>` : ''}</div>
    <input type="checkbox" class="switch" data-set="${key}" ${state.settings[key] ? 'checked' : ''}></label>`;
  const prog = LEVELS.map((L, l) => `<div class="prog-row"><span>${L.icon} ${L.name}</span>
    <span>${doneCount(l)}/${L.items.length} · ${L.items.reduce((a, _, i) => a + stars(l, i), 0)}⭐ · קושי ${DIFF_ICONS[Math.round(diff(L.id))]}</span></div>`).join('');
  const weak = LETTERS.filter(x => (state.progress.letters || {})[x.t] === 1 || state.fails['letters:' + x.t]).map(x => x.t).join(' ');
  openSheet(`<h2>הגדרות הורים</h2>
    ${sw('penOnly', 'כתיבה רק עם Apple Pencil', 'מונע סימונים מכף היד. נדלק אוטומטית כשהעט מזוהה.')}
    ${sw('unlockAll', 'פתיחת כל השלבים', 'בלי לחכות להתקדמות')}
    ${sw('voice', 'הקראה בקול', 'כל ההוראות נאמרות בקול')}
    ${voicePicker()}
    ${sw('sound', 'צלילים')}
    <h3>התקדמות</h3>${prog}
    ${weak ? `<div class="prog-row"><span>אותיות לתרגול</span><span class="weak">${weak}</span></div>` : ''}
    <p class="muted small">הקושי מותאם אוטומטית: הצלחה מעלה רמה (מדריך חלש יותר, אותיות קטנות יותר, בדיקה מדויקת יותר), טעות מורידה רמה ומראה שוב את סדר הקווים. כל 5 הצלחות פותחות משחק בונוס.</p>
    <button class="btn danger wide" data-act="reset">איפוס כל ההתקדמות</button>`);
}

function syncLike(p) {
  document.querySelectorAll(`.post[data-id="${p.id}"]`).forEach(a => {
    a.querySelector('.like')?.classList.toggle('on', p.liked);
    const cnt = a.querySelector('.like .cnt');
    if (cnt) cnt.textContent = p.likes + (p.liked ? 1 : 0);
  });
}

// ---------------- events ----------------

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act], [data-say], .tab');
  if (!t) return;
  if (t.classList.contains('tab')) {
    sfx.pop();
    const k = t.dataset.tab;
    if (k === 'create') { const n = nextLesson(); return n ? openStory(n.l, n.i) : openStory(-1); }
    if (k === 'draw') return openStory(-1);
    tab = k; render(); window.scrollTo(0, 0);
    return;
  }
  if (t.dataset.say) speak(t.dataset.say, +t.dataset.pitch || 1);
  const { act, id } = t.dataset;
  const l = +t.dataset.l, i = +t.dataset.i;
  switch (act) {
    case 'next': { const n = nextLesson(); n ? openStory(n.l, n.i) : openStory(-1); break; }
    case 'level': openLevel(l); break;
    case 'open': openStory(l, i); break;
    case 'free': openStory(-1); break;
    case 'bonus': openBonus(); break;
    case 'filter': exploreFilter = l; render(); break;
    case 'like': {
      const p = state.posts.find(x => x.id === id);
      if (!p) break;
      p.liked = !p.liked; save();
      if (p.liked) { sfx.pop(); const r = t.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, ['❤️'], 6); }
      syncLike(p); break;
    }
    case 'post': closeSheet(); sheetPost(id); break;
    case 'delPost':
      sheetParentGate(() => {
        const p = state.posts.find(x => x.id === id);
        state.posts = state.posts.filter(x => x.id !== id); save();
        if (p && !p.img.startsWith('data:')) ImageStore.del(p.img);
        closeSheet(); render();
      });
      break;
    case 'editProfile': sheetEditProfile(); break;
    case 'avatar':
      document.querySelectorAll('.av').forEach(b => b.classList.toggle('on', b === t)); break;
    case 'saveProfile':
      state.profile.name = ($('#inName').value.trim() || 'כוכב').slice(0, 20);
      state.profile.avatar = document.querySelector('.av.on')?.dataset.a || state.profile.avatar;
      save(); closeSheet(); render(); break;
    case 'parents': sheetParentGate(sheetSettings); break;
    case 'reset':
      if (confirm('למחוק את כל ההתקדמות והפוסטים?')) {
        state.posts.forEach(p => !p.img.startsWith('data:') && ImageStore.del(p.img));
        const { profile, settings } = state;
        state = defaultState(); state.profile = profile; state.settings = settings;
        save(); closeSheet(); render();
      }
      break;
  }
});

// double-tap a post to like it — Instagram style
let lastTap = { id: null, t: 0 };
document.addEventListener('pointerup', e => {
  const m = e.target.closest('[data-act="dbl"]');
  if (!m) return;
  const now = Date.now();
  if (lastTap.id === m.dataset.id && now - lastTap.t < 350) {
    const p = state.posts.find(x => x.id === m.dataset.id);
    if (p && !p.liked) { p.liked = true; save(); syncLike(p); }
    sfx.pop(); bigHeart(m);
    lastTap = { id: null, t: 0 };
  } else lastTap = { id: m.dataset.id, t: now };
});

document.addEventListener('change', e => {
  if (e.target.id === 'voiceSel') {
    state.settings.voiceName = e.target.value; save(); pickVoice();
    return speak('שָׁלוֹם! בּוֹאוּ נִכְתֹּב אֶת הָאוֹת אָלֶף');
  }
  const k = e.target.dataset.set;
  if (!k) return;
  state.settings[k] = e.target.checked; save();
  if (k === 'penOnly') { pad.penOnly = e.target.checked; pad.penLast = -1e9; }
  if (k === 'unlockAll') render();
});

$('#sheetBackdrop').addEventListener('click', closeSheet);
$('#btnActivity').addEventListener('click', sheetActivity);
$('#btnClose').addEventListener('click', closeStory);
$('#btnPrev').addEventListener('click', () => step(-1));
$('#btnNext').addEventListener('click', () => step(1));
$('#btnSpeak').addEventListener('click', sayPrompt);
$('#btnDemo').addEventListener('click', () => { pad.clear(); setupPad(); playDemo(); });
$('#btnUndo').addEventListener('click', () => pad.undo());
$('#btnClear').addEventListener('click', () => pad.clear());
$('#btnDone').addEventListener('click', finish);
$('#btnRetry').addEventListener('click', () => {
  $('#result').classList.add('hidden');
  if (!cur) return;
  if (cur.free) return openStory(-1);
  openStory(cur.l, cur.i, cur.page && !cur.pages[cur.page] ? cur.page : 0);
});
$('#btnResultNext').addEventListener('click', () => {
  $('#result').classList.add('hidden');
  if (!cur || cur.free) return closeStory();
  step(1);
});
$('#btnBonus').addEventListener('click', () => { closeStory(); openBonus(); });

$('#colors').innerHTML = INK_COLORS.map((c, k) =>
  `<button class="color ${k ? '' : 'on'}" style="background:${c}" data-c="${c}" aria-label="צבע"></button>`).join('');
$('#colors').addEventListener('click', e => {
  const b = e.target.closest('.color');
  if (!b) return;
  pad.setColor(b.dataset.c);
  document.querySelectorAll('.color').forEach(x => x.classList.toggle('on', x === b));
});

// Rotation / Split View: re-lay out an untouched page, otherwise just rescale it
let paperSize = '';
new ResizeObserver(() => {
  const p = $('#paper'), size = `${p.clientWidth}x${p.clientHeight}`;
  if (size === paperSize) return;
  paperSize = size;
  if (cur && storyReady && pad.isEmpty() && !demo) setupPad(); else pad.fit();
}).observe($('#paper'));
document.addEventListener('gesturestart', e => e.preventDefault());

navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
