import { callModel, memoryMaxTokens } from './api.js';
import { ctxLimit, estTokens } from './context.js';
import { activeProfile, chatId, ctx, findProfile, num, settings } from './core.js';
import { AipError, describeError, redact } from './errors.js';
import { promptText, tavernLocale, ui } from './i18n.js';
import { getSync, renderPrompt } from './prompts.js';
import { MEMORY_HEADER } from './prompts-en.js';

export let memCtl = null;            // запрос обновления записей игрока
export let memBusy = false;

// ---------- Записи игрока (память персонажа) ----------
// chatMetadata.aip_memory = { chatId, text, upTo, upToDate, hash, rev, review, skipped, updated, model }
// upTo/upToDate — последнее учтённое сообщение (ход агента; ответ бота после него не входит,
// поэтому свайп и перегенерация ответа записи не портят). hash — отпечаток учтённой истории
// (текст, вариант свайпа, дата и порядок сообщений 0..upTo): если история изменилась, записи
// помечаются как требующие проверки. rev растёт при каждой записи — так фоновое обновление
// узнаёт, что записи поправили вручную или очистили, пока шёл запрос.
export const isPlayable = m => !!m && !m.is_system && !!(m.mes || '').trim();
function fnv1a(str, h = 0x811c9dc5) {
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
}
function historyHash(chat, end) {
    let h = 0x811c9dc5;
    for (let i = 0; i <= end && i < (chat?.length || 0); i++) {
        const m = chat[i];
        if (!isPlayable(m)) continue;
        h = fnv1a(`${i}\u0001${m.send_date ?? ''}\u0001${m.swipe_id ?? 0}\u0001${m.is_user ? 1 : 0}\u0001${m.mes}\u0002`, h);
    }
    return h.toString(36);
}
export function memoryState() {
    const c = ctx();
    const mem = c.chatMetadata?.aip_memory;
    if (!mem || !String(mem.text || '').trim()) return null;
    const chat = c.chat || [];
    const cid = chatId();
    const sameChat = !mem.chatId || !cid || mem.chatId === cid;
    let index = -1, stale = false;
    if (mem.upToDate) {
        index = chat.findIndex(m => m.send_date === mem.upToDate);
        if (index < 0) {
            // ветка от более раннего места — записи знают «будущее», в этом чате их не используем
            if (!sameChat) return null;
            index = Math.min(num(mem.upTo, -1, 1e9, -1), chat.length - 1);
            stale = true;     // учтённое сообщение удалено — в записях могут быть отменённые события
        } else if (mem.hash && historyHash(chat, index) !== mem.hash) {
            stale = true;     // учтённую историю отредактировали, удалили или сменили свайп
        }
    }
    return { ...mem, index, stale: stale || !!mem.review };
}

export function memoryBlock(s, sync) {
    if (!s.memory) return '';
    const mem = memoryState();
    if (!mem) return '';
    return `\n\n${MEMORY_HEADER.replace('{player}', sync.personaName)}\n${String(mem.text).trim()}`;
}

// Обновляет записи по сообщениям после последнего учтённого до upTo (по умолчанию — до конца чата)
export async function updateMemory({ upTo, manual = false } = {}) {
    const c = ctx();
    const id0 = chatId();
    if (!id0) { if (manual) toastr.warning(ui("Откройте чат")); return false; }
    if (memBusy) { if (manual) toastr.info(ui("Записи уже обновляются")); return false; }
    const { s } = settings();
    const chat = c.chat || [];
    const end = Math.min(upTo ?? chat.length - 1, chat.length - 1);
    const mem = memoryState();
    const from = mem ? mem.index + 1 : 0;
    const fresh = chat.slice(from, end + 1).filter(isPlayable);
    if (!fresh.length) { if (manual) toastr.info(ui("Новых сообщений для записей нет")); return false; }
    const lastAgent = chat.slice(0, end + 1).reverse().find(m => m.is_user && m.extra?.aip);
    const p = findProfile(lastAgent?.extra.aip.profileId) || activeProfile();
    if (!p?.model) { if (manual) toastr.warning(ui("Укажите модель в окне AI Player")); return false; }
    const sync = getSync();
    const system = renderPrompt(s, sync, 'memory');
    const endDate = chat[end]?.send_date ?? null;
    // ---- бюджет (п. 3): фактический лимит ответа, системный промпт с правилом языка, прежние
    // записи целиком (их не режем), служебный текст и запас на разметку сообщений
    const maxOut = memoryMaxTokens(p);
    const prevText = mem ? String(mem.text).trim() : '';
    const frame = skipped => promptText`Прежние записи:\n${prevText || promptText("(пока пусто)")}\n\n`
        + promptText`Новые сообщения игры${skipped ? promptText` (самые старые ${skipped} не поместились)` : ''}:\n\n${'\u0000'}\n\n`
        + promptText`[Обнови записи «${sync.personaName}». Выведи только записи.]`;
    const overhead = 64;                                           // роли, разделители, служебные токены
    const limit = ctxLimit(p);
    let lines = fresh.map(m => `${m.is_user ? promptText("[ТЫ] ") : ''}${m.name}: ${m.mes}`);
    const total = (ls, skipped) => estTokens(system) + estTokens(frame(skipped)) + ls.reduce((a, l) => a + estTokens(l) + 4, 0) + maxOut + overhead;
    let skipped = 0;
    // самые новые сообщения важнее: если не влезают, отбрасываем старые и говорим об этом явно
    while (lines.length > 1 && total(lines, skipped) > limit) { lines = lines.slice(1); skipped++; }
    if (total(lines, skipped) > limit) {
        // минимальный запрос (прежние записи + одно сообщение) не помещается — не отправляем
        const without = estTokens(system) + estTokens(frame(0)) + maxOut + overhead;
        const why = without > limit
            ? ui`прежние записи и инструкции уже занимают ~${without} из ${limit} токенов`
            : ui`сообщение #${chat.indexOf(fresh.at(-1))} слишком длинное для лимита ${limit} токенов`;
        toastr.warning(ui`AI Player: записи не обновлены — запрос не помещается в контекст модели (${why}). Увеличьте «Контекст модели» в профиле или сократите записи.`, 'AI Player', { timeOut: 10000 });
        return false;
    }
    const user = frame(skipped).replace('\u0000', lines.join('\n\n'));
    // ---- снимок (п. 2): учтённая история 0..end и ревизия записей на момент запуска
    const meta0 = c.chatMetadata;
    const snap = { hash: historyHash(chat, end), rev: meta0?.aip_memory?.rev ?? 0, text: meta0?.aip_memory?.text ?? null };
    memBusy = true;
    memCtl = new AbortController();
    const signal = memCtl.signal;
    renderMemory();
    try {
        const res = await callModel(p, s, system, [{ role: 'user', content: user }], { maxTokens: maxOut, signal });
        if (chatId() !== id0 || signal.aborted) return false;
        const text = String(res.text || '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim();
        if (!text) throw new AipError('empty', ui("модель вернула пустые записи"));
        const meta = ctx().chatMetadata;
        if (!meta) return false;
        // пока шёл запрос, изменили учтённые сообщения (правка, удаление, свайп) — результат устарел
        if (historyHash(ctx().chat || [], end) !== snap.hash) {
            toastr.info(ui("Записи не обновлены: пока шёл запрос, изменились сообщения, по которым они составлялись. Новые записи будут составлены при следующем обновлении."), 'AI Player', { timeOut: 7000 });
            return false;
        }
        // записи поправили вручную или очистили — свежая правка важнее результата запроса
        if ((meta.aip_memory?.rev ?? 0) !== snap.rev || (meta.aip_memory?.text ?? null) !== snap.text) {
            toastr.info(ui("Записи не обновлены: их изменили вручную, пока шёл запрос. Ваша правка сохранена."), 'AI Player', { timeOut: 7000 });
            return false;
        }
        if (res.truncated) toastr.warning(ui("Записи обрезаны по лимиту токенов — часть разделов могла потеряться"), 'AI Player');
        if (skipped) toastr.warning(ui`Записи обновлены, но ${skipped} самых старых новых сообщений не поместились в контекст и не учтены.`, 'AI Player', { timeOut: 7000 });
        meta.aip_memory = {
            chatId: id0, text, upTo: end, upToDate: endDate, hash: snap.hash, rev: snap.rev + 1,
            review: !!mem?.stale, skipped: skipped || 0, updated: Date.now(), model: p.model,
        };
        ctx().saveMetadata?.();
        if (manual) toastr.success(ui("Записи игрока обновлены"), 'AI Player', { timeOut: 2500 });
        return true;
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.warn('[AI Player]', redact(e?.message));
            toastr.warning(describeError(e, 'memory') + ui(" Нажмите, чтобы повторить."), 'AI Player', { timeOut: 10000, onclick: () => updateMemory({ upTo: end, manual: true }) });
        }
        return false;
    } finally {
        memBusy = false;
        memCtl = null;
        renderMemory();
    }
}

// После ответа бота на ход агента: пора ли обновить записи (каждые N ходов агента)
export function maybeUpdateMemory(id) {
    const { s } = settings();
    if (!s.memory) return;
    const c = ctx();
    const m = c.chat?.[id];
    if (!m || m.is_user || m.is_system) return;
    let j = id - 1;
    while (j >= 0 && c.chat[j].is_system) j--;
    const pm = c.chat[j];
    if (!pm?.is_user || !pm.extra?.aip) return;
    const mem = memoryState();
    const turns = c.chat.slice(mem ? mem.index + 1 : 0, j + 1).filter(x => x.is_user && x.extra?.aip).length;
    if (turns >= num(s.memoryEvery, 1, 50, 3)) updateMemory({ upTo: j });
}

let memSaveTimer = null;
export function renderMemory() {
    const ta = document.getElementById('aip_memText');
    if (!ta) return;
    const mem = chatId() ? memoryState() : null;
    if (document.activeElement !== ta) ta.value = mem?.text || '';
    ta.readOnly = memBusy;
    document.getElementById('aip_memUpdate')?.classList.toggle('disabled', memBusy);
    const { s } = settings();
    const when = mem?.updated ? new Date(mem.updated).toLocaleString(tavernLocale()) : '';
    document.getElementById('aip_memState').textContent = [
        memBusy ? ui("⏳ Обновляю записи…")
            : mem ? ui`Записи от ${when || '—'}${mem.model ? ` · ${mem.model}` : ''}${mem.index >= 0 ? ui` · учтены сообщения до #${mem.index}` : ''}`
                : ui("Записей пока нет."),
        mem?.stale ? ui("⚠ Требуют проверки: сообщения, по которым составлены записи, изменены или удалены — в записях могут остаться отменённые события. Поправьте их вручную или очистите и обновите.") : '',
        mem?.skipped ? ui`При последнем обновлении не поместились и не учтены сообщений: ${mem.skipped}.` : '',
        s.memory ? '' : ui("Память выключена: записи не обновляются сами и не подмешиваются в ход."),
    ].filter(Boolean).join('\n');
}
// Ручная правка записей: сохраняем в метаданные текущего чата
export function onMemoryInput(e) {
    const meta = ctx().chatMetadata;
    const id0 = chatId();
    if (!meta || !id0 || memBusy) return;
    const text = e.target.value;
    const rev = (meta.aip_memory?.rev ?? 0) + 1;
    // ручная правка = записи проверены человеком: снимаем пометку «требуют проверки» и фиксируем
    // отпечаток текущей истории
    if (!text.trim()) delete meta.aip_memory;
    else if (meta.aip_memory) {
        const st = memoryState();
        const idx = st?.index ?? -1;
        Object.assign(meta.aip_memory, { text, chatId: id0, rev, review: false, updated: Date.now() });
        if (idx >= 0) Object.assign(meta.aip_memory, { upTo: idx, upToDate: ctx().chat[idx]?.send_date ?? null, hash: historyHash(ctx().chat, idx) });
    }
    else meta.aip_memory = { chatId: id0, text, upTo: -1, upToDate: null, rev, updated: Date.now(), model: ui("вручную") };
    clearTimeout(memSaveTimer);
    memSaveTimer = setTimeout(() => { if (chatId() === id0) ctx().saveMetadata?.(); }, 800);
}
