// AI Player — расширение SillyTavern «ИИ против ИИ».
// Агент играет за выбранную персону {{user}} против бота таверны. Работает только по кнопке ▶.
// Цикл: ▶ → агент пишет ход → ход уходит в чат → бот отвечает → агент читает ответ и пишет
// короткое впечатление об игре в окно 💭 (в чат не попадает). По желанию агент ведёт «записи» —
// память персонажа (цели, отношения, обещания, факты), которая переживает обрезку истории.
// Ключи: с серверным плагином (server-plugin/) — в отдельном хранилище AI Player, запросы идут
// через плагин; без плагина — в общем secrets.json ST, запросы идут через бэкенд ST.
//
// Модули (ES-модули без сборки, ST подключает index.js как type="module"):
//   src/i18n-en.js, src/i18n.js     — словарь интерфейса и язык; правило языка игры
//   src/core.js                     — версия, настройки, профили, контекст ST
//   src/errors.js                   — виды ошибок, понятные сообщения, вырезание секретов
//   src/keys.js                     — хранилище ключей: плагин или общий secrets.json, миграция
//   src/api.js                      — запросы к модели, список моделей, очистка ответа
//   src/prompts-en.js, prompts.js   — встроенные промпты (источник для prompts/*.md), подстановка
//   src/migrations.js               — обновление точных старых встроенных промптов
//   src/context.js                  — сборка истории хода, бюджет контекста, шкала
//   src/memory.js                   — записи игрока (память персонажа)
//   src/reactions.js                — впечатления после ответа бота
//   src/turn.js                     — ход агента, подписи моделей в чате
//   src/export.js                   — экспорт партии
//   src/ui-thoughts.js, ui-modal.js — окно впечатлений и окно настроек
//   src/diagnostics.js              — диагностика и перехват ошибок
import { scheduleMeter } from './src/context.js';
import { VERSION, applyMotion, ctx, settings } from './src/core.js';
import { diagnose, reportError, safe } from './src/diagnostics.js';
import { ui } from './src/i18n.js';
import { probeVault } from './src/keys.js';
import { maybeUpdateMemory, memCtl, renderMemory } from './src/memory.js';
import { onBotMessage, reactCtl, reacted, retagThoughts, setReactionFailure } from './src/reactions.js';
import { abortCtl, clearPendingMeta, onMessageSent, playTurn, renderAllBadges, renderBadge } from './src/turn.js';
import { buildModal, closeModal, openModal, refreshSync, toggleThoughts } from './src/ui-modal.js';
import { buildThoughts, clampIntoView, renderThoughts, setReactions } from './src/ui-thoughts.js';

// ---------- Кнопки ----------
function addButtons() {
    const host = document.getElementById('rightSendForm') || document.getElementById('send_form');
    if (host && !document.getElementById('aip_play')) {
        const b = document.createElement('div');
        b.id = 'aip_play';
        b.className = 'aip-play fa-solid fa-play interactable';
        b.title = ui("AI Player: сделать ход за игрока");
        b.tabIndex = 0;
        b.addEventListener('click', playTurn);
        b.addEventListener('keydown', e => { if (e.key === 'Enter') playTurn(); });
        host.prepend(b);
    }
    const menu = document.getElementById('extensionsMenu');
    if (menu && !document.getElementById('aip_menu')) {
        const mk = (id, icon, text, fn) => {
            const it = document.createElement('div');
            it.id = id; it.tabIndex = 0;
            it.className = 'list-group-item flex-container flexGap5 interactable';
            it.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;   // статичный текст
            it.addEventListener('click', e => { e.stopPropagation(); fn(); });
            return it;
        };
        menu.append(
            mk('aip_menu', 'fa-robot', ui("AI Player — настройки"), safe(ui("настройки"), openModal)),
            mk('aip_menu_th', 'fa-comment-dots', ui("AI Player — впечатления"), safe(ui("окно впечатлений"), toggleThoughts)),
            mk('aip_menu_diag', 'fa-stethoscope', ui("AI Player — диагностика"), safe(ui("диагностика"), diagnose)),
        );
    }
}

jQuery(() => { try { initAll(); } catch (e) { reportError(e, ui("запуск")); } });

function initAll() {
    settings();
    probeVault();                 // в фоне: есть ли серверный плагин ключей
    applyMotion();
    buildModal();
    buildThoughts();
    addButtons();
    setReactions(settings().s.reactions);
    const c = ctx();
    const ev = c.event_types;
    c.eventSource.on(ev.CHAT_CHANGED, () => {
        abortCtl?.abort();
        reactCtl?.abort();
        memCtl?.abort();
        setReactionFailure(null);
        clearPendingMeta();
        reacted.clear();
        renderThoughts();
        renderMemory();
        renderAllBadges();                       // CHAT_CHANGED приходит после отрисовки сообщений
        if (document.getElementById('aip_overlay')?.classList.contains('aip-open')) refreshSync();
    });
    // глобальные обработчики — один раз (не при каждой пересборке окна)
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('aip_overlay')?.classList.contains('aip-open')) closeModal();
    });
    window.addEventListener('resize', () => { const t = document.getElementById('aip_thoughts'); if (t) clampIntoView(t); });
    c.eventSource.on(ev.MESSAGE_SENT, onMessageSent);
    // шкала контекста следует за текущим чатом
    for (const name of ['CHAT_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_DELETED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'PERSONA_CHANGED']) {
        if (ev[name]) c.eventSource.on(ev[name], () => {
            if (document.getElementById('aip_overlay')?.classList.contains('aip-open')) scheduleMeter();
        });
    }
    // мысли — только на настоящие ответы бота: не на приветствие, /sendas и картинки расширений
    c.eventSource.on(ev.MESSAGE_RECEIVED, (id, type) => {
        // continue/append перезаписывают то же сообщение — повторная платная «мысль» не нужна,
        // но дату в уже записанных мыслях о нём обновляем
        if (['continue', 'append', 'appendFinal'].includes(type)) { retagThoughts(id); return; }
        if (['first_message', 'command', 'extension', 'impersonate'].includes(type)) return;
        onBotMessage(id);
        maybeUpdateMemory(id);
    });
    // удалили сообщение / перегенерировали ответ / удалили чат — убираем мысли о несуществующих сообщениях
    // правка и свайп учтённого сообщения — пометка «требуют проверки» у записей появляется сразу
    for (const name of ['MESSAGE_EDITED', 'MESSAGE_SWIPED']) {
        if (ev[name]) c.eventSource.on(ev[name], () => renderMemory());
    }
    for (const name of ['MESSAGE_DELETED', 'CHAT_DELETED', 'GROUP_CHAT_DELETED']) {
        if (ev[name]) c.eventSource.on(ev[name], () => { renderThoughts(); renderMemory(); });
    }
    if (ev.USER_MESSAGE_RENDERED) c.eventSource.on(ev.USER_MESSAGE_RENDERED, renderBadge);
    if (ev.MORE_MESSAGES_LOADED) c.eventSource.on(ev.MORE_MESSAGES_LOADED, renderAllBadges);
    renderThoughts();
    renderAllBadges();
    console.log(ui`[AI Player] ${VERSION} загружен`);
    const { s, save } = settings();
    if (s.lastVersion !== VERSION) {     // один раз после обновления — подтверждение, что загрузилась новая версия
        s.lastVersion = VERSION; save();
        toastr.success(ui`Версия ${VERSION} загружена. Меню-палочка → AI Player.`, 'AI Player', { timeOut: 5000 });
    }
}
