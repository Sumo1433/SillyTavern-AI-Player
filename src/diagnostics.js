import { VERSION, chatId, short } from './core.js';
import { redact } from './errors.js';
import { ui } from './i18n.js';
import { vault } from './keys.js';

// ---------- Диагностика (для телефона, где нет консоли браузера) ----------
export function diagnose() {
    const lines = [`AI Player ${VERSION} · ${navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/)?.[0] || navigator.userAgent.slice(0, 60)}`];
    const css = getComputedStyle(document.documentElement).getPropertyValue('--aip-dur').trim();
    lines.push(ui`style.css загружен: ${css ? ui("да") : ui("НЕТ")}`);
    lines.push(ui`плагин ключей: ${!vault.checked ? '?' : vault.ok ? `${ui("да")} ${vault.version || ''}` : ui("НЕТ")}`);
    const probe = id => {
        const n = document.getElementById(id);
        if (!n) return ui`${id}: НЕТ в DOM`;
        const cs = getComputedStyle(n), r = n.getBoundingClientRect();
        return ui`${id}: в ${n.parentElement?.id || n.parentElement?.tagName} · class="${n.className}" · display=${cs.display} vis=${cs.visibility} op=${cs.opacity} z=${cs.zIndex} pos=${cs.position} · ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    lines.push(probe('aip_play'), probe('aip_menu'), probe('aip_host'));
    const o = document.getElementById('aip_overlay');
    const wasOpen = o?.classList.contains('aip-open');
    if (o) o.classList.add('aip-open');                 // принудительно открыть и посмотреть, что получилось
    lines.push(probe('aip_overlay'), probe('aip_modal'));
    const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    lines.push(ui`сверху в центре экрана: ${top ? `${top.tagName}#${top.id}.${String(top.className).slice(0, 40)}` : '—'}`);
    if (o && !wasOpen) o.classList.remove('aip-open');
    lines.push(probe('aip_thoughts'));
    lines.push(ui`окно ${innerWidth}×${innerHeight} · чат: ${chatId() ? ui("открыт") : ui("нет")} · ошибок: ${errors.length}`);
    for (const e of errors.slice(-3)) lines.push(ui`ошибка: ${redact(e)}`);
    const text = lines.join('\n');
    console.log(ui("[AI Player] диагностика\n") + text);
    const ta = document.getElementById('send_textarea');
    if (ta && !ta.value.trim()) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    toastr.info(ui("Отчёт вставлен в поле ввода — скопируйте его и пришлите разработчику. Не отправляйте в чат."), ui("AI Player: диагностика"), { timeOut: 10000 });
}

// перехват ошибок расширения — показываем уведомлением, т.к. на телефоне консоли не видно
const errors = [];
export function reportError(err, where = '') {
    const msg = redact(`${where ? where + ': ' : ''}${err?.message || err}`);
    errors.push(msg);
    console.error('[AI Player]', where, err);
    toastr.error(short(msg), ui("AI Player — ошибка"));
}
window.addEventListener('error', e => { if (String(e.filename || e.error?.stack || '').includes('AI-Player')) reportError(e.error || e.message, ui("скрипт")); });
window.addEventListener('unhandledrejection', e => { if (String(e.reason?.stack || '').includes('AI-Player')) reportError(e.reason, ui("промис")); });
export const safe = (name, fn) => (...a) => { try { const r = fn(...a); if (r?.catch) r.catch(e => reportError(e, name)); return r; } catch (e) { reportError(e, name); } };
