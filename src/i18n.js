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

export function languageRule() {
    return 'OUTPUT LANGUAGE: Write the turn, impressions, and character notes in the language the user is playing in. ' +
        'Honor an explicit request to change the language of play. Otherwise follow the latest substantive user-character messages in the supplied game history; ' +
        'if there are no such messages, follow the current scene dialogue. Do not infer the language from character names, code, or quoted foreign phrases. ' +
        'English system instructions, card metadata, and the UI language must not override an established language of play. ' +
        'If no game language can be inferred, use the SillyTavern interface locale (' + tavernLocale() + '). ' +
        'Translate thought labels and memory headings into the language of play. Output only the requested content, without explaining the language choice.';
}
