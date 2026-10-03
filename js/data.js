// Content for all levels: letters → words → sentences → paragraphs.
// All text is gender-neutral (the child may be a boy or a girl): only past-tense
// 1st person (אכלתי) and 3rd person are used — no present-tense "I/you" forms.
//
// Fields:
//   t        – unvocalized text the child traces (כתיב מלא, as taught in Israeli schools)
//   say      – fully vocalized text for TTS (he-IL). For letters: the letter's name, spelled so
//              voices can't confuse it with a common word (הֵי not הא, פֵּה not פא); the app always
//              says it after "הָאוֹת" so natural voices read בית as bet (not bayit), אלף as aleph (not elef).
//   word     – (letters only) example word; finals' example words END with that letter
//   wordSay  – (letters only, optional) vocalized example word for TTS
//   emoji    – picture shown with the item

const LETTERS = [
  { t: 'א', say: 'אָלֶף',  word: 'אריה',     wordSay: 'אַרְיֵה',     emoji: '🦁' },
  { t: 'ב', say: 'בֵּית',  word: 'בננה',     wordSay: 'בַּנָּנָה',    emoji: '🍌' },
  { t: 'ג', say: 'גִּימֶל', word: 'גמל',      wordSay: 'גָּמָל',      emoji: '🐪' },
  { t: 'ד', say: 'דָּלֶת', word: 'דג',       wordSay: 'דָּג',        emoji: '🐟' },
  { t: 'ה', say: 'הֵי',    word: 'היפופוטם', wordSay: 'הִיפּוֹפּוֹטָם', emoji: '🦛' },
  { t: 'ו', say: 'וָו',    word: 'ורד',      wordSay: 'וֶרֶד',       emoji: '🌹' },
  { t: 'ז', say: 'זַיִן',  word: 'זברה',     wordSay: 'זֶבְּרָה',     emoji: '🦓' },
  { t: 'ח', say: 'חֵית',   word: 'חתול',     wordSay: 'חָתוּל',      emoji: '🐱' },
  { t: 'ט', say: 'טֵית',   word: 'טווס',     wordSay: 'טַוָּס',      emoji: '🦚' },
  { t: 'י', say: 'יוּד',   word: 'ירח',      wordSay: 'יָרֵחַ',      emoji: '🌙' },
  { t: 'כ', say: 'כַּף',   word: 'כלב',      wordSay: 'כֶּלֶב',      emoji: '🐶' },
  { t: 'ל', say: 'לָמֶד',  word: 'לימון',    wordSay: 'לִימוֹן',     emoji: '🍋' },
  { t: 'מ', say: 'מֵם',    word: 'מטוס',     wordSay: 'מָטוֹס',      emoji: '✈️' },
  { t: 'נ', say: 'נוּן',   word: 'נמר',      wordSay: 'נָמֵר',       emoji: '🐆' },
  { t: 'ס', say: 'סָמֶךְ', word: 'סוס',      wordSay: 'סוּס',        emoji: '🐴' },
  { t: 'ע', say: 'עַיִן',  word: 'עוגה',     wordSay: 'עוּגָה',      emoji: '🎂' },
  { t: 'פ', say: 'פֵּה',   word: 'פיל',      wordSay: 'פִּיל',       emoji: '🐘' },
  { t: 'צ', say: 'צָדִי',  word: 'צב',       wordSay: 'צָב',         emoji: '🐢' },
  { t: 'ק', say: 'קוּף',   word: 'קשת',      wordSay: 'קֶשֶׁת',      emoji: '🌈' },
  { t: 'ר', say: 'רֵישׁ',  word: 'רכבת',     wordSay: 'רַכֶּבֶת',     emoji: '🚂' },
  { t: 'ש', say: 'שִׁין',  word: 'שמש',      wordSay: 'שֶׁמֶשׁ',      emoji: '☀️' },
  { t: 'ת', say: 'תָּו',   word: 'תפוח',     wordSay: 'תַּפּוּחַ',    emoji: '🍎' },
  { t: 'ך', say: 'כַּף סוֹפִית',  word: 'מלך',  wordSay: 'מֶלֶךְ', emoji: '👑' },
  { t: 'ם', say: 'מֵם סוֹפִית',   word: 'ים',   wordSay: 'יָם',    emoji: '🌊' },
  { t: 'ן', say: 'נוּן סוֹפִית',  word: 'בלון', wordSay: 'בָּלוֹן', emoji: '🎈' },
  { t: 'ף', say: 'פֵּה סוֹפִית',  word: 'קוף',  wordSay: 'קוֹף',   emoji: '🐒' },
  { t: 'ץ', say: 'צָדִי סוֹפִית', word: 'עץ',   wordSay: 'עֵץ',    emoji: '🌳' },
];

// Teach letters by shape family (straight lines → roof+leg → base/arc → closed → complex),
// each final form right after its base letter — as in Israeli kindergarten workbooks.
const LETTER_ORDER = 'ויזן' + 'רדךהחתק' + 'בכנגפף' + 'סםטמ' + 'עצץשלא';
LETTERS.sort((a, b) => LETTER_ORDER.indexOf(a.t) - LETTER_ORDER.indexOf(b.t));

// Ordered by difficulty: 2 letters → 3 letters → 4 letters.
const WORDS = [
  // 2 letters
  { t: 'דג',   say: 'דָּג',      emoji: '🐟' },
  { t: 'צב',   say: 'צָב',       emoji: '🐢' },
  { t: 'ים',   say: 'יָם',       emoji: '🌊' },
  { t: 'יד',   say: 'יָד',       emoji: '✋' },
  { t: 'לב',   say: 'לֵב',       emoji: '❤️' },
  { t: 'עץ',   say: 'עֵץ',       emoji: '🌳' },
  // 3 letters
  { t: 'אמא',  say: 'אִמָּא',     emoji: '👩' },
  { t: 'אבא',  say: 'אַבָּא',     emoji: '👨' },
  { t: 'בית',  say: 'בַּיִת',     emoji: '🏠' },
  { t: 'סוס',  say: 'סוּס',      emoji: '🐴' },
  { t: 'פיל',  say: 'פִּיל',      emoji: '🐘' },
  { t: 'דוב',  say: 'דּוֹב',      emoji: '🐻' },
  { t: 'קוף',  say: 'קוֹף',      emoji: '🐒' },
  { t: 'כלב',  say: 'כֶּלֶב',     emoji: '🐶' },
  { t: 'שמש',  say: 'שֶׁמֶשׁ',     emoji: '☀️' },
  { t: 'ירח',  say: 'יָרֵחַ',     emoji: '🌙' },
  { t: 'פרח',  say: 'פֶּרַח',     emoji: '🌸' },
  { t: 'ספר',  say: 'סֵפֶר',      emoji: '📖' },
  // 4 letters
  { t: 'חתול', say: 'חָתוּל',     emoji: '🐱' },
  { t: 'עוגה', say: 'עוּגָה',     emoji: '🎂' },
  { t: 'בלון', say: 'בָּלוֹן',     emoji: '🎈' },
  { t: 'כדור', say: 'כַּדּוּר',    emoji: '⚽' },
  { t: 'תפוח', say: 'תַּפּוּחַ',   emoji: '🍎' },
  { t: 'בננה', say: 'בַּנָּנָה',   emoji: '🍌' },
];

const SENTENCES = [
  { t: 'החתול ישן',        say: 'הֶחָתוּל יָשֵׁן',             emoji: '🐱' },
  { t: 'הציפור שרה',       say: 'הַצִּיפּוֹר שָׁרָה',           emoji: '🐦' },
  { t: 'הכלב רץ מהר',      say: 'הַכֶּלֶב רָץ מַהֵר',           emoji: '🐶' },
  { t: 'השמש זורחת',       say: 'הַשֶּׁמֶשׁ זוֹרַחַת',          emoji: '☀️' },
  { t: 'אכלתי גלידה',      say: 'אָכַלְתִּי גְּלִידָה',          emoji: '🍦' },
  { t: 'הדג שוחה בים',     say: 'הַדָּג שׂוֹחֶה בַּיָּם',         emoji: '🐟' },
  { t: 'אבא קורא ספר',     say: 'אַבָּא קוֹרֵא סֵפֶר',          emoji: '📖' },
  { t: 'הפרח יפה מאוד',    say: 'הַפֶּרַח יָפֶה מְאוֹד',         emoji: '🌸' },
  { t: 'היום יום יפה',     say: 'הַיּוֹם יוֹם יָפֶה',           emoji: '🌈' },
  { t: 'הקוף אוכל בננה',   say: 'הַקּוֹף אוֹכֵל בַּנָּנָה',       emoji: '🐒' },
  { t: 'אמא אוהבת אותי',   say: 'אִמָּא אוֹהֶבֶת אוֹתִי',        emoji: '❤️' },
  { t: 'יש לי בלון אדום',  say: 'יֵשׁ לִי בָּלוֹן אָדוֹם',       emoji: '🎈' },
  { t: 'בוקר טוב לכולם',   say: 'בּוֹקֶר טוֹב לְכוּלָּם',        emoji: '🌅' },
  { t: 'הירח עולה בלילה',  say: 'הַיָּרֵחַ עוֹלֶה בַּלַּיְלָה',     emoji: '🌙' },
];

// Exactly 3 short sentences each (≤ ~22 chars per sentence, one line on iPad).
const PARAGRAPHS = [
  { t: 'יש לי כלב. קוראים לו רקס. הוא אוהב לרוץ.',
    say: 'יֵשׁ לִי כֶּלֶב. קוֹרְאִים לוֹ רֶקְס. הוּא אוֹהֵב לָרוּץ.', emoji: '🐶' },
  { t: 'השמש זורחת. השמיים כחולים. היום יום יפה.',
    say: 'הַשֶּׁמֶשׁ זוֹרַחַת. הַשָּׁמַיִם כְּחוּלִּים. הַיּוֹם יוֹם יָפֶה.', emoji: '☀️' },
  { t: 'אכלתי תפוח. הוא היה מתוק. אחר כך שיחקתי.',
    say: 'אָכַלְתִּי תַּפּוּחַ. הוּא הָיָה מָתוֹק. אַחַר כָּךְ שִׂיחַקְתִּי.', emoji: '🍎' },
  { t: 'החתול שלי קטן. הוא ישן על הכרית. הוא אוהב חלב.',
    say: 'הֶחָתוּל שֶׁלִּי קָטָן. הוּא יָשֵׁן עַל הַכָּרִית. הוּא אוֹהֵב חָלָב.', emoji: '🐱' },
  { t: 'הלכתי לים עם אבא. בנינו ארמון חול. היה כיף!',
    say: 'הָלַכְתִּי לַיָּם עִם אַבָּא. בָּנִינוּ אַרְמוֹן חוֹל. הָיָה כֵּיף!', emoji: '🏖️' },
  { t: 'ראיתי פרפר בגינה. הוא היה צבעוני. הוא עף אל הפרח.',
    say: 'רָאִיתִי פַּרְפַּר בַּגִּינָּה. הוּא הָיָה צִבְעוֹנִי. הוּא עָף אֶל הַפֶּרַח.', emoji: '🦋' },
  { t: 'יום הולדת שמח! יש עוגה ובלונים. כולם שרים.',
    say: 'יוֹם הוּלֶּדֶת שָׂמֵחַ! יֵשׁ עוּגָה וּבָלוֹנִים. כּוּלָּם שָׁרִים.', emoji: '🎂' },
  { t: 'בחורף יורד גשם. לבשתי מעיל חם. קפצתי בשלוליות.',
    say: 'בַּחוֹרֶף יוֹרֵד גֶּשֶׁם. לָבַשְׁתִּי מְעִיל חַם. קָפַצְתִּי בַּשְּׁלוּלִיּוֹת.', emoji: '🌧️' },
  { t: 'הלכתי לגן בבוקר. שיחקנו בחצר. שרנו שירים יפים.',
    say: 'הָלַכְתִּי לַגַּן בַּבּוֹקֶר. שִׂיחַקְנוּ בֶּחָצֵר. שַׁרְנוּ שִׁירִים יָפִים.', emoji: '🧸' },
  { t: 'בלילה יש כוכבים. הירח מאיר. לילה טוב לכולם!',
    say: 'בַּלַּיְלָה יֵשׁ כּוֹכָבִים. הַיָּרֵחַ מֵאִיר. לַיְלָה טוֹב לְכוּלָּם!', emoji: '⭐' },
];

// guide: base visibility of the tracing guide (adaptive difficulty scales it per child)
// font: how much of the paper height one line of letters may fill
const LEVELS = [
  { id: 'letters',    name: 'אותיות',  icon: 'אב', items: LETTERS,    guide: 0.30, font: 0.62, grad: ['#f9a826', '#f26a00'] },
  { id: 'words',      name: 'מילים',   icon: '🐶', items: WORDS,      guide: 0.24, font: 0.42, grad: ['#fa7e1e', '#d62976'] },
  { id: 'sentences',  name: 'משפטים',  icon: '💬', items: SENTENCES,  guide: 0.22, font: 0.3,   grad: ['#d62976', '#962fbf'] },
  { id: 'paragraphs', name: 'פסקאות',  icon: '📜', items: PARAGRAPHS, guide: 0.20, font: 0.3,    grad: ['#962fbf', '#4f5bd5'] },
];

// Fake "followers" who like and comment on the child's posts.
// Keep order/length stable: saved posts reference friends by index.
const FRIENDS = [
  { name: 'רקס', emoji: '🐶' }, { name: 'מיצי', emoji: '🐱' },
  { name: 'דובי', emoji: '🐻' }, { name: 'שפנפן', emoji: '🐰' },
  { name: 'אריה', emoji: '🦁' }, { name: 'קשת', emoji: '🦄' },
  { name: 'פינגו', emoji: '🐧' }, { name: 'קופיקו', emoji: '🐵' },
];

// Gender-neutral: praise the writing / use exclamations, never "you are ..." adjectives.
const COMMENTS = {
  3: ['וואו! מושלם! 😍', 'איזה כתב יפה! ⭐', 'מדהים!!! 🤩', 'ככה כותבים! 🏆', 'כמו בספר! 📚'],
  2: ['כל הכבוד! 👏', 'יפה מאוד! 😊', 'הכתב משתפר! 💪', 'איזה יופי! 🌟', 'אהבתי! 💖'],
  1: ['ניסיון יפה! 💛', 'עוד קצת אימון! 💪', 'כל ניסיון עוזר! 🙌', 'כמעט! 🌱'],
};

// What the friends "say" when a comment is tapped — vocalized so TTS gets gender and words right
// (unvocalized יפה can come out as yafa; ניסיון/כתב are masculine → יָפֶה).
const COMMENT_SAY = {
  'וואו! מושלם! 😍': 'וָאוּ! מֻשְׁלָם!',
  'איזה כתב יפה! ⭐': 'אֵיזֶה כְּתָב יָפֶה!',
  'מדהים!!! 🤩': 'מַדְהִים!',
  'ככה כותבים! 🏆': 'כָּכָה כּוֹתְבִים!',
  'כמו בספר! 📚': 'כְּמוֹ בַּסֵּפֶר!',
  'כל הכבוד! 👏': 'כָּל הַכָּבוֹד!',
  'יפה מאוד! 😊': 'יָפֶה מְאוֹד!',
  'הכתב משתפר! 💪': 'הַכְּתָב מִשְׁתַּפֵּר!',
  'איזה יופי! 🌟': 'אֵיזֶה יֹפִי!',
  'אהבתי! 💖': 'אָהַבְתִּי!',
  'ניסיון יפה! 💛': 'נִסָּיוֹן יָפֶה!',
  'עוד קצת אימון! 💪': 'עוֹד קְצָת אִמּוּן!',
  'כל ניסיון עוזר! 🙌': 'כָּל נִסָּיוֹן עוֹזֵר!',
  'כמעט! 🌱': 'כִּמְעַט!',
};

const AVATARS = ['🦄', '🐶', '🐱', '🦁', '🐻', '🐰', '🐼', '🦊', '🐸', '🐵', '🐧', '🦖', '🚀', '🌈', '⭐', '🌸'];

const INK_COLORS = ['#111111', '#2f6bff', '#e1306c', '#8a3ab9', '#20b26b', '#ff8a00'];
