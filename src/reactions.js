import { callModel, reactionMaxTokens } from './api.js';
import { activeProfile, chatId, ctx, findProfile, settings } from './core.js';
import { AipError, describeError, redact } from './errors.js';
import { promptText, ui } from './i18n.js';
import { isPlayable } from './memory.js';
import { getSync, renderPrompt } from './prompts.js';
import { appendThought, setReactions } from './ui-thoughts.js';

export let reactCtl = null;          // запрос «впечатлений» — отменяется при смене чата и их выключении
export const reacted = new Set();

const buildReactionPrompt = (s, sync, upTo) => renderPrompt(s, sync, 'reaction', upTo);

// Последние n сообщений игры до сообщения upTo включительно (по умолчанию — до конца чата)
function transcript(n = 6, upTo = Infinity) {
    return (ctx().chat || []).slice(0, upTo + 1).filter(isPlayable).slice(-n)
        .map(m => `${m.is_user ? promptText("[ТЫ] ") : ''}${m.name}: ${m.mes}`).join('\n\n');
}

// ---------- Вывод агента после ответа бота ----------
export async function onBotMessage(id) {
    const { s } = settings();
    if (!s.reactions) return;
    const c = ctx();
    const m = c.chat?.[id];
    if (!m || m.is_user || m.is_system || !(m.mes || '').trim()) return;
    let j = id - 1;
    while (j >= 0 && c.chat[j].is_system) j--;
    const pm = c.chat[j];
    if (!pm?.is_user || !pm.extra?.aip) return;            // реагируем только на ответ на ход агента

    const id0 = chatId();
    // снимок версии ответа: всё, что понадобится после ожидания, берём отсюда, а не из объекта
    // сообщения — ST меняет его на месте при свайпе, «Продолжить» и правке
    const snap = {
        chatId: id0, id, swipeId: m.swipe_id ?? 0, sendDate: m.send_date ?? null, genFinished: String(m.gen_finished ?? ''),
        mes: m.mes, bot: m.name, botModel: m.extra?.model || '?', playerModel: pm.extra.aip.model, profileId: pm.extra.aip.profileId,
    };
    // в ключ входит время генерации: после «Перегенерировать» новый ответ приходит с тем же
    // индексом и swipe_id 0, но с новым send_date/gen_finished
    const key = `${id0}:${id}:${snap.swipeId}:${snap.sendDate ?? ''}:${snap.genFinished}`;
    if (reacted.has(key)) return;
    reacted.add(key);

    const p = findProfile(snap.profileId) || activeProfile();
    if (!p?.model) { reacted.delete(key); return; }
    const sync = getSync();
    reactCtl?.abort();
    reactCtl = new AbortController();
    const signal = reactCtl.signal;
    setReactionFailure(null);
    try {
        const res = await callModel(p, s, buildReactionPrompt(s, sync, id),
            [{ role: 'user', content: promptText`Последние сообщения игры:\n\n${transcript(6, id)}\n\n[Что у тебя в голове об игре после ответа «${snap.bot}»?]` }],
            { maxTokens: reactionMaxTokens(p), signal });
        if (chatId() !== id0 || signal.aborted) { reacted.delete(key); return; }
        // исходный ответ удалили, отредактировали, сменили свайп или перегенерировали — впечатление о нём уже не к месту
        if (!sameReplyVersion(snap)) { reacted.delete(key); return; }
        const text = String(res.text || '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim();
        if (!text) throw new AipError('empty', '');
        const entry = {
            chatId: snap.chatId, mesId: snap.id, swipeId: snap.swipeId, sendDate: snap.sendDate, bot: snap.bot,
            playerModel: snap.playerModel, botModel: snap.botModel, text, ts: Date.now(),
        };
        const meta = ctx().chatMetadata;
        if (meta) {
            (meta.aip_log ??= []).push(entry);
            ctx().saveMetadata?.();
        }
        appendThought(entry);
    } catch (e) {
        reacted.delete(key);                          // неудачную реакцию можно получить повторно
        if (e.name === 'AbortError') return;
        console.warn('[AI Player]', redact(e?.message));
        const msg = describeError(e, 'reaction');
        const failure = { ...snap, message: msg };
        setReactionFailure(failure);
        // уведомление повторяет именно свой сбой, а не последний
        toastr.warning(msg + ui(" Нажмите, чтобы повторить."), 'AI Player', { timeOut: 10000, onclick: () => retryReaction(failure) });
    }
}

// Тот же ли это ответ бота, что был при запуске запроса
function sameReplyVersion(snap) {
    if (chatId() !== snap.chatId) return false;
    const m = ctx().chat?.[snap.id];
    return !!m && !m.is_user && !m.is_system && (m.swipe_id ?? 0) === snap.swipeId
        && (m.send_date ?? null) === snap.sendDate && m.mes === snap.mes;
}

// Последнее неудачное впечатление — для ручного повтора без повторного хода и ответа бота
let reactionFailure = null;
export function setReactionFailure(f) {
    reactionFailure = f;
    const panel = document.getElementById('aip_thoughts');
    if (!panel) return;
    panel.classList.toggle('aip-has-failed', !!f);
    const t = panel.querySelector('.aip-th-failtext');
    if (t) t.textContent = f?.message || '';
}
export function retryReaction(f = reactionFailure) {
    if (!f) return;
    if (!sameReplyVersion(f)) {
        if (reactionFailure === f) setReactionFailure(null);
        toastr.info(ui("Ответ бота изменился или удалён — повторять нечего"), 'AI Player');
        return;
    }
    if (!settings().s.reactions) setReactions(true);
    onBotMessage(f.id);
}

// ---------- Актуальность мыслей ----------
// Мысль живёт, пока существует ответ бота, на который она была: удалили сообщение, перегенерировали
// ответ или метаданные скопировались в другой чат (ветка/копия) — мысль убирается.
export function chatDates(chat) {
    const dates = new Set();
    for (const m of chat || []) { if (m.send_date) dates.add(m.send_date); for (const x of m.swipe_info || []) if (x?.send_date) dates.add(x.send_date); }
    return dates;
}
function thoughtAlive(e, chat, dates, cid) {
    if (e.chatId && cid && e.chatId !== cid) return false;                 // мысль из другого чата
    if (e.sendDate != null) return dates.has(e.sendDate);                  // ответ бота ещё существует (дата обновляется при «Продолжить»)
    // старые записи без даты — по индексу и имени бота
    const m = chat?.[e.mesId];
    return !!m && !m.is_user && !m.is_system && (!e.bot || m.name === e.bot);
}
// «Продолжить» перезаписывает дату ответа — переносим её в мысли об этом ответе, чтобы они не потерялись
export function retagThoughts(id) {
    const c = ctx();
    const m = c.chat?.[id];
    const log = c.chatMetadata?.aip_log;
    if (!m || !log?.length) return;
    const cid = chatId();
    let changed = false;
    // не зависим от порядка, в котором ST обновляет send_date и swipe_info: просто переносим текущую дату
    for (const e of log) {
        if (e.mesId === id && (!e.chatId || e.chatId === cid) && e.sendDate != null
            && (e.swipeId ?? 0) === (m.swipe_id ?? 0) && e.sendDate !== m.send_date) { e.sendDate = m.send_date; changed = true; }
    }
    if (changed) c.saveMetadata?.();
}
export function liveThoughts() {
    const c = ctx();
    const log = c.chatMetadata?.aip_log || [];
    const dates = chatDates(c.chat), cid = chatId();
    return log.filter(e => thoughtAlive(e, c.chat, dates, cid));
}
// Удаляет из лога мысли о несуществующих сообщениях; возвращает true, если что-то удалено
export function pruneThoughts() {
    const c = ctx();
    const meta = c.chatMetadata;
    if (!meta?.aip_log?.length || !chatId()) return false;
    const live = liveThoughts();
    if (live.length === meta.aip_log.length) return false;
    meta.aip_log = live;
    c.saveMetadata?.();
    return true;
}
