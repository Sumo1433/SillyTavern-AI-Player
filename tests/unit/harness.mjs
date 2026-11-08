// Тестовый стенд: загружает index.js расширения в jsdom с моками SillyTavern.
// index.js не меняется — исходник подключается как обычный <script>, после него
// добавляется маленький «хвост», открывающий внутренние функции через window.__aip.
//
// Моки повторяют поведение SillyTavern 1.19 (исходники: C:\Projects\SillyTavern):
//  - src/endpoints/secrets.js — /api/secrets/{read,write,rotate,delete}
//  - src/endpoints/backends/chat-completions.js — /generate (ключи, ответ Claude)
//  - public/script.js — saveReply / deleteLastMessage / sendMessageAsUser (send_date, gen_finished,
//    swipe_info, MESSAGE_RECEIVED (id, type))
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = readFileSync(path.resolve(here, '../../index.js'), 'utf8');

const EXPOSE = `
;window.__aip = {
  get busy() { return busy; },
  get pendingMeta() { return pendingMeta; },
  cleanReply, buildMessages, buildSystemPrompt, getSync, settings, activeProfile,
  updateCtxMeter, playTurn, openModal, renderPrompt, matchData, setReactions, renderThoughts,
  PROMPT_DEFAULTS, PLACEHOLDER_LABEL,
};`;

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function waitFor(fn, { timeout = 2000, msg = 'условие' } = {}) {
    const t0 = Date.now();
    for (;;) {
        let v;
        try { v = await fn(); } catch { v = false; }
        if (v) return v;
        if (Date.now() - t0 > timeout) throw new Error(`waitFor: не дождались — ${msg}`);
        await sleep(5);
    }
}

// SECRET_KEYS из src/endpoints/secrets.js (без маркера _migrated) — /read возвращает их ВСЕ
export const SECRET_KEYS = [
    'api_key_horde', 'api_key_mancer', 'api_key_vllm', 'api_key_aphrodite', 'api_key_tabby', 'api_key_openai',
    'api_key_novel', 'api_key_claude', 'deepl', 'libre', 'libre_url', 'lingva_url', 'api_key_openrouter',
    'api_key_ai21', 'oneringtranslator_url', 'deeplx_url', 'api_key_makersuite', 'api_key_vertexai',
    'api_key_serpapi', 'api_key_togetherai', 'api_key_mistralai', 'api_key_custom', 'api_key_ooba',
    'api_key_infermaticai', 'api_key_dreamgen', 'api_key_nomicai', 'api_key_koboldcpp', 'api_key_llamacpp',
    'api_key_cohere', 'api_key_perplexity', 'api_key_groq', 'api_key_azure_tts', 'api_key_featherless',
    'api_key_huggingface', 'api_key_stability', 'api_key_custom_openai_tts', 'api_key_tavily', 'api_key_chutes',
    'api_key_electronhub', 'api_key_nanogpt', 'api_key_bfl', 'api_key_comfy_runpod', 'api_key_falai',
    'api_key_generic', 'api_key_deepseek', 'api_key_serper', 'api_key_aimlapi', 'api_key_xai', 'api_key_fireworks',
    'vertexai_service_account_json', 'api_key_minimax', 'minimax_group_id', 'api_key_moonshot', 'api_key_cometapi',
    'api_key_azure_openai', 'api_key_zai', 'api_key_siliconflow', 'api_key_elevenlabs', 'api_key_pollinations',
    'volcengine_app_id', 'volcengine_access_key', 'api_key_workers_ai',
];
const EXPORTABLE_KEYS = ['libre_url', 'lingva_url', 'oneringtranslator_url', 'deeplx_url'];

/** SecretManager.getMaskedValue (allowKeysExposure = false) */
export function maskValue(value, key) {
    if (EXPORTABLE_KEYS.includes(key)) return value;
    if (value.length <= 10) return '*'.repeat(10);
    return '*'.repeat(7) + value.slice(-3);
}

/** Детерминированный «uuidv4» для id новых секретов: newId(1), newId(2)… */
export const newId = n => `0f0e0d0c-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const PROFILE = () => ({
    id: 'p1', name: 'Тест', provider: 'openai',
    url: 'https://proxy.example/v1/chat/completions/', model: 'gpt-test',
    temperature: 0.7, contextSize: 32000, secretId: 'k1',
});

// время сообщений — ISO 8601, как getMessageTimeStamp() в ST
const T0 = Date.parse('2026-11-08T12:00:00.000Z');
const iso = sec => new Date(T0 - 3600_000 + sec * 1000).toISOString();

export const defaultChat = () => [
    { name: 'Алиса', is_user: false, mes: 'Добро пожаловать в таверну!', send_date: iso(0), extra: {}, swipe_id: 0, swipes: ['Добро пожаловать в таверну!'], swipe_info: [{ send_date: iso(0), extra: {} }] },
    { name: 'Боб', is_user: true, mes: '*входит* «Привет»', send_date: iso(10), extra: {} },
    { name: 'Алиса', is_user: false, mes: '«Чего желаешь?»', send_date: iso(20), gen_started: new Date(T0 - 3600_000 + 15_000), gen_finished: new Date(T0 - 3600_000 + 20_000), extra: { api: 'openai', model: 'bot-model' }, swipe_id: 0, swipes: ['«Чего желаешь?»'], swipe_info: [{ send_date: iso(20), extra: { api: 'openai', model: 'bot-model' } }] },
];

// Хранилище secrets.json: значения — СЫРЫЕ ключи; в /read уходят только замаскированные
export const defaultSecrets = () => ({
    api_key_custom: [
        { id: 'k1', label: 'AI Player · Тест', value: 'sk-aip-test-1111', active: false },
        { id: 't1', label: 'Tavern', value: 'sk-tavern-key-2222', active: true },
    ],
});

export const REACTION_TEXT = 'Реакция: живой ответ\nНравится / не нравится: атмосфера\nПартнёр: оценка 7/10 — держит роль\nДальше: заказать эль';

export const isGenerate = c => c.url.endsWith('/api/backends/chat-completions/generate');
// тип запроса — по содержимому, а не по лимиту токенов (лимиты зависят от провайдера)
const sysOf = c => String(c.body?.messages?.[0]?.content || '');
const lastOf = c => String(c.body?.messages?.at?.(-1)?.content || '');
export const isTestCall = c => isGenerate(c) && sysOf(c).startsWith('Отвечай одним словом');
export const isReactionCall = c => isGenerate(c) && !isTestCall(c) && /об игре после ответа «/.test(lastOf(c));
export const isTurnCall = c => isGenerate(c) && !isReactionCall(c) && !isTestCall(c);
export const isSecretCall = (c, op) => c.url.endsWith(`/api/secrets/${op}`);

/**
 * @param {object} opts
 *  - extensionSettings: начальные extensionSettings (по умолчанию — один готовый профиль p1)
 *  - chat, secrets (сырые значения), card, chatId
 *  - turnReply: текст, который «модель» вернёт на ход игрока
 */
export function setup(opts = {}) {
    const logs = [];
    const vc = new VirtualConsole();
    for (const lvl of ['log', 'info', 'warn', 'error']) vc.on(lvl, (...a) => logs.push([lvl, ...a.map(String)]));
    vc.on('jsdomError', e => logs.push(['jsdomError', e.message]));

    const dom = new JSDOM(`<!doctype html><html><head></head><body>
        <div id="chat"></div>
        <div id="send_form">
          <div id="rightSendForm"><div id="mes_stop" style="display:none"></div><div id="send_but"></div></div>
          <textarea id="send_textarea"></textarea>
        </div>
        <div id="extensionsMenu"></div>
      </body></html>`, { runScripts: 'dangerously', url: 'http://localhost:8000/', virtualConsole: vc, pretendToBeVisual: true });
    const w = dom.window;
    const doc = w.document;

    // ---- полифилы ----
    w.requestAnimationFrame = cb => w.setTimeout(() => cb(Date.now()), 0);
    w.cancelAnimationFrame = id => w.clearTimeout(id);
    if (typeof w.structuredClone !== 'function') w.structuredClone = v => structuredClone(v);
    const blobs = [];
    w.URL.createObjectURL = b => { blobs.push(b); return `blob:http://localhost:8000/${blobs.length}`; };
    w.URL.revokeObjectURL = () => {};

    // ---- toastr / confirm / jQuery ----
    const toasts = [];
    w.toastr = Object.fromEntries(['info', 'warning', 'error', 'success'].map(k => [k, (m, t) => { toasts.push({ type: k, msg: String(m), title: t }); }]));
    const confirms = [];
    const env = { confirmAnswer: true, secretsReadBroken: false };
    w.confirm = m => { confirms.push(String(m)); return env.confirmAnswer; };
    w.jQuery = cb => { if (typeof cb === 'function') cb(); };

    // ---- часы сообщений: каждое новое сообщение получает новый send_date ----
    let clock = T0;
    const tick = () => { clock += 1000; return clock; };

    // ---- SillyTavern context ----
    const listeners = {};
    const eventSource = {
        on(ev, fn) { (listeners[ev] ??= []).push(fn); },
        async emit(ev, ...args) { for (const fn of [...(listeners[ev] || [])]) await fn(...args); },
    };
    const event_types = {
        CHAT_CHANGED: 'chat_id_changed', MESSAGE_SENT: 'message_sent', MESSAGE_RECEIVED: 'message_received',
        MESSAGE_DELETED: 'message_deleted', MESSAGE_EDITED: 'message_edited', MESSAGE_SWIPED: 'message_swiped',
        PERSONA_CHANGED: 'persona_changed', USER_MESSAGE_RENDERED: 'user_message_rendered',
        MORE_MESSAGES_LOADED: 'more_messages_loaded',
    };
    const card = {
        persona: 'Боб — циничный наёмник', description: 'Алиса — трактирщица', personality: 'хитрая',
        scenario: 'Таверна на перекрёстке', ...(opts.card || {}),
    };
    const counters = { saveSettings: 0, saveChat: 0, saveMetadata: 0 };
    const state = { chatId: opts.chatId === undefined ? 'chat-1' : opts.chatId };
    const c = {
        chat: opts.chat ?? defaultChat(),
        chatMetadata: {},
        characters: [{ name: 'Алиса', avatar: 'alice.png' }],
        characterId: 0,
        name1: 'Боб', name2: 'Алиса', groupId: null, groups: [],
        extensionSettings: opts.extensionSettings ?? {
            ai_player: { profiles: [PROFILE()], activeProfile: 'p1', lastVersion: '0.3.0' },
        },
        saveSettingsDebounced: () => { counters.saveSettings++; },
        saveChat: async () => { counters.saveChat++; },
        saveMetadata: async () => { counters.saveMetadata++; },
        getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'test' }),
        substituteParams: t => String(t)
            .replaceAll('{{user}}', c.name1).replaceAll('{{char}}', c.name2)
            .replaceAll('{{scenario}}', card.scenario).replaceAll('{{persona}}', card.persona),
        getCharacterCardFields: () => ({ ...card }),
        getCurrentChatId: () => state.chatId,
        getTokenCountAsync: async t => Math.ceil(String(t).length / 4),
        eventSource, event_types,
    };
    w.SillyTavern = { getContext: () => c };

    // ---- fetch-мок бэкенда ST ----
    const calls = [];
    const secrets = opts.secrets ?? defaultSecrets();     // «secrets.json»
    const gates = {};
    let newKeyN = 0;
    const turnReply = opts.turnReply ?? '*кивает* «Мне эля, пожалуйста»';
    const res = (status, data) => ({
        ok: status >= 200 && status < 300, status,
        json: async () => { if (data === undefined) throw new SyntaxError('Unexpected end of JSON input'); return structuredClone(data); },
    });
    const ok = data => res(200, data);
    const noContent = () => res(204);
    const bad = text => ({ ok: false, status: 400, json: async () => { throw new SyntaxError(`Unexpected token: ${text}`); } });

    // SecretManager
    const validKey = key => Object.hasOwn(secrets, key) && Array.isArray(secrets[key]);
    const readSecret = (key, id) => {
        const arr = secrets[key];
        if (Array.isArray(arr) && arr.length) return arr.find(s => id ? s.id === id : s.active)?.value || '';
        return '';
    };
    const secretState = () => {
        const st = {};
        for (const key of SECRET_KEYS) {
            const v = secrets[key];
            st[key] = Array.isArray(v) && v.length
                ? v.map(s => ({ id: s.id, value: maskValue(s.value, key), label: s.label, active: s.active }))
                : null;
        }
        return st;
    };

    const respond = (route, body) => {
        switch (route) {
            case 'secrets/read':
                // при исключении на сервере ST отвечает 200 и {}
                return ok(env.secretsReadBroken ? {} : secretState());
            case 'secrets/write': {
                const { key, value, label } = body;
                if (!key || typeof value !== 'string') return bad('Invalid key or value');
                if (!Array.isArray(secrets[key])) secrets[key] = [];
                for (const s of secrets[key]) s.active = false;
                const id = newId(++newKeyN);
                secrets[key].push({ id, value, label: label ?? 'Unlabeled', active: true });
                return ok({ id });
            }
            case 'secrets/rotate': {
                const { key, id } = body;
                if (!key || !id) return bad('Key and ID are required');
                if (validKey(key)) {
                    const arr = secrets[key];
                    const i = arr.findIndex(s => s.id === id);
                    if (i !== -1) { for (const s of arr) s.active = false; arr[i].active = true; }
                }
                return noContent();
            }
            case 'secrets/delete': {
                const { key, id } = body;
                if (!key) return bad('Key and ID are required');
                if (validKey(key)) {
                    const arr = secrets[key];
                    const i = arr.findIndex(s => id ? s.id === id : s.active);
                    if (i !== -1) arr.splice(i, 1);
                    if (arr.length && !arr.some(s => s.active)) arr[0].active = true;
                    if (!arr.length) delete secrets[key];
                }
                return noContent();
            }
            case 'backends/chat-completions/generate': {
                const call = { url: '/api/backends/chat-completions/generate', body };
                const text = isReactionCall(call) ? REACTION_TEXT : isTestCall(call) ? 'готов' : turnReply;
                if (body.chat_completion_source === 'claude') {
                    // sendClaudeRequest: ключ — пароль прокси или секрет; пустой → 400 { error: true }
                    const apiKey = body.reverse_proxy ? body.proxy_password : readSecret('api_key_claude', body.secret_id);
                    if (!apiKey) return { ok: false, status: 400, json: async () => ({ error: true }) };
                    // Claude 5 думает: content[0] — thinking, ST кладёт в choices только content[0].text
                    const content = /claude-(fable|opus-5|sonnet-5)/.test(body.model)
                        ? [{ type: 'thinking', thinking: '…' }, { type: 'text', text }]
                        : [{ type: 'text', text }];
                    return ok({ choices: [{ message: { content: content[0]?.text || '' } }], content });
                }
                return ok({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { total_tokens: 42 } });
            }
            case 'backends/chat-completions/status': return ok({ data: [{ id: 'm2' }, { id: 'm1' }] });
            default: return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
        }
    };
    w.fetch = (url, init = {}) => {
        const body = init.body ? JSON.parse(init.body) : {};
        const call = { url: String(url), body, signal: init.signal };
        calls.push(call);
        const route = call.url.replace(/^.*\/api\//, '');
        const sig = init.signal;
        const work = (async () => {
            if (gates[route]) await gates[route].promise;
            return respond(route, body);
        })();
        if (!sig) return work;
        const aborted = new Promise((_, rej) => {
            if (sig.aborted) rej(sig.reason);
            sig.addEventListener('abort', () => rej(sig.reason));
        });
        aborted.catch(() => {});
        return Promise.race([work, aborted]);
    };
    /** Задержать ответ на маршрут до вызова release() */
    const gate = route => {
        let release;
        const promise = new Promise(r => { release = r; });
        gates[route] = { promise };
        return () => { delete gates[route]; release(); };
    };

    // ---- эмуляция отправки сообщения ST (sendMessageAsUser) ----
    const sent = [];
    let sendDone = Promise.resolve();
    doc.getElementById('send_but').addEventListener('click', () => {
        const ta = doc.getElementById('send_textarea');
        const text = ta.value;
        if (!text.trim()) return;
        sent.push(text);
        ta.value = '';
        c.chat.push({ name: c.name1, is_user: true, send_date: new Date(tick()).toISOString(), mes: text, extra: {} });
        sendDone = eventSource.emit(event_types.MESSAGE_SENT, c.chat.length - 1);
    });

    // ---- загрузка расширения ----
    const script = doc.createElement('script');
    script.textContent = SRC + '\n' + EXPOSE;
    doc.body.appendChild(script);
    const aip = w.__aip;
    if (!aip) throw new Error('index.js не загрузился: ' + JSON.stringify(logs));

    return {
        dom, w, doc, c, card, calls, toasts, confirms, logs, counters, state, env, sent, blobs, aip, gate, eventSource, event_types,
        secrets, tick,
        $: sel => doc.querySelector(sel),
        $$: sel => [...doc.querySelectorAll(sel)],
        s: () => c.extensionSettings.ai_player,
        emit: (ev, ...a) => eventSource.emit(ev, ...a),
        get sendDone() { return sendDone; },
        generateCalls: () => calls.filter(isGenerate),
        click: sel => doc.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true })),
        input: (sel, value, type = 'input') => {
            const n = doc.querySelector(sel);
            n.value = value;
            n.dispatchEvent(new w.Event(type, { bubbles: true }));
        },
        close: () => w.close(),
    };
}

/** Агент делает ход (autoSend включён по умолчанию) и сообщение уходит в чат. */
export async function agentTurn(t) {
    const before = t.c.chat.length;
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy && t.c.chat.length > before, { msg: 'ход агента отправлен' });
    await t.sendDone;
    return t.c.chat.length - 1;
}

// После MESSAGE_RECEIVED ST (saveReply) дописывает swipe_id / swipes / swipe_info
function syncSwipeInfo(m) {
    m.swipe_info ??= [];
    if (m.swipe_id === undefined) { m.swipe_id = 0; m.swipes = []; }
    m.swipes[m.swipe_id] = m.mes;
    m.swipe_info[m.swipe_id] = { send_date: m.send_date, gen_started: m.gen_started, gen_finished: m.gen_finished, extra: structuredClone(m.extra) };
}

/**
 * Бот отвечает (saveReply, ветка non-swipe): новое сообщение с send_date / gen_finished,
 * MESSAGE_RECEIVED (id, type), затем ST дописывает swipe_info.
 */
export async function botReply(t, mes = '«Держи эль. Три медяка.»', extra = { api: 'openai', model: 'bot-model' }, type = 'normal') {
    const started = t.tick();
    const finished = t.tick();
    const m = {
        extra: { ...extra, reasoning: '' }, name: 'Алиса', is_user: false,
        send_date: new Date(finished).toISOString(), mes,
        gen_started: new Date(started), gen_finished: new Date(finished),
    };
    t.c.chat.push(m);
    const id = t.c.chat.length - 1;
    await t.emit(t.event_types.MESSAGE_RECEIVED, id, type);
    syncSwipeInfo(m);
    return id;
}

/** Новый свайп последнего сообщения бота (saveReply, type 'swipe'). */
export async function botSwipe(t, id, mes) {
    const m = t.c.chat[id];
    m.swipe_id = m.swipes.length;          // swipe() двигает swipe_id до генерации
    m.swipes.length++;
    const started = t.tick();
    const finished = t.tick();
    Object.assign(m, { mes, gen_started: new Date(started), gen_finished: new Date(finished), send_date: new Date(finished).toISOString() });
    await t.emit(t.event_types.MESSAGE_RECEIVED, id, 'swipe');
    syncSwipeInfo(m);
}

/** «Продолжить» (continue): текст дописывается, send_date и gen_finished обновляются. */
export async function botContinue(t, id, more) {
    const m = t.c.chat[id];
    const started = t.tick();
    const finished = t.tick();
    Object.assign(m, { mes: m.mes + more, gen_started: new Date(started), gen_finished: new Date(finished), send_date: new Date(finished).toISOString() });
    await t.emit(t.event_types.MESSAGE_RECEIVED, id, 'continue');
    syncSwipeInfo(m);
}

/** «Перегенерировать»: deleteLastMessage() + новый ответ с тем же индексом и type 'regenerate'. */
export async function regenerate(t, mes) {
    t.c.chat.length = t.c.chat.length - 1;
    await t.emit(t.event_types.MESSAGE_DELETED, t.c.chat.length);
    return botReply(t, mes, undefined, 'regenerate');
}
