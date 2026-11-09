import { callModel, fetchModels } from './api.js';
import { scheduleMeter } from './context.js';
import { CLAUDE_MODELS, GLOBAL_CHECKS, GLOBAL_FIELDS, PROFILE_FIELDS, SOURCE, activeProfile, applyMotion, ctx, newProfile, post, settings, short, srcOf } from './core.js';
import { AipError, describeError } from './errors.js';
import { exportJSON, exportMD } from './export.js';
import { promptText, ui } from './i18n.js';
import { PLUGIN_VERSION, adoptTavernKey, cleanLegacyCopies, isTavernOwnKey, deleteProfileKey, isAipKey, keyName, migrateProfileKey, needsMigration, pluginOutdated, probeVault, profileHasKey, saveProfileKey, secretState, sharedKeyGuard, slotList, tavernActiveKey, vault, vaultBase, vaultCall, vaultKeys } from './keys.js';
import { memBusy, memCtl, onMemoryInput, renderMemory, updateMemory } from './memory.js';
import { getPrompt, getSync, renderPrompt, syncPreviewText } from './prompts.js';
import { PLACEHOLDERS, PROMPT_DEFAULTS, PROMPT_LABELS, PROMPT_PRESETS } from './prompts-en.js';
import { busy, playTurn } from './turn.js';
import { buildThoughts, el, renderThoughts, setReactions, showThoughts } from './ui-thoughts.js';

// ---------- Окно настроек ----------
export function buildModal() {
    const o = document.createElement('div');
    o.id = 'aip_overlay';
    o.innerHTML = `
    <div id="aip_modal" role="dialog" aria-label="AI Player">
      <header class="aip-head">
        <div class="aip-title"><span class="aip-logo"><i class="fa-solid fa-robot"></i></span><div><b>AI Player</b><small>${ui("ИИ против ИИ")}</small></div></div>
        <div class="aip-chip" id="aip_chip" title="${ui("Активный профиль агента")}"><span class="aip-dot"></span><span id="aip_chipText">—</span></div>
        <a class="aip-icon aip-close" id="aip_close" title="${ui("Закрыть (Esc)")}"><i class="fa-solid fa-xmark"></i></a>
      </header>

      <div class="aip-ctx" id="aip_ctx" data-level="empty">
        <div class="aip-ctx-bar"><i id="aip_ctx_sys"></i><i id="aip_ctx_hist"></i><i id="aip_ctx_res"></i></div>
        <div class="aip-ctx-legend"><span class="aip-ctx-label"><i class="fa-solid fa-layer-group"></i> <span id="aip_ctxText">${ui("Контекст: —")}</span></span><span class="aip-ctx-keys"><b class="k-sys"></b>${ui("промпт")} <b class="k-hist"></b>${ui("история")} <b class="k-res"></b>${ui("ответ")}</span></div>
      </div>

      <nav class="aip-tabs" role="tablist">
        <button type="button" class="aip-tab" data-tab="conn" role="tab"><i class="fa-solid fa-plug"></i><span>${ui("Подключение")}</span></button>
        <button type="button" class="aip-tab" data-tab="game" role="tab"><i class="fa-solid fa-dice-d20"></i><span>${ui("Игра")}</span></button>
        <button type="button" class="aip-tab" data-tab="prompts" role="tab"><i class="fa-solid fa-pen-nib"></i><span>${ui("Промпты")}</span></button>
        <button type="button" class="aip-tab" data-tab="match" role="tab"><i class="fa-solid fa-chess-knight"></i><span>${ui("Партия")}</span></button>
      </nav>

      <div class="aip-body">
        <section class="aip-panel" data-panel="conn">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Профиль")}</div>
            <div class="aip-row">
              <select id="aip_profile"></select>
              <button type="button" class="menu_button aip-sq" id="aip_profNew" title="${ui("Новый профиль (копия текущего)")}"><i class="fa-solid fa-plus"></i></button>
              <button type="button" class="menu_button aip-sq" id="aip_profDel" title="${ui("Удалить профиль")}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <label>${ui("Название")}</label><input id="aip_profName" type="text">
          </div>

          <div class="aip-card">
            <div class="aip-card-title">API</div>
            <label>${ui("Тип")}</label>
            <select id="aip_p_provider">${Object.entries(SOURCE).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
            <div id="aip_urlWrap"><label id="aip_urlLabel">${ui("URL — база API или адрес реверс-прокси")}</label><input id="aip_p_url" type="text" placeholder="https://api.openai.com/v1"></div>
            <div id="aip_proxyWrap">
              <label>${ui("Пароль прокси")}</label>
              <input id="aip_p_proxyPassword" type="password" autocomplete="new-password" placeholder="${ui("обязателен для ST; если прокси без пароля — любой символ")}">
              <div class="aip-note">${ui("🔐 Пароль хранится в настройках расширения — в")} <code>settings.json</code> ${ui("SillyTavern на сервере таверны (там же, где ST хранит свой пароль прокси) и загружается в браузер вместе с настройками. При запросе он идёт через сервер ST только на указанный реверс-прокси. Не передавайте никому")} <code>settings.json</code> ${ui("и бэкапы папки")} <code>data</code>.</div>
            </div>
            <div class="aip-note aip-store" id="aip_storeMode" data-mode="unknown"></div>
            <div id="aip_keyWrap">
            <label id="aip_keyLabelText">${ui("Ключ")}</label>
            <div class="aip-row"><select id="aip_keySelect" title="${ui("Какой ключ использует этот профиль")}"></select><button type="button" class="menu_button aip-sq" id="aip_keyDel" title="${ui("Удалить выбранный ключ из хранилища")}"><i class="fa-solid fa-trash-can"></i></button></div>
            <details class="aip-addkey" id="aip_addKey">
              <summary><i class="fa-solid fa-plus"></i> ${ui("Добавить ключ")}</summary>
              <div class="aip-row aip-keyrow">
                <input id="aip_keyLabel" type="text" placeholder="${ui("название, напр. «Kimi основной»")}">
                <input id="aip_keyInput" type="password" autocomplete="new-password" placeholder="${ui("ключ")}">
                <button type="button" class="menu_button" id="aip_keySave"><i class="fa-solid fa-lock"></i> ${ui("Сохранить")}</button>
              </div>
            </details>
            <div class="aip-note" id="aip_keyState">…</div>
            <div class="aip-actions">
              <button type="button" class="menu_button aip-hidden" id="aip_keyAdopt"><i class="fa-solid fa-key"></i> ${ui("Взять ключ из подключения таверны")}</button>
              <button type="button" class="menu_button aip-hidden" id="aip_keyMigrate"><i class="fa-solid fa-right-left"></i> ${ui("Перенести в хранилище AI Player")}</button>
              <button type="button" class="menu_button aip-hidden" id="aip_legacyClean"><i class="fa-solid fa-broom"></i> ${ui("Удалить старые общие копии")}</button>
            </div>
            </div>
          </div>

          <div class="aip-card">
            <div class="aip-card-title">${ui("Модель")}</div>
            <div class="aip-row aip-keyrow"><input id="aip_p_model" type="text" list="aip_models" placeholder="${ui("выберите или впишите ID")}"><datalist id="aip_models"></datalist><button type="button" class="menu_button aip-sq" id="aip_fetchModels" title="${ui("Загрузить список моделей")}"><i class="fa-solid fa-rotate"></i></button></div>
            <div class="aip-row">
              <div><label>${ui("Температура")}</label><input id="aip_p_temperature" type="number" step="0.1" min="0" max="2"></div>
              <div><label>${ui("Контекст модели, токенов")}</label><input id="aip_p_contextSize" type="number" step="1000" min="1000"></div>
            </div>
            <label class="aip-check"><input type="checkbox" id="aip_sendTemperature"> ${ui("передавать temperature")} <small>${ui("reasoning-модели её не принимают")}</small></label>
          </div>
        </section>

        <section class="aip-panel" data-panel="game">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Объём и контекст")}</div>
            <div class="aip-row">
              <div><label>${ui("Слов от")}</label><input id="aip_minWords" type="number" min="10"></div>
              <div><label>${ui("Слов до")}</label><input id="aip_maxWords" type="number" min="20"></div>
            </div>
            <div class="aip-row">
              <div><label>${ui("Макс. токенов")}</label><input id="aip_maxTokens" type="number" min="100" max="16000"></div>
              <div><label>${ui("Сообщений в контексте")}</label><input id="aip_contextMessages" type="number" min="2" max="500"></div>
            </div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Роль игрока")}</div>
            <label>${ui("Что игрок знает о карте бота")}</label>
            <select id="aip_knowledge"><option value="scene">${ui("Только то, что видно в сцене (без метагейма)")}</option><option value="full">${ui("Всё описание карты")}</option></select>
            <label>${ui("Роль игрока — пусто = описание выбранной персоны ST")}</label><textarea id="aip_roleOverride" placeholder="${ui("Например: циничный наёмник, который скрывает…")}"></textarea>
            <label>${ui("Доп. указания — цели, манера")}</label><textarea id="aip_extraInstructions" placeholder="${ui("Например: хочет выведать тайну, не доверяет никому…")}"></textarea>
          </div>
          <div class="aip-card aip-switches">
            <label class="aip-check"><input type="checkbox" id="aip_autoSend"> ${ui("Сразу отправлять ход в чат")} <small>${ui("иначе — в поле ввода")}</small></label>
            <label class="aip-check"><input type="checkbox" id="aip_reactions"> ${ui("Впечатления игрока 💭 после ответа бота")} <small>${ui("выкл. — без доп. запросов")}</small></label>
            <label class="aip-check"><input type="checkbox" id="aip_motion"> ${ui("Анимации интерфейса")} <small>${ui("можно выключить на слабом телефоне")}</small></label>
          </div>
        </section>

        <section class="aip-panel" data-panel="prompts">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Пресет стиля игрока")}</div>
            <div class="aip-row">
              <select id="aip_promptPreset"><option value="">${ui("Сводный (стандарт)")}</option>${Object.entries(PROMPT_PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
              <button type="button" class="menu_button" id="aip_presetApply"><i class="fa-solid fa-wand-magic-sparkles"></i> ${ui("Применить")}</button>
            </div>
            <div class="aip-note">${ui("Пресет заменяет все три промпта. Удобно сравнивать модели при разных стилях игрока; свои правки потом можно вернуть только вручную.")}</div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Свой промпт (внедрение в историю)")}</div>
            <textarea id="aip_customPrompt" spellcheck="false" placeholder="${ui("Например: «{player} сейчас ранен в левую руку и не может держать меч» или любые свои указания игроку. Работают плейсхолдеры и макросы ST.")}"></textarea>
            <div class="aip-row">
              <div><label>${ui("Глубина внедрения")}</label><input id="aip_customDepth" type="number" min="0" max="1000" step="1"></div>
              <div><label>${ui("От чьего имени")}</label><select id="aip_customRole"><option value="system">${ui("system (инструкция)")}</option><option value="user">${ui("user (как реплика сцены)")}</option></select></div>
            </div>
            <div class="aip-note">${ui("Как Author's Note в SillyTavern:")} <b>0</b> ${ui("— в самом конце, прямо перед ходом (сильнее всего влияет);")} <b>N</b> ${ui("— перед последними N сообщениями истории (мягче, «в фоне»). Действует на ходы игрока; пустое поле — не внедряется.")}</div>
          </div>
          <div class="aip-card">
            <select id="aip_promptKey">${Object.entries(PROMPT_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            <textarea id="aip_promptText" class="aip-prompt" spellcheck="false"></textarea>
            <div class="aip-note" id="aip_promptState"></div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_promptPreview"><i class="fa-solid fa-eye"></i> ${ui("Предпросмотр")}</button>
              <button type="button" class="menu_button" id="aip_promptVars"><i class="fa-solid fa-code"></i> ${ui("Плейсхолдеры")}</button>
              <button type="button" class="menu_button" id="aip_promptReset"><i class="fa-solid fa-rotate-left"></i> ${ui("Сбросить")}</button>
            </div>
            <div class="aip-note aip-mono aip-hidden" id="aip_promptOut"></div>
          </div>
        </section>

        <section class="aip-panel" data-panel="match">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Синхронизация с таверной")} <a class="aip-icon" id="aip_resync" title="${ui("Обновить")}"><i class="fa-solid fa-rotate"></i></a></div>
            <div class="aip-note" id="aip_sync">—</div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Партия")}</div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_th_toggle"><i class="fa-solid fa-comment-dots"></i> ${ui("Окно впечатлений")}</button>
              <button type="button" class="menu_button" id="aip_expMD"><i class="fa-solid fa-file-lines"></i> ${ui("Экспорт .md")}</button>
              <button type="button" class="menu_button" id="aip_expJSON"><i class="fa-solid fa-file-code"></i> ${ui("Экспорт .json")}</button>
            </div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Память игрока (записи)")}</div>
            <label class="aip-check"><input type="checkbox" id="aip_memory"> ${ui("Вести записи и подмешивать их в ход")} <small>${ui("доп. запрос раз в N ходов")}</small></label>
            <label>${ui("Обновлять каждые N ходов агента")}</label><input id="aip_memoryEvery" type="number" min="1" max="50">
            <textarea id="aip_memText" class="aip-prompt" spellcheck="false" placeholder="${ui("Записей пока нет. Они появятся через N ходов агента или по кнопке «Обновить сейчас». Можно написать и вручную.")}"></textarea>
            <div class="aip-note" id="aip_memState"></div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_memUpdate"><i class="fa-solid fa-rotate"></i> ${ui("Обновить сейчас")}</button>
              <button type="button" class="menu_button" id="aip_memClear"><i class="fa-solid fa-trash-can"></i> ${ui("Очистить")}</button>
            </div>
            <div class="aip-note">${ui("Сводка от лица персонажа: состояние, цели, отношения, обещания, факты и догадки. Она помогает не забыть важное, когда старые сообщения не влезают в контекст. У каждого чата свои записи, они хранятся в метаданных чата. Править можно прямо здесь.")}</div>
          </div>
        </section>
      </div>

      <footer class="aip-foot">
        <div class="aip-status" id="aip_status"></div>
        <div class="aip-foot-btns">
          <button type="button" class="menu_button" id="aip_test"><i class="fa-solid fa-signal"></i> ${ui("Тест")}</button>
          <button type="button" class="menu_button aip-primary" id="aip_play_modal"><i class="fa-solid fa-play"></i> ${ui("Сделать ход")}</button>
        </div>
      </footer>
    </div>`;
    uiHost().appendChild(o);
    const $ = sel => o.querySelector(sel);
    o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
    $('#aip_close').onclick = closeModal;

    // любая правка настроек → пересчёт шкалы контекста
    o.addEventListener('input', scheduleMeter);
    o.addEventListener('change', scheduleMeter);

    // вкладки
    for (const t of o.querySelectorAll('.aip-tab')) t.addEventListener('click', () => setTab(t.dataset.tab));
    setTab(settings().s.uiTab || 'conn');

    // профили
    $('#aip_profile').addEventListener('change', e => { const { s, save } = settings(); s.activeProfile = e.target.value; save(); fillModal(); });
    $('#aip_profNew').onclick = () => {
        const { s, save } = settings();
        const cur = activeProfile();
        const p = newProfile(ui`Профиль ${s.profiles.length + 1}`, cur);
        s.profiles.push(p); s.activeProfile = p.id; save(); fillModal();
        toastr.info(ui("Создан профиль. Ключ у него свой — сохраните его."));
    };
    $('#aip_profDel').onclick = async () => {
        const { s, save } = settings();
        if (s.profiles.length < 2) { toastr.warning(ui("Нельзя удалить единственный профиль")); return; }
        const p = activeProfile();
        // ключ удаляем, только если он больше ни в одном профиле не выбран; ключ основного
        // подключения таверны (не выбранный в профиле) не трогаем никогда
        const ref = p.keyId ? 'keyId' : p.secretId ? 'secretId' : null;
        const shared = !!ref && s.profiles.some(x => x !== p && x[ref] === p[ref]);
        let dropKey = !!ref && !shared;
        // общее хранилище таверны: с плагином не трогаем вовсе (только отвязываем), без плагина —
        // не удаляем активный ключ основного подключения и ключи профилей Connection Manager
        let guard = '';
        if (dropKey && ref === 'secretId') {
            if (vault.ok) dropKey = false;
            else {
                try {
                    const item = slotList(await secretState(), srcOf(p).secret).find(x => x.id === p.secretId);
                    // ключ самой таверны, к которому профиль привязали явно, — не удаляем, только отвязываем
                    if (item && !isAipKey(item)) dropKey = false;
                    else guard = sharedKeyGuard(item);
                } catch { guard = ui("Не удалось проверить, используется ли ключ в таверне, — он не удалён."); }
                if (guard) dropKey = false;
            }
        }
        if (!confirm(ui`Удалить профиль «${p.name}»${dropKey ? ui(" и его ключ") : ''}?${shared ? ui(" Ключ останется — он выбран в других профилях.") : ''}`)) return;
        if (dropKey) {
            let ok = false;
            try {
                if (ref === 'keyId') { await vaultCall('/keys/delete', { id: p.keyId }); ok = true; }
                else ok = !!(await post('/api/secrets/delete', { key: srcOf(p).secret, id: p.secretId }).catch(() => null))?.ok;
            } catch { ok = false; }
            if (!ok) toastr.warning(ui("Профиль удалён, но ключ удалить не удалось — удалите его из списка ключей вручную"));
        }
        if (guard) toastr.info(guard, 'AI Player', { timeOut: 9000 });
        s.profiles = s.profiles.filter(x => x.id !== p.id);
        s.activeProfile = s.profiles[0].id; save(); fillModal();
    };
    $('#aip_profName').addEventListener('input', e => {
        const p = activeProfile(); p.name = e.target.value || ui("Без имени"); settings().save();
        const opt = $(`#aip_profile option[value="${p.id}"]`); if (opt) opt.textContent = p.name;
        updateChip(document.getElementById('aip_chip').dataset.state);
    });
    for (const f of PROFILE_FIELDS) {
        $(`#aip_p_${f}`).addEventListener(f === 'provider' ? 'change' : 'input', e => {
            const p = activeProfile();
            const prev = p.provider;
            p[f] = e.target.value;
            // общий режим: введённый пароль прокси заменяет ключ плагина, который сейчас недоступен
            if (f === 'proxyPassword' && e.target.value && !vault.ok) p.keyId = null;
            if (f === 'provider' && prev !== p.provider) {
                if (!p.url || p.url === SOURCE[prev]?.defUrl) p.url = srcOf(p).defUrl;
                p.secretId = null;   // ключ другого провайдера не подходит
                p.keyId = null;
                fillModal();
            }
            settings().save();
            updateChip(document.getElementById('aip_chip').dataset.state);
        });
    }
    // общие
    for (const f of GLOBAL_FIELDS) {
        const el = $(`#aip_${f}`);
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { const { s, save } = settings(); s[f] = el.value; save(); });
    }
    for (const f of GLOBAL_CHECKS) {
        $(`#aip_${f}`).addEventListener('change', e => { const { s, save } = settings(); s[f] = e.target.checked; save(); if (f === 'motion') applyMotion(); if (f === 'reactions') setReactions(e.target.checked); if (f === 'memory') { if (!e.target.checked) memCtl?.abort(); renderMemory(); } });
    }
    // записи игрока
    $('#aip_memText').addEventListener('input', onMemoryInput);
    $('#aip_memUpdate').onclick = () => { if (!memBusy) updateMemory({ manual: true }); };
    $('#aip_memClear').onclick = () => {
        const meta = ctx().chatMetadata;
        if (!meta?.aip_memory || !confirm(ui("Очистить записи игрока в этом чате?"))) return;
        memCtl?.abort();
        delete meta.aip_memory;
        ctx().saveMetadata?.();
        renderMemory(); scheduleMeter();
    };
    // промпты
    const promptKey = () => $('#aip_promptKey').value;
    $('#aip_promptKey').addEventListener('change', fillPrompt);
    $('#aip_promptText').addEventListener('input', e => {
        const { s, save } = settings();
        s.prompts ??= {};
        // текст, совпадающий со стандартным, храним как «пусто», чтобы получать обновления стандартного
        s.prompts[promptKey()] = e.target.value.trim() === PROMPT_DEFAULTS[promptKey()].trim() ? '' : e.target.value;
        save();
        updatePromptState();
    });
    $('#aip_presetApply').onclick = () => {
        const key = $('#aip_promptPreset').value;
        const preset = PROMPT_PRESETS[key];
        const name = preset ? preset.label : ui("Сводный (стандарт)");
        const { s, save } = settings();
        const hasCustom = Object.values(s.prompts || {}).some(v => (v || '').trim());
        if (hasCustom && !confirm(ui`Заменить текущие промпты пресетом «${name}»? Ваши правки будут потеряны.`)) return;
        s.prompts = preset ? { system: preset.system, turn: preset.turn, reaction: preset.reaction, memory: '' } : { system: '', turn: '', reaction: '', memory: '' };
        s.promptPreset = key;
        save(); fillPrompt(); scheduleMeter();
        toastr.success(ui`Пресет «${name}» применён`, 'AI Player', { timeOut: 2500 });
    };
    $('#aip_promptReset').onclick = () => {
        if (!confirm(ui`Сбросить «${PROMPT_LABELS[promptKey()]}» к стандартному?`)) return;
        const { s, save } = settings();
        (s.prompts ??= {})[promptKey()] = ''; save(); fillPrompt();
    };
    $('#aip_promptPreview').onclick = () => {
        const out = $('#aip_promptOut');
        try { out.textContent = renderPrompt(settings().s, getSync(), promptKey()); }
        catch (e) { out.textContent = ui`Ошибка: ${short(e.message)}`; }
        out.classList.remove('aip-hidden');
    };
    $('#aip_promptVars').onclick = () => {
        const out = $('#aip_promptOut');
        out.textContent = Object.entries(PLACEHOLDERS).map(([k, v]) => `${k} — ${v}`).join('\n');
        out.classList.remove('aip-hidden');
    };

    // ключ
    $('#aip_keySave').onclick = async () => {
        const inp = $('#aip_keyInput'), lab = $('#aip_keyLabel');
        const val = inp.value.trim();
        if (!val) { toastr.warning(ui("Введите ключ")); return; }
        try {
            if (await saveProfileKey(activeProfile(), val, lab.value.trim())) {
                inp.value = ''; lab.value = '';
                $('#aip_addKey').open = false;
                toastr.success(vault.ok ? ui("Ключ сохранён в хранилище AI Player и выбран в профиле. Менеджер ключей таверны не изменился.") : ui("Ключ добавлен в общее хранилище SillyTavern и выбран в профиле"));
            }
        } catch (e) { toastr.error(describeError(e, 'keys')); }
        refreshKeyState();
    };
    $('#aip_keySelect').addEventListener('change', e => {
        const p = activeProfile();
        const v = e.target.value;
        if (v === '__none') { $('#aip_addKey').open = true; return; }
        if (v === '__legacy') return;
        if (vault.ok) { p.keyId = v || null; if (v) p.secretId = null; }
        else { p.secretId = v || null; if (v) p.keyId = null; }
        settings().save();
        refreshKeyState();
        scheduleMeter();
    });
    $('#aip_keyDel').onclick = async () => {
        const p = activeProfile();
        if (!p.keyId && !p.secretId) { toastr.info(ui("В профиле не выбран ключ — удалять нечего")); return; }
        try { await deleteProfileKey(p); } catch (e) { toastr.error(describeError(e, 'keys')); }
        refreshKeyState();
    };
    $('#aip_keyMigrate').onclick = async () => {
        try {
            const p = activeProfile();
            const tavernOwn = await isTavernOwnKey(p);
            if (await migrateProfileKey(p)) toastr.success(tavernOwn
                ? ui("Ключ таверны скопирован в хранилище AI Player. В таверне он остался как был — AI Player его не удаляет.")
                : ui("Ключ перенесён в хранилище AI Player. Старая общая копия пока осталась в менеджере ключей таверны — удалите её кнопкой «Удалить старые общие копии», когда перенесёте все профили."), 'AI Player', { timeOut: 9000 });
        } catch (e) { toastr.error(describeError(e, 'keys')); }
        refreshKeyState();
    };
    $('#aip_keyAdopt').onclick = async e => {
        const btn = e.currentTarget;
        if (btn.disabled) return;
        btn.disabled = true;
        try {
            const r = await adoptTavernKey(activeProfile());
            if (r === true) toastr.success(vault.ok ? ui("Ключ таверны скопирован в хранилище AI Player и выбран в профиле.") : ui("Профиль привязан к ключу таверны."), 'AI Player');
            else if (r === null) toastr.info(ui("В основном подключении таверны сейчас не выбран подходящий ключ — добавьте ключ профилю вручную."), 'AI Player');
        } catch (e) { toastr.error(describeError(e, 'keys')); }
        finally { btn.disabled = false; }
        refreshKeyState();
    };
    $('#aip_legacyClean').onclick = async () => {
        try { await cleanLegacyCopies(); } catch (e) { toastr.error(describeError(e, 'keys')); }
        refreshKeyState();
    };
    // модели
    $('#aip_fetchModels').onclick = async () => {
        try {
            const ids = await fetchModels(activeProfile());
            $('#aip_models').replaceChildren(...ids.map(id => Object.assign(document.createElement('option'), { value: id })));
            toastr.info(ids.length ? ui`Моделей: ${ids.length} — выберите в поле «Модель»` : ui("Список не получен — впишите ID вручную"));
        } catch (e) { toastr.error(describeError(e, 'models')); }
    };
    // действия
    $('#aip_test').onclick = async () => {
        const st = $('#aip_status');
        if (busy) return;
        st.className = 'aip-status'; st.textContent = ui("Проверка…");
        try {
            const p = activeProfile();
            if (!(await profileHasKey(p))) throw new AipError('no_key', srcOf(p).proxy && !p.keyId && !vault.ok ? ui("Не указан адрес или пароль реверс-прокси") : ui("Ключ не сохранён"));
            // 256, а не 30: reasoning-модели и Claude 5 с мышлением на малом лимите отвечают пусто
            const r = await callModel(p, settings().s, promptText("Отвечай одним словом."), [{ role: 'user', content: promptText("Скажи: готов") }], { maxTokens: srcOf(p).source === 'claude' ? 1024 : 256 });
            st.textContent = ui`✔ Соединение есть (${p.model}). Ответ: ${r.text.trim() || ui("(пусто)")}`;
            st.classList.add('aip-ok');
        } catch (e) { st.textContent = `✖ ${describeError(e, 'test')}`; st.classList.add('aip-err'); }
    };
    $('#aip_resync').onclick = refreshSync;
    $('#aip_play_modal').onclick = () => { closeModal(); playTurn(); };
    $('#aip_th_toggle').onclick = toggleThoughts;
    $('#aip_expMD').onclick = exportMD;
    $('#aip_expJSON').onclick = exportJSON;
}

function setTab(tab) {
    const o = document.getElementById('aip_overlay');
    if (!o.querySelector(`.aip-panel[data-panel="${tab}"]`)) tab = 'conn';
    for (const t of o.querySelectorAll('.aip-tab')) t.setAttribute('aria-selected', String(t.dataset.tab === tab));
    for (const p of o.querySelectorAll('.aip-panel')) p.classList.toggle('aip-active', p.dataset.panel === tab);
    o.querySelector('.aip-body').scrollTop = 0;
    const { s, save } = settings();
    if (s.uiTab !== tab) { s.uiTab = tab; save(); }
}

function updateChip(state) {
    const p = activeProfile();
    const chip = document.getElementById('aip_chip');
    if (!chip) return;
    chip.dataset.state = state;    // ok | shared | none
    document.getElementById('aip_chipText').textContent = `${p.name} · ${p.model || ui("модель не выбрана")}`;
}

export function toggleThoughts() {
    if (!document.getElementById('aip_thoughts')) { buildThoughts(); setReactions(settings().s.reactions); renderThoughts(); }
    const el = document.getElementById('aip_thoughts');
    const v = !el.classList.contains('aip-open');
    showThoughts(v);
    const { s, save } = settings(); s.thoughtsHidden = !v; save();
}

function fillModal() {
    const { s } = settings();
    const p = activeProfile();
    const sel = document.getElementById('aip_profile');
    sel.replaceChildren(...s.profiles.map(x => Object.assign(document.createElement('option'), { value: x.id, textContent: x.name })));
    sel.value = p.id;
    document.getElementById('aip_profName').value = p.name;
    for (const f of PROFILE_FIELDS) document.getElementById(`aip_p_${f}`).value = p[f] ?? '';
    const src = srcOf(p);
    document.getElementById('aip_urlWrap').style.display = (src.source === 'custom' || src.proxy) ? '' : 'none';
    document.getElementById('aip_urlLabel').textContent = src.proxy
        ? ui("Адрес реверс-прокси — как в поле Reverse Proxy в ST (обычно оканчивается на /v1; ST сам добавит /messages)") : ui("URL — база API или адрес реверс-прокси");
    document.getElementById('aip_p_url').placeholder = src.proxy ? ui("https://адрес-прокси/…/v1") : 'https://api.openai.com/v1';
    applyKeyLayout(p);
    document.getElementById('aip_models').replaceChildren(
        ...(srcOf(p).source === 'claude' ? CLAUDE_MODELS : []).map(id => Object.assign(document.createElement('option'), { value: id })));
    for (const f of GLOBAL_FIELDS) document.getElementById(`aip_${f}`).value = s[f] ?? '';
    for (const f of GLOBAL_CHECKS) document.getElementById(`aip_${f}`).checked = !!s[f];
    document.getElementById('aip_keyInput').value = '';
    refreshKeyState();
    fillPrompt();
    renderMemory();
}

function fillPrompt() {
    const ps = document.getElementById('aip_promptPreset');
    if (ps) ps.value = settings().s.promptPreset || '';
    const k = document.getElementById('aip_promptKey').value;
    document.getElementById('aip_promptText').value = getPrompt(settings().s, k);
    document.getElementById('aip_promptOut').classList.add('aip-hidden');
    updatePromptState();
}
function updatePromptState() {
    const k = document.getElementById('aip_promptKey').value;
    const custom = !!(settings().s.prompts?.[k] || '').trim();
    document.getElementById('aip_promptState').textContent = custom
        ? ui("✎ Свой промпт. Изменения сохраняются сразу. Пустое поле = стандартный.")
        : ui("Стандартный промпт. Начните править — сохранится как свой.");
}

// Какие поля ключа показывать: с плагином пароль прокси тоже хранится как ключ в плагине
function applyKeyLayout(p) {
    const proxy = srcOf(p).proxy;
    const plainProxy = proxy && !vault.ok;         // общий режим: пароль прокси — поле профиля
    document.getElementById('aip_proxyWrap').style.display = plainProxy ? '' : 'none';
    document.getElementById('aip_keyWrap').style.display = plainProxy ? 'none' : '';
    document.getElementById('aip_keyLabelText').textContent = proxy ? ui("Пароль прокси") : ui("Ключ");
    const box = document.getElementById('aip_storeMode');
    box.dataset.mode = !vault.checked ? 'unknown' : vault.ok ? 'vault' : 'legacy';
    if (!vault.checked) { box.textContent = ''; return; }
    if (vault.ok) {
        box.textContent = ui`🔒 Плагин AI Player ${vault.version || ''} установлен: ключи и пароли прокси хранятся отдельно от ключей таверны (data/<пользователь>/ai-player/keys.json на сервере), в менеджере ключей таверны не появляются, в браузер не передаются. Каждый ключ привязан к типу API и адресу, с которым его сохранили.`
            + (pluginOutdated() ? ui`\n⚠ Плагин устарел (нужна версия ${PLUGIN_VERSION}): удалите папку plugins/ai-player, скопируйте server-plugin заново и перезапустите таверну.` : '');
        return;
    }
    box.replaceChildren(
        document.createTextNode(ui("ℹ Плагин AI Player не установлен — это необязательно, расширение полностью работает и без него. Ключи хранятся в общем хранилище SillyTavern (secrets.json) и видны в менеджере ключей основного подключения. Плагин нужен только для отдельного хранения ключей; если вы доверяете тем, у кого есть доступ к вашей таверне, его можно не ставить. Установка (затем перезапустите таверну):")),
        Object.assign(document.createElement('br')),
        Object.assign(document.createElement('code'), { textContent: 'cp -r data/default-user/extensions/SillyTavern-AI-Player/server-plugin plugins/ai-player' }),
        Object.assign(document.createElement('br')),
        document.createTextNode(ui("и в config.yaml: ")),
        Object.assign(document.createElement('code'), { textContent: 'enableServerPlugins: true' }),
    );
}

// Каждый вызов получает номер; после await результат устаревшего вызова отбрасывается,
// чтобы два параллельных обновления не дописывали текст друг другу.
let keyStateGen = 0;
async function refreshKeyState() {
    const gen = ++keyStateGen;
    const p = activeProfile();
    const prov = p.provider;
    const el = document.getElementById('aip_keyState');
    const sel = document.getElementById('aip_keySelect');
    const stale = () => gen !== keyStateGen || activeProfile() !== p || p.provider !== prov;
    if (!vault.checked) await probeVault();
    if (stale()) return;
    applyKeyLayout(p);
    const migrateBtn = document.getElementById('aip_keyMigrate');
    const cleanBtn = document.getElementById('aip_legacyClean');
    const adoptBtn = document.getElementById('aip_keyAdopt');
    migrateBtn.classList.toggle('aip-hidden', !needsMigration(p));
    adoptBtn.classList.add('aip-hidden');
    cleanBtn.classList.toggle('aip-hidden', !vault.ok);
    if (srcOf(p).proxy && !vault.ok) {            // общий режим: у прокси нет ключей, только пароль в профиле
        updateChip(p.url && p.proxyPassword && !p.keyId ? 'ok' : 'none');
        return;
    }
    const opt = (value, text) => Object.assign(document.createElement('option'), { value, textContent: text });
    let failed = false, legacy = false, items = [], has = false, count = 0, mismatch = false, tavernOwn = false;
    if (vault.ok) {
        let list = [];
        try { list = await vaultKeys(p.provider); } catch { failed = true; }
        if (stale()) return;
        // ключ точно удалён (плагин ответил нормально, а ключа нет) — сбрасываем выбор
        if (!failed && p.keyId && !list.some(k => k.id === p.keyId)) { p.keyId = null; settings().save(); }
        const base = vaultBase(p);
        items = list.map(k => opt(k.id, `🔑 ${k.label} · ${k.mask}${k.base !== base ? ui(" · ⚠ другой адрес") : ''}`));
        mismatch = !!p.keyId && list.find(k => k.id === p.keyId)?.base !== base;
        count = list.length;
        has = !!p.keyId;
        if (!p.keyId && p.secretId) {
            // старый ключ профиля может быть собственным ключом таверны (привязан кнопкой «Взять ключ…»)
            tavernOwn = await isTavernOwnKey(p);
            if (stale()) return;
            items.unshift(opt('__legacy', tavernOwn ? ui("↪ Ключ таверны (не скопирован в AI Player)") : ui("↪ Старый общий ключ (не перенесён)")));
        }
        else if (!p.keyId && list.length) items.unshift(opt('', ui("— выберите ключ —")));
        if (!list.length && !p.secretId) items.push(opt('__none', ui("— ключей нет, добавьте ниже —")));
        sel.replaceChildren(...items);
        sel.value = p.keyId || (p.secretId ? '__legacy' : list.length ? '' : '__none');
        if (!list.length && !failed) document.getElementById('aip_addKey').open = true;
    } else {
        let list = [];
        try { list = slotList(await secretState(), srcOf(p).secret); } catch { failed = true; }
        if (stale()) return;
        if (!failed) {
            legacy = list.some(x => x.legacy);
            if (p.secretId && !list.some(x => x.id === p.secretId)) { p.secretId = null; settings().save(); }
        }
        // значения приходят от ST замаскированными (*******abc) — в списке только последние символы
        const tail = x => { const t = String(x.value || '').replace(/\*/g, ''); return t ? ` · …${t.slice(-3)}` : ''; };
        // показываем только ключи, добавленные через расширение (+ выбранный, если он вдруг чужой)
        const mine = list.filter(x => x.id && (isAipKey(x) || x.id === p.secretId));
        items = mine.map(x => opt(x.id, `🔑 ${keyName(x)}${tail(x)}`));
        if (!p.secretId && mine.length) items.unshift(opt('', ui("— выберите ключ —")));
        if (!mine.length) items.push(opt('__none', ui("— ключей расширения нет, добавьте ниже —")));
        sel.replaceChildren(...items);
        sel.value = p.secretId || (mine.length ? '' : '__none');
        if (!mine.length && !failed) document.getElementById('aip_addKey').open = true;
        count = mine.length;
        has = !!p.secretId && !p.keyId;
        tavernOwn = has && list.some(x => x.id === p.secretId && !isAipKey(x));
    }
    sel.disabled = legacy || failed;
    const state = failed || !has ? 'none' : 'ok';
    updateChip(state);
    el.dataset.state = state;
    let text = failed
        ? (vault.ok ? ui("⚠ Не удалось прочитать хранилище плагина AI Player. Выбор ключа сохранён; попробуйте открыть окно ещё раз.")
            : ui("⚠ Не удалось прочитать хранилище ключей SillyTavern. Выбор ключа сохранён; попробуйте открыть окно ещё раз."))
        : !vault.ok && p.keyId
            ? ui("⚠ Профиль привязан к ключу из плагина AI Player, а плагин сейчас недоступен. Верните плагин или выберите здесь другой ключ.")
        : needsMigration(p) && tavernOwn
            ? ui("↪ Профиль привязан к ключу таверны в общем хранилище SillyTavern. Нажмите «Перенести в хранилище AI Player»: плагин скопирует ключ на сервере, в браузер он не попадёт. В таверне ключ останется как был — AI Player его не удаляет.")
        : needsMigration(p)
            ? ui("↪ Профиль пока использует старый ключ из общего хранилища SillyTavern — он виден в менеджере ключей таверны. Нажмите «Перенести в хранилище AI Player»: плагин скопирует ключ на сервере, в браузер он не попадёт. Общая копия останется, пока вы её не удалите.")
            : mismatch
                ? ui("⚠ Выбранный ключ сохранён для другого адреса API. Плагин не отправит его на новый адрес — добавьте ключ для этого адреса.")
                : has
                    ? (vault.ok ? ui`🔒 Выбран ключ из хранилища AI Player (ключей этого типа: ${count}).`
                        : tavernOwn ? ui("🔑 Профиль привязан к ключу таверны из общего secrets.json SillyTavern. Если сменить ключ в панели API таверны, профиль останется на этом ключе. AI Player этот ключ не удаляет — кнопка удаления только отвяжет его от профиля.")
                        : ui`🔑 Выбран ключ расширения (всего ключей расширения: ${count}). Он хранится в общем secrets.json SillyTavern на сервере и виден в менеджере ключей таверны; в браузер приходит только маска (если в config.yaml не включён allowKeysExposure).`)
                    : ui("⚠ У профиля нет своего ключа — выберите или добавьте ключ. Сам AI Player ключ основного подключения таверны не берёт.");
    // профили из версий до 0.5.1 работали на ключе таверны — предлагаем явно взять его в профиль
    if (!failed && !has && !p.keyId && !p.secretId) {
        const tav = await tavernActiveKey(p);
        if (stale() || p.keyId || p.secretId) return;
        if (tav) {
            adoptBtn.classList.remove('aip-hidden');
            text += ' ' + ui("Если раньше профиль работал на ключе таверны, нажмите «Взять ключ из подключения таверны».");
        }
    }
    el.textContent = text;
}

export async function refreshSync() {
    try { document.getElementById('aip_sync').textContent = syncPreviewText(getSync()); }
    catch (e) { document.getElementById('aip_sync').textContent = ui`Ошибка синхронизации: ${short(e.message)}`; }
}

export function openModal() {
    let o = document.getElementById('aip_overlay');
    try {
        if (!o) { buildModal(); o = document.getElementById('aip_overlay'); }   // кто-то удалил окно — пересобираем
        const host = uiHost();
        if (document.body.lastElementChild !== host) {                         // поднять поверх элементов, добавленных позже
            const th = host.querySelector('.aip-th-body'), y = th?.scrollTop;  // перенос узла сбрасывает прокрутку мыслей
            document.body.appendChild(host);
            if (th) th.scrollTop = y;
        }
        if (o.parentElement !== host) host.appendChild(o);
    } catch (e) {
        console.error(ui("[AI Player] окно не создано"), e);
        toastr.error(ui`AI Player: окно не создано — ${short(e.message)}`);
        return;
    }
    // окно показываем всегда; ошибки заполнения — уведомлением, а не молчаливым отказом
    o.classList.add('aip-open');
    vault.checked = false;           // плагин могли установить или убрать — проверяем заново
    const step = (name, fn) => {
        try { fn(); } catch (e) {
            console.error(`[AI Player] ${name}`, e);
            toastr.error(`AI Player (${name}): ${short(e.message)}`);
        }
    };
    step(ui("настройки"), fillModal);
    step(ui("статус"), () => { document.getElementById('aip_status').textContent = ''; });
    step(ui("синхронизация"), refreshSync);
    step(ui("шкала"), scheduleMeter);
}
export function closeModal() { document.getElementById('aip_overlay').classList.remove('aip-open'); }

// Контейнер для окон расширения с явным размером экрана.
// Некоторые темы/стили ST меняют containing block у position:fixed (body нулевой высоты),
// из-за чего окна с top/bottom/height:100% получали высоту 0 и уезжали за экран.
export function uiHost() {
    let h = document.getElementById('aip_host');
    if (!h) {
        h = document.createElement('div');
        h.id = 'aip_host';
        document.body.appendChild(h);
    }
    return h;
}
