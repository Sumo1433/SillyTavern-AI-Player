import { ctx, settings } from './core.js';
import { ui } from './i18n.js';
import { liveThoughts, pruneThoughts, reactCtl, retryReaction } from './reactions.js';
import { uiHost } from './ui-modal.js';

// ---------- Окно мыслей ----------
export const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

function thoughtNode(e) {
    const item = el('div', 'aip-th-item');
    const head = el('div', 'aip-th-meta');
    head.append(el('span', 'aip-th-id', `#${e.mesId}${e.swipeId ? ui` · свайп ${e.swipeId + 1}` : ''}`));
    const score = String(e.text).match(/(\d{1,2}(?:[.,]\d)?)\s*\/\s*10/);
    if (score) {
        const n = parseFloat(score[1].replace(',', '.'));
        head.append(el('span', `aip-score ${n >= 7 ? 'hi' : n >= 4 ? 'mid' : 'lo'}`, `★ ${score[1]}/10`));
    }
    const models = el('div', 'aip-th-models');
    models.append(el('span', 'aip-pill aip-pill-me', `🤖 ${e.playerModel}`), el('span', 'aip-vs', 'vs'), el('span', 'aip-pill', e.botModel));
    const body = el('div', 'aip-th-text');
    for (const line of String(e.text).split('\n')) {
        if (!line.trim()) continue;
        const row = el('div', 'aip-th-line');
        const m = line.match(/^\s*(?:[-•*]\s*)?\**([^:*]{2,32})\**\s*:\s*(.*)$/);
        if (m) row.append(el('b', null, `${m[1].trim()}: `), document.createTextNode(m[2]));
        else row.textContent = line;
        body.append(row);
    }
    item.append(head, models, body);
    return item;
}

function updateThoughtsCount() {
    const n = liveThoughts().length;
    const c = document.querySelector('#aip_thoughts .aip-th-count');
    if (c) c.textContent = n ? String(n) : '';
    document.getElementById('aip_thoughts')?.classList.toggle('aip-empty', !n);
}
export function appendThought(e) {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    const panel = document.getElementById('aip_thoughts');
    const wasOpen = panel.classList.contains('aip-open') && !panel.classList.contains('aip-min') && !panel.classList.contains('aip-empty');
    // пользователь внизу (или окно было закрыто/пустое) → прокручиваем; листает старое → не мешаем
    const atBottom = !wasOpen || thoughtsAtBottom(body);
    const node = thoughtNode(e);
    node.classList.add('aip-new');
    node.addEventListener('animationend', () => node.classList.remove('aip-new'), { once: true });
    body.appendChild(node);
    updateThoughtsCount();
    if (settings().s.thoughtsHidden) toastr.info(ui("💭 Новое впечатление игрока"), 'AI Player', { timeOut: 2500 });
    else showThoughts(true, atBottom);
    if (!atBottom) panel.classList.add('aip-has-new');
}

function thoughtsAtBottom(body) { return body.scrollHeight - body.scrollTop - body.clientHeight < 40; }

// Вкл/выкл мыслей игрока (вывод после ответа бота)
export function setReactions(on) {
    const { s, save } = settings();
    s.reactions = !!on; save();
    if (!s.reactions) reactCtl?.abort();          // уже идущий запрос «мыслей» тоже отменяем
    const panel = document.getElementById('aip_thoughts');
    panel?.classList.toggle('aip-off', !s.reactions);
    const btn = panel?.querySelector('[data-act="power"]');
    if (btn) btn.title = s.reactions ? ui("Впечатления включены — нажмите, чтобы выключить") : ui("Впечатления выключены — нажмите, чтобы включить");
    const cb = document.getElementById('aip_reactions');
    if (cb) cb.checked = s.reactions;
    const mi = document.querySelector('#aip_menu_th span');
    if (mi) mi.textContent = ui`AI Player — впечатления${s.reactions ? '' : ui(" (выкл.)")}`;
}

// Прокрутка к последней мысли — после отрисовки: пока окно скрыто/пусто, scrollTop не применяется
function scrollThoughtsToEnd() {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        body.scrollTop = body.scrollHeight;
        document.getElementById('aip_thoughts')?.classList.remove('aip-has-new');
    }));
}
export function renderThoughts() {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    pruneThoughts();
    body.replaceChildren(...liveThoughts().map(thoughtNode));
    updateThoughtsCount();
    scrollThoughtsToEnd();
}
export function showThoughts(v, scroll = true) {
    const el = document.getElementById('aip_thoughts');
    if (!el) return;
    el.classList.toggle('aip-open', v);
    if (!v) el.classList.remove('aip-has-new');   // иначе невидимая кнопка «Новая мысль» ловила бы нажатия
    if (v) { clampIntoView(el); if (scroll) scrollThoughtsToEnd(); }
}
export function clampIntoView(el) {
    if (!el.style.left) return;
    const r = el.getBoundingClientRect();
    const headH = el.querySelector('.aip-th-head').offsetHeight;
    const x = Math.max(0, Math.min(r.left, window.innerWidth - r.width));
    const y = Math.max(0, Math.min(r.top, window.innerHeight - headH));
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

export function buildThoughts() {
    const el = document.createElement('div');
    el.id = 'aip_thoughts';
    el.innerHTML = `<div class="aip-th-head"><div class="aip-th-title"><i class="fa-solid fa-comment-dots"></i><b>${ui("Впечатления игрока")}</b><span class="aip-th-count"></span></div><span class="aip-th-btns"><a class="aip-icon aip-power" data-act="power" title=""><i class="fa-solid fa-power-off"></i></a><a class="aip-icon" data-act="min" title="${ui("Свернуть / развернуть")}"><i class="fa-solid fa-minus"></i></a><a class="aip-icon" data-act="clear" title="${ui("Очистить впечатления этого чата")}"><i class="fa-solid fa-trash-can"></i></a><a class="aip-icon" data-act="close" title="${ui("Скрыть")}"><i class="fa-solid fa-xmark"></i></a></span></div><div class="aip-th-off"><i class="fa-solid fa-power-off"></i> ${ui("Впечатления выключены — новые не запрашиваются.")} <a data-act="on">${ui("Включить")}</a></div><div class="aip-th-fail"><i class="fa-solid fa-triangle-exclamation"></i> <span class="aip-th-failtext"></span> <a data-act="retry">${ui("Повторить")}</a></div><div class="aip-th-body"></div><button type="button" class="aip-th-newbtn" data-act="tonew"><i class="fa-solid fa-arrow-down"></i> ${ui("Новое впечатление")}</button><div class="aip-th-empty">${ui("Впечатления игрока об игре появятся здесь, когда бот ответит на ход агента.")}<br><small>${ui("Это слова игрока, а не персонажа. В чат не попадают.")}</small></div>`;
    uiHost().appendChild(el);
    el.classList.toggle('aip-min', !!settings().s.thoughtsMin);
    el.querySelector('[data-act="power"]').onclick = () => {
        setReactions(!settings().s.reactions);
        toastr.info(settings().s.reactions ? ui("Впечатления игрока включены") : ui("Впечатления игрока выключены — лишних запросов не будет"), 'AI Player', { timeOut: 2500 });
    };
    el.querySelector('[data-act="on"]').onclick = () => setReactions(true);
    el.querySelector('[data-act="retry"]').onclick = () => retryReaction();
    el.querySelector('[data-act="tonew"]').onclick = scrollThoughtsToEnd;
    const thBody = el.querySelector('.aip-th-body');
    thBody.addEventListener('scroll', () => { if (thoughtsAtBottom(thBody)) el.classList.remove('aip-has-new'); }, { passive: true });
    el.querySelector('[data-act="min"]').onclick = () => {
        const { s, save } = settings();
        s.thoughtsMin = !s.thoughtsMin; save();
        el.classList.toggle('aip-min', s.thoughtsMin);
        clampIntoView(el);
        if (!s.thoughtsMin) scrollThoughtsToEnd();
    };
    el.querySelector('[data-act="close"]').onclick = () => {
        showThoughts(false);
        const { s, save } = settings(); s.thoughtsHidden = true; save();
    };
    el.querySelector('[data-act="clear"]').onclick = () => {
        if (!confirm(ui("Очистить впечатления игрока в этом чате?"))) return;
        const meta = ctx().chatMetadata;
        if (meta) { meta.aip_log = []; ctx().saveMetadata?.(); }
        renderThoughts();
    };
    const { s } = settings();
    if (s.thoughtsPos) Object.assign(el.style, { left: `${s.thoughtsPos.x}px`, top: `${s.thoughtsPos.y}px`, right: 'auto', bottom: 'auto' });

    const head = el.querySelector('.aip-th-head');
    head.addEventListener('pointerdown', ev => {
        if (ev.target.closest('a') || ev.button > 0) return;
        head.setPointerCapture(ev.pointerId);
        const r = el.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top;
        const move = e => {
            const x = Math.max(0, Math.min(e.clientX - dx, window.innerWidth - el.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - dy, window.innerHeight - head.offsetHeight));
            Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
        };
        const up = () => {
            head.removeEventListener('pointermove', move);
            head.removeEventListener('pointerup', up);
            head.removeEventListener('pointercancel', up);
            if (!el.style.left) return;                // просто касание без перетаскивания — позицию не трогаем
            const { s: st, save } = settings();
            st.thoughtsPos = { x: parseInt(el.style.left) || 0, y: parseInt(el.style.top) || 0 };
            save();
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
        head.addEventListener('pointercancel', up);
    });
}
