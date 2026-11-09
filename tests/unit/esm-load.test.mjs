// Загрузка расширения так, как это делает SillyTavern: index.js как ES-модуль (script type="module")
// с настоящими import между src/*.js. Стенд в остальных тестах склеивает модули в один скрипт —
// этот тест ловит то, что склейка скрывает: забытый import/export, обращение к ещё не
// вычисленному модулю в цикле импортов (TDZ), относительные пути.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { ROOT, SOURCES } from './sources.mjs';

test('ESM: index.js и src/*.js загружаются настоящими модулями, расширение инициализируется', async () => {
    const dom = new JSDOM(`<!doctype html><html><body><div id="chat"></div><div id="send_form"><div id="rightSendForm"><div id="mes_stop" style="display:none"></div><div id="send_but"></div></div><textarea id="send_textarea"></textarea></div><div id="extensionsMenu"></div></body></html>`,
        { url: 'http://localhost:8000/', pretendToBeVisual: true });
    const w = dom.window;
    const errors = [];
    const listeners = {};
    const ctx = {
        chat: [], chatMetadata: {}, characters: [], characterId: 0, name1: 'Боб', name2: 'Алиса', groupId: null, groups: [],
        extensionSettings: {}, saveSettingsDebounced() {}, saveMetadata() {}, saveChat() {},
        getRequestHeaders: () => ({ 'Content-Type': 'application/json' }), getCurrentChatId: () => 'chat-1',
        getCurrentLocale: () => 'en',
        eventSource: { on(ev, fn) { (listeners[ev] ??= []).push(fn); } },
        event_types: { CHAT_CHANGED: 'cc', MESSAGE_SENT: 'ms', MESSAGE_RECEIVED: 'mr', MESSAGE_DELETED: 'md' },
    };
    const set = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
    for (const k of ['window', 'document', 'navigator', 'localStorage', 'getComputedStyle', 'Event', 'MouseEvent', 'HTMLElement', 'Node', 'innerWidth', 'innerHeight'])
        set(k, k === 'window' ? w : typeof w[k] === 'function' && !/^[A-Z]/.test(k) ? w[k].bind(w) : w[k]);
    set('requestAnimationFrame', cb => setTimeout(cb, 0));
    set('SillyTavern', { getContext: () => ctx });
    set('toastr', Object.fromEntries(['info', 'warning', 'error', 'success'].map(k => [k, (m, t) => { if (k === 'error') errors.push(String(m)); }])));
    set('jQuery', fn => fn());
    set('confirm', () => true);
    set('fetch', async () => ({ ok: false, status: 404, json: async () => { throw new SyntaxError('html'); } }));

    await import(pathToFileURL(path.join(ROOT, 'index.js')).href);
    await new Promise(r => setTimeout(r, 20));
    assert.deepEqual(errors, [], 'ошибок при загрузке нет');
    assert.ok(w.document.getElementById('aip_play'), 'кнопка ▶ добавлена');
    assert.ok(w.document.getElementById('aip_overlay'), 'окно настроек построено');
    assert.equal(w.document.querySelector('.aip-tab[data-tab="conn"] span').textContent, 'Connection');
    assert.ok(listeners.mr?.length, 'подписка на MESSAGE_RECEIVED');
    w.close();
});

test('ESM: модули импортируют только из ./src и не тянут лишних путей', () => {
    for (const { file, text } of SOURCES()) {
        for (const m of text.matchAll(/^import\s.*from\s+'([^']+)'/gm)) {
            const ok = file === 'index.js' ? /^\.\/src\/[\w-]+\.js$/.test(m[1]) : /^\.\/[\w-]+\.js$/.test(m[1]);
            assert.ok(ok, `${file}: import из ${m[1]}`);
        }
    }
});
