// Мок OpenAI-совместимого API для E2E-теста AI Player.
// GET  /v1/models            → mock-player, mock-bot
// POST /v1/chat/completions  → ход игрока / «мысли» / тест / ответ бота (поддерживает stream:true)
// POST /v1/messages          → то же в формате Anthropic Messages (режим «Claude через реверс-прокси»)
// Все запросы пишутся построчно (JSONL) в logFile: метод, путь, заголовки, тело, классификация.
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
    if (sys.includes('вне роли')) return 'thought';
    if (isPlayerModel(body?.model) && sys.includes('Отвечай одним словом')) return 'test';
    if (isPlayerModel(body?.model)) return 'turn';
    return 'bot';
}

const TEXT = { turn: TURN, thought: THOUGHT, test: 'готов', bot: BOT };

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
            if (req.method === 'POST' && /\/chat\/completions$/.test(url)) {
                const kind = classify(body);
                rec.kind = kind;
                log(rec);
                const text = TEXT[kind];
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
            if (req.method === 'POST' && /\/messages$/.test(url)) {
                const kind = classify(body);
                rec.kind = kind;
                rec.api = 'anthropic';
                log(rec);
                const text = TEXT[kind];
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
            }
            rec.kind = 'unknown';
            log(rec);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'not found' } }));
        });
    });
    return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

// Запуск отдельно: node mock-server.mjs [logFile]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
    const logFile = process.argv[2] || 'mock-requests.jsonl';
    startMock({ logFile }).then(() => console.log(`mock on http://127.0.0.1:8124/v1, log → ${logFile}`));
}
