// Полнота словаря интерфейса: каждая строка, переданная в ui(...) / ui`...` / promptText(...) /
// promptText`...` в исходниках расширения, есть в английском словаре, и плейсхолдеры ${n}
// в ключе и переводе совпадают. Строки ищутся статически, поэтому проверяются и редкие ветки
// (ошибки, миграция), которые обычные тесты не проходят.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, loadDictionary } from './sources.mjs';

// Ключ шаблонной строки так же, как его строит formatTranslation: части + ${0}, ${1}, …
function extractCalls(src) {
    const out = [];
    const re = /\b(ui|promptText)\s*(\(|`)/g;
    let m;
    while ((m = re.exec(src))) {
        const at = m.index + m[0].length;
        if (m[2] === '`') {
            const { key } = readTemplate(src, at);
            out.push({ fn: m[1], key, pos: m.index });
            re.lastIndex = at;            // дальше ищем и внутри ${…}: там бывают вложенные ui`…`
        } else {
            const rest = src.slice(at).trimStart();
            const q = rest[0];
            if (q !== '"' && q !== "'") continue;                // ui(переменная) — не литерал
            const lit = readQuoted(rest, 0);
            out.push({ fn: m[1], key: cook(lit.raw, q), pos: m.index });
        }
    }
    return out;
}
function readQuoted(s, i) {
    const q = s[i];
    let j = i + 1;
    while (j < s.length && s[j] !== q) j += s[j] === '\\' ? 2 : 1;
    return { raw: s.slice(i, j + 1), end: j + 1 };
}
const cook = (raw) => Function(`"use strict"; return ${raw};`)();
// читает шаблон от символа после ` до закрывающей `; выражения ${…} (с вложенными шаблонами) → ${n}
function readTemplate(s, i) {
    let key = '', chunk = '', n = 0;
    const flush = () => { key += Function(`"use strict"; return \`${chunk}\`;`)(); chunk = ''; };
    while (i < s.length) {
        const ch = s[i];
        if (ch === '\\') { chunk += s.slice(i, i + 2); i += 2; continue; }
        if (ch === '`') { flush(); return { key, end: i + 1 }; }
        if (ch === '$' && s[i + 1] === '{') {
            flush();
            i = skipExpression(s, i + 2);
            key += '$' + `{${n++}}`;
            continue;
        }
        chunk += ch; i++;
    }
    throw new Error('unterminated template');
}
function skipExpression(s, i) {
    let depth = 1;
    while (i < s.length && depth) {
        const ch = s[i];
        if (ch === '"' || ch === "'") { i = readQuoted(s, i).end; continue; }
        if (ch === '`') { i = readTemplate(s, i + 1).end; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
    }
    return i;
}
const holes = t => [...String(t).matchAll(/\$\{(\d+)\}/g)].map(x => x[1]).sort().join(',');

test('i18n: every ui()/promptText() string has an English translation', () => {
    const dict = loadDictionary();
    const missing = [];
    let total = 0;
    for (const { file, text } of SOURCES()) {
        for (const c of extractCalls(text)) {
            total++;
            // строки, уже написанные по-английски, переводить не нужно
            if (!/[А-Яа-яЁё]/.test(c.key)) continue;
            if (!(c.key in dict)) missing.push(`${file}: ${c.fn} ${JSON.stringify(c.key)}`);
        }
    }
    assert.ok(total > 100, `найдено слишком мало строк (${total}) — разбор исходников сломался`);
    assert.deepEqual(missing, [], `нет перевода:\n${missing.join('\n')}`);
});

test('i18n: placeholders ${n} match between Russian keys and English values', () => {
    const bad = Object.entries(loadDictionary()).filter(([k, v]) => holes(k) !== holes(v)).map(([k, v]) => `${k} → ${v}`);
    assert.deepEqual(bad, []);
});

test('i18n: English values contain no Cyrillic', () => {
    const bad = Object.entries(loadDictionary()).filter(([, v]) => /[А-Яа-яЁё]/.test(v)).map(([k]) => k);
    assert.deepEqual(bad, []);
});

test('i18n: no unused dictionary entries', () => {
    const used = new Set();
    for (const { text } of SOURCES()) for (const c of extractCalls(text)) used.add(c.key);
    const unused = Object.keys(loadDictionary()).filter(k => !used.has(k));
    assert.deepEqual(unused, [], `лишние ключи словаря:\n${unused.join('\n')}`);
});
