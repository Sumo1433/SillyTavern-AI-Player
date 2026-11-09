// Серверный плагин ключей (server-plugin/index.mjs) в Node: маршруты на поддельном express-роутере,
// данные — во временных папках «пользователей». Провайдер подменён через global.fetch.
// Проверяется: разделение пользователей, отсутствие значений ключей в ответах, привязка к адресу,
// перенос из secrets.json без утечки, коды ошибок.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ROOT } from './sources.mjs';

const plugin = await import(new URL(`file:///${path.join(ROOT, 'server-plugin', 'index.mjs').replace(/\\/g, '/')}`));
const routes = {};
await plugin.init({ post: (p, fn) => { routes[p] = fn; } });

let dir, alice, bob, upstream;
before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'aip-plugin-'));
    alice = { directories: { root: path.join(dir, 'alice') } };
    bob = { directories: { root: path.join(dir, 'bob') } };
});
after(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(() => {
    rmSync(path.join(dir, 'alice'), { recursive: true, force: true });
    rmSync(path.join(dir, 'bob'), { recursive: true, force: true });
    upstream = [];
    globalThis.fetch = async (url, init) => {
        upstream.push({ url, init });
        const reply = globalThis.__reply ?? { status: 200, json: { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] } };
        if (reply.throw) throw reply.throw;
        return { ok: reply.status < 300, status: reply.status, statusText: 'x', text: async () => JSON.stringify(reply.json) };
    };
    globalThis.__reply = undefined;
});

async function call(route, user, body) {
    const res = new EventEmitter();
    Object.assign(res, {
        statusCode: 200, body: null, headersSent: false, writableEnded: false,
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; this.headersSent = true; this.writableEnded = true; return this; },
    });
    await routes[route]({ user, body }, res);
    return res;
}
const add = (user, extra = {}) => call('/keys/add', user, { provider: 'openai', url: 'https://api.example/v1', value: 'sk-alice-secret-1234', label: 'A', ...extra });

test('P1. probe и список без значений ключей', async () => {
    assert.equal((await call('/probe', alice, {})).body.ok, true);
    const r = await add(alice);
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.key.mask, '…234');
    assert.ok(!JSON.stringify(r.body).includes('sk-alice'), 'значение не возвращается');
    const list = await call('/keys/list', alice, {});
    assert.equal(list.body.keys.length, 1);
    assert.ok(!JSON.stringify(list.body).includes('sk-alice'));
    assert.ok(existsSync(path.join(dir, 'alice', 'ai-player', 'keys.json')), 'файл в папке пользователя');
});

test('P2. Два пользователя ST: ключи и запросы разделены', async () => {
    const id = (await add(alice)).body.key.id;
    assert.equal((await call('/keys/list', bob, {})).body.keys.length, 0, 'Боб не видит ключей Алисы');
    const r = await call('/generate', bob, { keyId: id, provider: 'openai', url: 'https://api.example/v1', model: 'm', system: 's', messages: [] });
    assert.equal(r.statusCode, 404);
    assert.equal(r.body.error.kind, 'no_key');
    assert.equal(upstream.length, 0, 'чужой ключ не использован');
    assert.equal((await call('/keys/delete', bob, { id })).statusCode, 404, 'Боб не может удалить ключ Алисы');
});

test('P3. Привязка к адресу и типу API: ключ не уходит на другой адрес', async () => {
    const id = (await add(alice)).body.key.id;
    const r = await call('/generate', alice, { keyId: id, provider: 'openai', url: 'https://evil.example/v1', model: 'm', system: '', messages: [] });
    assert.equal(r.body.error.kind, 'key_mismatch');
    const r2 = await call('/generate', alice, { keyId: id, provider: 'anthropic', url: '', model: 'm', system: '', messages: [] });
    assert.equal(r2.body.error.kind, 'key_mismatch');
    assert.equal(upstream.length, 0);
    const ok = await call('/generate', alice, { keyId: id, provider: 'openai', url: 'https://api.example/v1/chat/completions/', model: 'm', system: 'S', messages: [{ role: 'user', content: 'hi' }], maxTokens: 50 });
    assert.equal(ok.body.text, 'ok');
    assert.equal(upstream[0].url, 'https://api.example/v1/chat/completions');
    assert.equal(upstream[0].init.headers.Authorization, 'Bearer sk-alice-secret-1234');
});

test('P4. Anthropic: system отдельно, роли чередуются, ответ разбирается', async () => {
    const id = (await call('/keys/add', alice, { provider: 'anthropic', url: '', value: 'sk-ant-xyz-0000', label: 'C' })).body.key.id;
    globalThis.__reply = { status: 200, json: { content: [{ type: 'thinking', thinking: '…' }, { type: 'text', text: 'привет' }], stop_reason: 'max_tokens' } };
    const r = await call('/generate', alice, { keyId: id, provider: 'anthropic', model: 'claude-sonnet-5', system: 'SYS', messages: [{ role: 'assistant', content: 'a' }, { role: 'system', content: 'note' }, { role: 'user', content: 'b' }], maxTokens: 10 });
    assert.deepEqual(r.body, { text: 'привет', usage: null, truncated: true });
    const body = JSON.parse(upstream[0].init.body);
    assert.equal(upstream[0].url, 'https://api.anthropic.com/v1/messages');
    assert.equal(upstream[0].init.headers['x-api-key'], 'sk-ant-xyz-0000');
    assert.equal(body.system, 'SYS');
    assert.deepEqual(body.messages.map(m => m.role), ['user', 'assistant', 'user']);
});

test('P5. Ошибки провайдера: вид, код и без значения ключа в тексте', async () => {
    const id = (await add(alice)).body.key.id;
    const base = { keyId: id, provider: 'openai', url: 'https://api.example/v1', model: 'm', system: '', messages: [] };
    globalThis.__reply = { status: 401, json: { error: { message: 'Incorrect API key provided: sk-alice-secret-1234' } } };
    let r = await call('/generate', alice, base);
    assert.equal(r.body.error.kind, 'auth');
    assert.equal(r.body.error.status, 401);
    assert.ok(!r.body.error.message.includes('sk-alice-secret-1234'), r.body.error.message);
    globalThis.__reply = { status: 429, json: { error: { message: 'slow down' } } };
    assert.equal((await call('/generate', alice, base)).body.error.kind, 'rate');
    globalThis.__reply = { throw: Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }) };
    r = await call('/generate', alice, base);
    assert.equal(r.body.error.kind, 'network');
    assert.equal(r.statusCode, 502);
});

test('P6. Перенос из secrets.json: копия на сервере, значение не возвращается, общая копия не удаляется', async () => {
    const secretsFile = path.join(dir, 'alice', 'secrets.json');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(path.dirname(secretsFile), { recursive: true });
    const secrets = { api_key_custom: [{ id: 's1', label: 'AI Player · Старый', value: 'sk-legacy-5555', active: false }], api_key_openai: [{ id: 'o1', value: 'sk-openai-6666', active: true }] };
    writeFileSync(secretsFile, JSON.stringify(secrets));
    const r = await call('/keys/import', alice, { secretKey: 'api_key_custom', secretId: 's1', provider: 'openai', url: 'https://api.example/v1' });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.key.label, 'Старый');
    assert.ok(!JSON.stringify(r.body).includes('sk-legacy'));
    assert.deepEqual(JSON.parse(readFileSync(secretsFile, 'utf8')), secrets, 'secrets.json не изменён');
    const other = await call('/keys/import', alice, { secretKey: 'api_key_openai', secretId: 'o1', provider: 'openai', url: 'https://api.example/v1' });
    assert.equal(other.statusCode, 400, 'чужие категории не переносятся');
    assert.equal((await call('/keys/import', bob, { secretKey: 'api_key_custom', secretId: 's1', provider: 'openai', url: 'https://api.example/v1' })).statusCode, 404, 'из чужого secrets.json — нет');
});

test('P7. Валидация: пустой ключ, неизвестный тип, адрес с учётными данными', async () => {
    assert.equal((await add(alice, { value: '  ' })).statusCode, 400);
    assert.equal((await add(alice, { provider: 'gemini' })).statusCode, 400);
    assert.equal((await add(alice, { url: 'https://u:p@api.example/v1' })).statusCode, 400);
    assert.equal((await add(alice, { url: 'file:///etc/passwd' })).statusCode, 400);
    assert.equal((await call('/keys/list', { directories: {} }, {})).statusCode, 401, 'без пользователя ST');
});
