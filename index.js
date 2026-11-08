// AI Player — расширение SillyTavern «ИИ против ИИ».
// Агент играет за выбранную персону {{user}} против бота таверны. Работает только по кнопке ▶.
// Цикл: ▶ → агент пишет ход → ход уходит в чат → бот отвечает → агент читает ответ и пишет
// короткий вывод в окно 💭 (в чат не попадает).
// Ключи хранятся только в secrets ST (на сервере); все запросы идут через бэкенд ST.

const MODULE = 'ai_player';
const VERSION = '0.2.3';
const CLAUDE_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'];
const SOURCE = {
    openai: { source: 'custom', secret: 'api_key_custom', label: 'OpenAI-совместимый / реверс-прокси', defUrl: 'https://api.openai.com/v1' },
    anthropic: { source: 'claude', secret: 'api_key_claude', label: 'Anthropic (Claude, официальный API)', defUrl: '' },
};
const DEFAULTS = {
    profiles: [],
    activeProfile: '',
    sendTemperature: true,     // reasoning-модели OpenAI отклоняют temperature
    maxTokens: 1200,
    contextMessages: 30,
    minWords: 50,
    maxWords: 200,
    knowledge: 'scene',        // 'scene' — карта бота как знание ведущего, игрок не метагеймит; 'full' — без ограничения
    autoSend: true,
    reactions: true,
    extraInstructions: '',
    roleOverride: '',
    thoughtsHidden: false,
    thoughtsPos: null,
    prompts: { system: '', turn: '', reaction: '' },   // пусто = стандартный промпт
    motion: true,              // анимации интерфейса
    uiTab: 'conn',
    thoughtsMin: false,
};
const PROFILE_FIELDS = ['provider', 'url', 'model', 'temperature', 'contextSize'];
const GLOBAL_FIELDS = ['maxTokens', 'contextMessages', 'minWords', 'maxWords', 'knowledge', 'extraInstructions', 'roleOverride'];
const GLOBAL_CHECKS = ['autoSend', 'reactions', 'sendTemperature', 'motion'];
const applyMotion = () => document.body.classList.toggle('aip-nomotion', !settings().s.motion);
const REQUEST_TIMEOUT = 180000;

const ctx = () => SillyTavern.getContext();
const H = () => ctx().getRequestHeaders();
const post = (url, body, signal) => fetch(url, { method: 'POST', headers: H(), body: JSON.stringify(body ?? {}), signal });
const num = (v, lo, hi, def) => { const n = Number(v); return (v === '' || v == null || !Number.isFinite(n)) ? def : Math.min(hi, Math.max(lo, n)); };
const esc = t => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const short = t => String(t ?? '').slice(0, 300);
const chatId = () => { try { return ctx().getCurrentChatId?.() ?? null; } catch { return null; } };

let busy = false;
let abortCtl = null;
let pendingMeta = null;
const reacted = new Set();

// ---------- Настройки и профили ----------
function newProfile(name, from = {}) {
    return {
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, provider: from.provider || 'openai',
        url: from.url ?? SOURCE.openai.defUrl, model: from.model || '',
        temperature: from.temperature ?? 0.9, contextSize: from.contextSize ?? 32000, secretId: null,
    };
}

function settings() {
    const { extensionSettings, saveSettingsDebounced } = ctx();
    const s = extensionSettings[MODULE] ??= {};
    let dirty = false;
    for (const k of ['key', 'useProxy']) if (k in s) { delete s[k]; dirty = true; }   // ключи в настройках не храним
    for (const k of Object.keys(DEFAULTS)) if (s[k] === undefined) s[k] = structuredClone(DEFAULTS[k]);
    if (!Array.isArray(s.profiles)) s.profiles = [];
    if (!s.profiles.length) {   // миграция с v0.1
        s.profiles.push(newProfile('Профиль 1', { provider: s.provider, url: s.url, model: s.model, temperature: s.temperature }));
        delete s.provider; delete s.url; delete s.model; delete s.temperature;
        dirty = true;
    }
    if (!s.profiles.some(p => p.id === s.activeProfile)) { s.activeProfile = s.profiles[0].id; dirty = true; }
    if (dirty) saveSettingsDebounced();
    return { s, save: saveSettingsDebounced };
}
const activeProfile = () => { const { s } = settings(); return s.profiles.find(p => p.id === s.activeProfile); };
const findProfile = id => settings().s.profiles.find(p => p.id === id);
const srcOf = p => SOURCE[p?.provider] || SOURCE.openai;
const baseUrl = p => (p.url || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');

// ---------- Секреты ST ----------
async function secretState() {
    const r = await post('/api/secrets/read');
    if (!r.ok) throw new Error(`Не удалось прочитать состояние ключей (HTTP ${r.status})`);
    return r.json();
}
function slotList(state, key) {
    const v = state?.[key];
    if (Array.isArray(v)) return v;
    return v ? [{ id: null, active: true, legacy: true }] : [];
}
async function profileHasKey(p) {
    try {
        const list = slotList(await secretState(), srcOf(p).secret);
        return p.secretId ? list.some(x => x.id === p.secretId) : list.length > 0;
    } catch { return false; }
}
// Пишет ключ отдельным значением с меткой профиля и возвращает основной таверне её прежний активный ключ.
async function saveProfileKey(p, value) {
    const key = srcOf(p).secret;
    const state = await secretState();
    const before = slotList(state, key);
    if (before.some(x => x.legacy) && !confirm('Эта версия SillyTavern хранит один ключ на провайдера. Новый ключ заменит ключ основной таверны. Продолжить?')) return false;
    const prevActive = before.find(x => x.active)?.id;
    const r = await post('/api/secrets/write', { key, value, label: `AI Player: ${p.name}` });
    if (!r.ok) throw new Error(`Не удалось сохранить ключ (HTTP ${r.status})`);
    const j = await r.json().catch(() => ({}));
    if (j?.id) {
        const old = p.secretId;
        p.secretId = j.id;
        if (prevActive && prevActive !== j.id) await post('/api/secrets/rotate', { key, id: prevActive }).catch(() => {});
        if (old && old !== j.id && before.some(x => x.id === old)) await post('/api/secrets/delete', { key, id: old }).catch(() => {});
    } else {
        p.secretId = null;
    }
    settings().save();
    return true;
}
async function deleteProfileKey(p) {
    const key = srcOf(p).secret;
    if (p.secretId) {
        await post('/api/secrets/delete', { key, id: p.secretId });
        p.secretId = null;
        settings().save();
        return;
    }
    if (!confirm('У профиля нет собственного ключа — он использует общий ключ таверны. Удалить активный ключ таверны?')) return;
    const r = await post('/api/secrets/delete', { key });
    if (!r.ok) throw new Error(`Не удалось удалить ключ (HTTP ${r.status})`);
}

// ---------- Синхронизация с ST ----------
function getSync() {
    const c = ctx();
    const sub = t => { try { return c.substituteParams ? c.substituteParams(t || '') : (t || ''); } catch { return t || ''; } };
    let f = {};
    try { f = c.getCharacterCardFields?.() ?? {}; } catch { /* старый ST */ }
    const personaName = c.name1 || 'Игрок';
    const personaDesc = sub(f.persona ?? c.powerUserSettings?.persona_description ?? '').trim();
    let card, partners;
    if (c.groupId) {
        const g = (c.groups || []).find(x => x.id === c.groupId);
        const members = (g?.members || []).map(av => (c.characters || []).find(ch => ch.avatar === av)).filter(Boolean);
        partners = members.map(m => m.name);
        card = {
            name: partners.join(', ') || g?.name || 'Группа',
            description: members.map(m => `— ${m.name}: ${sub(m.description)}`).join('\n'),
            personality: members.map(m => m.personality ? `— ${m.name}: ${sub(m.personality)}` : '').filter(Boolean).join('\n'),
            scenario: sub(g?.chat_metadata?.scenario || members[0]?.scenario || ''),
        };
    } else {
        card = { name: c.name2 || 'Персонаж', description: sub(f.description), personality: sub(f.personality), scenario: sub(f.scenario) };
        partners = [card.name];
    }
    return { personaName, personaDesc, card, partners, isGroup: !!c.groupId };
}

function syncPreviewText(sync) {
    const cut = (t, n = 300) => (t && t.length > n ? t.slice(0, n) + '…' : t) || '—';
    return `Персона (агент-игрок): ${sync.personaName}\n${cut(sync.personaDesc)}\n\n`
        + `${sync.isGroup ? 'Группа' : 'Карта чара'}: ${sync.card.name}\n${cut(sync.card.description)}\n`
        + `Сценарий: ${cut(sync.card.scenario, 200)}`;
}

function wordRange(s) {
    let lo = num(s.minWords, 10, 1000, 50), hi = num(s.maxWords, 20, 2000, 200);
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
}

// ---------- Промпты (редактируются в окне расширения) ----------
const PROMPT_DEFAULTS = {
    system: `Ты — живой игрок в текстовой ролевой игре. Ты играешь за персонажа «{player}». {partner_is} {them_cap} управляет другой ИИ.

ТВОЙ ПЕРСОНАЖ — {player}:
{persona}

МИР И {partners_word} ({partner}):
{card}
{extra}
ПРАВИЛА ИГРЫ:
1. Ты не ассистент, а игрок. У «{player}» свои желания, страхи и недостатки. Не подыгрывай и не льсти собеседнику, но и не саботируй сцену — реагируй так, как реагировал бы персонаж. Получай удовольствие от игры.
2. Пиши только за «{player}». Никогда не описывай слова, действия, мысли и решения {them}. Менять обстоятельства мира (погода, посторонние люди, ход времени) можно; решать реакции {them} нельзя.
3. {knowledge_rule}
4. Объём: {min}–{max} слов (примерно 1–3 абзаца). Пиши на том языке, на котором идёт игра.
5. Формат — каждый элемент с новой строки:
   *действие в звёздочках*
   «прямая речь в ёлочках»
   (мысль: внутренний голос персонажа)
6. Если последние 2–3 обмена не принесли нового события, решения или информации — сдвинь сюжет сам: событие, смена места или перемотка времени («прошло несколько часов»).
7. Не начинай ответ с имени и двоеточия, не повторяй формулировки из своих прошлых ходов, не выходи из роли, не упоминай, что ты ИИ. Выводи только саму реплику, без пояснений.`,
    turn: `[Твой ход как «{player}». Реплика {min}–{max} слов, без «{player}:» в начале: *действия*, «речь», (мысль: …).]`,
    reaction: `Ты — игрок, который в ролевой игре играет за «{player}» против ИИ, управляющего «{partner}».
Сейчас ты вне роли. Прочитай последний ответ партнёра и коротко, честно и конкретно поделись впечатлением — без вежливых общих слов и без ролевого текста.
Отвечай по-русски, строго в формате (каждый пункт — 1 предложение):
Реакция: что ты думаешь об этом ответе
Нравится / не нравится: что именно
Партнёр: оценка N/10 — за что (логика, верность персонажу, повторы, инициатива, пишет ли за тебя)
Дальше: что твой персонаж хочет сделать`,
};
const PROMPT_LABELS = { system: 'Системный промпт игрока', turn: 'Напоминание перед ходом', reaction: 'Вывод после ответа бота' };
const PLACEHOLDERS = {
    '{player}': 'имя персоны (агент)', '{partner}': 'имя бота / участников группы', '{persona}': 'описание персоны или «Роль игрока»',
    '{card}': 'описание, характер и сценарий карты', '{scenario}': 'сценарий', '{extra}': 'доп. указания игроку',
    '{knowledge_rule}': 'правило знаний (по настройке)', '{min}': 'слов от', '{max}': 'слов до',
    '{them}': '«Имя» или «персонажей «…»»', '{them_cap}': 'то же для начала фразы', '{partner_is}': '«Персонажем» / «Персонажами»',
    '{partners_word}': 'СОБЕСЕДНИК / СОБЕСЕДНИКИ', '{{user}} {{char}}': 'макросы ST тоже работают',
};
const getPrompt = (s, k) => (s.prompts?.[k] || '').trim() || PROMPT_DEFAULTS[k];

function promptVars(s, sync) {
    const { personaName: P, personaDesc, card, isGroup } = sync;
    const C = card.name;
    const [lo, hi] = wordRange(s);
    const them = isGroup ? `персонажей «${C}»` : `«${C}»`;
    return {
        player: P, partner: C, them, them_cap: them,
        partner_is: isGroup ? 'Персонажами' : 'Персонажем',
        partners_word: isGroup ? 'СОБЕСЕДНИКИ' : 'СОБЕСЕДНИК',
        persona: s.roleOverride || personaDesc || '(описание не задано — выстрой характер из хода игры и оставайся последовательным)',
        card: [`Описание: ${card.description || '—'}`, card.personality ? `Характер: ${card.personality}` : '', `Сценарий: ${card.scenario || '—'}`].filter(Boolean).join('\n'),
        scenario: card.scenario || '—',
        extra: s.extraInstructions ? `\nДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ ИГРОКУ:\n${s.extraInstructions}\n` : '',
        knowledge_rule: s.knowledge === 'scene'
            ? `Описание мира и ${them} выше — знание ведущего. «${P}» знает только то, что сам видел, слышал или мог знать по своей биографии. Скрытое не используй.`
            : 'Можешь опираться на всё описание мира выше.',
        min: lo, max: hi,
    };
}

function renderPrompt(s, sync, key) {
    const vars = promptVars(s, sync);
    let t = getPrompt(s, key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    try { t = ctx().substituteParams?.(t) ?? t; } catch { /* без макросов ST */ }
    return t.replace(/\n{3,}/g, '\n\n').trim();
}

const buildSystemPrompt = (s, sync) => renderPrompt(s, sync, 'system');

// Грубая оценка токенов (для обрезки); точный подсчёт — через токенайзер ST в шкале контекста
const estTokens = t => Math.ceil(String(t || '').length / 3.2);
const ctxLimit = p => num(p?.contextSize, 1000, 2000000, 32000);

// Источник истории — ТОЛЬКО ctx().chat, т.е. открытый сейчас чат. Другие чаты не читаются.
function buildMessages(s, sync, system = '') {
    const c = ctx();
    const p = activeProfile();
    const N = num(s.contextMessages, 2, 500, 30);
    const all = (c.chat || []).filter(m => !m.is_system && (m.mes || '').trim());
    const first = all.length > 1 ? all[0] : null;          // приветствие держим всегда
    let tail = first ? all.slice(Math.max(1, all.length - N)) : all.slice(-N);
    // обрезка по бюджету токенов: лимит модели − ответ − системный промпт − запас
    const budget = ctxLimit(p) - num(s.maxTokens, 100, 16000, 1200) - estTokens(system) - estTokens(getPrompt(s, 'turn')) - 600;
    const cost = arr => arr.reduce((a, m) => a + estTokens(m.mes) + 8, 0) + (first ? estTokens(first.mes) : 0);
    let trimmed = Math.max(0, all.length - (first ? 1 : 0) - tail.length);
    while (tail.length > 1 && cost(tail) > budget) { tail = tail.slice(1); trimmed++; }
    const chat = first ? [first, ...tail] : tail;
    const gap = trimmed > 0 && !!first;
    const raw = [];
    chat.forEach((m, i) => {
        if (i === 1 && gap) raw.push({ role: 'user', content: '[…часть истории пропущена…]' });
        raw.push(m.is_user ? { role: 'assistant', content: m.mes } : { role: 'user', content: `${m.name}: ${m.mes}` });
    });
    const msgs = [];
    for (const m of raw) {
        const last = msgs[msgs.length - 1];
        if (last && last.role === m.role) last.content += `\n\n${m.content}`;
        else msgs.push({ ...m });
    }
    if (!msgs.length || msgs[0].role !== 'user') {
        msgs.unshift({ role: 'user', content: `[Начало ролевой игры. Сценарий: ${sync.card.scenario || '—'}]` });
    }
    const turn = renderPrompt(s, sync, 'turn');
    const last = msgs[msgs.length - 1];
    if (last.role === 'user') last.content += `\n\n${turn}`;
    else msgs.push({ role: 'user', content: turn });
    msgs.meta = { chatId: chatId(), total: all.length, included: chat.length, trimmed };
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
function scheduleMeter() { clearTimeout(meterTimer); meterTimer = setTimeout(() => updateCtxMeter().catch(e => console.warn('[AI Player] шкала:', e)), 250); }

async function updateCtxMeter() {
    const box = document.getElementById('aip_ctx');
    if (!box) return;
    const id0 = chatId(), seq = ++meterSeq;
    if (!id0 || !(ctx().chat || []).length) {
        box.dataset.level = 'empty';
        document.getElementById('aip_ctxText').textContent = 'Контекст: чат не открыт';
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
    box.dataset.level = pct > 1 ? 'over' : pct > 0.85 ? 'high' : 'ok';
    const k = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
    const m = msgs.meta;
    document.getElementById('aip_ctxText').textContent =
        `${k(used)} / ${k(limit)} (${Math.round(pct * 100)}%) · сообщений ${m.included}/${m.total}${m.trimmed ? ` · ${m.trimmed} не влезло` : ''}`;
    box.title = `Только текущий чат: ${sync.personaName} × ${sync.card.name}\n`
        + `Системный промпт: ${sys} ток.\nИстория чата: ${hist} ток.\nРезерв на ответ: ${res} ток.\nЛимит модели (настройка профиля): ${limit} ток.`;
}

const buildReactionPrompt = (s, sync) => renderPrompt(s, sync, 'reaction');

function transcript(n = 6) {
    return (ctx().chat || []).filter(m => !m.is_system && (m.mes || '').trim()).slice(-n)
        .map(m => `${m.is_user ? '[ТЫ] ' : ''}${m.name}: ${m.mes}`).join('\n\n');
}

// ---------- Вызов модели через бэкенд ST ----------
async function callModel(p, s, system, messages, { maxTokens, signal, stop } = {}) {
    const src = srcOf(p);
    if (!p.model) throw new Error('Не указана модель');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(new DOMException('timeout', 'TimeoutError')), REQUEST_TIMEOUT);
    const onAbort = () => ctl.abort();
    signal?.addEventListener('abort', onAbort);
    try {
        const body = {
            chat_completion_source: src.source,
            model: p.model,
            max_tokens: maxTokens ?? num(s.maxTokens, 100, 16000, 1200),
            messages: [{ role: 'system', content: system }, ...messages],
            stream: false,
        };
        if (s.sendTemperature) {
            const t = num(p.temperature, 0, 2, 0.9);
            body.temperature = src.source === 'claude' ? Math.min(1, t) : t;
        }
        if (stop?.length) body.stop = stop;
        if (p.secretId) body.secret_id = p.secretId;
        if (src.source === 'custom') {
            if (!baseUrl(p)) throw new Error('Не указан URL');
            body.custom_url = baseUrl(p);
        } else {
            body.use_sysprompt = true;          // иначе ST превратит system в user-сообщение
            body.claude_use_sysprompt = true;   // (имя поля в старых версиях ST)
        }
        const r = await fetch('/api/backends/chat-completions/generate', {
            method: 'POST', signal: ctl.signal, headers: H(), body: JSON.stringify(body),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.error) {
            const e = j?.error;
            const m = (typeof e === 'string' ? e : e?.message)
                || (e === true ? 'Ошибка бэкенда ST — подробности в консоли сервера SillyTavern' : '')
                || j?.message || `HTTP ${r.status}`;
            throw new Error(m);
        }
        const ch = j?.choices?.[0];
        const text = ch?.message?.content
            || (Array.isArray(j?.content) ? j.content.filter(x => x.type === 'text').map(x => x.text).join('') : '')
            || '';
        return { text, usage: j?.usage ?? null, truncated: ch?.finish_reason === 'length' || j?.stop_reason === 'max_tokens' };
    } catch (e) {
        if (ctl.signal.reason?.name === 'TimeoutError') throw new Error('Превышено время ожидания ответа (3 мин)');
        throw e;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
    }
}

async function fetchModels(p) {
    if (srcOf(p).source === 'claude') return CLAUDE_MODELS;
    const body = { chat_completion_source: 'custom', custom_url: baseUrl(p) };
    if (p.secretId) body.secret_id = p.secretId;
    const r = await post('/api/backends/chat-completions/status', body);
    const j = await r.json().catch(() => ({}));
    if (j?.error) return [];
    const arr = j?.data ?? j?.models ?? [];
    return [...new Set((Array.isArray(arr) ? arr : []).map(m => m?.id ?? m).filter(x => typeof x === 'string'))].sort();
}

// ---------- Очистка ответа ----------
function cleanReply(text, sync) {
    let t = String(text || '');
    t = t.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
    t = t.replace(/(?:\*\*)?\[{1,2}\s*OOC\s*\]{1,2}(?:\*\*)?[\s\S]*?(?:\[{1,2}\s*\/\s*OOC\s*\]{1,2}|$)/gi, '');
    t = t.trim();
    t = t.replace(new RegExp(`^\\s*(?:\\*\\*)?${esc(sync.personaName)}(?:\\*\\*)?\\s*:\\s*`, 'i'), '');
    for (const name of sync.partners) {
        const cut = t.search(new RegExp(`\\n\\s*(?:\\*\\*)?${esc(name)}(?:\\*\\*)?\\s*:`, 'i'));
        if (cut > 0) t = t.slice(0, cut);
    }
    return t.trim();
}

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
        b.title = v ? 'AI Player: остановить' : 'AI Player: сделать ход за игрока';
    }
}

async function playTurn() {
    if (busy) { abortCtl?.abort(); return; }              // повторное нажатие = стоп
    setBusy(true);
    abortCtl = new AbortController();
    const signal = abortCtl.signal;
    try {
        const { s } = settings();
        const p = activeProfile();
        if (isStBusy()) { toastr.warning('Таверна ещё генерирует — дождитесь окончания'); return; }
        if (!p.model) { toastr.warning('Укажите модель в окне AI Player'); openModal(); return; }
        if (!(await profileHasKey(p))) { toastr.warning('Сохраните API-ключ в окне AI Player'); openModal(); return; }

        const c0 = ctx();
        const visible = (c0.chat || []).filter(m => !m.is_system);
        if (visible.length && visible[visible.length - 1].is_user
            && !confirm('Последнее сообщение — ход игрока, бот ещё не ответил. Сделать ещё один ход подряд?')) return;

        const id0 = chatId();
        const snap = JSON.stringify((c0.chat || []).slice(-1).map(m => [m.mes, m.swipe_id]));
        const len0 = c0.chat?.length ?? 0;

        const sync = getSync();
        const t0 = performance.now();
        const stop = sync.partners.flatMap(n => [`\n${n}:`, `\n**${n}**:`]);
        const system = buildSystemPrompt(s, sync);
        const messages = buildMessages(s, sync, system);
        if (messages.meta.chatId !== id0) throw new Error('Чат сменился при сборке контекста');
        const res = await callModel(p, s, system, messages, { signal, stop });
        if (signal.aborted) return;

        const c1 = ctx();
        if (chatId() !== id0 || (c1.chat?.length ?? 0) !== len0
            || JSON.stringify((c1.chat || []).slice(-1).map(m => [m.mes, m.swipe_id])) !== snap) {
            toastr.warning('Чат изменился во время генерации — ход отброшен');
            return;
        }
        const msg = cleanReply(res.text, sync);
        if (!msg) throw new Error('Модель вернула пустую реплику');
        if (res.truncated) toastr.warning('Ответ обрезан по лимиту токенов — увеличьте «Макс. токенов»');

        const ta = document.getElementById('send_textarea');
        if (ta.value.trim() && !confirm('В поле ввода есть ваш текст. Заменить его ходом агента?')) return;
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
            if (isStBusy()) toastr.info('Таверна занята — ход оставлен в поле ввода');
            else document.getElementById('send_but')?.click();
        }
    } catch (e) {
        if (e.name !== 'AbortError') { console.error('[AI Player]', e); toastr.error(`AI Player: ${short(e.message)}`); }
    } finally {
        setBusy(false);
        abortCtl = null;
    }
}

function onMessageSent(id) {
    const c = ctx();
    const m = c.chat?.[id];
    if (!pendingMeta || !m?.is_user || pendingMeta.chat !== chatId()) return;
    // если пользователь заменил ход агента своим текстом — это уже не ход агента
    const norm = t => String(t).replace(/\s+/g, ' ').trim();
    if (!norm(m.mes).includes(norm(pendingMeta.text).slice(0, 40))) { pendingMeta = null; return; }
    m.extra = { ...(m.extra || {}), aip: { ...pendingMeta.meta, edited: m.mes.trim() !== pendingMeta.text.trim() } };
    pendingMeta = null;
    c.saveChat?.();
    renderBadge(id);
}

// ---------- Вывод агента после ответа бота ----------
async function onBotMessage(id) {
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
    const key = `${id0}:${id}:${m.swipe_id ?? 0}`;
    if (reacted.has(key)) return;
    reacted.add(key);

    const p = findProfile(pm.extra.aip.profileId) || activeProfile();
    if (!p?.model) return;
    const sync = getSync();
    try {
        const res = await callModel(p, s, buildReactionPrompt(s, sync),
            [{ role: 'user', content: `Последние сообщения игры:\n\n${transcript(6)}\n\n[Дай вывод о последнем ответе «${m.name}».]` }],
            { maxTokens: 500 });
        if (chatId() !== id0) return;
        const text = String(res.text || '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim();
        if (!text) return;
        const entry = {
            mesId: id, swipeId: m.swipe_id ?? 0, bot: m.name,
            playerModel: pm.extra.aip.model, botModel: m.extra?.model || '?', text, ts: Date.now(),
        };
        const meta = ctx().chatMetadata;
        if (meta) {
            (meta.aip_log ??= []).push(entry);
            ctx().saveMetadata?.();
        }
        appendThought(entry);
    } catch (e) {
        console.warn('[AI Player] вывод не получен:', e);
        toastr.warning(`AI Player: вывод не получен — ${short(e.message)}`);
    }
}

// ---------- Окно мыслей ----------
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

function thoughtNode(e) {
    const item = el('div', 'aip-th-item');
    const head = el('div', 'aip-th-meta');
    head.append(el('span', 'aip-th-id', `#${e.mesId}${e.swipeId ? ` · свайп ${e.swipeId + 1}` : ''}`));
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
    const n = (ctx().chatMetadata?.aip_log || []).length;
    const c = document.querySelector('#aip_thoughts .aip-th-count');
    if (c) c.textContent = n ? String(n) : '';
    document.getElementById('aip_thoughts')?.classList.toggle('aip-empty', !n);
}
function appendThought(e) {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    const node = thoughtNode(e);
    node.classList.add('aip-new');
    node.addEventListener('animationend', () => node.classList.remove('aip-new'), { once: true });
    body.appendChild(node);
    body.scrollTop = body.scrollHeight;
    updateThoughtsCount();
    if (settings().s.thoughtsHidden) toastr.info('💭 Новый вывод игрока', 'AI Player', { timeOut: 2500 });
    else showThoughts(true);
}
function renderThoughts() {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    body.replaceChildren(...(ctx().chatMetadata?.aip_log || []).map(thoughtNode));
    body.scrollTop = body.scrollHeight;
    updateThoughtsCount();
}
function showThoughts(v) {
    const el = document.getElementById('aip_thoughts');
    el.classList.toggle('aip-open', v);
    if (v) clampIntoView(el);
}
function clampIntoView(el) {
    if (!el.style.left) return;
    const r = el.getBoundingClientRect();
    const headH = el.querySelector('.aip-th-head').offsetHeight;
    const x = Math.max(0, Math.min(r.left, window.innerWidth - r.width));
    const y = Math.max(0, Math.min(r.top, window.innerHeight - headH));
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

function buildThoughts() {
    const el = document.createElement('div');
    el.id = 'aip_thoughts';
    el.innerHTML = `<div class="aip-th-head"><div class="aip-th-title"><i class="fa-solid fa-comment-dots"></i><b>Мысли игрока</b><span class="aip-th-count"></span></div><span class="aip-th-btns"><a class="aip-icon" data-act="min" title="Свернуть / развернуть"><i class="fa-solid fa-minus"></i></a><a class="aip-icon" data-act="clear" title="Очистить выводы этого чата"><i class="fa-solid fa-trash-can"></i></a><a class="aip-icon" data-act="close" title="Скрыть"><i class="fa-solid fa-xmark"></i></a></span></div><div class="aip-th-body"></div><div class="aip-th-empty">Выводы появятся здесь, когда бот ответит на ход агента.<br><small>Вне ролевой игры — в чат не попадают.</small></div>`;
    uiHost().appendChild(el);
    el.classList.toggle('aip-min', !!settings().s.thoughtsMin);
    el.querySelector('[data-act="min"]').onclick = () => {
        const { s, save } = settings();
        s.thoughtsMin = !s.thoughtsMin; save();
        el.classList.toggle('aip-min', s.thoughtsMin);
        clampIntoView(el);
    };
    el.querySelector('[data-act="close"]').onclick = () => {
        showThoughts(false);
        const { s, save } = settings(); s.thoughtsHidden = true; save();
    };
    el.querySelector('[data-act="clear"]').onclick = () => {
        if (!confirm('Очистить выводы игрока в этом чате?')) return;
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
            const { s: st, save } = settings();
            st.thoughtsPos = { x: parseInt(el.style.left) || 0, y: parseInt(el.style.top) || 0 };
            save();
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
        head.addEventListener('pointercancel', up);
    });
    window.addEventListener('resize', () => clampIntoView(el));
}

// ---------- Подписи моделей в чате ----------
function renderBadge(id) {
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
    b.title = `Ход сделан агентом AI Player (профиль «${m.extra.aip.profile}»)`;
    name.after(b);
}
const renderAllBadges = () => (ctx().chat || []).forEach((_, i) => renderBadge(i));

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
    const log = c.chatMetadata?.aip_log || [];
    const turns = (c.chat || []).map((m, i) => ({ m, i })).filter(({ m }) => !m.is_system).map(({ m, i }) => ({
        index: i, side: m.is_user ? (m.extra?.aip ? 'agent' : 'human') : 'bot', name: m.name, time: m.send_date,
        model: m.is_user ? (m.extra?.aip?.model ?? null) : (m.extra?.model ?? null),
        api: m.is_user ? (m.extra?.aip?.provider ?? null) : (m.extra?.api ?? null),
        player_meta: m.extra?.aip ?? null,
        words: (m.mes.match(/\S+/g) || []).length, swipes: m.swipes?.length ?? 1,
        text: m.mes,
        reactions: log.filter(e => e.mesId === i).map(e => ({ swipe: e.swipeId, text: e.text })),
    }));
    return {
        format: 'ai-player-match/2', exported: new Date().toISOString(), chatId: chatId(),
        character: c.name2, persona: c.name1,
        settings: { maxTokens: s.maxTokens, contextMessages: s.contextMessages, minWords: s.minWords, maxWords: s.maxWords, knowledge: s.knowledge, extraInstructions: s.extraInstructions, roleOverride: s.roleOverride },
        turns,   // ключей и secretId здесь нет
    };
}
const fileBase = () => `aip_${(ctx().name2 || 'chat').replace(/[^\p{L}\p{N}_-]+/gu, '_')}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
function exportJSON() { download(`${fileBase()}.json`, JSON.stringify(matchData(), null, 2), 'application/json'); }
function exportMD() {
    const d = matchData();
    const out = [`# ${d.persona} × ${d.character}`, `_Экспорт ${d.exported}_`, ''];
    for (const t of d.turns) {
        const tag = t.side === 'agent' ? ` — 🤖 ${t.model}` : t.side === 'bot' && t.model ? ` — ${t.model}` : t.side === 'human' ? ' — (вручную)' : '';
        const pm = t.player_meta;
        const extra = pm ? ` · ${pm.words} сл.${pm.inRange ? '' : ' ⚠'} · ${(pm.latencyMs / 1000).toFixed(1)} с` : '';
        out.push(`### #${t.index} ${t.name}${tag}${extra}`, '', t.text, '');
        for (const r of t.reactions) out.push(...r.text.split('\n').map(l => `> 💭 ${l}`), '');
    }
    download(`${fileBase()}.md`, out.join('\n'), 'text/markdown');
}

// ---------- Окно настроек ----------
function buildModal() {
    const o = document.createElement('div');
    o.id = 'aip_overlay';
    o.innerHTML = `
    <div id="aip_modal" role="dialog" aria-label="AI Player">
      <header class="aip-head">
        <div class="aip-title"><span class="aip-logo"><i class="fa-solid fa-robot"></i></span><div><b>AI Player</b><small>ИИ против ИИ</small></div></div>
        <div class="aip-chip" id="aip_chip" title="Активный профиль агента"><span class="aip-dot"></span><span id="aip_chipText">—</span></div>
        <a class="aip-icon aip-close" id="aip_close" title="Закрыть (Esc)"><i class="fa-solid fa-xmark"></i></a>
      </header>

      <div class="aip-ctx" id="aip_ctx" data-level="empty">
        <div class="aip-ctx-bar"><i id="aip_ctx_sys"></i><i id="aip_ctx_hist"></i><i id="aip_ctx_res"></i></div>
        <div class="aip-ctx-legend"><span class="aip-ctx-label"><i class="fa-solid fa-layer-group"></i> <span id="aip_ctxText">Контекст: —</span></span><span class="aip-ctx-keys"><b class="k-sys"></b>промпт <b class="k-hist"></b>история <b class="k-res"></b>ответ</span></div>
      </div>

      <nav class="aip-tabs" role="tablist">
        <button type="button" class="aip-tab" data-tab="conn" role="tab"><i class="fa-solid fa-plug"></i><span>Подключение</span></button>
        <button type="button" class="aip-tab" data-tab="game" role="tab"><i class="fa-solid fa-dice-d20"></i><span>Игра</span></button>
        <button type="button" class="aip-tab" data-tab="prompts" role="tab"><i class="fa-solid fa-pen-nib"></i><span>Промпты</span></button>
        <button type="button" class="aip-tab" data-tab="match" role="tab"><i class="fa-solid fa-chess-knight"></i><span>Партия</span></button>
      </nav>

      <div class="aip-body">
        <section class="aip-panel" data-panel="conn">
          <div class="aip-card">
            <div class="aip-card-title">Профиль</div>
            <div class="aip-row">
              <select id="aip_profile"></select>
              <button type="button" class="menu_button aip-sq" id="aip_profNew" title="Новый профиль (копия текущего)"><i class="fa-solid fa-plus"></i></button>
              <button type="button" class="menu_button aip-sq" id="aip_profDel" title="Удалить профиль"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <label>Название</label><input id="aip_profName" type="text">
          </div>

          <div class="aip-card">
            <div class="aip-card-title">API</div>
            <label>Тип</label>
            <select id="aip_p_provider"><option value="openai">${SOURCE.openai.label}</option><option value="anthropic">${SOURCE.anthropic.label}</option></select>
            <div id="aip_urlWrap"><label>URL — база API или адрес реверс-прокси</label><input id="aip_p_url" type="text" placeholder="https://api.openai.com/v1"></div>
            <label>Ключ</label>
            <div class="aip-row aip-keyrow"><input id="aip_keyInput" type="password" autocomplete="new-password" placeholder="вставьте ключ"><button type="button" class="menu_button" id="aip_keySave"><i class="fa-solid fa-lock"></i> Сохранить</button><button type="button" class="menu_button aip-sq" id="aip_keyDel" title="Удалить ключ профиля"><i class="fa-solid fa-key"></i><i class="fa-solid fa-xmark aip-mini"></i></button></div>
            <div class="aip-note" id="aip_keyState">…</div>
          </div>

          <div class="aip-card">
            <div class="aip-card-title">Модель</div>
            <div class="aip-row aip-keyrow"><input id="aip_p_model" type="text" list="aip_models" placeholder="выберите или впишите ID"><datalist id="aip_models"></datalist><button type="button" class="menu_button aip-sq" id="aip_fetchModels" title="Загрузить список моделей"><i class="fa-solid fa-rotate"></i></button></div>
            <div class="aip-row">
              <div><label>Температура</label><input id="aip_p_temperature" type="number" step="0.1" min="0" max="2"></div>
              <div><label>Контекст модели, токенов</label><input id="aip_p_contextSize" type="number" step="1000" min="1000"></div>
            </div>
            <label class="aip-check"><input type="checkbox" id="aip_sendTemperature"> передавать temperature <small>reasoning-модели её не принимают</small></label>
          </div>
        </section>

        <section class="aip-panel" data-panel="game">
          <div class="aip-card">
            <div class="aip-card-title">Объём и контекст</div>
            <div class="aip-row">
              <div><label>Слов от</label><input id="aip_minWords" type="number" min="10"></div>
              <div><label>Слов до</label><input id="aip_maxWords" type="number" min="20"></div>
            </div>
            <div class="aip-row">
              <div><label>Макс. токенов</label><input id="aip_maxTokens" type="number" min="100" max="16000"></div>
              <div><label>Сообщений в контексте</label><input id="aip_contextMessages" type="number" min="2" max="500"></div>
            </div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">Роль игрока</div>
            <label>Что игрок знает о карте бота</label>
            <select id="aip_knowledge"><option value="scene">Только то, что видно в сцене (без метагейма)</option><option value="full">Всё описание карты</option></select>
            <label>Роль игрока — пусто = описание выбранной персоны ST</label><textarea id="aip_roleOverride" placeholder="Например: циничный наёмник, который скрывает…"></textarea>
            <label>Доп. указания — цели, манера</label><textarea id="aip_extraInstructions" placeholder="Например: хочет выведать тайну, не доверяет никому…"></textarea>
          </div>
          <div class="aip-card aip-switches">
            <label class="aip-check"><input type="checkbox" id="aip_autoSend"> Сразу отправлять ход в чат <small>иначе — в поле ввода</small></label>
            <label class="aip-check"><input type="checkbox" id="aip_reactions"> Вывод в окно 💭 после ответа бота <small>доп. короткий запрос</small></label>
            <label class="aip-check"><input type="checkbox" id="aip_motion"> Анимации интерфейса <small>можно выключить на слабом телефоне</small></label>
          </div>
        </section>

        <section class="aip-panel" data-panel="prompts">
          <div class="aip-card">
            <select id="aip_promptKey">${Object.entries(PROMPT_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            <textarea id="aip_promptText" class="aip-prompt" spellcheck="false"></textarea>
            <div class="aip-note" id="aip_promptState"></div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_promptPreview"><i class="fa-solid fa-eye"></i> Предпросмотр</button>
              <button type="button" class="menu_button" id="aip_promptVars"><i class="fa-solid fa-code"></i> Плейсхолдеры</button>
              <button type="button" class="menu_button" id="aip_promptReset"><i class="fa-solid fa-rotate-left"></i> Сбросить</button>
            </div>
            <div class="aip-note aip-mono aip-hidden" id="aip_promptOut"></div>
          </div>
        </section>

        <section class="aip-panel" data-panel="match">
          <div class="aip-card">
            <div class="aip-card-title">Синхронизация с таверной <a class="aip-icon" id="aip_resync" title="Обновить"><i class="fa-solid fa-rotate"></i></a></div>
            <div class="aip-note" id="aip_sync">—</div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">Партия</div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_th_toggle"><i class="fa-solid fa-comment-dots"></i> Окно мыслей</button>
              <button type="button" class="menu_button" id="aip_expMD"><i class="fa-solid fa-file-lines"></i> Экспорт .md</button>
              <button type="button" class="menu_button" id="aip_expJSON"><i class="fa-solid fa-file-code"></i> Экспорт .json</button>
            </div>
          </div>
        </section>
      </div>

      <footer class="aip-foot">
        <div class="aip-status" id="aip_status"></div>
        <div class="aip-foot-btns">
          <button type="button" class="menu_button" id="aip_test"><i class="fa-solid fa-signal"></i> Тест</button>
          <button type="button" class="menu_button aip-primary" id="aip_play_modal"><i class="fa-solid fa-play"></i> Сделать ход</button>
        </div>
      </footer>
    </div>`;
    uiHost().appendChild(o);
    const $ = sel => o.querySelector(sel);
    o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && o.classList.contains('aip-open')) closeModal(); });
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
        const p = newProfile(`Профиль ${s.profiles.length + 1}`, cur);
        s.profiles.push(p); s.activeProfile = p.id; save(); fillModal();
        toastr.info('Создан профиль. Ключ у него свой — сохраните его.');
    };
    $('#aip_profDel').onclick = async () => {
        const { s, save } = settings();
        if (s.profiles.length < 2) { toastr.warning('Нельзя удалить единственный профиль'); return; }
        const p = activeProfile();
        if (!confirm(`Удалить профиль «${p.name}»${p.secretId ? ' и его ключ' : ''}?`)) return;
        if (p.secretId) await post('/api/secrets/delete', { key: srcOf(p).secret, id: p.secretId }).catch(() => {});
        s.profiles = s.profiles.filter(x => x.id !== p.id);
        s.activeProfile = s.profiles[0].id; save(); fillModal();
    };
    $('#aip_profName').addEventListener('input', e => {
        const p = activeProfile(); p.name = e.target.value || 'Без имени'; settings().save();
        const opt = $(`#aip_profile option[value="${p.id}"]`); if (opt) opt.textContent = p.name;
        updateChip(document.getElementById('aip_chip').dataset.state);
    });
    for (const f of PROFILE_FIELDS) {
        $(`#aip_p_${f}`).addEventListener(f === 'provider' ? 'change' : 'input', e => {
            const p = activeProfile();
            const prev = p.provider;
            p[f] = e.target.value;
            if (f === 'provider' && prev !== p.provider) {
                if (!p.url || p.url === SOURCE[prev]?.defUrl) p.url = srcOf(p).defUrl;
                p.secretId = null;   // ключ другого провайдера не подходит
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
        $(`#aip_${f}`).addEventListener('change', e => { const { s, save } = settings(); s[f] = e.target.checked; save(); if (f === 'motion') applyMotion(); });
    }
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
    $('#aip_promptReset').onclick = () => {
        if (!confirm(`Сбросить «${PROMPT_LABELS[promptKey()]}» к стандартному?`)) return;
        const { s, save } = settings();
        (s.prompts ??= {})[promptKey()] = ''; save(); fillPrompt();
    };
    $('#aip_promptPreview').onclick = () => {
        const out = $('#aip_promptOut');
        try { out.textContent = renderPrompt(settings().s, getSync(), promptKey()); }
        catch (e) { out.textContent = `Ошибка: ${short(e.message)}`; }
        out.classList.remove('aip-hidden');
    };
    $('#aip_promptVars').onclick = () => {
        const out = $('#aip_promptOut');
        out.textContent = Object.entries(PLACEHOLDERS).map(([k, v]) => `${k} — ${v}`).join('\n');
        out.classList.remove('aip-hidden');
    };

    // ключ
    $('#aip_keySave').onclick = async () => {
        const inp = $('#aip_keyInput');
        const val = inp.value.trim();
        if (!val) { toastr.warning('Введите ключ'); return; }
        try {
            if (await saveProfileKey(activeProfile(), val)) { inp.value = ''; toastr.success('Ключ сохранён в хранилище SillyTavern'); }
        } catch (e) { toastr.error(short(e.message)); }
        refreshKeyState();
    };
    $('#aip_keyDel').onclick = async () => {
        try { await deleteProfileKey(activeProfile()); } catch (e) { toastr.error(short(e.message)); }
        refreshKeyState();
    };
    // модели
    $('#aip_fetchModels').onclick = async () => {
        try {
            const ids = await fetchModels(activeProfile());
            $('#aip_models').replaceChildren(...ids.map(id => Object.assign(document.createElement('option'), { value: id })));
            toastr.info(ids.length ? `Моделей: ${ids.length} — выберите в поле «Модель»` : 'Список не получен — впишите ID вручную');
        } catch (e) { toastr.error(short(e.message)); }
    };
    // действия
    $('#aip_test').onclick = async () => {
        const st = $('#aip_status');
        if (busy) return;
        st.className = 'aip-status'; st.textContent = 'Проверка…';
        try {
            const p = activeProfile();
            if (!(await profileHasKey(p))) throw new Error('Ключ не сохранён');
            const r = await callModel(p, settings().s, 'Отвечай одним словом.', [{ role: 'user', content: 'Скажи: готов' }], { maxTokens: 30 });
            st.textContent = `✔ Соединение есть (${p.model}). Ответ: ${r.text.trim() || '(пусто)'}`;
            st.classList.add('aip-ok');
        } catch (e) { st.textContent = `✖ ${short(e.message)}`; st.classList.add('aip-err'); }
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
    document.getElementById('aip_chipText').textContent = `${p.name} · ${p.model || 'модель не выбрана'}`;
}

function toggleThoughts() {
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
    document.getElementById('aip_urlWrap').style.display = srcOf(p).source === 'custom' ? '' : 'none';
    document.getElementById('aip_models').replaceChildren(
        ...(srcOf(p).source === 'claude' ? CLAUDE_MODELS : []).map(id => Object.assign(document.createElement('option'), { value: id })));
    for (const f of GLOBAL_FIELDS) document.getElementById(`aip_${f}`).value = s[f] ?? '';
    for (const f of GLOBAL_CHECKS) document.getElementById(`aip_${f}`).checked = !!s[f];
    document.getElementById('aip_keyInput').value = '';
    refreshKeyState();
    fillPrompt();
}

function fillPrompt() {
    const k = document.getElementById('aip_promptKey').value;
    document.getElementById('aip_promptText').value = getPrompt(settings().s, k);
    document.getElementById('aip_promptOut').classList.add('aip-hidden');
    updatePromptState();
}
function updatePromptState() {
    const k = document.getElementById('aip_promptKey').value;
    const custom = !!(settings().s.prompts?.[k] || '').trim();
    document.getElementById('aip_promptState').textContent = custom
        ? '✎ Свой промпт. Изменения сохраняются сразу. Пустое поле = стандартный.'
        : 'Стандартный промпт. Начните править — сохранится как свой.';
}

async function refreshKeyState() {
    const p = activeProfile();
    const el = document.getElementById('aip_keyState');
    let has = false, legacy = false;
    try {
        const list = slotList(await secretState(), srcOf(p).secret);
        legacy = list.some(x => x.legacy);
        has = p.secretId ? list.some(x => x.id === p.secretId) : list.length > 0;
    } catch { /* нет доступа */ }
    updateChip(!has ? 'none' : p.secretId ? 'ok' : 'shared');
    el.dataset.state = !has ? 'none' : p.secretId ? 'ok' : 'shared';
    el.textContent = p.secretId && has
        ? '🔒 У профиля свой ключ в хранилище SillyTavern (на сервере). В браузер и настройки он не попадает; основной ключ таверны не затронут.'
        : has
            ? `🔑 Используется общий ключ таверны (${srcOf(p).label}).${legacy ? ' Эта версия ST хранит один ключ на провайдера.' : ' Сохраните свой ключ, чтобы профиль не зависел от основной таверны.'}`
            : '⚠ Ключа нет — вставьте и нажмите «Сохранить».';
}

async function refreshSync() {
    try { document.getElementById('aip_sync').textContent = syncPreviewText(getSync()); }
    catch (e) { document.getElementById('aip_sync').textContent = `Ошибка синхронизации: ${short(e.message)}`; }
}

function openModal() {
    let o = document.getElementById('aip_overlay');
    try {
        if (!o) { buildModal(); o = document.getElementById('aip_overlay'); }   // кто-то удалил окно — пересобираем
        const host = uiHost();
        document.body.appendChild(host);                                       // поднять поверх элементов, добавленных позже
        if (o.parentElement !== host) host.appendChild(o);
    } catch (e) {
        console.error('[AI Player] окно не создано', e);
        toastr.error(`AI Player: окно не создано — ${short(e.message)}`);
        return;
    }
    // окно показываем всегда; ошибки заполнения — уведомлением, а не молчаливым отказом
    o.classList.add('aip-open');
    const step = (name, fn) => {
        try { fn(); } catch (e) {
            console.error(`[AI Player] ${name}`, e);
            toastr.error(`AI Player (${name}): ${short(e.message)}`);
        }
    };
    step('настройки', fillModal);
    step('статус', () => { document.getElementById('aip_status').textContent = ''; });
    step('синхронизация', refreshSync);
    step('шкала', scheduleMeter);
}
function closeModal() { document.getElementById('aip_overlay').classList.remove('aip-open'); }

// Контейнер для окон расширения с явным размером экрана.
// Некоторые темы/стили ST меняют containing block у position:fixed (body нулевой высоты),
// из-за чего окна с top/bottom/height:100% получали высоту 0 и уезжали за экран.
function uiHost() {
    let h = document.getElementById('aip_host');
    if (!h) {
        h = document.createElement('div');
        h.id = 'aip_host';
        document.body.appendChild(h);
    }
    return h;
}

// ---------- Диагностика (для телефона, где нет консоли браузера) ----------
function diagnose() {
    const lines = [`AI Player ${VERSION} · ${navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/)?.[0] || navigator.userAgent.slice(0, 60)}`];
    const css = getComputedStyle(document.documentElement).getPropertyValue('--aip-dur').trim();
    lines.push(`style.css загружен: ${css ? 'да' : 'НЕТ'}`);
    const probe = id => {
        const n = document.getElementById(id);
        if (!n) return `${id}: НЕТ в DOM`;
        const cs = getComputedStyle(n), r = n.getBoundingClientRect();
        return `${id}: в ${n.parentElement?.id || n.parentElement?.tagName} · class="${n.className}" · display=${cs.display} vis=${cs.visibility} op=${cs.opacity} z=${cs.zIndex} pos=${cs.position} · ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    lines.push(probe('aip_play'), probe('aip_menu'), probe('aip_host'));
    const o = document.getElementById('aip_overlay');
    const wasOpen = o?.classList.contains('aip-open');
    if (o) o.classList.add('aip-open');                 // принудительно открыть и посмотреть, что получилось
    lines.push(probe('aip_overlay'), probe('aip_modal'));
    const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    lines.push(`сверху в центре экрана: ${top ? `${top.tagName}#${top.id}.${String(top.className).slice(0, 40)}` : '—'}`);
    if (o && !wasOpen) o.classList.remove('aip-open');
    lines.push(probe('aip_thoughts'));
    lines.push(`окно ${innerWidth}×${innerHeight} · чат: ${chatId() ? 'открыт' : 'нет'} · ошибок: ${errors.length}`);
    for (const e of errors.slice(-3)) lines.push(`ошибка: ${e}`);
    const text = lines.join('\n');
    console.log('[AI Player] диагностика\n' + text);
    const ta = document.getElementById('send_textarea');
    if (ta && !ta.value.trim()) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    toastr.info('Отчёт вставлен в поле ввода — скопируйте его и пришлите разработчику. Не отправляйте в чат.', 'AI Player: диагностика', { timeOut: 10000 });
}

// перехват ошибок расширения — показываем уведомлением, т.к. на телефоне консоли не видно
const errors = [];
function reportError(err, where = '') {
    const msg = `${where ? where + ': ' : ''}${err?.message || err}`;
    errors.push(msg);
    console.error('[AI Player]', where, err);
    toastr.error(short(msg), 'AI Player — ошибка');
}
window.addEventListener('error', e => { if (String(e.filename || e.error?.stack || '').includes('AI-Player')) reportError(e.error || e.message, 'скрипт'); });
window.addEventListener('unhandledrejection', e => { if (String(e.reason?.stack || '').includes('AI-Player')) reportError(e.reason, 'промис'); });
const safe = (name, fn) => (...a) => { try { const r = fn(...a); if (r?.catch) r.catch(e => reportError(e, name)); return r; } catch (e) { reportError(e, name); } };

// ---------- Кнопки ----------
function addButtons() {
    const host = document.getElementById('rightSendForm') || document.getElementById('send_form');
    if (host && !document.getElementById('aip_play')) {
        const b = document.createElement('div');
        b.id = 'aip_play';
        b.className = 'aip-play fa-solid fa-play interactable';
        b.title = 'AI Player: сделать ход за игрока';
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
            mk('aip_menu', 'fa-robot', 'AI Player — настройки', safe('настройки', openModal)),
            mk('aip_menu_th', 'fa-comment-dots', 'AI Player — окно мыслей', safe('окно мыслей', toggleThoughts)),
            mk('aip_menu_diag', 'fa-stethoscope', 'AI Player — диагностика', safe('диагностика', diagnose)),
        );
    }
}

jQuery(() => { try { initAll(); } catch (e) { reportError(e, 'запуск'); } });

function initAll() {
    settings();
    applyMotion();
    buildModal();
    buildThoughts();
    addButtons();
    const c = ctx();
    const ev = c.event_types;
    c.eventSource.on(ev.CHAT_CHANGED, () => {
        abortCtl?.abort();
        pendingMeta = null;
        renderThoughts();
        setTimeout(renderAllBadges, 300);
        if (document.getElementById('aip_overlay').classList.contains('aip-open')) refreshSync();
    });
    c.eventSource.on(ev.MESSAGE_SENT, onMessageSent);
    // шкала контекста следует за текущим чатом
    for (const name of ['CHAT_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_DELETED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'PERSONA_CHANGED']) {
        if (ev[name]) c.eventSource.on(ev[name], () => {
            if (document.getElementById('aip_overlay').classList.contains('aip-open')) scheduleMeter();
        });
    }
    c.eventSource.on(ev.MESSAGE_RECEIVED, id => { onBotMessage(id); });
    if (ev.USER_MESSAGE_RENDERED) c.eventSource.on(ev.USER_MESSAGE_RENDERED, renderBadge);
    if (ev.MORE_MESSAGES_LOADED) c.eventSource.on(ev.MORE_MESSAGES_LOADED, renderAllBadges);
    renderThoughts();
    renderAllBadges();
    console.log(`[AI Player] ${VERSION} загружен`);
    const { s, save } = settings();
    if (s.lastVersion !== VERSION) {     // один раз после обновления — подтверждение, что загрузилась новая версия
        s.lastVersion = VERSION; save();
        toastr.success(`Версия ${VERSION} загружена. Меню-палочка → AI Player.`, 'AI Player', { timeOut: 5000 });
    }
}


