// Исходники расширения для статических проверок и тестового стенда.
// Расширение — набор ES-модулей (index.js + src/*.js), ST загружает их как type="module"
// без сборки. Стенд в jsdom выполняет их одним классическим скриптом: убирает строки import/export
// и склеивает модули в порядке MODULE_ORDER (имена верхнего уровня во всех модулях уникальны).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_DIR = path.join(ROOT, 'src');

// порядок склейки: сначала то, что вычисляется при загрузке модуля (словарь, константы),
// потом остальное; index.js — точка входа — последним
export const MODULE_ORDER = [
    'i18n-en.js', 'i18n.js', 'core.js', 'errors.js', 'prompts-en.js', 'migrations.js', 'prompts.js', 'keys.js', 'api.js',
    'context.js', 'memory.js', 'reactions.js', 'turn.js', 'export.js', 'ui-thoughts.js', 'ui-modal.js', 'diagnostics.js',
];

export function moduleFiles() {
    const files = [];
    if (existsSync(SRC_DIR)) {
        const present = new Set(readdirSync(SRC_DIR).filter(f => f.endsWith('.js')));
        const extra = [...present].filter(f => !MODULE_ORDER.includes(f));
        if (extra.length) throw new Error(`Добавьте модули в MODULE_ORDER (tests/unit/sources.mjs): ${extra.join(', ')}`);
        for (const f of MODULE_ORDER) if (present.has(f)) files.push(path.join(SRC_DIR, f));
    }
    files.push(path.join(ROOT, 'index.js'));
    return files;
}

export const SOURCES = () => moduleFiles().map(f => ({ file: path.relative(ROOT, f), text: readFileSync(f, 'utf8').replace(/^﻿/, '') }));

// import … from './x.js';  (в т.ч. многострочный)  → удаляем; export перед объявлением → удаляем
export function stripModuleSyntax(text) {
    return text
        .replace(/^﻿/, '')
        .replace(/^\s*import\s[\s\S]*?\sfrom\s+['"][^'"]+['"];?[ \t]*$/gm, '')
        .replace(/^\s*import\s+['"][^'"]+['"];?[ \t]*$/gm, '')
        .replace(/^export\s+(?=(async\s+)?function|const|let|class)/gm, '')
        .replace(/^export\s*\{[^}]*\};?[ \t]*$/gm, '');
}
export const bundleForTests = () => SOURCES().map(s => `// ---- ${s.file} ----\n${stripModuleSyntax(s.text)}`).join('\n');

// Английский словарь интерфейса (UI_EN) — из модуля словаря или из index.js
export function loadDictionary() {
    for (const { text } of SOURCES()) {
        const m = text.match(/(?:export\s+)?const UI_EN = (\{[\s\S]*?\n\});/);
        if (m) return Function(`"use strict"; return (${m[1]});`)();
    }
    throw new Error('UI_EN не найден');
}
