import { UI_EN } from './i18n-en.js';

// Язык интерфейса — по языку SillyTavern; встроенные промпты — на английском с правилом языка игры.
export function tavernLocale() {
    try {
        const locale = SillyTavern.getContext().getCurrentLocale?.();
        if (locale) return String(locale).toLowerCase();
    } catch { /* compatibility with older ST */ }
    try { return String(localStorage.getItem('language') || navigator.language || 'en').toLowerCase(); }
    catch { return 'en'; }
}
function formatTranslation(input, values, english) {
    const key = typeof input === 'string' ? input : input.reduce((out, part, i) => out + part + (i < values.length ? '\$' + '{' + i + '}' : ''), '');
    const text = english ? (UI_EN[key] ?? key) : key;
    // Substitute once, so text from users containing placeholder syntax remains literal.
    return text.replace(/\$\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match);
}
export function ui(input, ...values) { return formatTranslation(input, values, !/^ru(?:-|$)/.test(tavernLocale())); }
export function promptText(input, ...values) { return formatTranslation(input, values, true); }

// ---------- Язык игры ----------
// Язык определяется по последним сообщениям чата (а не по персоне, карте или интерфейсу ST):
// иначе модель видела русское описание персоны и локаль ru-ru и писала впечатления по-русски
// при игре на английском.
const SCRIPTS = [
    ['cyr', /\p{Script=Cyrillic}/u], ['lat', /\p{Script=Latin}/u], ['jpn', /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
    ['han', /\p{Script=Han}/u], ['kor', /\p{Script=Hangul}/u], ['ara', /\p{Script=Arabic}/u],
    ['grc', /\p{Script=Greek}/u], ['heb', /\p{Script=Hebrew}/u],
];
// только однозначно английские слова: «a», «in», «me», «was», «to» есть и в других языках
const EN_WORDS = new Set("the and you your you're that this with what have but his her she they them their are for not it's i'm don't can't would there just from will".split(' '));
// частые служебные слова других языков на латинице (es, de, fr, it, pt, nl, pl…)
const NON_EN_WORDS = new Set('de la el los las que del por para una und der die das ist ich nicht mit ein eine le les et est une des il che non sono per não uma com het een niet jest nie się'.split(' '));

// Текст сообщения без того, что не говорит о языке: код, ссылки, макросы
const stripMarkup = text => String(text || '')
    .replace(/```[\s\S]*?```|`[^`]*`/g, ' ').replace(/\{\{[^}]*\}\}/g, ' ').replace(/https?:\/\/\S+/g, ' ');
// …а также блоки размышлений и HTML-панели (статус-панели карт часто на другом языке)
const stripBlocks = text => text.replace(/<(think|thinking|details|div|table|style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ');
const letterCount = s => (s.match(/\p{L}/gu) || []).length;

// Язык одного текста: название языка; 'latin' / 'cyrillic' — уверенно другой язык на этой письменности
// (точно не называем); null — не определить
export function detectLanguage(text) {
    let s = stripMarkup(text);
    const outside = stripBlocks(s);
    s = letterCount(outside) >= 12 ? outside : s.replace(/<[^>]*>/g, ' ');   // панели учитываем, только если кроме них текста нет
    const counts = {};
    let letters = 0;
    for (const ch of s) {
        if (!/\p{L}/u.test(ch)) continue;
        letters++;
        const sc = SCRIPTS.find(([, re]) => re.test(ch));
        if (sc) counts[sc[0]] = (counts[sc[0]] || 0) + 1;
    }
    if (letters < 12) return null;
    // японский текст содержит и кандзи, поэтому заметная доля каны важнее иероглифов;
    // но короткая японская цитата в русском или английском тексте язык игры не меняет
    const jpn = counts.jpn || 0;
    if (jpn >= Math.max(2, letters * 0.03) && jpn + (counts.han || 0) >= letters * 0.5) return 'Japanese';
    const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
    if (!top || n < letters * 0.6) return null;
    if (top === 'cyr') {
        if (/[јљњћџѓќѕў]/i.test(s) || /ъ(?![еёюя])/i.test(s)) return 'cyrillic';   // сербский, македонский, белорусский, болгарский
        if (/[ыэ]/i.test(s)) return 'Russian';
        if (/[іїєґ]/i.test(s)) return 'Ukrainian';
        return 'Russian';
    }
    if (top === 'lat') {
        const words = s.toLowerCase().replace(/[’‘]/g, "'").match(/\p{Script=Latin}+(?:'\p{Script=Latin}+)?/gu) || [];
        const en = words.filter(w => EN_WORDS.has(w)).length;
        const other = words.filter(w => NON_EN_WORDS.has(w)).length;
        const marks = (s.match(/[à-öø-ÿāăąćčďęěğłńňőœřśşšťůűźżžß]/gi) || []).length;
        // английский сигнал важнее диакритики: имена и заимствования (José, café) не делают текст «другой латиницей»
        if (en >= 2 && en >= other * 2) return 'English';
        if ((other >= 2 && other > en) || (marks && en < 2) || (/[¿¡]/.test(s) && !en)) return 'latin';
        return null;
    }
    return { han: 'Chinese', kor: 'Korean', ara: 'Arabic', grc: 'Greek', heb: 'Hebrew' }[top];
}

// Язык игры по последним содержательным сообщениям чата до upTo включительно (свежее важнее).
// preferUser — сначала сообщения за персонажа пользователя (для хода агента: бот может сбиться на язык карты).
export function playLanguage(upTo = Infinity, { preferUser = false } = {}) {
    let chat = [];
    try { chat = SillyTavern.getContext().chat || []; } catch { /* нет ST */ }
    const last = Math.min(Number.isFinite(upTo) ? upTo : Infinity, chat.length - 1);
    const scan = onlyUser => {
        for (let i = last, seen = 0; i >= 0 && seen < 4; i--) {
            const m = chat[i];
            if (!m || m.is_system || !String(m.mes || '').trim() || (onlyUser && !m.is_user)) continue;
            seen++;
            const lang = detectLanguage(m.mes);
            if (lang) return lang;
        }
        return null;
    };
    return (preferUser && scan(true)) || scan(false);
}

export function languageRule(upTo = Infinity, opts = {}) {
    const lang = playLanguage(upTo, opts);
    const tail = 'Honor an explicit in-game request to switch languages. ' +
        'Do not take the language from the persona or character descriptions, character names, these instructions, or the SillyTavern interface locale. ' +
        'Translate thought labels and memory headings into the language of play. Output only the requested content, without explaining the language choice.';
    if (lang && lang !== 'latin' && lang !== 'cyrillic') {
        return `OUTPUT LANGUAGE: The game is currently being played in ${lang} (detected from the latest game messages). ` +
            `Write the turn, impressions, and character notes in ${lang}, even if the persona, the character card, or the interface use another language. ` + tail;
    }
    const script = { latin: 'a Latin-script language', cyrillic: 'a Cyrillic-script language' }[lang];
    return 'OUTPUT LANGUAGE: Write the turn, impressions, and character notes in the language of the game messages in the supplied history' +
        (script ? ` (${script} — use exactly that language)` : '') + '. ' +
        'Follow the latest substantive messages of the game; if there are none, follow the current scene dialogue. Do not infer the language from quoted foreign phrases or code. ' +
        (script ? '' : 'If no game language can be inferred, use the SillyTavern interface locale (' + tavernLocale() + '). ') + tail;
}
