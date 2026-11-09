import { chatId, ctx, settings } from './core.js';
import { ui } from './i18n.js';
import { memoryState } from './memory.js';
import { chatDates, liveThoughts } from './reactions.js';

// ---------- Экспорт партии ----------
function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function matchData() {
    const c = ctx();
    const { s } = settings();
    const log = liveThoughts();                   // только мысли о существующих сообщениях этого чата
    // даты сообщений в чате: если дата записи уже не встречается (после «Продолжить» ST её перезаписывает) — по индексу
    const dates = chatDates(c.chat);
    const turns = (c.chat || []).map((m, i) => ({ m, i })).filter(({ m }) => !m.is_system).map(({ m, i }) => ({
        index: i, side: m.is_user ? (m.extra?.aip ? 'agent' : 'human') : 'bot', name: m.name, time: m.send_date,
        model: m.is_user ? (m.extra?.aip?.model ?? null) : (m.extra?.model ?? null),
        api: m.is_user ? (m.extra?.aip?.provider ?? null) : (m.extra?.api ?? null),
        player_meta: m.extra?.aip ?? null,
        words: ((m.mes || '').match(/\S+/g) || []).length, swipes: m.swipes?.length ?? 1,
        text: m.mes || '',
        // сопоставляем по времени сообщения (индексы сдвигаются при удалении), старые записи — по индексу
        reactions: log.filter(e => (e.sendDate != null && dates.has(e.sendDate) ?(m.swipe_info || []).some(x => x?.send_date === e.sendDate) || e.sendDate === m.send_date : e.mesId === i))
            .map(e => ({ swipe: e.swipeId, text: e.text })),
    }));
    return {
        format: 'ai-player-match/2', exported: new Date().toISOString(), chatId: chatId(),
        character: c.name2, persona: c.name1,
        settings: { maxTokens: s.maxTokens, contextMessages: s.contextMessages, minWords: s.minWords, maxWords: s.maxWords, knowledge: s.knowledge, extraInstructions: s.extraInstructions, roleOverride: s.roleOverride, customPrompt: s.customPrompt, customDepth: s.customDepth, customRole: s.customRole, memory: s.memory, memoryEvery: s.memoryEvery },
        turns,   // ключей и secretId здесь нет
        memory: memoryState()?.text ?? null,
    };
}
const fileBase = () => `aip_${(ctx().name2 || 'chat').replace(/[^\p{L}\p{N}_-]+/gu, '_')}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
export function exportJSON() { download(`${fileBase()}.json`, JSON.stringify(matchData(), null, 2), 'application/json'); }
export function exportMD() {
    const d = matchData();
    const out = [`# ${d.persona} × ${d.character}`, ui`_Экспорт ${d.exported}_`, ''];
    for (const t of d.turns) {
        const tag = t.side === 'agent' ? ` — 🤖 ${t.model}` : t.side === 'bot' && t.model ? ` — ${t.model}` : t.side === 'human' ? ui(" — (вручную)") : '';
        const pm = t.player_meta;
        const extra = pm ? ui` · ${pm.words} сл.${pm.inRange ? '' : ' ⚠'} · ${(pm.latencyMs / 1000).toFixed(1)} с` : '';
        out.push(`### #${t.index} ${t.name}${tag}${extra}`, '', t.text, '');
        for (const r of t.reactions) out.push(...r.text.split('\n').map(l => `> 💭 ${l}`), '');
    }
    if (d.memory) out.push(ui("## Записи игрока"), '', d.memory, '');
    download(`${fileBase()}.md`, out.join('\n'), 'text/markdown');
}
