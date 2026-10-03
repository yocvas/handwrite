# כותבים ✏️

> **בקצרה:** משחק לימוד כתיבה בעברית לילדים בעיצוב של אינסטגרם, ל־iPad עם Apple Pencil.
> כותבים על גבי אותיות אפורות (אותיות ← מילים ← משפטים ← פסקאות), עם בדיקת סדר וכיוון קווים,
> קושי שמתאים את עצמו לילד/ה, משחקי בונוס, ופיד עם לייקים ותגובות מחברים־חיות. עובד אופליין, בלי חשבון ובלי שרת.

A static, no-build PWA: serve the folder with any static web server and it runs. Built for a 5-year-old
on an iPad with Apple Pencil; this README is for the parent setting it up from Windows.

---

## Features

- **4 levels**, unlocked in order: letters (27 incl. finals) → words (24) → sentences (14) → paragraphs (10).
  A level opens once **half** the items of the previous one have at least one star.
- **Letters by shape family** (`LETTER_ORDER` in `js/data.js`): straight lines (ו י ז ן) → roof + leg → base/arc →
  closed shapes → complex; each final form comes right after its base letter.
- **Tracing guide**: grey dashed text on notebook lines. Scoring (0-3 ★) compares ink with the guide glyphs
  (*coverage* of the letters and *precision* of the ink).
- **Stroke order (letters level)**, using per-letter stroke paths in `js/strokes.js`:
  - A **▶️ demo** animates the strokes the first time a letter is seen and again after a miss.
  - **Live coaching** on every pencil lift: if a stroke is reversed, out of order or started in the wrong place,
    that stroke pulses with a green start dot and a spoken hint plays (once per stroke).
  - **Final check** on "סיימתי": wrong order/direction/start or a missing stroke ⇒ **0 ★ "כמעט! 🌱"** with a
    specific spoken hint, and the problem stroke is highlighted on the retry.
- **Adaptive difficulty** per level, 0-4 shown as 🌱🌿🌳🚀👑 (starts at 🌿). 2-3 ★ → +0.5, 0 ★ → −1. It controls guide
  opacity, letter size, scoring leniency, stroke-check strictness and the green start dots (shown below 🚀).
  At 🚀 and above, "next" skips items already at 3 ★; below 🌿, the "+" lesson first reviews shaky 1 ★ items.
  After **2 misses** on the same item: stronger guide and gentler scoring. After **3**, "skip" becomes the main button.
- **Smart "+" (next lesson):** alternates letters and words, and offers words whose letters were all learned first.
- **Paragraphs** are written **one sentence per page**; the pages are stacked into a single post.
- **Bonus mini-games** every **5 successful lessons** (🎁 ring in the stories bar shows 0/5, plus a button on the
  result screen). Full-screen Reels style, alternating 🎣 fishing and 🦋 butterfly catching (with a net, no weapons).
  Targets are the child's learned letters/words (easy letters fill in at the start), spoken aloud. The games have their
  own adaptive difficulty (`state.adapt.game`), and a card is posted to the feed.
- **Instagram-style UI:** stories bar, feed of the child's own writing, likes (double-tap too), comments from 8 animal
  friends (tap a comment to hear it), activity sheet, explore grid with level filters, profile with posts and stars.
  Likes/comments **praise effort**: they do not scale with the score.
- **Free drawing**, 6 ink colours, undo/clear, pressure-sensitive ink, Hebrew voice for every prompt and toast.
- **Palm rejection:** for 30 s after any Apple Pencil input, finger touches on the paper are ignored.
- **Parent area** behind a math question. **Offline** via service worker.

---

## Run locally on Windows

There is no build step. Any static file server pointed at the project folder works.

**Option A - Node.js installed (`node -v`):**

```powershell
cd "C:\Users\16022505\dev\writing game"
npx serve -l 8080 .
```

`serve` listens on all interfaces and prints a `Local` and a `Network` URL.

**Option B - PowerShell only, no installs.** Paste this into PowerShell, opened in the project folder:

```powershell
$root=(Get-Location).Path; $port=8080
$mime=@{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.png'='image/png';'.webmanifest'='application/manifest+json';'.json'='application/json'}
$l=New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$port/"); $l.Start(); "http://localhost:$port/"
while($l.IsListening){ $c=$l.GetContext(); $p=[Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if(!$p){$p='index.html'}
  $f=Join-Path $root $p; if(Test-Path $f -PathType Leaf){ $b=[IO.File]::ReadAllBytes($f); $t=$mime[[IO.Path]::GetExtension($f)]; if($t){$c.Response.ContentType=$t}
  $c.Response.OutputStream.Write($b,0,$b.Length)} else {$c.Response.StatusCode=404}; $c.Response.Close() }
```

To stop it, press Ctrl+C (it may only stop after the next request) or close the window. For iPad access, change the
prefix to `http://+:8080/`. That needs an **elevated** PowerShell, or a one-time
`netsh http add urlacl url=http://+:8080/ user=Everyone` run as admin.

**Option C - VS Code:** install the *Live Server* extension, then right-click `index.html` › *Open with Live Server*.
For LAN access, set `"liveServer.settings.host": "0.0.0.0"`.

### Opening it on the iPad over Wi-Fi

1. Find the PC's IP with `ipconfig` › *IPv4 Address*, e.g. `192.168.1.23`.
2. Open the port in the firewall (admin PowerShell, once):
   `New-NetFirewallRule -DisplayName "kotvim dev" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow`
3. On the iPad, open Safari and go to `http://192.168.1.23:8080`.

**Limitation:** the app only registers its service worker on **HTTPS or `localhost`**. Over plain
`http://192.168.x.x` everything works while the PC is reachable, but **offline mode is off** and fonts need internet.
Saved data belongs to the *origin* (the exact address), so progress made at the LAN address does **not** carry over
to the hosted HTTPS address. Use LAN for testing only and host on HTTPS for real use.

---

## Free HTTPS hosting (recommended)

**Don't publish dev files:** delete `_test.html`, `_sim.js`, `_shot.sh` (or any other `_*` file) if they exist, and
leave out `tests/` (a scoring calibration harness that's only for development). For git, create a `.gitignore` containing:

```
_*
tests/
```

### GitHub Pages (with `gh` CLI)

Free Pages needs a **public** repo. The app contains no secrets.

```powershell
winget install --id GitHub.cli        # once (git too: winget install Git.Git)
gh auth login                         # once
cd "C:\Users\16022505\dev\writing game"
git init; git add .; git commit -m "kotvim"; git branch -M main
gh repo create kotvim --public --source . --push
gh api -X POST "repos/{owner}/kotvim/pages" -f "source[branch]=main" -f "source[path]=/"
```

After about a minute it's live at `https://<username>.github.io/kotvim/`
(`gh api repos/{owner}/kotvim/pages --jq .html_url`). All paths are relative, so the sub-folder works.
To publish an update: `git add .; git commit -m "update"; git push`.
Without the CLI: create a repo on github.com, upload the files, then go to *Settings › Pages › Deploy from a branch › main / (root)*.

### Netlify Drop (no git)

Open <https://app.netlify.com/drop> and drag the project folder onto it (without the dev files). You get an
`https://<random>.netlify.app` URL right away. Sign up for a free account to keep the site and drag in updates later.

### Updates and the service worker

`sw.js` precaches the app shell into cache **`kotvim-v2`**. App files are **network-first with a 3 s timeout**: on slow
Wi-Fi or offline it falls back to the cache, so the child never gets a white screen. Google Fonts are cache-first.
**On every deploy, bump `CACHE`** (`kotvim-v2` → `kotvim-v3`) so the shell is precached fresh and old caches are deleted.
If you add a JS/CSS file, add it to `SHELL` as well.

---

## iPad setup

**Install as an app:** open the HTTPS URL in **Safari** › *Share* › **Add to Home Screen**. It opens full-screen and
works offline after the first online launch. The Home Screen app has storage **separate** from Safari tabs, so the
child should always use the icon.

**Hebrew voice:** go to *Settings › Accessibility › Spoken Content › Voices › Hebrew* and download a voice (e.g. Carmit).
All prompts, hints and praise are spoken, so this matters: the child can't read the toasts yet.

**Apple Pencil tips:**
- Turn off **Scribble** (*Settings › Apple Pencil › Scribble*). Otherwise iPadOS may turn strokes into text or swallow them.
- Palm rejection is automatic once the Pencil is used. To always ignore fingers on the paper, turn on
  *"כתיבה רק עם Apple Pencil"* in parent settings. Leave it off if the child writes with a finger.
- *Guided Access* (*Settings › Accessibility*, then triple-click the side button) locks the iPad to the app.

---

## Parent settings and the math gate

Go to *Profile › "הורים ⚙️"* and answer a random multiplication (`a × b`, each between 3 and 9). The same gate also protects
**deleting a post** (post sheet › "🔐 מחיקת הפוסט").

| Setting | Effect |
|---|---|
| כתיבה רק עם Apple Pencil (`penOnly`) | Ignore all finger touches on the paper |
| פתיחת כל השלבים (`unlockAll`) | All levels open without earning stars |
| הקראה בקול (`voice`) | Spoken prompts, hints and praise |
| צלילים (`sound`) | Sound effects |

The sheet also shows each level's progress, stars and current difficulty icon, plus **"אותיות לתרגול"** (letters with
1 ★ or recent misses). **"איפוס כל ההתקדמות"** deletes progress, difficulty and all posts, and keeps the name/avatar
and settings. The child can change name and avatar under *עריכת פרופיל*.

---

## Adding or changing content (`js/data.js`)

```js
// LETTERS: t = glyph, say = vocalized name (TTS), word / wordSay = example ("כמו אריה"), emoji
{ t: 'א', say: 'אָלֶף', word: 'אריה', wordSay: 'אַרְיֵה', emoji: '🦁' }
// WORDS / SENTENCES / PARAGRAPHS: t = unvocalized text to trace, say = vocalized text for the voice
{ t: 'החתול ישן', say: 'הֶחָתוּל יָשֵׁן', emoji: '🐱' }
// LEVELS: guide = base tracing opacity, font = max share of paper height per line (adaptive difficulty scales both)
{ id: 'words', name: 'מילים', icon: '🐶', items: WORDS, guide: 0.24, font: 0.42, grad: ['#fa7e1e', '#d62976'] }
```

- **Adding, removing and reordering items is safe.** Progress is stored by level `id` + item **text** (`t`), not by
  position. Changing an item's `t` or a level's `id` starts that item or level from zero.
- Letter order comes from the `LETTER_ORDER` string, not from the array order. A new letter must also be added there.
- The stroke-order demo and checks only apply to letters that have paths in `LETTER_STROKES` (`js/strokes.js`):
  each letter is a list of strokes, and each stroke is a polyline in a 0..1 box (x right, y down). Letters without
  paths are scored on tracing only.
- Paragraphs are split into pages at `.` `!` `?`. Keep the same sentence count in `t` and `say`, and keep each sentence
  short (about 22 characters or less) so it fits one line.
- Keep text gender-neutral (past tense 1st person or 3rd person), as the existing content does.
- `FRIENDS` (commenters): saved posts reference them **by index**, so add new ones only at the end.
  `COMMENTS` are grouped by star tier. `AVATARS` and `INK_COLORS` are simple lists.
- A 5th level would need changes in `js/app.js` too (explore chips and the letter/paragraph logic assume levels 0-3).

---

## Progress and storage

- **localStorage** key **`kotvim-state-v2`** holds only small JSON: profile, settings, best stars per item,
  difficulty, miss counts, demo-seen letters, bonus counter and post metadata. Data saved under the old
  `kotvim-state-v1` key is not migrated.
- **Post images** are JPEG blobs in **IndexedDB** (database `kotvim-images`, see `js/store.js`), referenced by post id.
  If IndexedDB isn't available, an image is stored inline as a smaller data URL instead.
- The app calls `navigator.storage.persist()` to ask the browser not to evict its data. Installing to the Home Screen
  also protects it from Safari's cleanup of sites that haven't been used for a while.
- There's no cloud sync or export. Data is per device, per address. Deleting the Home Screen app or clearing Safari
  website data erases it.
- To start fresh on a desktop: DevTools › Application › clear Local Storage and IndexedDB for the site.

---

## File structure

```
index.html            Shell: top bar, feed, tab bar, writing "story" screen, result card, bottom sheet
styles.css            All styling (Instagram look, RTL, iPad layout)
manifest.webmanifest  PWA name, icons, standalone display
sw.js                 Service worker (cache kotvim-v2): precache, network-first with 3 s fallback, fonts cache-first
icons/                App icons (192, 512, apple-touch-icon)
js/data.js            Content: letters (+ LETTER_ORDER), words, sentences, paragraphs, levels, friends, comments
js/store.js           ImageStore: post images in IndexedDB
js/pad.js             WritingPad: guide layout, Pencil input and palm rejection, ink, scoring, snapshot
js/strokes.js         Letter stroke paths, ▶️ demo, start dots, highlight, checkStrokeOrder()
js/minigame.js        Bonus games: MiniGame.open({ mode: 'fishing'|'hunting', letters, words, letterSay,
                      difficulty, speak, sfx, burst, onDone }) → onDone({ hits, misses, difficulty, ... })
js/app.js             State, adaptive learning, views, writing flow, posts, bonus, parent gate, TTS
tests/                Dev-only scoring calibration page (don't deploy)
```

The scripts are loaded as plain `<script>` tags in the order data → store → pad → strokes → minigame → app.
There are no modules and no dependencies.

---

## Privacy

There are no analytics, accounts, backend or uploads. The only network requests go to **Google Fonts** (Varela Round, Rubik,
Playpen Sans Hebrew from `fonts.googleapis.com` / `fonts.gstatic.com`), and the service worker caches them after the
first load. The friends, likes and comments are generated locally. All writing stays on the device (localStorage +
IndexedDB). Speech uses the iPad's built-in voices.
