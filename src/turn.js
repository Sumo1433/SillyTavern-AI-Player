import { callModel, cleanReply } from './api.js';
import { buildMessages } from './context.js';
import { activeProfile, chatId, ctx, num, settings, srcOf } from './core.js';
import { AipError, describeError, redact } from './errors.js';
import { ui } from './i18n.js';
import { profileHasKey, vault } from './keys.js';
import { buildSystemPrompt, getSync, wordRange } from './prompts.js';
import { openModal } from './ui-modal.js';

export let busy = false;
export let abortCtl = null;
let pendingMeta = null;

// ---------- Ход игрока ----------
const isStBusy = () => {
    const st = document.getElementById('mes_stop');
    return !!st && getComputedStyle(st).display !== 'none';
};

function setBusy(v) {
    busy = v;
    for (const b of document.querySelectorAll('.aip-play')) {
        b.classList.toggle('aip-busy', v);
        b.classList.toggle('fa-play', !v);
        b.classList.toggle('fa-stop', v);
        b.title = v ? ui("AI Player: остановить") : ui("AI Player: сделать ход за игрока");
    }
}

export async function playTurn() {
    if (busy) { abortCtl?.abort(); return; }              // повторное нажатие = стоп
    setBusy(true);
    abortCtl = new AbortController();
    const signal = abortCtl.signal;
    try {
        const { s } = settings();
        const p = activeProfile();
        if (isStBusy()) { toastr.warning(ui("Таверна ещё генерирует — дождитесь окончания")); return; }
        if (!p.model) { toastr.warning(ui("Укажите модель в окне AI Player")); openModal(); return; }
        if (!chatId() || (ctx().characterId === undefined && !ctx().groupId)) {
            // без открытого чата ST создал бы новый чат с Ассистентом и отправил ход туда
            toastr.warning(ui("Откройте чат с персонажем или группой")); return;
        }
        if (!(await profileHasKey(p))) {
            toastr.warning(srcOf(p).proxy && !p.keyId && !vault.ok ? ui("Укажите адрес и пароль реверс-прокси в окне AI Player") : ui("Сохраните API-ключ в окне AI Player"));
            openModal(); return;
        }
        if (signal.aborted) return;

        const c0 = ctx();
        const visible = (c0.chat || []).filter(m => !m.is_system);
        if (visible.length && visible[visible.length - 1].is_user
            && !confirm(ui("Последнее сообщение — ход игрока, бот ещё не ответил. Сделать ещё один ход подряд?"))) return;

        const id0 = chatId();
        const snap = JSON.stringify((c0.chat || []).slice(-1).map(m => [m.mes, m.swipe_id]));
        const len0 = c0.chat?.length ?? 0;

        const sync = getSync();
        const t0 = performance.now();
        const stop = sync.partners.flatMap(n => [`\n${n}:`, `\n**${n}**:`]);
        const system = buildSystemPrompt(s, sync);
        const messages = buildMessages(s, sync, system);
        if (messages.meta.chatId !== id0) throw new Error(ui("Чат сменился при сборке контекста"));
        if (messages.meta.overflow) toastr.warning(ui("Контекст переполнен: даже последнее сообщение не влезает в лимит модели. Увеличьте «Контекст модели» или уменьшите «Макс. токенов»."), 'AI Player', { timeOut: 7000 });
        const res = await callModel(p, s, system, messages, { signal, stop });
        if (signal.aborted) return;

        const c1 = ctx();
        if (chatId() !== id0 || (c1.chat?.length ?? 0) !== len0
            || JSON.stringify((c1.chat || []).slice(-1).map(m => [m.mes, m.swipe_id])) !== snap) {
            toastr.warning(ui("Чат изменился во время генерации — ход отброшен"));
            return;
        }
        const msg = cleanReply(res.text, sync);
        if (!msg) throw new AipError('empty', ui("Модель вернула пустую реплику"));
        if (res.truncated) toastr.warning(ui("Ответ обрезан по лимиту токенов — увеличьте «Макс. токенов»"));

        const ta = document.getElementById('send_textarea');
        if (ta.value.trim() && !confirm(ui("В поле ввода есть ваш текст. Заменить его ходом агента?"))) return;
        ta.value = msg;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        const [lo, hi] = wordRange(s);
        const words = (msg.match(/\S+/g) || []).length;
        pendingMeta = {
            chat: id0, text: msg,
            meta: {
                profileId: p.id, profile: p.name, model: p.model, provider: p.provider,
                temperature: s.sendTemperature ? num(p.temperature, 0, 2, 0.9) : null,
                latencyMs: Math.round(performance.now() - t0), usage: res.usage,
                words, inRange: words >= lo && words <= hi, truncated: !!res.truncated, ts: Date.now(),
            },
        };
        if (s.autoSend) {
            const sendBtn = document.getElementById('send_but');
            if (isStBusy()) toastr.info(ui("Таверна занята — ход оставлен в поле ввода"));
            else if (sendBtn && getComputedStyle(sendBtn).display !== 'none') sendBtn.click();
            else toastr.info(ui("Основной API таверны не подключён — ход оставлен в поле ввода"));
        }
    } catch (e) {
        if (e.name !== 'AbortError') { console.error('[AI Player]', redact(e?.message)); toastr.error(describeError(e, 'turn'), 'AI Player'); }
    } finally {
        setBusy(false);
        abortCtl = null;
    }
}

// ход агента, ожидающий отправки в чат, больше не актуален (сменили чат)
export function clearPendingMeta() { pendingMeta = null; }

export function onMessageSent(id) {
    const c = ctx();
    const m = c.chat?.[id];
    if (!pendingMeta || !m?.is_user || pendingMeta.chat !== chatId()) return;
    // если пользователь заменил ход агента своим текстом — это уже не ход агента
    const norm = t => String(t).replace(/\s+/g, ' ').trim();
    if (!norm(m.mes).includes(norm(pendingMeta.text).slice(0, 40))) { pendingMeta = null; return; }
    m.extra = { ...(m.extra || {}), aip: { ...pendingMeta.meta, edited: m.mes.trim() !== pendingMeta.text.trim() } };
    pendingMeta = null;
    c.saveChat?.();
    // бейдж поставит USER_MESSAGE_RENDERED — MESSAGE_SENT приходит раньше отрисовки
}

// ---------- Подписи моделей в чате ----------
export function renderBadge(id) {
    const m = ctx().chat?.[id];
    if (!m) return;
    const model = m.is_user ? m.extra?.aip?.model : null;
    if (!model) return;
    const mes = document.querySelector(`#chat .mes[mesid="${id}"]`);
    const name = mes?.querySelector('.name_text');
    if (!name || mes.querySelector('.aip-badge')) return;
    const b = document.createElement('small');
    b.className = 'aip-badge';
    b.textContent = `🤖 ${model}`;
    b.title = ui`Ход сделан агентом AI Player (профиль «${m.extra.aip.profile}»)`;
    name.after(b);
}
export const renderAllBadges = () => (ctx().chat || []).forEach((_, i) => renderBadge(i));
