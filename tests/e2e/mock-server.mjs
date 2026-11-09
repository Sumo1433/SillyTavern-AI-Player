// Мок OpenAI-совместимого API для E2E-теста AI Player.
// GET  /v1/models            → mock-player, mock-bot
// POST /v1/chat/completions  → ход игрока / «мысли» / записи / тест / ответ бота (поддерживает stream:true)
// POST /v1/messages          → то же в формате Anthropic Messages (режим «Claude через реверс-прокси»)
// Все запросы пишутся построчно (JSONL) в logFile: метод, путь, заголовки, тело, классификация.
//
// Управление из теста (тот же процесс): addRule({ kind, times, delayMs, status, empty }) — следующие
// `times` запросов вида `kind` (turn | thought | memory | test | bot) ответят с задержкой, ошибкой HTTP
// `status` (для 401 текст ошибки нарочно содержит присланный ключ — проверка, что его вырезают)
// или пустым текстом. mockCtl.inflight — сколько задержанных ответов ещё не отправлено.
// Ответы бота пронумерованы «(ответ №N)», «мысль» называет номер ответа, о котором она
// («Отвечаю на: ответ №N»), — так тест проверяет привязку впечатления к версии ответа.
import http from 'node:http';
import fs from 'node:fs';

const TURN = `*Я медленно поднимаюсь на локте, морщась от боли в боку, и обвожу взглядом незнакомую поляну, залитую мягким вечерним светом.*
«Кто ты такая и почему я здесь? Последнее, что я помню, — это волчий вой и холодную грязь под щекой. Если ты собираешься меня продать, скажи сразу».
(мысль: она слишком спокойна для случайной путницы; надо держать нож поближе и не показывать, насколько я слаб, пока не пойму, чего она хочет на самом деле.)`;

const THOUGHT = `Реакция: Партнёр ответил спокойно и тепло, сцена сдвинулась.
Нравится / не нравится: нравится забота, не нравится, что тайна леса раскрыта слишком быстро.
Партнёр: 7/10 — держит характер, но мало инициативы.
Дальше: мой персонаж хочет проверить, можно ли ей доверять.`;

const BOT = `*Серафина мягко улыбается и опускается рядом на колени, протягивая тебе чашу с тёплым травяным отваром.*
«Тише, тише. Ты в безопасности — это мой лес, и волки сюда не заходят. Выпей, это снимет боль».`;

export const MEMORY_TEXT = 'СОСТОЯНИЕ: раненый путник в лесу.\nЦЕЛИ: узнать, кому можно доверять.';

// Системный промпт: OpenAI — сообщения role=system; Anthropic — поле system (строка или [{type:'text',text}])
export function systemText(body) {
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    const txt = c => typeof c === 'string' ? c : Array.isArray(c) ? c.map(x => x?.text ?? '').join('\n') : JSON.stringify(c ?? '');
    const parts = msgs.filter(m => m.role === 'system').map(m => txt(m.content));
    if (body?.system) parts.unshift(txt(body.system));
    return parts.join('\n');
}
// Модели игрока (агента): mock-player (OpenAI-совм.) и claude-* (реверс-прокси Claude); бот таверны — mock-bot
const isPlayerModel = m => m === 'mock-player' || /^claude-/.test(String(m || ''));
export function classify(body) {
    const sys = systemText(body);
    if (sys.includes('выйди из роли') || sys.includes('вне роли') || sys.includes('Step out of character')) return 'thought';
    if (isPlayerModel(body?.model) && /Отвечай одним словом|Reply with one word/.test(sys)) return 'test';
    if (isPlayerModel(body?.model) && sys.includes('Maintain the personal roleplaying notes')) return 'memory';
    if (isPlayerModel(body?.model)) return 'turn';
    return 'bot';
}
// номер ответа бота, о котором спрашивают «мысль»: последний «ответ №N» в не-системных сообщениях
export function lastReplyNo(body) {
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    const txt = msgs.filter(m => m.role !== 'system').map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
    const all = [...txt.matchAll(/ответ №(\d+)/g)];
    return all.length ? Number(all.at(-1)[1]) : null;
}

export const mockCtl = { rules: [], inflight: 0, botCounter: 0 };
export function addRule(rule) { mockCtl.rules.push({ times: 1, ...rule }); }
export function clearRules() { mockCtl.rules = []; }
function takeRule(kind) {
    const i = mockCtl.rules.findIndex(r => r.kind === kind && r.times > 0);
    if (i < 0) return null;
    const r = mockCtl.rules[i];
    r.times--;
    if (r.times <= 0) mockCtl.rules.splice(i, 1);
    return { ...r };
}

function textFor(kind, body, rec) {
    if (kind === 'bot') { rec.botNo = ++mockCtl.botCounter; return `${BOT}\n\n(ответ №${rec.botNo})`; }
    if (kind === 'thought') { const n = lastReplyNo(body); rec.aboutNo = n; return n ? `${THOUGHT}\nОтвечаю на: ответ №${n}` : THOUGHT; }
    return { memory: MEMORY_TEXT, turn: TURN, test: 'готов' }[kind] ?? '';
}
const errMessage = (status, req) => status === 401
    ? `Incorrect API key provided: ${req.headers.authorization || req.headers['x-api-key'] || '(none)'}`
    : status === 429 ? 'Rate limit reached for requests' : 'Internal mock failure';

export function startMock({ port = 8124, logFile } = {}) {
    if (logFile) fs.writeFileSync(logFile, '');
    const log = rec => { if (logFile) fs.appendFileSync(logFile, JSON.stringify(rec) + '\n'); };
    const server = http.createServer((req, res) => {
        let raw = '';
        req.setEncoding('utf8');
        req.on('data', d => { raw += d; });
        req.on('end', () => {
            let body = null;
            try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
            const url = req.url.replace(/\?.*$/, '');
            const rec = { ts: Date.now(), method: req.method, url, headers: req.headers, raw, body };
            if (req.method === 'GET' && /\/models$/.test(url)) {
                rec.kind = 'models';
                log(rec);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-player', object: 'model' }, { id: 'mock-bot', object: 'model' }] }));
            }
            const openai = req.method === 'POST' && /\/chat\/completions$/.test(url);
            const anthropic = req.method === 'POST' && /\/messages$/.test(url);
            if (!openai && !anthropic) {
                rec.kind = 'unknown';
                log(rec);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: { message: 'not found' } }));
            }
            const kind = classify(body);
            rec.kind = kind;
            if (anthropic) rec.api = 'anthropic';
            const rule = takeRule(kind);
            if (rule) rec.rule = rule;
            const text = rule?.empty ? '' : textFor(kind, body, rec);
            log(rec);
            const respond = () => {
                if (res.writableEnded || res.destroyed) return;
                if (rule?.status) {
                    res.writeHead(rule.status, { 'Content-Type': 'application/json' });
                    const message = errMessage(rule.status, req);
                    return res.end(JSON.stringify(anthropic
                        ? { type: 'error', error: { type: rule.status === 401 ? 'authentication_error' : 'api_error', message } }
                        : { error: { message, type: rule.status === 401 ? 'invalid_request_error' : 'server_error', code: rule.status === 401 ? 'invalid_api_key' : null } }));
                }
                if (openai) {
                    const id = 'chatcmpl-mock-' + Date.now();
                    const model = body?.model || 'mock';
                    if (body?.stream) {
                        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
                        const parts = text.match(/[\s\S]{1,40}/g) || [''];
                        for (const p of parts) res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', model, choices: [{ index: 0, delta: { content: p }, finish_reason: null }] })}\n\n`);
                        res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
                        res.write('data: [DONE]\n\n');
                        return res.end();
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
                        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
                    }));
                }
                // Anthropic Messages API — сюда ST шлёт при reverse_proxy: `${reverse_proxy}/messages`
                const id = 'msg_mock_' + Date.now();
                const model = body?.model || 'claude-mock';
                if (!req.headers['x-api-key']) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'x-api-key required' } }));
                }
                if (body?.stream) {
                    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
                    const ev = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify({ type: e, ...d })}\n\n`);
                    ev('message_start', { message: { id, type: 'message', role: 'assistant', model, content: [], stop_reason: null, usage: { input_tokens: 100, output_tokens: 0 } } });
                    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
                    for (const p of text.match(/[\s\S]{1,40}/g) || ['']) ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: p } });
                    ev('content_block_stop', { index: 0 });
                    ev('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 50 } });
                    ev('message_stop', {});
                    return res.end();
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    id, type: 'message', role: 'assistant', model,
                    content: [{ type: 'text', text }],
                    stop_reason: 'end_turn', stop_sequence: null,
                    usage: { input_tokens: 100, output_tokens: 50 },
                }));
            };
            if (rule?.delayMs) {
                mockCtl.inflight++;
                setTimeout(() => { mockCtl.inflight--; respond(); }, rule.delayMs);
            } else respond();
        });
    });
    return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

// Запуск отдельно: node mock-server.mjs [logFile]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
    const logFile = process.argv[2] || 'mock-requests.jsonl';
    startMock({ logFile }).then(() => console.log(`mock on http://127.0.0.1:8124/v1, log → ${logFile}`));
}
