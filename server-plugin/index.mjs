// AI Player key vault — серверный плагин SillyTavern.
//
// Зачем: клиентское расширение может хранить ключи только в общих категориях secrets.json
// (api_key_custom / api_key_claude), потому что бэкенд ST читает ключ для запроса только оттуда.
// Тогда ключ AI Player виден в менеджере ключей основного подключения. Плагин хранит ключи
// AI Player отдельно (data/<пользователь>/ai-player/keys.json) и сам отправляет запрос провайдеру,
// так что ключ никогда не попадает ни в общий менеджер, ни в браузер.
//
// Установка: скопировать эту папку в SillyTavern/plugins/ai-player и включить
// enableServerPlugins: true в config.yaml, затем перезапустить ST.
//
// Маршруты (POST, JSON), все — в пространстве текущего пользователя ST (request.user):
//   /api/plugins/ai-player/probe        — проверка, что плагин установлен
//   /api/plugins/ai-player/keys/list    — список ключей (без значений)
//   /api/plugins/ai-player/keys/add     — добавить ключ; он привязан к провайдеру и адресу API
//   /api/plugins/ai-player/keys/delete  — удалить ключ
//   /api/plugins/ai-player/keys/import  — перенести старый ключ AI Player из secrets.json (на сервере)
//   /api/plugins/ai-player/generate     — запрос к модели ключом из хранилища
//   /api/plugins/ai-player/models       — список моделей OpenAI-совместимого API
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const info = {
    id: 'ai-player',
    name: 'AI Player key vault',
    description: 'Separate per-user API key storage and requests for the AI Player extension.',
};

const VERSION = '1.1.0';
const PROVIDERS = ['openai', 'anthropic', 'claude_proxy'];
// какую категорию secrets.json можно перенести и для какого типа API: ключ Anthropic ST отправляет
// только на api.anthropic.com — переносить его к произвольному адресу нельзя
const IMPORTABLE = { api_key_custom: 'openai', api_key_claude: 'anthropic' };
const ANTHROPIC_URL = 'https://api.anthropic.com/v1';
const UPSTREAM_TIMEOUT = 170000;

// ---------- Хранилище ----------
function userRoot(req) {
    const root = req.user?.directories?.root;
    if (!root) throw httpError(401, 'auth', 'No SillyTavern user');
    return root;
}
const storeFile = req => path.join(userRoot(req), 'ai-player', 'keys.json');

function readStore(req) {
    const file = storeFile(req);
    if (!fs.existsSync(file)) return { keys: [] };
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { keys: Array.isArray(data?.keys) ? data.keys : [] };
}
// Атомарная запись: временный файл + fsync + rename. На Windows rename может кратко упасть с
// EPERM/EBUSY, пока антивирус или индексатор держит файл, — повторяем несколько раз.
function writeStore(req, store) {
    const file = storeFile(req);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
        const fd = fs.openSync(tmp, 'w', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify(store, null, 2), 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        for (let attempt = 0; ; attempt++) {
            try { fs.renameSync(tmp, file); break; } catch (e) {
                if (attempt >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
                const until = Date.now() + 50 * (attempt + 1);
                while (Date.now() < until) { /* короткое ожидание без async */ }
            }
        }
    } catch (e) {
        try { fs.rmSync(tmp, { force: true }); } catch { /* уже нет */ }
        throw httpError(500, 'server', `Could not save AI Player keys (${e.code || 'error'})`);
    }
}

// Адрес, к которому привязан ключ: ключ уходит только туда, куда его сохранили
function normalizeBase(provider, url) {
    if (provider === 'anthropic') return ANTHROPIC_URL;
    let u = String(url || '').trim().replace(/\/+$/, '');
    u = provider === 'claude_proxy' ? u.replace(/\/messages$/, '') : u.replace(/\/chat\/completions$/, '');
    let parsed;
    try { parsed = new URL(u); } catch { throw httpError(400, 'bad_request', 'Invalid API URL'); }
    if (!/^https?:$/.test(parsed.protocol)) throw httpError(400, 'bad_request', 'API URL must start with http:// or https://');
    if (parsed.username || parsed.password) throw httpError(400, 'bad_request', 'Do not put credentials into the API URL');
    return u;
}
const mask = v => { const s = String(v || ''); return s.length > 6 ? `…${s.slice(-3)}` : '…'; };
const publicKey = k => ({ id: k.id, label: k.label, provider: k.provider, base: k.base, mask: mask(k.value), created: k.created });

function findKey(req, id, provider, url) {
    const k = readStore(req).keys.find(x => x.id === id);
    if (!k) throw httpError(404, 'no_key', 'Key not found in AI Player storage');
    if (provider && k.provider !== provider) throw httpError(400, 'key_mismatch', 'Key belongs to another API type');
    // адрес в текст не включаем: в нём может быть зашит токен прокси
    if (provider && normalizeBase(provider, url) !== k.base) throw httpError(400, 'key_mismatch', 'Key is bound to another API address');
    return k;
}

// ---------- Ошибки ----------
function httpError(status, kind, message) { return Object.assign(new Error(message), { status, kind }); }
// никаких значений ключей и учётных данных в ответах
function redact(text, secret) {
    let t = String(text ?? '').slice(0, 600);
    if (secret && secret.length >= 4) t = t.split(secret).join('***');
    return t.replace(/Bearer\s+[^\s"']+/gi, 'Bearer ***')
        .replace(/\b(sk|key|pk)-[A-Za-z0-9_-]{6,}/g, '$1-***')
        .replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, '$1***@')
        .replace(/([?&](?:key|api_key|apikey|token|password|access_token)=)[^&\s"']+/gi, '$1***');
}
function kindByStatus(status) {
    if (status === 401 || status === 403) return 'auth';
    if (status === 429) return 'rate';
    if (status === 408 || status === 504) return 'timeout';
    if (status === 402) return 'billing';
    if (status >= 500) return 'upstream';
    return 'bad_request';
}
function sendError(res, e) {
    const status = e.status || 500;
    if (!res.headersSent) res.status(status).json({ error: { kind: e.kind || 'server', status: e.upstreamStatus ?? null, message: redact(e.message) } });
}
const route = fn => async (req, res) => {
    try { await fn(req, res); } catch (e) {
        if (!e.status) console.error('[AI Player plugin]', redact(e?.message));
        sendError(res, e);
    }
};

// ---------- Запрос к провайдеру ----------
async function upstream(res, url, init, secret) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(new Error('timeout')), UPSTREAM_TIMEOUT);
    // клиент закрыл соединение (▶ повторно, смена чата) — отменяем и запрос к провайдеру
    const onClose = () => { if (!res.writableEnded) ctl.abort(new Error('client_closed')); };
    res.on('close', onClose);
    let r, raw;
    // тайм-аут и отмена действуют и на чтение тела: прокси может отдать заголовки и зависнуть
    try {
        r = await fetch(url, { ...init, signal: ctl.signal });
        raw = await r.text();
    } catch (e) {
        if (ctl.signal.aborted && String(ctl.signal.reason?.message) === 'timeout') throw httpError(504, 'timeout', 'Provider did not respond in time');
        if (ctl.signal.aborted) throw httpError(499, 'aborted', 'Request cancelled');
        const code = e?.cause?.code || e?.code || '';
        throw httpError(502, /ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_BODY_TIMEOUT/.test(code) ? 'timeout' : 'network', `Connection to the provider failed${code ? ` (${code})` : ''}`);
    } finally {
        clearTimeout(timer);
        res.off('close', onClose);
    }
    let json = null;
    try { json = raw ? JSON.parse(raw) : null; } catch { /* не JSON */ }
    if (!r.ok) {
        const msg = json?.error?.message || json?.message || (typeof json?.error === 'string' ? json.error : '') || raw || r.statusText;
        throw Object.assign(httpError(502, kindByStatus(r.status), redact(msg, secret)), { upstreamStatus: r.status });
    }
    if (!json) throw httpError(502, 'bad_response', 'Provider returned a non-JSON response');
    return json;
}

// Anthropic: system отдельно, роли чередуются, первой идёт user
function toAnthropicMessages(messages) {
    const out = [];
    for (const m of messages || []) {
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        const content = String(m.content ?? '');
        const last = out[out.length - 1];
        if (last && last.role === role) last.content += `\n\n${content}`;
        else out.push({ role, content });
    }
    if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: '[Start]' });
    return out;
}

async function generate(req, res) {
    const b = req.body || {};
    if (!PROVIDERS.includes(b.provider)) throw httpError(400, 'bad_request', 'Unknown API type');
    if (!b.model || typeof b.model !== 'string') throw httpError(400, 'bad_request', 'No model');
    const key = findKey(req, b.keyId, b.provider, b.url);
    const maxTokens = Math.max(1, Math.min(200000, Number(b.maxTokens) || 1000));
    const stop = Array.isArray(b.stop) ? b.stop.filter(x => typeof x === 'string').slice(0, 4) : [];
    const temperature = typeof b.temperature === 'number' && Number.isFinite(b.temperature) ? b.temperature : undefined;
    const messages = Array.isArray(b.messages) ? b.messages.map(m => ({ role: String(m.role), content: String(m.content ?? '') })) : [];

    if (b.provider === 'openai') {
        const body = { model: b.model, messages: [{ role: 'system', content: String(b.system ?? '') }, ...messages], stream: false };
        body[b.maxTokensField === 'max_completion_tokens' ? 'max_completion_tokens' : 'max_tokens'] = maxTokens;
        if (temperature !== undefined) body.temperature = temperature;
        if (stop.length) body.stop = stop;
        const j = await upstream(res, `${key.base}/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.value}` }, body: JSON.stringify(body),
        }, key.value);
        const ch = j?.choices?.[0];
        const c = ch?.message?.content;
        const text = Array.isArray(c) ? c.map(x => x?.text || '').join('') : String(c ?? '');
        return res.json({ text, usage: j?.usage ?? null, truncated: ch?.finish_reason === 'length' });
    }
    // anthropic / claude_proxy — формат Messages API; у прокси ключ = пароль прокси, как в ST
    const body = { model: b.model, max_tokens: maxTokens, system: String(b.system ?? ''), messages: toAnthropicMessages(messages) };
    if (temperature !== undefined) body.temperature = Math.min(1, temperature);
    if (stop.length) body.stop_sequences = stop.filter(s => s.trim());
    const j = await upstream(res, `${key.base}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key.value, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
    }, key.value);
    const text = (Array.isArray(j?.content) ? j.content : []).filter(x => x?.type === 'text').map(x => x.text).join('');
    return res.json({ text, usage: j?.usage ?? null, truncated: j?.stop_reason === 'max_tokens' });
}

async function models(req, res) {
    const b = req.body || {};
    const key = findKey(req, b.keyId, 'openai', b.url);
    const j = await upstream(res, `${key.base}/models`, { method: 'GET', headers: { Authorization: `Bearer ${key.value}` } }, key.value);
    const arr = j?.data ?? j?.models ?? [];
    res.json({ models: [...new Set((Array.isArray(arr) ? arr : []).map(m => m?.id ?? m).filter(x => typeof x === 'string'))].sort() });
}

// ---------- Маршруты ----------
export async function init(router) {
    router.post('/probe', route(async (req, res) => { userRoot(req); res.json({ ok: true, version: VERSION }); }));

    router.post('/keys/list', route(async (req, res) => {
        const provider = req.body?.provider;
        const keys = readStore(req).keys.filter(k => !provider || k.provider === provider).map(publicKey);
        res.json({ keys });
    }));

    router.post('/keys/add', route(async (req, res) => {
        const { provider, url, value, label } = req.body || {};
        if (!PROVIDERS.includes(provider)) throw httpError(400, 'bad_request', 'Unknown API type');
        if (typeof value !== 'string' || !value.trim()) throw httpError(400, 'bad_request', 'Empty key');
        const store = readStore(req);
        const k = { id: crypto.randomUUID(), label: String(label || '').slice(0, 80) || 'Key', provider, base: normalizeBase(provider, url), value: value.trim(), created: Date.now() };
        store.keys.push(k);
        writeStore(req, store);
        res.json({ key: publicKey(k) });
    }));

    router.post('/keys/delete', route(async (req, res) => {
        const id = req.body?.id;
        const store = readStore(req);
        const i = store.keys.findIndex(k => k.id === id);
        if (i < 0) throw httpError(404, 'no_key', 'Key not found in AI Player storage');
        store.keys.splice(i, 1);
        writeStore(req, store);
        res.json({ ok: true });
    }));

    // Перенос ключа профиля из общего secrets.json: значение копируется на сервере и в браузер не уходит.
    // Общая копия НЕ удаляется — это отдельное действие пользователя в расширении.
    router.post('/keys/import', route(async (req, res) => {
        const { secretKey, secretId, provider, url, label } = req.body || {};
        if (!Object.hasOwn(IMPORTABLE, secretKey) || !secretId) throw httpError(400, 'bad_request', 'Only api_key_custom / api_key_claude entries can be imported');
        if (IMPORTABLE[secretKey] !== provider) throw httpError(400, 'key_mismatch', `${secretKey} can only be imported for API type ${IMPORTABLE[secretKey]}`);
        const file = path.join(userRoot(req), 'secrets.json');
        const secrets = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
        const item = Array.isArray(secrets?.[secretKey]) ? secrets[secretKey].find(x => x?.id === secretId) : null;
        if (!item || typeof item.value !== 'string' || !item.value.trim()) throw httpError(404, 'no_key', 'Shared key not found');
        const store = readStore(req);
        const k = { id: crypto.randomUUID(), label: String(label || item.label || '').replace(/^AI Player\s*[:·-]?\s*/, '').slice(0, 80) || 'Key', provider, base: normalizeBase(provider, url), value: item.value, created: Date.now() };
        store.keys.push(k);
        writeStore(req, store);
        res.json({ key: publicKey(k) });
    }));

    router.post('/generate', route(generate));
    router.post('/models', route(models));
    console.log(`[AI Player plugin] ${VERSION} loaded`);
}

export async function exit() { /* нечего освобождать */ }

// для юнит-тестов плагина
export const _internal = { normalizeBase, redact, toAnthropicMessages, kindByStatus, mask };
