// Справочные копии встроенных промптов в prompts/ генерируются из единственного источника —
// src/prompts-en.js. Запуск после правки промптов: node tests/unit/sync-prompts.mjs
// Тест prompts-sync.test.mjs падает, если копии разошлись с источником.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { ROOT } from './sources.mjs';

const NOTE = 'Generated from `src/prompts-en.js` by `node tests/unit/sync-prompts.mjs` — edit the source, not this file.';

export async function promptDocs() {
    const { PROMPT_DEFAULTS, PROMPT_PRESETS } = await import(pathToFileURL(path.join(ROOT, 'src', 'prompts-en.js')).href);
    const docs = {};
    docs['prompts/final.md'] = [
        '# Combined player prompts', '',
        'Built-in instructions are English. Output follows the language of play; the extension appends its language rule at runtime. Placeholders and user-supplied text are preserved.', '',
        NOTE, '',
        ...['system', 'turn', 'reaction', 'memory'].flatMap(k => [`## ${k}`, '', PROMPT_DEFAULTS[k], '']),
    ].join('\n');
    for (const [name, p] of Object.entries(PROMPT_PRESETS)) {
        docs[`prompts/drafts/${name}.md`] = [
            `# ${name}`, '', NOTE, '', p.system, '', '## Turn reminder', '', p.turn, '',
            '## Impressions (reaction)', '',
            'Shared by all presets and the combined prompt: presets differ only in play style, not in how the player shares impressions.', '',
            p.reaction, '',
            '## Character notes (memory)', '',
            'Shared by all presets: applying a preset resets the memory prompt to the built-in one. See `prompts/final.md`, section `memory`.', '',
        ].join('\n');
    }
    return docs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    for (const [rel, text] of Object.entries(await promptDocs())) {
        const file = path.join(ROOT, rel);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, text, 'utf8');
        console.log('written', rel);
    }
}
