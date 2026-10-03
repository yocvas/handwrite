// MiniGame — bonus "Reel" mini-games earned after 5 writing lessons.
//   🎣 דיג          – fish carrying letters/words swim at different depths; tap (or drag the hook to)
//                     the right fish → the line drops, hooks it and reels it into the bucket.
//   🦋 ציד פרפרים   – butterflies / ladybugs / bees flutter with letter/word signs; tap (or sweep the
//                     net across) the right one → net swoosh, it goes into the jar.
// Content is letters or words (the target is spoken; words also show the emoji as a clue).
// Adaptive difficulty 0..4: hit +0.5, miss −1 → creature count (2→5), speed, look-alike
// distractors and whether the target is shown faded at the top.
//
// MiniGame.open({ letters, words, letterSay, difficulty, mode, content, speak, sfx, burst, onDone })
// MiniGame.close()   MiniGame.isOpen()
// onDone({ hits, misses, difficulty, mode, content }) fires once when the overlay closes.
// Self-contained: injects its own <style id="mg-style">; plain globals, no modules.

(function () {
  'use strict';

  const TARGETS = 8;        // creatures to catch per round
  const ROUND_S = 45;       // after this, the round ends on the next catch
  const CAP_S = 80;         // hard cap: end the round anyway (always celebrated)
  const IDLE_S = 9;         // re-say the prompt after this much idle time
  const LS_KEY = 'kotvim-mg-last';

  const SIMILAR = [['ב', 'כ', 'פ'], ['ד', 'ר', 'ך'], ['ה', 'ח', 'ת'], ['ו', 'ז', 'ן'], ['ס', 'ם', 'ט'], ['ע', 'צ'], ['ג', 'נ']];
  const EASY = ['א', 'ב', 'ל', 'מ', 'ש', 'ד', 'ר', 'ת', 'ס', 'י', 'ק', 'ע'];
  const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  // [main, dark, text]
  const PAL = [
    ['#ff6b9a', '#d93a72', '#fff'], ['#ffc531', '#e08a00', '#3b2600'], ['#3fd47e', '#1d9a55', '#fff'],
    ['#4fb3ff', '#1f6fe0', '#fff'], ['#b07cff', '#7a3fe0', '#fff'], ['#ff8a3d', '#d9561a', '#fff'],
    ['#2fd6c6', '#109488', '#063b36'],
  ];
  const PRAISE = ['יוֹפִי!', 'כָּל הַכָּבוֹד!', 'מְצֻיָּן!', 'וָאוּ!', 'נֶהְדָּר!', 'בּוּל!'];
  const BUGS = ['🦋', '🦋', '🐞', '🐝'];
  const HAUL_FISH = ['🐟', '🐠', '🐡'];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lerp = (a, b, p) => a + (b - a) * p;
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let G = null;

  // ------------------------------------------------------------------ CSS

  const CSS = `
.mg{position:fixed;inset:0;z-index:85;overflow:hidden;direction:rtl;color:#fff;background:#0b2f6e;
 font-family:"Varela Round","Arial Hebrew",-apple-system,system-ui,sans-serif;font-size:18px;
 touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
 animation:mg-in .35s ease-out;--ig:linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5 100%)}
.mg *{box-sizing:border-box}
.mg svg{fill:initial;stroke:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter}
.mg :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.mg-probe{position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}
.mg-scene,.mg-field,.mg-tools,.mg-fxl{position:absolute;inset:0;pointer-events:none}
.mg-scene{overflow:hidden}
.mg-fxl{z-index:6}

/* ---- underwater scene ---- */
.mg-sky{position:absolute;left:0;right:0;top:0;height:calc(var(--S) + 4px);
 background:linear-gradient(180deg,#ffb36b 0%,#ff8f7a 45%,#ffc98f 100%)}
.mg-sun{position:absolute;width:120px;height:120px;border-radius:50%;left:9%;top:calc(var(--S) - 74px);
 background:radial-gradient(circle,#fff6c9 0 45%,#ffe07a 60%,rgba(255,224,122,0) 72%)}
.mg-water{position:absolute;left:0;right:0;bottom:0;top:var(--S);
 background:linear-gradient(180deg,#2bc6e6 0%,#1592d6 28%,#0d5fb0 62%,#083b80 100%)}
.mg-ray{position:absolute;top:0;width:90px;height:75%;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0));
 transform-origin:top center;filter:blur(2px);animation:mg-ray 7s ease-in-out infinite alternate}
.mg-bub{position:absolute;bottom:-20px;border-radius:50%;border:2px solid rgba(255,255,255,.55);
 background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.7) 0 18%,rgba(255,255,255,.08) 30%);animation:mg-bub linear infinite}
.mg-weed{position:absolute;bottom:40px;width:44px;transform-origin:50% 100%;animation:mg-sway 3.2s ease-in-out infinite alternate}
.mg-sand{position:absolute;left:0;right:0;bottom:0;height:96px;width:100%}
.mg-shell{position:absolute;bottom:14px;font-size:30px}
.mg-wave{position:absolute;left:-100%;top:calc(var(--S) - 12px);width:200%;height:24px;animation:mg-wave 6s linear infinite}

/* ---- meadow scene ---- */
.mg-msky{position:absolute;inset:0;background:linear-gradient(180deg,#58b8ff 0%,#9ad7ff 40%,#d9f3ff 70%)}
.mg-msun{position:absolute;right:6%;top:calc(var(--st) + 100px);width:120px;height:120px;border-radius:50%;
 background:radial-gradient(circle,#fff7b0 0 40%,#ffd84a 56%,rgba(255,216,74,.35) 64%,rgba(255,216,74,0) 74%);animation:mg-pulse 3s ease-in-out infinite}
.mg-cloud{position:absolute;width:150px;height:46px;border-radius:30px;background:rgba(255,255,255,.92);animation:mg-cloud linear infinite}
.mg-cloud::before,.mg-cloud::after{content:"";position:absolute;background:inherit;border-radius:50%}
.mg-cloud::before{width:66px;height:66px;left:22px;top:-32px}.mg-cloud::after{width:50px;height:50px;left:72px;top:-22px}
.mg-hills{position:absolute;left:0;right:0;bottom:0;width:100%;height:46%}
.mg-flower{position:absolute;transform-origin:50% 100%;animation:mg-sway 2.6s ease-in-out infinite alternate}

.mg-scrim-t{position:absolute;left:0;right:0;top:0;height:150px;background:linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,0))}
.mg-scrim-b{position:absolute;left:0;right:0;bottom:0;height:230px;background:linear-gradient(0deg,rgba(0,0,0,.5),rgba(0,0,0,0))}

/* ---- creatures ---- */
.mg-c{position:absolute;left:0;top:0;will-change:transform;transform-origin:50% 50%}
.mg-wig{position:relative;width:100%;height:100%}
.mg-c.mg-new .mg-wig{animation:mg-pop-in .5s cubic-bezier(.2,1.5,.4,1) both}
.mg-c.mg-wob .mg-wig{animation:mg-wob .45s ease-in-out}
.mg-c.mg-out{transition:opacity .35s;opacity:0}
.mg-c.mg-glow::before{content:"";position:absolute;inset:-26px;border-radius:50%;z-index:-1;
 background:radial-gradient(circle,rgba(255,250,170,.95) 0,rgba(255,230,90,.55) 45%,rgba(255,230,90,0) 70%);animation:mg-pulse 1s ease-in-out infinite}
.mg-fsvg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 6px 8px rgba(0,20,60,.35))}
.mg-fish.mg-l .mg-fsvg{transform:scaleX(-1)}
.mg-tail{transform-box:view-box;transform-origin:46px 60px;animation:mg-wag .38s ease-in-out infinite alternate}
.mg-c.mg-hooked .mg-tail{animation-duration:.12s}
.mg-flab{position:absolute;top:14%;bottom:12%;left:24%;right:22%;display:flex;align-items:center;justify-content:center;
 color:var(--t);line-height:1;white-space:nowrap;text-shadow:0 2px 0 rgba(0,0,0,.18)}
.mg-fish.mg-l .mg-flab{left:22%;right:24%}
.mg-bug .mg-crit{position:absolute;left:0;right:0;top:0;text-align:center;line-height:1;z-index:2;
 filter:drop-shadow(0 4px 4px rgba(0,0,0,.25));animation:mg-flap .2s ease-in-out infinite alternate}
.mg-bug .mg-crit.mg-buzz{animation:mg-buzz .14s ease-in-out infinite alternate}
.mg-card{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;
 border:5px solid transparent;border-radius:28px;color:#262626;line-height:1;white-space:nowrap;
 background:linear-gradient(#fff,#fff) padding-box,var(--ig) border-box;box-shadow:0 8px 18px rgba(0,40,80,.28);
 transform-origin:50% 0;animation:mg-swing 1.5s ease-in-out infinite alternate}

/* ---- boat, line & hook ---- */
.mg-svgfx{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.mg-boat{position:absolute;left:0;top:0;width:220px;height:140px;will-change:transform;transform-origin:50% 85%}
.mg-boat svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.mg-capt{position:absolute;left:84px;top:24px;font-size:56px;line-height:1}
.mg-bucket{position:absolute;left:150px;top:40px;width:58px;height:54px}
.mg-bucket svg{width:100%;height:100%}
.mg-count{position:absolute;top:-18px;right:-16px;min-width:38px;height:38px;padding:0 8px;border-radius:19px;display:flex;align-items:center;justify-content:center;
 background:var(--ig);color:#fff;font-size:22px;font-weight:bold;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3)}
.mg-bump{animation:mg-bump .45s ease-out}

/* ---- net & jar ---- */
.mg-net{position:absolute;left:0;top:0;width:150px;height:190px;opacity:0;transition:opacity .2s;transform-origin:55px 52px;will-change:transform}
.mg-net.mg-on{opacity:1}
.mg-net svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 6px 8px rgba(0,0,0,.25))}
.mg-jar{position:absolute;left:16px;top:calc(var(--st) + 84px);width:100px;height:124px;z-index:4;pointer-events:none}
.mg-jar-lid{position:absolute;left:14px;right:14px;top:0;height:20px;border-radius:8px;background:var(--ig);box-shadow:0 3px 6px rgba(0,0,0,.25)}
.mg-jar-glass{position:absolute;left:4px;right:4px;top:16px;bottom:0;border-radius:20px 20px 28px 28px;
 background:linear-gradient(90deg,rgba(255,255,255,.55),rgba(255,255,255,.18) 30%,rgba(255,255,255,.12) 70%,rgba(255,255,255,.4));
 border:3px solid rgba(255,255,255,.9);box-shadow:0 6px 14px rgba(0,60,120,.25);overflow:hidden;
 display:flex;flex-wrap:wrap-reverse;align-content:flex-start;justify-content:center;padding:6px 4px;gap:0 2px}
.mg-jar-glass span{font-size:21px;line-height:1.15;animation:mg-pop-in .4s cubic-bezier(.2,1.6,.4,1) both}
.mg-jar .mg-count{top:auto;bottom:-12px;left:-12px;right:auto}

/* ---- Reel chrome ---- */
.mg-top{position:absolute;z-index:4;top:calc(var(--st) + 12px);left:14px;right:18px;display:flex;align-items:flex-start;justify-content:space-between;pointer-events:none}
.mg-title{display:flex;flex-direction:column;gap:2px;text-shadow:0 2px 8px rgba(0,0,0,.45)}
.mg-title b{font-size:32px;line-height:1.1}
.mg-title span{font-size:20px;opacity:.95}
.mg-x{pointer-events:auto;width:64px;height:64px;border-radius:50%;font-size:30px;line-height:1;display:flex;align-items:center;justify-content:center;
 background:rgba(0,0,0,.28);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:2px solid rgba(255,255,255,.35)}
.mg-x:active,.mg-say:active,.mg-btn:active{transform:scale(.92)}
.mg-prompt{position:absolute;z-index:4;left:50%;top:calc(var(--st) + 74px);transform:translateX(-50%);
 display:flex;align-items:center;gap:16px;padding:10px 12px 10px 18px;border-radius:30px;pointer-events:none;
 background:rgba(20,10,40,.34);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1.5px solid rgba(255,255,255,.3);
 box-shadow:0 8px 24px rgba(0,0,0,.18)}
.mg-clue{display:flex;align-items:center;gap:14px;min-height:96px}
.mg-clue:empty{display:none}
.mg-pic{font-size:84px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.3));animation:mg-pop-in .45s cubic-bezier(.2,1.6,.4,1) both}
.mg-ghost{font-size:78px;line-height:1;color:rgba(255,255,255,.62);text-shadow:0 2px 10px rgba(0,0,0,.25);min-width:70px;text-align:center;animation:mg-fade-in .5s both}
.mg-words .mg-ghost{font-size:58px}
.mg-ear{font-size:64px;line-height:1;animation:mg-pulse 1.6s ease-in-out infinite}
.mg-say{pointer-events:auto;width:96px;height:96px;border-radius:50%;font-size:46px;line-height:1;display:flex;align-items:center;justify-content:center;
 background:var(--ig);border:4px solid #fff;box-shadow:0 6px 16px rgba(0,0,0,.3)}
.mg-say.mg-call{animation:mg-call .9s ease-in-out 3}
.mg-side{position:absolute;z-index:4;left:10px;bottom:calc(var(--sb) + 22px);display:flex;flex-direction:column;align-items:center;gap:14px;pointer-events:none}
.mg-ic{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:42px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45))}
.mg-ic b{font-size:17px;color:#fff}
.mg-ic.mg-bump{animation:mg-bump .45s ease-out}
.mg-disc{width:46px;height:46px;border-radius:12px;border:3px solid #fff;background:var(--ig);display:flex;align-items:center;justify-content:center;
 font-size:24px;animation:mg-spin 4s linear infinite;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.mg-fh{position:absolute;font-size:34px;pointer-events:none;animation:mg-heartup 1.5s ease-out forwards}
.mg-cap{position:absolute;z-index:4;right:16px;left:96px;bottom:calc(var(--sb) + 24px);pointer-events:none;text-shadow:0 1px 6px rgba(0,0,0,.5)}
.mg-who{display:flex;align-items:center;gap:10px}
.mg-ava{width:54px;height:54px;border-radius:50%;padding:3px;background:var(--ig);flex-shrink:0}
.mg-ava i{display:flex;width:100%;height:100%;border-radius:50%;border:3px solid #fff;background:#fff;align-items:center;justify-content:center;font-style:normal;font-size:26px;text-shadow:none}
.mg-name{font-size:20px;font-weight:bold}
.mg-follow{border:1.5px solid rgba(255,255,255,.85);border-radius:10px;padding:3px 12px;font-size:16px}
.mg-text{font-size:20px;margin:8px 0 8px}
.mg-tick{display:inline-block;max-width:280px;width:62%;overflow:hidden;white-space:nowrap;border-radius:14px;background:rgba(0,0,0,.25);padding:4px 0;font-size:16px}
.mg-tick-in{display:inline-block;animation:mg-tick 9s linear infinite}
.mg-tick-in span{padding:0 18px}
.mg-bar{position:absolute;z-index:4;left:0;right:0;bottom:0;height:6px;background:rgba(255,255,255,.28)}
.mg-bar i{position:absolute;right:0;top:0;bottom:0;width:0;background:var(--ig);transition:width .5s ease}
.mg-ripple{position:absolute;width:30px;height:12px;border-radius:50%;border:3px solid rgba(255,255,255,.85);transform:translate(-50%,-50%);animation:mg-ripple .7s ease-out forwards;pointer-events:none}
.mg-pt{position:absolute;pointer-events:none;transform:translate(-50%,-50%);animation:mg-fly 1.2s cubic-bezier(.2,.7,.3,1) forwards}

/* ---- end screen ---- */
.mg-end{position:absolute;inset:0;z-index:7;display:flex;align-items:center;justify-content:center;
 background:rgba(15,6,35,.5);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:mg-fade-in .35s both}
.mg-endcard{width:min(540px,90vw);padding:26px 26px 28px;border-radius:34px;background:#fff;color:#262626;text-align:center;
 box-shadow:0 20px 60px rgba(0,0,0,.4);animation:mg-pop-in .55s cubic-bezier(.2,1.4,.4,1) both;position:relative;overflow:hidden}
.mg-endcard::before{content:"";position:absolute;left:0;right:0;top:0;height:8px;background:var(--ig)}
.mg-end-emo{font-size:72px;line-height:1.1}
.mg-end-title{font-size:42px;margin:4px 0 6px;font-weight:bold;background:var(--ig);-webkit-background-clip:text;background-clip:text;color:transparent}
.mg-stars{font-size:58px;line-height:1.1;letter-spacing:4px}
.mg-stars span{display:inline-block;animation:mg-star .6s cubic-bezier(.2,1.6,.4,1) both}
.mg-stars span.mg-dim{filter:grayscale(1);opacity:.25}
.mg-haul{font-size:34px;line-height:1.3;margin:8px 0 2px;direction:ltr}
.mg-haul span{display:inline-block;animation:mg-pop-in .4s both}
.mg-likes-end{font-size:30px;margin:4px 0 16px}
.mg-end-btns{display:flex;gap:16px;justify-content:center}
.mg-btn{min-width:150px;min-height:120px;border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
 font-size:24px;box-shadow:0 6px 16px rgba(0,0,0,.18)}
.mg-btn i{font-style:normal;font-size:52px;line-height:1}
.mg-btn.mg-pri{background:var(--ig);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.25)}
.mg-btn.mg-sec{background:#efeff4;color:#262626}

@keyframes mg-in{from{opacity:0;transform:scale(1.04)}}
@keyframes mg-fade-in{from{opacity:0}}
@keyframes mg-pop-in{0%{transform:scale(.2);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes mg-wob{0%,100%{transform:rotate(0)}20%{transform:rotate(-16deg) translateX(-8px)}40%{transform:rotate(13deg) translateX(8px)}60%{transform:rotate(-9deg)}80%{transform:rotate(5deg)}}
@keyframes mg-wag{from{transform:scaleY(.82) rotate(-10deg)}to{transform:scaleY(1.05) rotate(10deg)}}
@keyframes mg-flap{from{transform:scaleX(1)}to{transform:scaleX(.5)}}
@keyframes mg-buzz{from{transform:rotate(-8deg) translateY(-2px)}to{transform:rotate(8deg) translateY(2px)}}
@keyframes mg-swing{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes mg-sway{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
@keyframes mg-bub{from{transform:translate(0,0)}50%{transform:translate(14px,-55vh)}to{transform:translate(-8px,-110vh);opacity:.2}}
@keyframes mg-ray{from{transform:skewX(-14deg);opacity:.6}to{transform:skewX(10deg);opacity:1}}
@keyframes mg-wave{to{transform:translateX(50%)}}
@keyframes mg-cloud{from{transform:translateX(-30vw)}to{transform:translateX(130vw)}}
@keyframes mg-pulse{50%{transform:scale(1.08);opacity:.85}}
@keyframes mg-call{50%{transform:scale(1.14);box-shadow:0 0 0 14px rgba(255,255,255,.35)}}
@keyframes mg-bump{40%{transform:scale(1.35)}}
@keyframes mg-spin{to{transform:rotate(360deg)}}
@keyframes mg-tick{from{transform:translateX(0)}to{transform:translateX(50%)}}
@keyframes mg-heartup{0%{transform:translate(0,0) scale(.4);opacity:0}15%{opacity:1;transform:translate(0,-20px) scale(1.1)}100%{transform:translate(var(--hx),-260px) scale(.8);opacity:0}}
@keyframes mg-ripple{to{width:200px;height:50px;opacity:0}}
@keyframes mg-fly{to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.6);opacity:0}}
@keyframes mg-star{0%{transform:scale(0) rotate(-40deg)}70%{transform:scale(1.3) rotate(10deg)}100%{transform:scale(1)}}
@media (max-height:700px){.mg-say{width:84px;height:84px;font-size:40px}.mg-pic{font-size:70px}.mg-ghost{font-size:64px}.mg-clue{min-height:84px}}
`;

  function injectCss() {
    if (document.getElementById('mg-style')) return;
    const s = document.createElement('style');
    s.id = 'mg-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------------ scene markup

  function fishSceneHTML() {
    let h = '<div class="mg-sky"></div><div class="mg-sun"></div><div class="mg-water">';
    [12, 34, 58, 80].forEach((x, i) => { h += `<div class="mg-ray" style="left:${x}%;animation-delay:${-i * 1.7}s"></div>`; });
    for (let i = 0; i < 14; i++) {
      const s = rnd(8, 22);
      h += `<div class="mg-bub" style="left:${rnd(2, 96).toFixed(1)}%;width:${s}px;height:${s}px;animation-duration:${rnd(6, 12).toFixed(1)}s;animation-delay:${-rnd(0, 12).toFixed(1)}s"></div>`;
    }
    const weeds = [[4, 150, '#29b56a'], [11, 100, '#3fd47e'], [27, 120, '#1f9d55'], [70, 140, '#29b56a'], [86, 110, '#3fd47e'], [94, 170, '#1f9d55']];
    weeds.forEach(([x, hh, c], i) => {
      h += `<svg class="mg-weed" style="left:${x}%;height:${hh}px;animation-delay:${-i * .7}s" viewBox="0 0 44 200" preserveAspectRatio="none">
        <path d="M22 200 C4 160 40 130 22 100 S4 40 22 4" stroke="${c}" stroke-width="13" fill="none" stroke-linecap="round"/>
        <path d="M22 150 C34 140 40 128 38 118 M22 90 C8 82 4 70 6 60" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/></svg>`;
    });
    h += `<svg class="mg-sand" viewBox="0 0 1000 96" preserveAspectRatio="none">
      <path d="M0 40 Q120 10 250 34 T520 30 T780 38 T1000 26 V96 H0Z" fill="#f2d38b"/>
      <path d="M0 62 Q160 44 330 60 T680 58 T1000 52 V96 H0Z" fill="#e6bf6c"/></svg>
      <span class="mg-shell" style="left:20%">🐚</span><span class="mg-shell" style="left:62%;font-size:24px">🐚</span>`;
    h += '</div>';
    h += `<svg class="mg-wave" viewBox="0 0 400 24" preserveAspectRatio="none">
      <path d="M0 12 Q25 0 50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12 V24 H0Z" fill="#2bc6e6"/>
      <path d="M0 12 Q25 0 50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="3"/></svg>`;
    return h + '<div class="mg-scrim-t"></div><div class="mg-scrim-b"></div>';
  }

  function meadowSceneHTML() {
    let h = '<div class="mg-msky"></div><div class="mg-msun"></div>';
    [[14, 32, 48], [34, 18, 62], [52, 44, 56]].forEach(([top, d, dur], i) => {
      h += `<div class="mg-cloud" style="top:${top}%;animation-duration:${dur}s;animation-delay:${-i * 17 - d}s;transform:scale(${1 - i * .15})"></div>`;
    });
    h += `<svg class="mg-hills" viewBox="0 0 1000 400" preserveAspectRatio="none">
      <defs><linearGradient id="mgH1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8be36a"/><stop offset="1" stop-color="#4fb848"/></linearGradient>
      <linearGradient id="mgH2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd35a"/><stop offset="1" stop-color="#2f9a3c"/></linearGradient></defs>
      <path d="M0 120 Q250 20 520 110 T1000 80 V400 H0Z" fill="url(#mgH1)"/>
      <path d="M0 220 Q300 120 640 210 T1000 170 V400 H0Z" fill="url(#mgH2)"/></svg>`;
    const fl = ['🌼', '🌷', '🌸', '🌻', '🌼', '🌷'];
    for (let i = 0; i < 16; i++) {
      h += `<span class="mg-flower" style="left:${(i * 6.3 + rnd(-2, 2)).toFixed(1)}%;bottom:${rnd(3, 30).toFixed(1)}%;font-size:${rnd(26, 44).toFixed(0)}px;animation-delay:${-rnd(0, 3).toFixed(1)}s">${fl[i % fl.length]}</span>`;
    }
    return h + '<div class="mg-scrim-t"></div><div class="mg-scrim-b"></div>';
  }

  const BOAT_HTML = `<div class="mg-boat"><div class="mg-capt">🐱</div>
    <svg viewBox="0 0 220 140">
      <defs><linearGradient id="mgHull" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fa7e1e"/><stop offset=".5" stop-color="#d62976"/><stop offset="1" stop-color="#962fbf"/></linearGradient></defs>
      <path d="M112 80 L24 6" stroke="#7a4520" stroke-width="6" stroke-linecap="round"/>
      <circle cx="102" cy="72" r="7" fill="#555"/>
      <path d="M6 88 H214 Q206 116 186 134 H34 Q14 116 6 88Z" fill="url(#mgHull)"/>
      <path d="M12 100 H208" stroke="#fff" stroke-width="5" opacity=".85"/>
      <circle cx="58" cy="114" r="6" fill="#fff" opacity=".9"/><circle cx="162" cy="114" r="6" fill="#fff" opacity=".9"/>
    </svg>
    <div class="mg-bucket"><svg viewBox="0 0 60 56">
      <path d="M8 18 Q30 -10 52 18" fill="none" stroke="#ddd" stroke-width="4"/>
      <path d="M5 18 H55 L48 54 H12Z" fill="#4f9dff"/><path d="M8 30 H52" stroke="#fff" stroke-width="3" opacity=".6"/>
      <ellipse cx="30" cy="18" rx="25" ry="6" fill="#2b6fd6"/><ellipse cx="30" cy="19" rx="20" ry="4" fill="#8fdcff"/></svg>
      <b class="mg-count">0</b></div></div>`;

  const HOOK_SVG = `<svg class="mg-svgfx"><path class="mg-line" d="" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="2.5"/>
    <g class="mg-hook"><circle cx="0" cy="-14" r="9" fill="#ff4f6d" stroke="#fff" stroke-width="3"/>
      <circle cx="0" cy="2" r="4" fill="none" stroke="#e9eef5" stroke-width="3"/>
      <path d="M0 6 V26 Q0 38 -11 34 Q-17 30 -15 23" fill="none" stroke="#e9eef5" stroke-width="4.5" stroke-linecap="round"/></g></svg>`;

  const NET_HTML = `<div class="mg-net"><svg viewBox="0 0 150 190">
      <defs><pattern id="mgMesh" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0 V10 M0 0 H10" stroke="rgba(255,255,255,.75)" stroke-width="1.6"/></pattern></defs>
      <path d="M88 86 L146 186" stroke="#a0612d" stroke-width="10" stroke-linecap="round"/>
      <path d="M88 86 L146 186" stroke="#c98a4f" stroke-width="4" stroke-linecap="round"/>
      <circle cx="55" cy="52" r="46" fill="rgba(255,255,255,.22)"/><circle cx="55" cy="52" r="46" fill="url(#mgMesh)"/>
      <circle cx="55" cy="52" r="46" fill="none" stroke="#ffcf3f" stroke-width="7"/></svg></div>`;

  const JAR_HTML = `<div class="mg-jar"><div class="mg-jar-glass"></div><div class="mg-jar-lid"></div><b class="mg-count">0</b></div>`;

  // ------------------------------------------------------------------ game

  function createGame(o) {
    const LETTERS_ = typeof LETTERS !== 'undefined' ? LETTERS : [];
    const WORDS_ = typeof WORDS !== 'undefined' ? WORDS : [];
    const extSpeak = typeof o.speak === 'function' ? o.speak : (typeof speak === 'function' ? speak : null);
    const extSfx = o.sfx || (typeof sfx !== 'undefined' ? sfx : null);
    const extBurst = typeof o.burst === 'function' ? o.burst : (typeof burst === 'function' ? burst : null);

    const say = t => { try { extSpeak && extSpeak(t); } catch (e) {} };
    const fx = n => { try { extSfx && typeof extSfx[n] === 'function' && extSfx[n](); } catch (e) {} };

    // ---- mode & content
    let mode = o.mode === 'fishing' || o.mode === 'hunting' ? o.mode : null;
    if (!mode) {
      let last = null;
      try { last = localStorage.getItem(LS_KEY); } catch (e) {}
      mode = last === 'fishing' ? 'hunting' : 'fishing';
    }
    try { localStorage.setItem(LS_KEY, mode); } catch (e) {}
    const FISH = mode === 'fishing';

    const sayOf = {};
    LETTERS_.forEach(l => { sayOf[l.t] = l.say; });
    Object.assign(sayOf, o.letterSay || {});
    const ALLL = LETTERS_.length ? LETTERS_.map(l => l.t) : EASY.slice();

    const seen = new Set();
    const words = (o.words || []).map(w => (typeof w === 'string' ? (WORDS_.find(x => x.t === w) || { t: w }) : w))
      .filter(w => w && w.t && !seen.has(w.t) && seen.add(w.t))
      .map(w => ({ label: w.t, say: w.say || w.t, emoji: w.emoji || '' }));
    const wPool = words.slice();
    WORDS_.forEach(w => { if (!wPool.some(x => x.label === w.t)) wPool.push({ label: w.t, say: w.say || w.t, emoji: w.emoji || '' }); });

    const content = o.content === 'words' && words.length ? 'words'
      : o.content === 'letters' ? 'letters'
        : (words.length >= 4 && Math.random() < 0.5 ? 'words' : 'letters');
    const WORDSMODE = content === 'words';

    const learned = [];
    (o.letters || []).forEach(l => { const c = typeof l === 'string' ? l : l && l.t; if (c && !learned.includes(c)) learned.push(c); });
    for (const c of EASY) { if (learned.length >= 4) break; if (!learned.includes(c)) learned.push(c); }
    const lPool = learned.slice();
    for (const c of EASY) { if (lPool.length >= 7) break; if (!lPool.includes(c)) lPool.push(c); }
    const L = c => ({ label: c, say: sayOf[c] || c });
    const tPool = WORDSMODE ? words.slice() : learned.map(L);

    // ---- state
    let diff = clamp(+o.difficulty || 0, 0, 4);
    let totalHits = 0, totalMisses = 0;
    let hits = 0, misses = 0, tMiss = 0, likes = 0, caughtEmo = [];
    let target = null, queue = [], retried = new Set();
    let creatures = [], seq = null, busy = true, phase = 'play';
    let T = 0, playT = 0, lastPromptAt = 0, lastMissAt = -9, last = 0, raf = 0, paused = !!document.hidden;
    let timers = [];
    let W = 0, H = 0, st = 0, sb = 0, S = 0, top = 0, bottom = 0, u = 100;
    let dead = false;
    const after = (s, fn) => timers.push({ at: T + s, fn });

    // ---- DOM
    const root = document.createElement('div');
    root.className = `mg mg-${mode}${WORDSMODE ? ' mg-words' : ''}`;
    root.dir = 'rtl';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    const gameName = FISH ? '🎣 דיג' : '🦋 ציד פרפרים';
    root.setAttribute('aria-label', 'בונוס ' + gameName);
    root.innerHTML = `
      <div class="mg-probe"></div>
      <div class="mg-scene">${FISH ? fishSceneHTML() : meadowSceneHTML()}</div>
      <div class="mg-field"></div>
      <div class="mg-tools">${FISH ? HOOK_SVG + BOAT_HTML : NET_HTML}</div>
      ${FISH ? '' : JAR_HTML}
      <div class="mg-top">
        <div class="mg-title"><b>🎁 בונוס!</b><span>${gameName}</span></div>
        <button class="mg-x" aria-label="סגירה">✕</button>
      </div>
      <div class="mg-prompt"><div class="mg-clue"></div><button class="mg-say" aria-label="השמעה">🔊</button></div>
      <div class="mg-side">
        <div class="mg-ic mg-like">❤️<b class="mg-likes">0</b></div>
        <div class="mg-ic">💬<b>${TARGETS}</b></div>
        <div class="mg-ic">✈️</div>
        <div class="mg-disc">${FISH ? '🐟' : '🦋'}</div>
      </div>
      <div class="mg-cap">
        <div class="mg-who"><div class="mg-ava"><i>${FISH ? '🐱' : '🐞'}</i></div><span class="mg-name">${gameName}</span><span class="mg-follow">⭐</span></div>
        <div class="mg-text">${FISH ? 'בואו נדוג דגים! 🐟' : 'בואו נתפוס פרפרים! 🦋'}</div>
        <div class="mg-tick"><div class="mg-tick-in"><span>🎵 משחק בונוס</span><span>🎵 משחק בונוס</span><span>🎵 משחק בונוס</span><span>🎵 משחק בונוס</span></div></div>
      </div>
      <div class="mg-bar"><i></i></div>
      <div class="mg-fxl"></div>`;
    const q = s => root.querySelector(s);
    const field = q('.mg-field'), fxl = q('.mg-fxl'), clueEl = q('.mg-clue'), sayBtn = q('.mg-say');
    const countEl = q('.mg-count'), likesEl = q('.mg-likes'), barEl = q('.mg-bar i');
    const boatEl = q('.mg-boat'), lineEl = q('.mg-line'), hookEl = q('.mg-hook'), netEl = q('.mg-net');
    const jarGlass = q('.mg-jar-glass');

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(root);

    // tools
    const boat = { x: 0, tx: 0 };
    const hook = { x: 0, y: 0, free: true };
    const net = { x: 0, y: 0, r: 0, s: 1 };
    let drag = null; // { id, x, y, vx }

    function boom(x, y, em, n) {
      if (extBurst) { try { extBurst(x, y, em, n); return; } catch (e) {} }
      for (let k = 0; k < n; k++) {
        const e = document.createElement('span');
        e.className = 'mg-pt';
        e.textContent = pick(em);
        const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 180;
        e.style.left = x + 'px'; e.style.top = y + 'px';
        e.style.setProperty('--dx', Math.cos(a) * d + 'px');
        e.style.setProperty('--dy', Math.sin(a) * d - 100 + 'px');
        e.style.fontSize = 22 + Math.random() * 24 + 'px';
        fxl.appendChild(e);
        setTimeout(() => e.remove(), 1300);
      }
    }

    // ---------------- layout

    function layout() {
      W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
      const pcs = getComputedStyle(q('.mg-probe'));
      st = parseFloat(pcs.paddingTop) || 0; sb = parseFloat(pcs.paddingBottom) || 0;
      u = clamp(Math.min(W, H) / 8, 92, 128);
      S = clamp(H * 0.25, 200, 300) + st * 0.5;
      root.style.setProperty('--S', S + 'px');
      root.style.setProperty('--st', st + 'px');
      root.style.setProperty('--sb', sb + 'px');
      top = FISH ? S + 40 : st + 212;
      bottom = H - sb - (FISH ? 150 : 140);
      if (FISH && !boat.x) { boat.x = boat.tx = W - 150; }
      if (FISH) boat.x = boat.tx = clamp(boat.tx, 125, W - 125);
      placeSlots();
    }

    // assign each creature a lane (fish) / cell (bugs) and its size
    function placeSlots() {
      const n = creatures.length;
      if (!n) return;
      const fh = Math.max(120, bottom - top);
      if (FISH) {
        let rows = n, per = 1;
        if (fh / n < u * 1.1 && n > 2) { rows = Math.ceil(n / 2); per = 2; }
        const rowH = fh / rows;
        const h = clamp(rowH * 0.78, 78, u * 1.2);
        const w = h * (WORDSMODE ? 1.95 : 1.62);
        creatures.forEach(c => {
          const row = Math.floor(c.slot / per), col = c.slot % per;
          c.w = w; c.h = h;
          c.y0 = top + rowH * (row + 0.5) - h / 2;
          const mid = W / 2;
          c.xmin = per === 1 ? 6 : (col === 0 ? 6 : mid);
          c.xmax = per === 1 ? W - 6 : (col === 0 ? mid : W - 6);
          if (c.xmax - c.xmin < w + 20) { c.xmin = 6; c.xmax = W - 6; }
          if (c.x == null) c.x = rnd(c.xmin, Math.max(c.xmin, c.xmax - w));
          c.y = c.y == null ? c.y0 : c.y;
          sizeFish(c);
        });
      } else {
        const fw = W - 24;
        let cols = clamp(Math.round(Math.sqrt(n * fw / fh)), 1, n);
        let rows = Math.ceil(n / cols);
        const cw = fw / cols, ch = fh / rows;
        const cardW = WORDSMODE ? u * 1.75 : u, cardH = WORDSMODE ? u * 0.92 : u;
        const crit = u * 0.62;
        creatures.forEach(c => {
          const r = Math.floor(c.slot / cols), k = c.slot % cols;
          const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;   // center a short last row
          const off = (cols - inRow) * cw / 2;
          c.w = cardW; c.h = cardH + crit * 0.55;
          c.cx = 12 + off + cw * (k + 0.5);
          c.cy = top + ch * (r + 0.5);
          c.ax = clamp((cw - c.w) / 2 - 8, 0, u * 1.6);
          c.ay = clamp((ch - c.h) / 2 - 6, 0, u * 1.1);
          sizeBug(c, cardH, crit);
        });
      }
    }

    function sizeFish(c) {
      c.el.style.width = c.w + 'px'; c.el.style.height = c.h + 'px';
      c.lab.style.fontSize = (WORDSMODE ? c.h * 0.36 : c.h * 0.6) + 'px';
    }
    function sizeBug(c, cardH, crit) {
      c.el.style.width = c.w + 'px'; c.el.style.height = c.h + 'px';
      c.card.style.height = cardH + 'px';
      c.card.style.fontSize = (WORDSMODE ? cardH * 0.48 : cardH * 0.62) + 'px';
      c.crit.style.fontSize = crit + 'px';
      c.crit.style.top = -crit * 0.05 + 'px';
    }

    // ---------------- content selection

    const normLetters = s => [...s].map(ch => FINAL[ch] || ch);
    function sim(a, b) {
      const A = new Set(normLetters(a)), B = new Set(normLetters(b));
      let n = 0; B.forEach(ch => { if (A.has(ch)) n++; });
      return n + (a.length === b.length ? 0.5 : 0) + (normLetters(a)[0] === normLetters(b)[0] ? 0.5 : 0);
    }
    const lookAlikeP = () => clamp((diff - 1) / 2.5, 0, 1);

    function pickDistractor(ex) {
      const p = lookAlikeP();
      if (!WORDSMODE) {
        const t = target.label;
        const grp = (SIMILAR.find(g => g.includes(t)) || []).filter(c => c !== t && !ex.has(c));
        const alike = grp.filter(c => diff >= 3 || lPool.includes(c));
        if (alike.length && Math.random() < p) return L(pick(alike));
        let others = lPool.filter(c => !ex.has(c) && (diff >= 1.5 || !grp.includes(c)));
        if (!others.length) others = ALLL.filter(c => !ex.has(c) && !grp.includes(c));
        if (!others.length) others = ALLL.filter(c => !ex.has(c));
        return others.length ? L(pick(others)) : null;
      }
      const cands = wPool.filter(w => !ex.has(w.label));
      if (!cands.length) return null;
      const scored = cands.map(w => ({ w, s: sim(target.label, w.label) + Math.random() * 0.3 }));
      if (Math.random() < p) { scored.sort((a, b) => b.s - a.s); return pick(scored.slice(0, 3)).w; }
      const known = scored.filter(x => words.some(y => y.label === x.w.label));
      const base = known.length ? known : scored;
      if (diff < 1.5) { base.sort((a, b) => a.s - b.s); return pick(base.slice(0, Math.max(1, Math.ceil(base.length / 2)))).w; }
      return pick(base).w;
    }

    function nextTarget() {
      if (!queue.length) queue = shuffle(tPool.slice());
      let it = queue.shift();
      if (target && it.label === target.label && tPool.length > 1) {
        if (!queue.length) queue = shuffle(tPool.filter(x => x.label !== it.label));
        queue.push(it); it = queue.shift();
      }
      return it;
    }

    const creatureCount = () => clamp(2 + Math.round(diff * (WORDSMODE ? 0.5 : 0.75)), 2, 5);
    const showHint = () => diff < 2 || tMiss >= 2;
    function promptText() {
      if (!target) return '';
      if (FISH) return WORDSMODE ? `אֵיפֹה הַדָּג עִם הַמִּילָּה ${target.say}?` : `אֵיפֹה הַדָּג עִם הָאוֹת ${target.say}?`;
      return WORDSMODE ? `אֵיפֹה כָּתוּב ${target.say}?` : `אֵיפֹה הָאוֹת ${target.say}?`;
    }

    function renderClue() {
      let h = '';
      if (WORDSMODE) h += `<span class="mg-pic">${esc(target.emoji || '❓')}</span>`;
      if (showHint()) h += `<span class="mg-ghost">${esc(target.label)}</span>`;
      else if (!WORDSMODE) h += '<span class="mg-ear">👂</span>';
      clueEl.innerHTML = h;
    }

    // ---------------- creatures

    function makeCreature(item, slot, color) {
      const c = { item, label: item.label, isT: item.label === target.label, slot, x: null, y: null, s: 1, r: 0,
        state: 'swim', k: rnd(0.85, 1.15), ph: rnd(0, 6.28), p1: rnd(0, 6.28), p2: rnd(0, 6.28), t: rnd(0, 6), fleeT: 0, fv: [0, 0] };
      const el = document.createElement('div');
      c.el = el;
      if (FISH) {
        el.className = 'mg-c mg-fish mg-new';
        el.style.setProperty('--c', color[0]); el.style.setProperty('--d', color[1]); el.style.setProperty('--t', color[2]);
        el.innerHTML = `<div class="mg-wig"><svg class="mg-fsvg" viewBox="0 0 200 120">
          <path class="mg-tail" d="M48 60 L4 20 Q18 60 4 100Z" style="fill:var(--d)"/>
          <path d="M86 16 Q116 -8 150 18Z" style="fill:var(--d)"/>
          <path d="M104 104 Q118 122 136 104Z" style="fill:var(--d)"/>
          <ellipse cx="116" cy="60" rx="80" ry="50" style="fill:var(--c)"/>
          <ellipse cx="112" cy="80" rx="64" ry="24" fill="#fff" opacity=".2"/>
          <ellipse cx="96" cy="34" rx="44" ry="10" fill="#fff" opacity=".25"/>
          <circle cx="166" cy="46" r="12" fill="#fff"/><circle cx="169" cy="47" r="6.5" fill="#1d1d1d"/><circle cx="171" cy="44" r="2.2" fill="#fff"/>
          <circle cx="160" cy="70" r="7" fill="#ff7aa8" opacity=".55"/>
          <path d="M190 68 Q182 76 172 72" stroke="#1d1d1d" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          </svg><div class="mg-flab"></div></div>`;
        c.lab = el.querySelector('.mg-flab');
        c.dir = Math.random() < 0.5 ? -1 : 1;
        c.emoji = pick(HAUL_FISH);
      } else {
        el.className = 'mg-c mg-bug';
        c.emoji = pick(BUGS);
        el.innerHTML = `<div class="mg-wig"><div class="mg-crit${c.emoji === '🦋' ? '' : ' mg-buzz'}" style="animation-delay:${-rnd(0, .3).toFixed(2)}s">${c.emoji}</div>
          <div class="mg-card" style="animation-delay:${-rnd(0, 1.5).toFixed(2)}s"></div></div>`;
        c.card = el.querySelector('.mg-card');
        c.crit = el.querySelector('.mg-crit');
        c.lab = c.card;
        // fly in from off-screen
        c.state = 'flee'; c.fleeT = 1; c.swapped = true;
        const side = Math.random() < 0.5 ? -1 : 1;
        c.fv = [side * (W * 0.7 + 100), rnd(-0.3, 0.3) * H];
      }
      c.lab.textContent = item.label;
      field.appendChild(el);
      if (FISH) { setDir(c); after(0.55, () => el.classList.remove('mg-new')); }
      return c;
    }

    function setDir(c) { c.el.classList.toggle('mg-l', c.dir < 0); }

    function relabel(c) {
      const ex = new Set(creatures.map(x => x.label));
      const d = pickDistractor(ex);
      if (!d) return;
      c.item = d; c.label = d.label; c.lab.textContent = d.label;
    }

    function spawnSet() {
      creatures.forEach(c => { c.el.classList.add('mg-out'); const el = c.el; after(0.4, () => el.remove()); });
      creatures = [];
      const n = creatureCount();
      const items = [target], ex = new Set([target.label]);
      while (items.length < n) { const d = pickDistractor(ex); if (!d) break; ex.add(d.label); items.push(d); }
      const slots = shuffle(items.map((_, i) => i));
      const cols = shuffle(PAL.slice());
      creatures = shuffle(items).map((it, i) => makeCreature(it, slots[i], cols[i % cols.length]));
      placeSlots();
      if (FISH) {
        // keep fish in the same row spread out horizontally
        creatures.forEach(c => { c.x = rnd(c.xmin, Math.max(c.xmin, c.xmax - c.w)); c.y = c.y0; });
      }
    }

    function fishSpeed() { return Math.min(W, 1000) * (0.05 + 0.032 * diff); }

    function updateCreatures(dt) {
      for (const c of creatures) {
        if (c.state === 'caught') continue;
        if (FISH) {
          const v = fishSpeed() * c.k;
          if (c.state === 'wob') {
            c.wobT -= dt;
            if (c.wobT <= 0) { c.state = 'flee'; c.dir = (c.x + c.w / 2 < W / 2) ? -1 : 1; setDir(c); }
          } else if (c.state === 'flee') {
            c.x += c.dir * Math.max(560, v * 5) * dt;
            if (c.x > W + 30 || c.x + c.w < -30) {
              if (!c.isT) relabel(c);
              c.state = 'swim'; c.entering = true; c.dir = -c.dir; setDir(c);
            }
          } else {
            c.x += c.dir * v * dt;
            if (c.entering) { if (c.x >= c.xmin && c.x + c.w <= c.xmax) c.entering = false; }
            else if (c.x < c.xmin) { c.x = c.xmin; c.dir = 1; setDir(c); }
            else if (c.x + c.w > c.xmax) { c.x = c.xmax - c.w; c.dir = -1; setDir(c); }
          }
          c.y = c.y0 + Math.sin(T * 1.6 + c.ph) * 7;
          c.r = Math.cos(T * 1.6 + c.ph) * 4 * c.dir;
        } else {
          c.t += dt * (0.45 + 0.27 * diff) * c.k;
          let ox = 0, oy = 0;
          if (c.state === 'wob') {
            c.wobT -= dt;
            if (c.wobT <= 0) {
              c.state = 'flee'; c.fleeT = 0; c.swapped = false;
              const sx = c.cx < W / 2 ? -1 : 1;
              c.fv = [sx * (W * 0.6 + 100), -(H * 0.5 + rnd(0, 0.2) * H)];
            }
          }
          if (c.state === 'flee') {
            c.fleeT = Math.min(2, c.fleeT + dt / (c.fleeT < 1 ? 0.7 : 1.1));
            if (c.fleeT >= 1 && !c.swapped) { c.swapped = true; if (!c.isT) relabel(c); }
            const f = c.fleeT <= 1 ? easeOut(c.fleeT) : 1 - easeInOut(c.fleeT - 1);
            ox = c.fv[0] * f; oy = c.fv[1] * f;
            if (c.fleeT >= 2) c.state = 'swim';
          }
          const x = c.cx + c.ax * Math.sin(c.t + c.p1);
          const y = c.cy + c.ay * Math.sin(c.t * 1.37 + c.p2) + Math.sin(T * 5 + c.p1) * 4;
          c.x = x - c.w / 2 + ox; c.y = y - c.h / 2 + oy;
          c.r = Math.sin(c.t * 1.6 + c.p2) * 6;
        }
      }
    }

    function hitAt(px, py) {
      let best = null, bd = 1e9;
      const pad = 14;
      for (const c of creatures) {
        if (c.state !== 'swim') continue;
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const dx = Math.abs(px - cx), dy = Math.abs(py - cy);
        if (dx <= c.w / 2 + pad && dy <= Math.max(c.h, 90) / 2 + pad) {
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = c; }
        }
      }
      return best;
    }

    // ---------------- tools (boat/hook, net)

    const boatTop = () => S - 118 + Math.sin(T * 1.8) * 3;
    const tip = () => ({ x: boat.x - 110 + 24, y: boatTop() + 6 });
    const bucketPt = () => ({ x: boat.x - 110 + 179, y: boatTop() + 62 });
    const jarPt = () => { const r = q('.mg-jar').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 }; };

    function updateTools(dt) {
      if (FISH) {
        boat.x += (boat.tx - boat.x) * Math.min(1, dt * 3.5);
        if (!seq) {
          const tp = tip();
          if (drag && drag.inWater) {
            hook.x += (drag.x - hook.x) * Math.min(1, dt * 18);
            hook.y += (drag.y - hook.y) * Math.min(1, dt * 18);
            boat.tx = clamp(hook.x + 86, 125, W - 125);
          } else {
            const rx = tp.x, ry = S + 46 + Math.sin(T * 2.2) * 6;
            hook.x += (rx - hook.x) * Math.min(1, dt * 6);
            hook.y += (ry - hook.y) * Math.min(1, dt * 6);
          }
        }
      } else if (drag && !seq) {
        const nx = drag.x, ny = drag.y;
        const vx = (nx - net.x) / Math.max(dt, 0.001);
        net.x = nx; net.y = ny;
        net.r += (clamp(vx * 0.03, -40, 40) - net.r) * Math.min(1, dt * 10);
        net.s = 1;
      }
    }

    function renderAll() {
      for (const c of creatures) {
        c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0) rotate(${c.r.toFixed(2)}deg) scale(${c.s})`;
      }
      if (FISH) {
        const bt = boatTop();
        boatEl.style.transform = `translate3d(${(boat.x - 110).toFixed(1)}px,${bt.toFixed(1)}px,0) rotate(${(Math.sin(T * 1.8 + 1) * 2).toFixed(2)}deg)`;
        const tp = tip();
        const mx = (tp.x + hook.x) / 2, my = (tp.y + hook.y) / 2 + 24;
        lineEl.setAttribute('d', `M${tp.x.toFixed(1)} ${tp.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${hook.x.toFixed(1)} ${(hook.y - 22).toFixed(1)}`);
        hookEl.setAttribute('transform', `translate(${hook.x.toFixed(1)} ${hook.y.toFixed(1)})`);
      } else {
        netEl.style.transform = `translate3d(${(net.x - 55).toFixed(1)}px,${(net.y - 52).toFixed(1)}px,0) rotate(${net.r.toFixed(1)}deg) scale(${net.s.toFixed(3)})`;
      }
    }

    // ---------------- catch sequences

    function startCatch(c) {
      busy = true;
      c.state = 'caught';
      c.el.classList.remove('mg-glow', 'mg-wob');
      c.el.style.zIndex = 3;
      say(pick(PRAISE));
      if (FISH) {
        c.el.classList.add('mg-hooked');
        const cx = c.x + c.w / 2;
        seq = { kind: 'fish', c, ph: 0, t: 0, hx0: hook.x, hy0: hook.y, bx0: boat.x, btx: clamp(cx + 86, 125, W - 125), splashed: false };
        boat.tx = seq.btx;
      } else {
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const from = drag ? { x: net.x, y: net.y } : { x: cx < W / 2 ? W + 60 : -60, y: H + 40 };
        net.x = from.x; net.y = from.y;
        netEl.classList.add('mg-on');
        seq = { kind: 'net', c, ph: 0, t: 0, fx: from.x, fy: from.y, tx: cx, ty: cy, sx: from.x < cx ? -1 : 1 };
      }
    }

    function stepSeq(dt) {
      const s = seq;
      s.t += dt;
      const c = s.c;
      if (s.kind === 'fish') {
        const D = [0.35, 0.42, 0.6, 0.5];
        const p = Math.min(1, s.t / D[s.ph]);
        const tp = tip();
        if (s.ph === 0) {                      // boat glides over, hook rises to below the rod tip
          hook.x = lerp(s.hx0, tp.x, easeInOut(p)); hook.y = lerp(s.hy0, S + 30, easeInOut(p));
        } else if (s.ph === 1) {               // hook drops to the fish
          const ax = c.x + c.w / 2, ay = c.y + c.h * 0.12 - 30;
          hook.x = lerp(s.hx1, ax, easeInOut(p)); hook.y = lerp(s.hy1, ay, easeInOut(p));
        } else if (s.ph === 2) {               // reel up
          hook.x = lerp(s.hx2, tp.x, easeInOut(p)); hook.y = lerp(s.hy2, S - 40, easeInOut(p));
          c.x = hook.x - c.w / 2; c.y = hook.y + 30 - c.h * 0.12;
          c.r = Math.sin(T * 30) * 10 - 18 * c.dir;
          if (!s.splashed && c.y + c.h * 0.5 < S) {
            s.splashed = true;
            fx('pop');
            boom(hook.x, S, ['💦', '💧', '✨', '💦'], 12);
            ripple(hook.x, S);
          }
        } else if (s.ph === 3) {               // arc into the bucket
          const b = bucketPt();
          const e = easeInOut(p);
          const x = lerp(s.fx3, b.x, e), y = lerp(s.fy3, b.y, e) - Math.sin(Math.PI * e) * 90;
          c.s = lerp(1, 0.22, e);
          c.x = x - c.w / 2; c.y = y - c.h / 2; c.r = lerp(c.r, 0, p);
          hook.x = tp.x; hook.y = lerp(S - 40, S + 46, e);
        }
        if (p >= 1) {
          s.ph++; s.t = 0;
          if (s.ph === 1) { s.hx1 = hook.x; s.hy1 = hook.y; }
          if (s.ph === 2) { s.hx2 = hook.x; s.hy2 = hook.y; fx('pop'); boom(c.x + c.w / 2, c.y + c.h / 2, ['✨', '⭐'], 8); }
          if (s.ph === 3) { s.fx3 = c.x + c.w / 2; s.fy3 = c.y + c.h / 2; }
          if (s.ph === 4) { const b = bucketPt(); landed(c, b.x, b.y); }
        }
      } else {
        const D = [0.3, 0.25, 0.55];
        const p = Math.min(1, s.t / D[s.ph]);
        if (s.ph === 0) {                      // swoosh
          const e = easeOut(p);
          net.x = lerp(s.fx, s.tx, e); net.y = lerp(s.fy, s.ty, e) - Math.sin(Math.PI * e) * 60;
          net.r = lerp(55 * s.sx, -12 * s.sx, e); net.s = 1;
        } else if (s.ph === 1) {               // scoop: creature shrinks into the hoop
          c.s = lerp(1, 0.42, easeInOut(p));
          c.x = lerp(c.x, net.x - c.w / 2, 0.4); c.y = lerp(c.y, net.y - c.h / 2, 0.4);
          net.r = lerp(-12 * s.sx, 0, p);
        } else if (s.ph === 2) {               // carry to the jar
          const j = jarPt(), e = easeInOut(p);
          net.x = lerp(s.nx2, j.x, e); net.y = lerp(s.ny2, j.y, e) - Math.sin(Math.PI * e) * 120;
          net.s = lerp(1, 0.45, e); net.r = Math.sin(Math.PI * e) * -25;
          c.s = lerp(0.42, 0.2, e);
          c.x = net.x - c.w / 2; c.y = net.y - c.h / 2;
        }
        if (p >= 1) {
          s.ph++; s.t = 0;
          if (s.ph === 1) { fx('pop'); boom(s.tx, s.ty, ['✨', '⭐', '💫'], 12); }
          if (s.ph === 2) { s.nx2 = net.x; s.ny2 = net.y; }
          if (s.ph === 3) { netEl.classList.remove('mg-on'); const j = jarPt(); landed(c, j.x, j.y); }
        }
      }
    }

    function ripple(x, y) {
      const r = document.createElement('div');
      r.className = 'mg-ripple';
      r.style.left = x + 'px'; r.style.top = y + 'px';
      fxl.appendChild(r);
      setTimeout(() => r.remove(), 800);
    }

    function bump(el) { if (!el) return; el.classList.remove('mg-bump'); void el.offsetWidth; el.classList.add('mg-bump'); }

    function landed(c, x, y) {
      seq = null;
      c.el.remove();
      creatures = creatures.filter(k => k !== c);
      hits++; totalHits++;
      diff = clamp(diff + 0.5, 0, 4);
      caughtEmo.push(c.emoji);
      countEl.textContent = hits;
      bump(FISH ? q('.mg-bucket') : q('.mg-jar'));
      if (jarGlass) { const e = document.createElement('span'); e.textContent = c.emoji; jarGlass.appendChild(e); }
      boom(x, y, ['⭐', '✨', FISH ? '🐟' : '🦋', '💖'], 14);
      fx('ok');
      likes += 10;
      likesEl.textContent = likes;
      bump(q('.mg-like'));
      floatHearts();
      barEl.style.width = (hits / TARGETS * 100) + '%';
      if (tMiss > 0 && !retried.has(target.label)) { retried.add(target.label); queue.splice(Math.min(2, queue.length), 0, target); }
      if (hits >= TARGETS || playT >= ROUND_S) after(0.6, endRound);
      else after(0.35, () => newTarget(false));
    }

    function floatHearts() {
      const r = q('.mg-like').getBoundingClientRect();
      for (let k = 0; k < 3; k++) {
        const h = document.createElement('span');
        h.className = 'mg-fh';
        h.textContent = pick(['❤️', '💖', '💗']);
        h.style.left = r.left + r.width / 2 - 17 + 'px';
        h.style.top = r.top + 'px';
        h.style.setProperty('--hx', rnd(-10, 60).toFixed(0) + 'px');
        h.style.animationDelay = k * 0.15 + 's';
        fxl.appendChild(h);
        setTimeout(() => h.remove(), 1900);
      }
    }

    // ---------------- flow

    function newTarget(first) {
      target = nextTarget();
      tMiss = 0;
      renderClue();
      spawnSet();
      busy = false;
      lastPromptAt = playT;
      const intro = FISH ? 'בּוֹאוּ נָדוּג דָּגִים! ' : 'בּוֹאוּ נִתְפֹּס פַּרְפָּרִים! ';
      say((first ? intro : '') + promptText());
    }

    function wrong(c) {
      c.state = 'wob';
      c.wobT = FISH ? 0.42 : 0.32;
      c.el.classList.remove('mg-new');
      bump2(c.el, 'mg-wob');
      fx('oops');
      if (playT - lastMissAt > 0.9) {
        misses++; totalMisses++; tMiss++;
        diff = clamp(diff - 1, 0, 4);
        lastMissAt = playT;
        renderClue();
        if (tMiss >= 3) { const t = creatures.find(k => k.isT); if (t) t.el.classList.add('mg-glow'); }
      }
      const tl = target.label;
      after(0.75, () => { if (phase === 'play' && !busy && target.label === tl) { say(promptText()); lastPromptAt = playT; } });
    }
    function bump2(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); after(0.5, () => el.classList.remove(cls)); }

    function tryHit(x, y) {
      if (phase !== 'play' || busy || seq) return false;
      const c = hitAt(x, y);
      if (!c) return false;
      if (c.isT) startCatch(c); else wrong(c);
      return true;
    }

    function startRound(first) {
      hits = 0; misses = 0; tMiss = 0; likes = 0; caughtEmo = []; retried = new Set();
      playT = 0; lastMissAt = -9; phase = 'play'; queue = []; target = null;
      countEl.textContent = '0'; likesEl.textContent = '0'; barEl.style.width = '0';
      if (jarGlass) jarGlass.innerHTML = '';
      const end = q('.mg-end'); if (end) end.remove();
      newTarget(first);
    }

    function endRound() {
      if (phase === 'end') return;
      phase = 'end'; busy = true; seq = null;
      if (netEl) netEl.classList.remove('mg-on');
      creatures.forEach(c => c.el.classList.add('mg-out'));
      fx('win');
      boom(W / 2, H * 0.42, ['🎉', '⭐', '✨', '💖', FISH ? '🐟' : '🦋'], 26);
      const acc = hits / Math.max(1, hits + misses);
      const stars = hits === 0 ? 1 : acc >= 0.8 ? 3 : acc >= 0.55 ? 2 : 1;
      const end = document.createElement('div');
      end.className = 'mg-end';
      end.innerHTML = `<div class="mg-endcard">
        <div class="mg-end-emo">${FISH ? '🎣' : '🦋'}🎉</div>
        <div class="mg-end-title">כל הכבוד!</div>
        <div class="mg-stars">${[0, 1, 2].map(i => `<span class="${i < stars ? '' : 'mg-dim'}" style="animation-delay:${0.2 + i * 0.18}s">⭐</span>`).join('')}</div>
        <div class="mg-haul">${caughtEmo.map((e, i) => `<span style="animation-delay:${0.5 + i * 0.08}s">${e}</span>`).join('')}</div>
        <div class="mg-likes-end">❤️ ${likes}</div>
        <div class="mg-end-btns">
          <button class="mg-btn mg-pri mg-again" data-say="עוֹד פַּעַם!" aria-label="עוד פעם"><i>🔁</i><span>עוד פעם</span></button>
          <button class="mg-btn mg-sec mg-back" data-say="חֲזָרָה" aria-label="חזרה"><i>⬅️</i><span>חזרה</span></button>
        </div></div>`;
      root.appendChild(end);
      say('כָּל הַכָּבוֹד! ' + (FISH ? 'דַּגְנוּ הַמּוֹן דָּגִים! ' : 'תָּפַסְנוּ הַמּוֹן פַּרְפָּרִים! ') + 'עוֹד פַּעַם?');
      end.addEventListener('pointerover', e => {
        const b = e.target.closest('.mg-btn');
        if (b && e.pointerType !== 'touch' && b !== end._hov) { end._hov = b; say(b.dataset.say); }
      });
      end.querySelector('.mg-again').addEventListener('click', () => {
        if (phase !== 'end') return;
        phase = 'restarting';
        say('עוֹד פַּעַם!');
        fx('pop');
        after(0.7, () => startRound(true));
      });
      end.querySelector('.mg-back').addEventListener('click', () => { say('חֲזָרָה'); destroy(true); });
    }

    // ---------------- input

    function local(e) { return { x: e.clientX, y: e.clientY }; }
    function onDown(e) {
      if (e.target.closest && e.target.closest('button, .mg-end')) return;
      if (drag) return;
      e.preventDefault();
      lastPromptAt = playT;
      const p = local(e);
      drag = { id: e.pointerId, x: p.x, y: p.y, inWater: FISH && p.y > S };
      try { root.setPointerCapture(e.pointerId); } catch (err) {}
      if (tryHit(p.x, p.y)) return;
      if (!FISH && phase === 'play' && !seq) { net.x = p.x; net.y = p.y; net.r = 0; net.s = 1; netEl.classList.add('mg-on'); }
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = local(e);
      drag.x = p.x; drag.y = p.y;
      if (FISH) {
        drag.inWater = p.y > S;
        if (drag.inWater && !seq) {
          // test the hook point itself (it trails the finger slightly)
          tryHit(p.x, p.y);
        }
      } else if (!seq) {
        if (phase === 'play') netEl.classList.add('mg-on');
        tryHit(p.x, p.y);
      }
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      if (!FISH && !seq) netEl.classList.remove('mg-on');
    }

    function onVis() { paused = document.hidden; last = 0; }
    function onResize() { layout(); }

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('contextmenu', e => e.preventDefault());
    q('.mg-x').addEventListener('click', () => destroy(true));
    sayBtn.addEventListener('click', () => { say(promptText()); lastPromptAt = playT; });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);

    // ---------------- loop

    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (paused) { last = 0; return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      tick(dt);
    }

    function tick(dt) {
      T += dt;
      if (phase === 'play') {
        playT += dt;
        if (!busy && playT - lastPromptAt > IDLE_S) {
          lastPromptAt = playT;
          say(promptText());
          sayBtn.classList.remove('mg-call'); void sayBtn.offsetWidth; sayBtn.classList.add('mg-call');
        }
        if (playT > CAP_S && !seq) endRound();
      }
      if (timers.length) {
        const due = timers.filter(t => t.at <= T);
        if (due.length) { timers = timers.filter(t => t.at > T); due.forEach(t => { if (!dead) t.fn(); }); }
      }
      if (dead) return;
      updateCreatures(dt);
      updateTools(dt);
      if (seq) stepSeq(dt);
      renderAll();
    }

    function destroy(callDone) {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      timers = [];
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      root.remove();
      document.documentElement.style.overflow = prevOverflow;
      if (G === api) G = null;
      if (callDone && typeof o.onDone === 'function') {
        try { o.onDone({ hits: totalHits, misses: totalMisses, difficulty: Math.round(diff * 2) / 2, mode, content }); } catch (e) {}
      }
    }

    // ---------------- start
    layout();
    hook.x = tip().x; hook.y = S + 46;
    if (!FISH) { net.x = W / 2; net.y = H; }
    startRound(true);
    raf = requestAnimationFrame(frame);

    const api = {
      destroy,
      mode, content,
      get difficulty() { return diff; },
      get hits() { return hits; },
      get target() { return target; },
      // test hook: catch the current target (or tap a wrong one with wrong=true)
      _tap(wrongOne) {
        const c = creatures.find(k => (wrongOne ? !k.isT : k.isT) && k.state === 'swim');
        return c ? tryHit(c.x + c.w / 2, c.y + c.h / 2) : false;
      },
      // test hook: step the simulation (headless browsers may not run requestAnimationFrame)
      _advance(sec) { for (let k = 0; k < Math.round(sec * 60) && !dead; k++) tick(1 / 60); },
    };
    return api;
  }

  function open(opts) {
    if (G) G.destroy(true);
    injectCss();
    G = createGame(opts || {});
    return G;
  }

  window.MiniGame = {
    open,
    close() { if (G) G.destroy(true); },
    isOpen: () => !!G,
    get current() { return G; },
  };
})();
