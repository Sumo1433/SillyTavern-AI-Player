import { ctx, num } from './core.js';
import { languageRule, promptText, ui } from './i18n.js';
import { memoryBlock } from './memory.js';
import { PROMPT_DEFAULTS } from './prompts-en.js';

// ---------- Синхронизация с ST ----------
export function getSync() {
    const c = ctx();
    const sub = t => { try { return c.substituteParams ? c.substituteParams(t || '') : (t || ''); } catch { return t || ''; } };
    let f = {};
    try { f = c.getCharacterCardFields?.() ?? {}; } catch { /* старый ST */ }
    const personaName = c.name1 || ui("Игрок");
    const personaDesc = sub(f.persona ?? c.powerUserSettings?.persona_description ?? '').trim();
    let card, partners;
    if (c.groupId) {
        const g = (c.groups || []).find(x => x.id === c.groupId);
        const members = (g?.members || []).map(av => (c.characters || []).find(ch => ch.avatar === av)).filter(Boolean);
        partners = members.map(m => m.name);
        card = {
            name: partners.join(', ') || g?.name || ui("Группа"),
            description: members.map(m => `— ${m.name}: ${sub(m.description)}`).join('\n'),
            personality: members.map(m => m.personality ? `— ${m.name}: ${sub(m.personality)}` : '').filter(Boolean).join('\n'),
            scenario: sub(c.chatMetadata?.scenario || members[0]?.scenario || ''),   // переопределение сценария группы — в метаданных чата
        };
    } else {
        card = { name: c.name2 || ui("Персонаж"), description: sub(f.description), personality: sub(f.personality), scenario: sub(f.scenario) };
        partners = [card.name];
    }
    return { personaName, personaDesc, card, partners, isGroup: !!c.groupId };
}

export function syncPreviewText(sync) {
    const cut = (t, n = 300) => (t && t.length > n ? t.slice(0, n) + '…' : t) || '—';
    return ui`Персона (агент-игрок): ${sync.personaName}\n${cut(sync.personaDesc)}\n\n`
        + `${sync.isGroup ? ui("Группа") : ui("Карта чара")}: ${sync.card.name}\n${cut(sync.card.description)}\n`
        + ui`Сценарий: ${cut(sync.card.scenario, 200)}`;
}

export function wordRange(s) {
    let lo = num(s.minWords, 10, 1000, 50), hi = num(s.maxWords, 20, 2000, 200);
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
}

export const getPrompt = (s, k) => (s.prompts?.[k] || '').trim() || PROMPT_DEFAULTS[k];

function promptVars(s, sync) {
    const { personaName: P, personaDesc, card, isGroup } = sync;
    const C = card.name;
    const [lo, hi] = wordRange(s);
    const them = isGroup ? promptText`персонажей «${C}»` : `«${C}»`;
    return {
        player: P, partner: C, them, them_cap: `«${C}»`,
        partner_is: isGroup ? promptText("Персонажами") : promptText("Персонажем"),
        partners_word: isGroup ? promptText("СОБЕСЕДНИКИ") : promptText("СОБЕСЕДНИК"),
        persona: s.roleOverride || personaDesc || promptText("(описание не задано — выстрой характер из хода игры и оставайся последовательным)"),
        card: [promptText`Описание: ${card.description || '—'}`, card.personality ? promptText`Характер: ${card.personality}` : '', promptText`Сценарий: ${card.scenario || '—'}`].filter(Boolean).join('\n'),
        scenario: card.scenario || '—',
        language_rule: languageRule(),
        extra: s.extraInstructions ? promptText`\nДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ ИГРОКУ:\n${s.extraInstructions}\n` : '',
        knowledge_rule: s.knowledge === 'scene'
            ? promptText`Описание мира и ${them} выше — знание ведущего. «${P}» знает только то, что сам видел, слышал или мог знать по своей биографии. Скрытое не используй.`
            : promptText("Можешь опираться на всё описание мира выше."),
        min: lo, max: hi,
    };
}

export function renderPrompt(s, sync, key) {
    const vars = promptVars(s, sync);
    // {name} — плейсхолдеры расширения; {{name}} не трогаем — это макросы ST
    let t = getPrompt(s, key).replace(/(?<!\{)\{(\w+)\}(?!\})/g, (m, k) => (k in vars ? String(vars[k]) : m));
    try { t = ctx().substituteParams?.(t) ?? t; } catch { /* без макросов ST */ }
    return t.replace(/\n{3,}/g, '\n\n').trim() + '\n\n' + languageRule();
}

// Системный промпт хода + записи игрока (если память включена и записи есть)
export const buildSystemPrompt = (s, sync) => renderPrompt(s, sync, 'system') + memoryBlock(s, sync);

// Свой промпт пользователя (вкладка «Промпты» → «Свой промпт»): те же плейсхолдеры и макросы ST
export function renderCustomPrompt(s, sync) {
    const text = String(s.customPrompt || '').trim();
    if (!text) return '';
    const vars = promptVars(s, sync);
    let t = text.replace(/(?<!\{)\{(\w+)\}(?!\})/g, (m, k) => (k in vars ? String(vars[k]) : m));
    try { t = ctx().substituteParams?.(t) ?? t; } catch { /* без макросов ST */ }
    return t.trim();
}
