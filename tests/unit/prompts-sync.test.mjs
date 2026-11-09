// prompts/*.md — справочные копии встроенных промптов; источник один — src/prompts-en.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './sources.mjs';
import { promptDocs } from './sync-prompts.mjs';

test('prompts/*.md совпадают с src/prompts-en.js (иначе: node tests/unit/sync-prompts.mjs)', async () => {
    for (const [rel, text] of Object.entries(await promptDocs())) {
        const file = path.join(ROOT, rel);
        assert.ok(existsSync(file), `нет ${rel}`);
        assert.equal(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), text, `${rel} разошёлся с источником`);
    }
});

test('плейсхолдеры встроенных промптов известны подстановке', async () => {
    const { PROMPT_DEFAULTS, PROMPT_PRESETS } = await import(new URL(`file:///${path.join(ROOT, 'src', 'prompts-en.js').replace(/\\/g, '/')}`));
    const known = new Set(['player', 'partner', 'them', 'them_cap', 'partner_is', 'partners_word', 'persona', 'card', 'scenario', 'language_rule', 'extra', 'knowledge_rule', 'min', 'max']);
    const texts = [...Object.values(PROMPT_DEFAULTS), ...Object.values(PROMPT_PRESETS).flatMap(p => [p.system, p.turn])];
    for (const t of texts) for (const m of t.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)) assert.ok(known.has(m[1]), `неизвестный плейсхолдер {${m[1]}}`);
});
