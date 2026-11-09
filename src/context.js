import { activeProfile, chatId, ctx, num, settings } from './core.js';
import { promptText, ui } from './i18n.js';
import { memoryBlock } from './memory.js';
import { buildSystemPrompt, getPrompt, getSync, renderCustomPrompt, renderPrompt } from './prompts.js';

// Грубая оценка токенов (для обрезки); точный подсчёт — через токенайзер ST в шкале контекста.
// Кириллицу токенайзеры режут мельче латиницы, поэтому считаем её отдельно (с запасом)
export const estTokens = t => {
    const str = String(t || '');
    const cyr = (str.match(/[Ѐ-ӿ]/g) || []).length;
    return Math.ceil(cyr / 2.5 + (str.length - cyr) / 3.5);
};
export const ctxLimit = p => num(p?.contextSize, 1000, 2000000, 32000);

// Источник истории — ТОЛЬКО ctx().chat, т.е. открытый сейчас чат. Другие чаты не читаются.
export function buildMessages(s, sync, system = '') {
    const c = ctx();
    const p = activeProfile();
    const N = num(s.contextMessages, 2, 500, 30);
    const all = (c.chat || []).filter(m => !m.is_system && (m.mes || '').trim());
    const first = all.length > 1 ? all[0] : null;          // приветствие держим всегда
    let tail = first ? all.slice(Math.max(1, all.length - N)) : all.slice(-N);
    // обрезка по бюджету токенов: лимит модели − ответ − системный промпт − запас
    const custom = renderCustomPrompt(s, sync);
    const budget = ctxLimit(p) - num(s.maxTokens, 100, 16000, 1200) - estTokens(system) - estTokens(getPrompt(s, 'turn')) - estTokens(custom) - 600;
    let keepFirst = !!first;
    const cost = () => tail.reduce((a, m) => a + estTokens(m.mes) + 8, 0) + (keepFirst ? estTokens(first.mes) + 8 : 0);
    let trimmed = Math.max(0, all.length - (first ? 1 : 0) - tail.length);
    while (tail.length > 1 && cost() > budget) { tail = tail.slice(1); trimmed++; }
    // приветствие держим, пока влезает; не влезает даже с одним последним сообщением — жертвуем им
    if (keepFirst && cost() > budget) { keepFirst = false; trimmed++; }
    const overflow = cost() > budget;                     // не влезает даже минимальный контекст
    const chat = keepFirst ? [first, ...tail] : tail;
    const gap = trimmed > 0 && keepFirst;
    const raw = [];
    chat.forEach((m, i) => {
        if (i === 1 && gap) raw.push({ role: 'user', content: promptText("[…часть истории пропущена…]") });
        raw.push(m.is_user ? { role: 'assistant', content: m.mes } : { role: 'user', content: `${m.name}: ${m.mes}` });
    });
    // свой промпт — внедряется на заданную глубину, как Author's Note в ST:
    // 0 — в самом конце (перед напоминанием о ходе), N — перед последними N сообщениями истории
    if (custom) {
        const depth = num(s.customDepth, 0, 1000, 0);
        const at = Math.max(0, raw.length - depth);
        raw.splice(at, 0, { role: s.customRole === 'user' ? 'user' : 'system', content: custom, custom: true });
    }
    const msgs = [];
    for (const m of raw) {
        const last = msgs[msgs.length - 1];
        if (last && last.role === m.role && m.role !== 'system') last.content += `\n\n${m.content}`;
        else msgs.push({ role: m.role, content: m.content });
    }
    if (!msgs.length || msgs[0].role !== 'user') {
        msgs.unshift({ role: 'user', content: promptText`[Начало ролевой игры. Сценарий: ${sync.card.scenario || '—'}]` });
    }
    const turn = renderPrompt(s, sync, 'turn');
    const last = msgs[msgs.length - 1];
    if (last.role === 'user') last.content += `\n\n${turn}`;
    else msgs.push({ role: 'user', content: turn });
    msgs.meta = { chatId: chatId(), total: all.length, included: chat.length, trimmed, overflow };
    return msgs;
}

// ---------- Шкала контекста ----------
async function countTokens(text) {
    try {
        const f = ctx().getTokenCountAsync;
        if (typeof f === 'function') return await f(text);
    } catch { /* нет токенайзера — оценка */ }
    return estTokens(text);
}

let meterTimer = null, meterSeq = 0;
export function scheduleMeter() { clearTimeout(meterTimer); meterTimer = setTimeout(() => updateCtxMeter().catch(e => console.warn(ui("[AI Player] шкала:"), e)), 250); }

async function updateCtxMeter() {
    const box = document.getElementById('aip_ctx');
    if (!box) return;
    const id0 = chatId(), seq = ++meterSeq;
    if (!id0 || !(ctx().chat || []).length) {
        box.dataset.level = 'empty';
        document.getElementById('aip_ctxText').textContent = ui("Контекст: чат не открыт");
        for (const k of ['sys', 'hist', 'res']) document.getElementById(`aip_ctx_${k}`).style.width = '0';
        return;
    }
    const { s } = settings();
    const p = activeProfile();
    const sync = getSync();
    const system = buildSystemPrompt(s, sync);
    const msgs = buildMessages(s, sync, system);
    const [sys, hist] = await Promise.all([countTokens(system), countTokens(msgs.map(m => m.content).join('\n\n'))]);
    if (chatId() !== id0 || seq !== meterSeq) return;     // сменили чат или есть более свежий пересчёт
    const res = num(s.maxTokens, 100, 16000, 1200);
    const limit = ctxLimit(p);
    const used = sys + hist + res;
    const pct = used / limit;
    // сегменты идут подряд во flex-полосе; суммарно не больше 100%
    let left = 100;
    for (const [key, v] of [['sys', sys], ['hist', hist], ['res', res]]) {
        const w = Math.min(left, v / limit * 100);
        left -= w;
        document.getElementById(`aip_ctx_${key}`).style.width = `${w}%`;
    }
    const m = msgs.meta;
    box.dataset.level = pct > 1 || m.overflow ? 'over' : pct > 0.85 ? 'high' : 'ok';
    const k = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
    const memTok = memoryBlock(s, sync) ? await countTokens(memoryBlock(s, sync)) : 0;
    if (chatId() !== id0 || seq !== meterSeq) return;
    document.getElementById('aip_ctxText').textContent =
        ui`${k(used)} / ${k(limit)} (${Math.round(pct * 100)}%) · сообщений ${m.included}/${m.total}${m.trimmed ? ui` · ${m.trimmed} не влезло` : ''}${m.overflow ? ui(" · ⚠ последнее сообщение не влезает") : ''}`;
    box.title = ui`Только текущий чат: ${sync.personaName} × ${sync.card.name}\n`
        + ui`Системный промпт: ${sys} ток.${memTok ? ui` (из них записи игрока: ${memTok})` : ''}\nИстория чата: ${hist} ток.\nРезерв на ответ: ${res} ток.\nЛимит модели (настройка профиля): ${limit} ток.`;
}
