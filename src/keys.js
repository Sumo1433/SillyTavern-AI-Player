import { ctx, post, settings, srcOf } from './core.js';
import { AipError, kindByStatus } from './errors.js';
import { ui } from './i18n.js';

// ---------- Хранилище ключей ----------
// Два режима:
//  • плагин (vault) — серверный плагин AI Player (SillyTavern/plugins/ai-player) хранит ключи и пароли
//    прокси отдельно от ключей таверны и сам отправляет запросы. Профиль хранит keyId.
//  • общий (legacy) — плагина нет: ключи лежат в общих категориях secrets.json SillyTavern и видны
//    в менеджере ключей таверны; запросы идут через бэкенд ST. Профиль хранит secretId.
// Активный ключ основного подключения таверны как запасной не используется ни в одном режиме.
export const VAULT = '/api/plugins/ai-player';
// версия плагина, с которой выпущено расширение; более старый плагин работает, но просим обновить
export const PLUGIN_VERSION = '1.1.0';
// ok — плагин ответил; absent — сервер ЯВНО сказал, что плагина нет (404/405); иначе состояние
// неизвестно (403 устаревшей сессии, 5xx, нет связи) — тогда ключи в общее хранилище не пишем
export const vault = { checked: false, ok: false, absent: false, status: null, version: null };
export async function probeVault() {
    try {
        const r = await post(`${VAULT}/probe`);
        const j = r.ok ? await r.json().catch(() => null) : null;
        Object.assign(vault, { checked: true, ok: !!j?.ok, absent: !j?.ok && (r.status === 404 || r.status === 405), status: r.status, version: j?.version ?? null });
    } catch { Object.assign(vault, { checked: true, ok: false, absent: false, status: null, version: null }); }
    return vault.ok;
}
export async function ensureVault() { if (!vault.checked) await probeVault(); return vault; }
export const pluginOutdated = () => vault.ok && !!vault.version && vault.version.localeCompare(PLUGIN_VERSION, undefined, { numeric: true }) < 0;
export async function vaultCall(route, body, signal) {
    let r;
    try { r = await post(`${VAULT}${route}`, body, signal); }
    catch (e) { if (e?.name === 'AbortError') throw e; throw new AipError('network', ui("Плагин AI Player не отвечает")); }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) {
        if (!j?.error && (r.status === 404 || r.status === 405)) { Object.assign(vault, { ok: false, absent: true }); throw new AipError('no_plugin', ui("Плагин AI Player не найден на сервере SillyTavern")); }
        if (!j?.error && r.status === 403) throw new AipError('session', ui("SillyTavern отклонил запрос (HTTP 403)"));
        const er = j?.error || {};
        throw new AipError(er.kind || kindByStatus(r.status), er.message || `HTTP ${r.status}`, er.status ?? null);
    }
    return j;
}
// ключи, на которые ссылаются профили встроенного Connection Manager SillyTavern
function connectionManagerSecretIds() {
    try { return new Set((ctx().extensionSettings?.connectionManager?.profiles || []).map(p => p?.['secret-id']).filter(Boolean)); }
    catch { return new Set(); }
}
export const vaultKeys = async provider => (await vaultCall('/keys/list', { provider })).keys || [];
// адрес, к которому плагин привяжет ключ (та же нормализация, что на сервере)
export function vaultBase(p) {
    if (p.provider === 'anthropic') return 'https://api.anthropic.com/v1';
    const u = String(p.url || '').trim().replace(/\/+$/, '');
    return srcOf(p).proxy ? u.replace(/\/messages$/, '') : u.replace(/\/chat\/completions$/, '');
}

// ---------- Секреты ST (общий режим) ----------
export async function secretState() {
    const r = await post('/api/secrets/read');
    if (!r.ok) throw new Error(ui`Не удалось прочитать состояние ключей (HTTP ${r.status})`);
    const j = await r.json();
    // при внутренней ошибке ST отвечает 200 и {} — это сбой, а не «ключей нет»
    if (!j || typeof j !== 'object' || !('api_key_custom' in j)) throw new Error(ui("Хранилище ключей SillyTavern недоступно"));
    return j;
}
export function slotList(state, key) {
    const v = state?.[key];
    if (Array.isArray(v)) return v;
    return v ? [{ id: null, active: true, legacy: true }] : [];
}
// Есть ли у профиля СВОЙ ключ. Активный ключ основного подключения таверны не считается.
export async function profileHasKey(p) {
    if (p.keyId) {
        if (!vault.checked) await probeVault();
        if (!vault.ok) return false;
        try { return (await vaultKeys(p.provider)).some(k => k.id === p.keyId); } catch { return false; }
    }
    if (srcOf(p).proxy) return !!(p.url && p.proxyPassword);   // общий режим: адрес + пароль прокси в профиле
    if (!p.secretId) return false;
    try { return slotList(await secretState(), srcOf(p).secret).some(x => x.id === p.secretId); } catch { return false; }
}
// Ключи расширения помечаются меткой «AI Player …», чтобы не смешивать их с ключами самой таверны
const AIP_LABEL = 'AI Player';
export const isAipKey = x => /^AI Player\b/.test(x?.label || '');
export const keyName = x => (x?.label || ui("без названия")).replace(/^AI Player\s*[:·-]?\s*/, '') || ui("без названия");

const PLACEHOLDER_LABEL = 'Пусто — заглушка AI Player (ключ таверны не задан)';

// Добавляет ключ и выбирает его в профиле.
// С плагином — в отдельное хранилище AI Player (общий менеджер ключей таверны не меняется).
// Без плагина — ОТДЕЛЬНЫМ значением в общую категорию ST. ST всегда делает новый ключ активным
// для всей таверны — поэтому возвращаем таверне её прежний активный ключ, а если его не было —
// ставим пустую заглушку, чтобы ключ расширения не ушёл на адрес основного подключения таверны.
export async function saveProfileKey(p, value, label) {
    await ensureVault();
    if (!vault.ok && !vault.absent) {
        // не знаем, есть ли плагин (устаревшая сессия, сбой сервера) — в общее хранилище не пишем
        throw new AipError(vault.status === 403 ? 'session' : 'no_plugin', ui("Не удалось проверить, установлен ли плагин AI Player, — ключ не сохранён, чтобы не записать его в общее хранилище таверны. Обновите страницу и повторите."), vault.status);
    }
    if (vault.ok) {
        const j = await vaultCall('/keys/add', { provider: p.provider, url: p.url, value, label: label || p.name });
        if (!j?.key?.id) throw new AipError('bad_response', ui("Плагин не подтвердил сохранение ключа"));
        p.keyId = j.key.id;
        p.secretId = null;
        if (srcOf(p).proxy) p.proxyPassword = '';     // пароль прокси теперь в хранилище плагина
        settings().save();
        return true;
    }
    if (srcOf(p).proxy) return false;                 // общий режим: пароль прокси — поле профиля
    const key = srcOf(p).secret;
    const before = slotList(await secretState(), key);
    if (before.some(x => x.legacy) && !confirm(ui("Эта версия SillyTavern хранит один ключ на провайдера — несколько ключей недоступны. Новый ключ заменит ключ основной таверны. Продолжить?"))) return false;
    const prevActive = before.find(x => x.active)?.id;
    const r = await post('/api/secrets/write', { key, value, label: `${AIP_LABEL} · ${label || p.name}` });
    if (!r.ok) throw new Error(ui`Не удалось сохранить ключ (HTTP ${r.status})`);
    const j = await r.json().catch(() => ({}));
    if (!j?.id && !before.some(x => x.legacy)) throw new AipError('bad_response', ui("SillyTavern не подтвердил сохранение ключа"));
    p.secretId = j?.id || null;
    p.keyId = null;
    let restored = true;
    const okOf = async req => { try { return (await req).ok; } catch { return false; } };
    if (j?.id) {
        if (prevActive && prevActive !== j.id) {
            restored = await okOf(post('/api/secrets/rotate', { key, id: prevActive }));
        } else if (!prevActive) {
            const ph = before.find(x => x.label === PLACEHOLDER_LABEL);
            if (ph) restored = await okOf(post('/api/secrets/rotate', { key, id: ph.id }));
            else {
                restored = await okOf(post('/api/secrets/write', { key, value: '', label: PLACEHOLDER_LABEL }));
                if (restored) toastr.info(ui("В списке ключей таверны появилась пустая «заглушка AI Player» — она нужна, чтобы ключ расширения не стал ключом основной таверны. Не удаляйте её, пока не добавите таверне свой ключ."), 'AI Player', { timeOut: 9000 });
            }
        }
    }
    settings().save();
    if (!restored) toastr.warning(ui("Ключ сохранён, но вернуть таверне прежний активный ключ не удалось: сейчас в основном подключении может быть выбран ключ AI Player. Проверьте ключ в панели API таверны."), 'AI Player', { timeOut: 12000 });
    return true;
}
// Удаляет выбранный в профиле ключ. Ключ основного подключения таверны отсюда не удаляется никогда.
export async function deleteProfileKey(p) {
    const { s, save } = settings();
    if (p.keyId) {
        const item = vault.ok ? (await vaultKeys(p.provider).catch(() => [])).find(k => k.id === p.keyId) : null;
        if (!confirm(ui`Удалить ключ «${item?.label || ui("без названия")}» из хранилища AI Player? Его потеряют все профили, где он выбран.`)) return false;
        await vaultCall('/keys/delete', { id: p.keyId });
        const id = p.keyId;
        for (const x of s.profiles) if (x.keyId === id) x.keyId = null;
        save();
        return true;
    }
    if (!p.secretId) return false;
    await ensureVault();
    if (vault.ok) {
        // с плагином общее хранилище таверны отсюда не меняем: только отвязываем профиль
        if (!confirm(ui("Отвязать старый общий ключ от профиля? Из хранилища SillyTavern он не удаляется — для этого есть кнопка «Удалить старые общие копии»."))) return false;
        p.legacySecretId = p.secretId;
        p.secretId = null;
        save();
        return true;
    }
    const key = srcOf(p).secret;
    const item = slotList(await secretState(), key).find(x => x.id === p.secretId);
    const guard = sharedKeyGuard(item);
    if (guard) { toastr.warning(guard, 'AI Player', { timeOut: 9000 }); return false; }
    if (!confirm(ui`Удалить ключ «${keyName(item)}» из хранилища SillyTavern? Его потеряют все профили, где он выбран.`)) return false;
    const r = await post('/api/secrets/delete', { key, id: p.secretId });
    if (!r.ok) throw new AipError(kindByStatus(r.status), ui`Не удалось удалить ключ (HTTP ${r.status})`);
    const id = p.secretId;
    for (const x of s.profiles) if (x.secretId === id) x.secretId = null;
    save();
    return true;
}

// Можно ли удалить запись общего хранилища, не задев основное подключение таверны.
// Возвращает причину отказа или ''.
export function sharedKeyGuard(item) {
    if (!item) return '';
    if (item.active) return ui("Этот ключ сейчас активен в основном подключении таверны — AI Player его не удаляет. Выберите в панели API таверны другой ключ или удалите этот там.");
    if (connectionManagerSecretIds().has(item.id)) return ui("Этот ключ выбран в профиле Connection Manager SillyTavern — AI Player его не удаляет.");
    return '';
}

// ---------- Переход на хранилище плагина ----------
// Ключ профиля из общего secrets.json копируется плагином на сервере (в браузер не попадает).
// Общая копия остаётся на месте: удалить её — отдельное подтверждённое действие (cleanLegacyCopies).
export const needsMigration = p => vault.ok && !p.keyId && (srcOf(p).proxy ? !!p.proxyPassword : !!p.secretId);
export async function migrateProfileKey(p) {
    await ensureVault();
    if (!needsMigration(p)) return false;
    const { s, save } = settings();
    if (srcOf(p).proxy) {
        const j = await vaultCall('/keys/add', { provider: 'claude_proxy', url: p.url, value: p.proxyPassword, label: p.name });
        p.keyId = j.key.id;
        p.proxyPassword = '';
        save();
        return true;
    }
    const j = await vaultCall('/keys/import', { secretKey: srcOf(p).secret, secretId: p.secretId, provider: p.provider, url: p.url, label: '' });
    const old = p.secretId;
    // тот же ключ у профилей с тем же типом и адресом — переносим одним ключом
    for (const x of s.profiles) {
        if (x.secretId === old && x.provider === p.provider && vaultBase(x) === vaultBase(p)) {
            x.keyId = j.key.id;
            x.legacySecretId = old;
            x.secretId = null;
        }
    }
    save();
    return true;
}
// Старые общие копии ключей AI Player (и заглушка) в secrets.json таверны
async function legacyCopies() {
    const state = await secretState();
    const out = [];
    for (const key of ['api_key_custom', 'api_key_claude']) {
        for (const x of slotList(state, key)) if (x.id && (isAipKey(x) || x.label === PLACEHOLDER_LABEL)) out.push({ ...x, key });
    }
    return out;
}
// Удаляет только неактивные копии, которые не выбраны ни в одном профиле без переноса:
// активный ключ основного подключения и его выбор не меняются.
export async function cleanLegacyCopies() {
    const { s, save } = settings();
    const items = await legacyCopies();
    // зависимости: активный ключ таверны, профили AI Player без переноса, профили Connection Manager ST
    const used = new Set([...s.profiles.map(p => p.secretId).filter(Boolean), ...connectionManagerSecretIds()]);
    const del = items.filter(x => !x.active && !used.has(x.id));
    const kept = items.length - del.length;
    if (!del.length) {
        toastr.info(kept ? ui`Удалять нечего: ${kept} общих копий активны в основном подключении таверны или ещё выбраны в профилях без переноса` : ui("Старых общих копий ключей AI Player нет"), 'AI Player');
        return { deleted: 0, failed: 0, kept };
    }
    const names = del.map(x => `• ${x.label === PLACEHOLDER_LABEL ? ui("пустая заглушка AI Player") : keyName(x)}`).join('\n');
    if (!confirm(ui`Удалить из общего хранилища SillyTavern старые копии ключей AI Player (${del.length})?\n${names}${kept ? ui`\n\nНе трогаем ещё ${kept}: они активны в основном подключении или выбраны в профилях без переноса.` : ''}\n\nОсновное подключение таверны не изменится.`)) return null;
    let deleted = 0, failed = 0;
    for (const x of del) {
        try { (await post('/api/secrets/delete', { key: x.key, id: x.id })).ok ? deleted++ : failed++; } catch { failed++; }
    }
    for (const p of s.profiles) if (p.legacySecretId && del.some(x => x.id === p.legacySecretId)) delete p.legacySecretId;
    save();
    if (failed) toastr.warning(ui`Удалено ${deleted}, не удалось удалить ${failed} — повторите позже`, 'AI Player');
    else toastr.success(ui`Удалено старых общих копий: ${deleted}`, 'AI Player');
    return { deleted, failed, kept };
}
