// Сквозной E2E-тест расширения AI Player на настоящей SillyTavern.
// Запуск: cd tests/e2e && npm install && node run-e2e.mjs
// Переменные окружения: ST_DIR (по умолчанию C:\Projects\SillyTavern), BROWSER (путь к Edge/Chrome), HEADFUL=1,
//   EXT_SRC (папка с index.js/style.css/manifest.json другой версии расширения).
// Шаги 1–10c — базовый сценарий; 11–16 — проверки 0.3.0: утечка ключа (12a/12b), Regenerate (13),
//   кнопка «Новая мысль» в закрытом окне (14), Claude через реверс-прокси (15a–15d), ▶ без чата (16).
// Статус KNOWN — подтверждённый известный баг (прогон не валит, см. report.json).
// Пользовательские data/ и config.yaml ST не трогаются: отдельный --dataRoot и --configPath в .tmp-data.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startMock, systemText } from './mock-server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_SRC = process.env.EXT_SRC || path.resolve(HERE, '..', '..');   // EXT_SRC — прогнать другую версию расширения
const ST_DIR = process.env.ST_DIR || 'C:\\Projects\\SillyTavern';
const TMP = path.join(HERE, '.tmp-data');
const OUT = path.join(TMP, '_e2e');
const SCREENS = path.join(HERE, 'screens');
const USER_DIR = path.join(TMP, 'default-user');
const EXT_DST = path.join(USER_DIR, 'extensions', 'SillyTavern-AI-Player');
const ST_PORT = 8123, MOCK_PORT = 8124;
const BASE = `http://127.0.0.1:${ST_PORT}/`;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;
const MOCK_LOG = path.join(OUT, 'mock-requests.jsonl');
const KEY = 'sk-e2e-SECRET-0123456789abcdef';
const KEY_LABEL = 'E2E ключ';
const KEY2 = 'sk-e2e-SECOND-aaaabbbbccccdddd';      // второй ключ расширения (сценарий «у таверны свой ключ»)
const KEY2_LABEL = 'E2E ключ 2';
const TAVERN_KEY = 'sk-e2e-TAVERN-9876543210fedcba'; // собственный ключ таверны (Custom), тоже фиктивный
const PROXY_PASS = 'e2e-proxy-pass';
const CLAUDE_MODEL = 'claude-sonnet-5';
const PLACEHOLDER_RE = /^Пусто — заглушка AI Player/;
const BROWSERS = [
    process.env.BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const evidence = {};
let failed = 0;

// status: true = PASS, false = FAIL, 'known' = известный баг расширения/ST (подтверждён, но прогон не валит)
function record(step, ok, details) {
    results.push({ step, ok, details });
    if (!ok) failed++;
    const tag = ok === 'known' ? 'KNOWN' : ok ? 'PASS' : 'FAIL';
    console.log(`${tag}  ${step}${details ? ' — ' + (typeof details === 'string' ? details : JSON.stringify(details)) : ''}`);
}
async function step(name, fn) {
    try {
        const r = await fn();
        if (r && r.ok === false) record(name, false, r.details);
        else if (r && r.known) record(name, 'known', r.details);
        else record(name, true, r?.details ?? r);
    } catch (e) {
        record(name, false, e?.stack?.split('\n').slice(0, 3).join(' | ') || String(e));
    }
}
const check = (cond, msg) => { if (!cond) throw new Error(msg); };
const readMock = () => fs.existsSync(MOCK_LOG)
    ? fs.readFileSync(MOCK_LOG, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const countKind = k => readMock().filter(r => r.kind === k).length;

async function waitFor(fn, timeout = 30000, every = 250, what = 'условие') {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
        try { last = await fn(); if (last) return last; } catch (e) { last = e; }
        await sleep(every);
    }
    throw new Error(`таймаут ожидания: ${what}${last instanceof Error ? ` (${last.message})` : ''}`);
}

// ---------- подготовка ----------
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SCREENS, { recursive: true });

const mock = await startMock({ port: MOCK_PORT, logFile: MOCK_LOG });
console.log(`мок: ${MOCK_URL}`);

const stLog = fs.createWriteStream(path.join(OUT, 'st-server.log'));
const st = spawn(process.execPath, [
    'server.js',
    '--configPath', path.join(TMP, 'config.yaml'),
    '--dataRoot', TMP,
    '--port', String(ST_PORT),
    '--listen', 'false',
    '--browserLaunchEnabled', 'false',
], { cwd: ST_DIR, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0' } });
st.stdout.pipe(stLog); st.stderr.pipe(stLog);
let stExited = false;
st.on('exit', c => { stExited = true; console.log(`ST завершилась (код ${c})`); });

let browser;
try {
    await waitFor(async () => { if (stExited) throw new Error('ST упала, см. .tmp-data/_e2e/st-server.log'); const r = await fetch(BASE); return r.ok; }, 120000, 500, 'старт ST');
    const settingsFile = path.join(USER_DIR, 'settings.json');
    await waitFor(() => fs.existsSync(settingsFile), 30000, 250, 'settings.json в tmp-dir');
    console.log('ST запущена на', BASE);

    // шаг 2 (до открытия UI): основной API таверны → мок, персона «Тестер», без онбординга
    const S = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    S.firstRun = false;
    S.main_api = 'openai';
    S.username = 'Тестер';
    S.user_avatar = 'user-default.png';
    Object.assign(S.oai_settings ??= {}, { chat_completion_source: 'custom', custom_url: MOCK_URL, custom_model: 'mock-bot' });
    S.power_user ??= {};
    S.power_user.auto_connect = true;
    S.power_user.personas = { 'user-default.png': 'Тестер' };
    S.power_user.persona_descriptions = { 'user-default.png': { description: 'Раненый бывший наёмник, недоверчивый и упрямый.', position: 0 } };
    S.power_user.default_persona = 'user-default.png';
    fs.writeFileSync(settingsFile, JSON.stringify(S, null, 4));

    // подключение расширения
    fs.mkdirSync(EXT_DST, { recursive: true });
    for (const f of ['index.js', 'style.css', 'manifest.json']) fs.copyFileSync(path.join(EXT_SRC, f), path.join(EXT_DST, f));

    // ---------- браузер ----------
    const exe = BROWSERS.find(p => fs.existsSync(p));
    check(exe, 'не найден Edge/Chrome');
    browser = await puppeteer.launch({
        executablePath: exe, headless: process.env.HEADFUL ? false : true,
        args: ['--no-first-run', '--no-default-browser-check', '--lang=ru-RU', '--window-size=1366,900'],
        defaultViewport: { width: 1366, height: 900 },
    });
    const page = await browser.newPage();
    const UA0 = await browser.userAgent();
    const consoleLog = [], pageErrors = [], dialogs = [], stReqs = [];
    page.on('console', m => consoleLog.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', e => pageErrors.push(String(e?.stack || e)));
    page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
    page.on('request', r => {
        const u = r.url();
        if (/\/api\/(backends\/chat-completions\/(generate|status)|secrets\/)/.test(u)) stReqs.push({ url: u.replace(BASE, '/'), body: r.postData() || '' });
    });
    page.setDefaultTimeout(30000);

    const ctxEval = (fn, ...a) => page.evaluate(fn, ...a);
    const loadST = async () => {
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction(() => window.SillyTavern?.getContext && document.getElementById('aip_play')
            && document.getElementById('aip_overlay') && !document.getElementById('preloader'), { timeout: 120000 });
        await sleep(1500);
    };
    const shot = async (name, opts = {}) => { const p = path.join(SCREENS, name); await page.screenshot({ path: p, ...opts }); return p; };

    // Открыть окно настроек через меню-палочку
    async function openSettingsViaMenu() {
        await ctxEval(() => document.getElementById('aip_overlay')?.classList.remove('aip-open'));
        await page.click('#extensionsMenuButton');
        await page.waitForSelector('#aip_menu', { visible: true, timeout: 5000 });
        await page.click('#aip_menu');
        await sleep(700);   // анимация появления
    }
    // Геометрия, видимость, вкладки, читаемость полей
    async function inspectModal(tag) {
        const geo = await ctxEval(() => {
            const o = document.getElementById('aip_overlay'), m = document.getElementById('aip_modal');
            const r = m.getBoundingClientRect(), ro = o.getBoundingClientRect();
            const cs = getComputedStyle(m), co = getComputedStyle(o);
            const c = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40));
            return {
                vw: innerWidth, vh: innerHeight,
                modal: { x: r.left, y: r.top, w: r.width, h: r.height, display: cs.display, visibility: cs.visibility, opacity: cs.opacity },
                overlay: { x: ro.left, y: ro.top, w: ro.width, h: ro.height, display: co.display, opacity: co.opacity, z: co.zIndex, open: o.classList.contains('aip-open') },
                hitInsideModal: !!c && m.contains(c), hit: c ? `${c.tagName}#${c.id}.${String(c.className).slice(0, 40)}` : null,
            };
        });
        const inView = geo.modal.h > 0 && geo.modal.w > 0 && geo.modal.y >= -1 && geo.modal.x >= -1
            && geo.modal.y + geo.modal.h <= geo.vh + 1 && geo.modal.x + geo.modal.w <= geo.vw + 1;
        const tabs = {};
        const fields = [];
        for (const t of ['conn', 'game', 'prompts', 'match']) {
            await page.click(`.aip-tab[data-tab="${t}"]`);
            await sleep(250);
            const info = await ctxEval(t => {
                const panels = [...document.querySelectorAll('#aip_modal .aip-panel')];
                const act = panels.filter(p => getComputedStyle(p).display !== 'none');
                const p = document.querySelector(`#aip_modal .aip-panel[data-panel="${t}"]`);
                const r = p.getBoundingClientRect();
                const body = document.querySelector('#aip_modal .aip-body').getBoundingClientRect();
                const sel = document.querySelector(`.aip-tab[data-tab="${t}"]`).getAttribute('aria-selected');
                // --- читаемость полей ---
                const rgba = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
                const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
                const effBg = el => {
                    const layers = [];
                    for (let n = el; n; n = n.parentElement) {
                        const c = rgba(getComputedStyle(n).backgroundColor);
                        if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
                    }
                    let acc = { r: 255, g: 255, b: 255, a: 1 };
                    if (layers.length && layers[layers.length - 1].a < 0.99) {
                        const bb = rgba(getComputedStyle(document.body).backgroundColor);
                        acc = bb && bb.a > 0 ? { ...bb, a: 1 } : acc;
                    }
                    for (const l of layers.reverse()) acc = over(l, acc);
                    return acc;
                };
                const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
                const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
                const fmt = c => c ? `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})` : '?';
                const fields = [];
                for (const el of p.querySelectorAll('input:not([type=checkbox]), select, textarea')) {
                    const rr = el.getBoundingClientRect();
                    if (!rr.width || !rr.height) continue;
                    const cs = getComputedStyle(el);
                    const bg = effBg(el);
                    let fg = rgba(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color && !/^(currentcolor)$/i.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color);
                    const ph = rgba(getComputedStyle(el, '::placeholder').color);
                    const fgB = fg ? over(fg, bg) : null;
                    const phB = ph ? over(ph, bg) : null;
                    fields.push({
                        id: el.id || el.tagName, tag: el.tagName.toLowerCase(),
                        color: cs.color, textFill: cs.webkitTextFillColor, bgOwn: cs.backgroundColor, bgEffective: fmt(bg),
                        contrast: fgB ? +ratio(fgB, bg).toFixed(2) : null,
                        placeholder: ph ? cs.color === ph ? '=color' : getComputedStyle(el, '::placeholder').color : null,
                        placeholderContrast: phB && el.placeholder ? +ratio(phB, bg).toFixed(2) : null,
                        fontSize: cs.fontSize,
                    });
                    if (el.tagName === 'SELECT') {
                        const o = el.options[0];
                        if (o) { const oc = getComputedStyle(o); const ob = rgba(oc.backgroundColor); const of = rgba(oc.color);
                            fields[fields.length - 1].optionColors = `${oc.color} on ${oc.backgroundColor}`;
                            if (ob && of && ob.a > 0) fields[fields.length - 1].optionContrast = +ratio(of, { ...ob, a: 1 }).toFixed(2); }
                    }
                }
                return {
                    visiblePanels: act.map(p => p.dataset.panel), ariaSelected: sel,
                    panel: { h: r.height, w: r.width, y: r.y }, body: { h: body.height, y: body.y }, fields,
                };
            }, t);
            tabs[t] = info;
            fields.push(...info.fields.map(f => ({ tab: t, ...f })));
            await shot(`settings-${tag}-${t}.png`);
        }
        await page.click('.aip-tab[data-tab="conn"]');
        return { geo, inView, tabs, fields };
    }

    // ---------- Шаг 1 ----------
    await step('1. ST открылась, расширение загружено, ошибок нет', async () => {
        await loadST();
        await waitFor(() => consoleLog.some(m => /\[AI Player\].*загружен/.test(m.text)), 15000, 250, 'лог «[AI Player] … загружен»');
        const line = consoleLog.find(m => /\[AI Player\].*загружен/.test(m.text)).text;
        const extErr = [...consoleLog.filter(m => m.type === 'error' && /AI Player|AI-Player|aip/i.test(m.text)).map(m => m.text),
            ...pageErrors.filter(e => /AI-Player|AI Player/i.test(e))];
        evidence.step1 = { line, extErr, allConsoleErrors: consoleLog.filter(m => m.type === 'error').map(m => m.text).slice(0, 20), pageErrors };
        check(!extErr.length, `ошибки расширения: ${extErr.join(' | ')}`);
        return line;
    });

    // ---------- Шаг 2 ----------
    await step('2. Основной API таверны → мок (Custom, mock-bot)', async () => {
        let st0 = await ctxEval(() => SillyTavern.getContext().onlineStatus);
        if (!st0 || st0 === 'no_connection') {
            // запасной путь через UI
            await ctxEval(url => {
                $('#main_api').val('openai').trigger('change');
                $('#chat_completion_source').val('custom').trigger('change');
                $('#custom_api_url_text').val(url).trigger('input');
                $('#custom_model_id').val('mock-bot').trigger('input');
                $('#api_button_openai').trigger('click');
            }, MOCK_URL);
            await waitFor(async () => { const s = await ctxEval(() => SillyTavern.getContext().onlineStatus); return s && s !== 'no_connection'; }, 20000, 300, 'подключение к моку');
            st0 = await ctxEval(() => SillyTavern.getContext().onlineStatus);
        }
        const info = await ctxEval(() => ({ main: SillyTavern.getContext().mainApi, src: $('#chat_completion_source').val(), url: $('#custom_api_url_text').val(), model: $('#custom_model_id').val() }));
        check(info.src === 'custom' && info.url.includes('8124'), `источник ${JSON.stringify(info)}`);
        return { onlineStatus: st0, ...info };
    });

    // ---------- Шаг 3 ----------
    await step('3. Персонаж Seraphina + персона «Тестер», чат открыт', async () => {
        await ctxEval(async () => {
            const c = SillyTavern.getContext();
            const i = c.characters.findIndex(x => x.name === 'Seraphina');
            if (i < 0) throw new Error('нет Seraphina');
            await c.selectCharacterById(String(i));
        });
        await waitFor(() => ctxEval(() => { const c = SillyTavern.getContext(); return !!c.getCurrentChatId() && c.chat.length >= 1 && document.querySelector('#chat .mes'); }), 20000, 300, 'открытие чата');
        const r = await ctxEval(() => { const c = SillyTavern.getContext(); return { name1: c.name1, name2: c.name2, chatId: c.getCurrentChatId(), msgs: c.chat.length }; });
        check(r.name2 === 'Seraphina', 'не Seraphina');
        if (r.name1 !== 'Тестер') return { ok: false, details: { ...r, note: 'персона не применилась' } };
        return r;
    });

    // ---------- Шаг 4 (десктоп) ----------
    let desk;
    await step('4a. Окно настроек видно на десктопе 1366×900, вкладки работают', async () => {
        await openSettingsViaMenu();
        desk = await inspectModal('desktop');
        evidence.modalDesktop = desk;
        const badTabs = Object.entries(desk.tabs).filter(([t, i]) => i.visiblePanels.join() !== t || i.ariaSelected !== 'true' || i.panel.h <= 0).map(([t]) => t);
        check(desk.inView, `окно вне экрана/нулевое: ${JSON.stringify(desk.geo.modal)} vw=${desk.geo.vw} vh=${desk.geo.vh}`);
        check(desk.geo.hitInsideModal, `центр окна перекрыт: ${desk.geo.hit}`);
        check(!badTabs.length, `вкладки не работают: ${badTabs}`);
        return { modal: desk.geo.modal, tabs: Object.fromEntries(Object.entries(desk.tabs).map(([k, v]) => [k, v.panel.h])) };
    });
    await step('4b. Окно настроек при сжатии до 400×800 без перезагрузки', async () => {
        await page.setViewport({ width: 400, height: 800 });
        await sleep(600);
        const g = await ctxEval(() => { const r = document.getElementById('aip_modal').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; });
        await shot('settings-resize-400x800.png');
        await page.setViewport({ width: 1366, height: 900 });
        await sleep(400);
        check(g.h > 0 && g.y >= -1 && g.y + g.h <= g.vh + 1 && g.x >= -1 && g.x + g.w <= g.vw + 1, `геометрия ${JSON.stringify(g)}`);
        return g;
    });

    // ---------- Шаг 5 ----------
    await step('5. Профиль: OpenAI-совм., URL мока, ключ, список моделей, mock-player, Тест ✔', async () => {
        await page.click('.aip-tab[data-tab="conn"]');
        await ctxEval(() => { const s = document.getElementById('aip_p_provider'); s.value = 'openai'; s.dispatchEvent(new Event('change', { bubbles: true })); });
        await page.click('#aip_p_url', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#aip_p_url', MOCK_URL);
        await ctxEval(() => { document.getElementById('aip_addKey').open = true; });
        await page.type('#aip_keyLabel', KEY_LABEL);
        await page.type('#aip_keyInput', KEY);
        const keyInputType = await ctxEval(() => document.getElementById('aip_keyInput').type);
        await page.click('#aip_keySave');
        await waitFor(() => ctxEval(l => [...document.querySelectorAll('#aip_keySelect option')].some(o => o.textContent.includes(l)) && document.getElementById('aip_keyState').dataset.state === 'ok', KEY_LABEL), 10000, 200, 'ключ появился в списке');
        const keyUi = await ctxEval(() => ({ options: [...document.querySelectorAll('#aip_keySelect option')].map(o => o.textContent), state: document.getElementById('aip_keyState').textContent, input: document.getElementById('aip_keyInput').value }));
        check(!keyUi.options.join().includes(KEY), 'полный ключ виден в списке');
        await page.click('#aip_fetchModels');
        await waitFor(() => ctxEval(() => !!document.querySelector('#aip_models option[value="mock-player"]')), 10000, 200, 'список моделей');
        const models = await ctxEval(() => [...document.querySelectorAll('#aip_models option')].map(o => o.value));
        await page.click('#aip_p_model', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#aip_p_model', 'mock-player');
        await page.click('#aip_test');
        await waitFor(() => ctxEval(() => /^[✔✖]/.test(document.getElementById('aip_status').textContent)), 20000, 200, 'результат «Тест»');
        const status = await ctxEval(() => document.getElementById('aip_status').textContent);
        const prof = await ctxEval(() => { const s = SillyTavern.getContext().extensionSettings.ai_player; return s.profiles.find(p => p.id === s.activeProfile); });
        evidence.profile = prof; evidence.keyUi = keyUi;
        await shot('settings-desktop-configured.png');
        check(status.startsWith('✔'), `статус: ${status}`);
        check(prof.model === 'mock-player' && prof.url === MOCK_URL && prof.secretId, `профиль ${JSON.stringify(prof)}`);
        check(keyInputType === 'password' && keyUi.input === '', 'поле ключа не password или не очищено');
        return { status, models, keyOptions: keyUi.options };
    });
    await ctxEval(() => document.getElementById('aip_close').click());
    // граница: дальше ключ расширения легитимно уходит только в запросы самого агента (turn/thought/test)
    const T_KEY_SAVED = Date.now();

    // ---------- Шаг 6 ----------
    const chatSnap = () => ctxEval(() => { const c = SillyTavern.getContext(); return { len: c.chat.length, log: (c.chatMetadata?.aip_log || []).length, busy: getComputedStyle(document.getElementById('mes_stop')).display !== 'none', aipBusy: document.getElementById('aip_play').classList.contains('aip-busy') }; });
    await step('6. ▶: ход агента с бейджем, ответ бота, мысль ★ 7/10, лог в chatMetadata', async () => {
        const before = await chatSnap();
        const k0 = { turn: countKind('turn'), thought: countKind('thought'), bot: countKind('bot') };
        await page.click('#aip_play');
        await waitFor(async () => { const s = await chatSnap(); return s.len >= before.len + 2 && s.log >= before.log + 1 && !s.busy && !s.aipBusy; }, 60000, 300, 'ход + ответ бота + мысль');
        await sleep(800);
        const r = await ctxEval(() => {
            const c = SillyTavern.getContext();
            const ui = c.chat.findLastIndex(m => m.is_user);
            const um = c.chat[ui], bm = c.chat[ui + 1];
            const badge = document.querySelector(`#chat .mes[mesid="${ui}"] .aip-badge`)?.textContent;
            const th = document.getElementById('aip_thoughts');
            const items = th.querySelectorAll('.aip-th-item');
            const last = items[items.length - 1];
            const tr = th.getBoundingClientRect();
            return {
                user: { idx: ui, mes: um.mes.slice(0, 80), aip: um.extra?.aip }, bot: bm ? { name: bm.name, mes: bm.mes.slice(0, 60), model: bm.extra?.model } : null,
                badge, thoughtsOpen: th.classList.contains('aip-open'), items: items.length,
                score: last?.querySelector('.aip-score')?.textContent, scoreClass: last?.querySelector('.aip-score')?.className,
                pills: [...(last?.querySelectorAll('.aip-pill') || [])].map(p => p.textContent),
                thoughtsRect: { x: tr.left, y: tr.top, w: tr.width, h: tr.height, vw: innerWidth, vh: innerHeight },
                aipLog: c.chatMetadata.aip_log,
            };
        });
        evidence.step6 = r;
        await shot('thoughts-desktop.png');
        try { await (await page.$('#aip_thoughts')).screenshot({ path: path.join(SCREENS, 'thoughts-window.png') }); } catch { /* */ }
        // метаданные на диске
        // метаданные на диске (папка чатов называется по аватару: default_Seraphina)
        const chatsRoot = path.join(USER_DIR, 'chats');
        const diskHasLog = () => fs.readdirSync(chatsRoot, { recursive: true }).filter(f => String(f).endsWith('.jsonl'))
            .some(f => (fs.readFileSync(path.join(chatsRoot, String(f)), 'utf8').split('\n')[0] || '').includes('"aip_log"'));
        const tDisk = Date.now();
        const onDisk = await waitFor(diskHasLog, 10000, 250, 'aip_log в файле чата').catch(() => false);
        r.aipLogDiskDelayMs = Date.now() - tDisk;
        const k1 = { turn: countKind('turn'), thought: countKind('thought'), bot: countKind('bot') };
        r.mockDelta = { turn: k1.turn - k0.turn, thought: k1.thought - k0.thought, bot: k1.bot - k0.bot };
        r.aipLogOnDisk = onDisk;
        check(r.badge === '🤖 mock-player', `бейдж: ${r.badge}`);
        check(r.user.aip?.model === 'mock-player', 'нет extra.aip у хода');
        check(r.bot && !r.bot.mes.includes('undefined') && r.bot.mes.length > 0, 'нет ответа бота');
        check(r.thoughtsOpen && r.items >= 1, 'окно мыслей не открылось/пусто');
        check(r.score === '★ 7/10', `оценка: ${r.score}`);
        check(r.aipLog?.length >= 1 && r.aipLog.at(-1).playerModel === 'mock-player', 'aip_log не записан');
        check(onDisk, 'aip_log не сохранён в файл чата');
        check(r.mockDelta.turn === 1 && r.mockDelta.thought === 1 && r.mockDelta.bot >= 1, `запросы к моку: ${JSON.stringify(r.mockDelta)}`);
        return { badge: r.badge, score: r.score, pills: r.pills, botModel: r.bot.model, mockDelta: r.mockDelta, words: r.user.aip.words, inRange: r.user.aip.inRange, aipLogOnDisk: onDisk };
    });

    // ---------- Шаг 7 ----------
    await step('7. ⏻ выключает мысли: следующий ход без запроса «мыслей»', async () => {
        await page.click('#aip_thoughts [data-act="power"]');
        await sleep(400);
        const off = await ctxEval(() => ({ reactions: SillyTavern.getContext().extensionSettings.ai_player.reactions, cls: document.getElementById('aip_thoughts').classList.contains('aip-off'), offVisible: getComputedStyle(document.querySelector('#aip_thoughts .aip-th-off')).display !== 'none' }));
        check(off.reactions === false && off.cls, `не выключилось: ${JSON.stringify(off)}`);
        await shot('thoughts-off.png');
        const before = await chatSnap();
        const k0 = { turn: countKind('turn'), thought: countKind('thought'), bot: countKind('bot') };
        await page.click('#aip_play');
        await waitFor(async () => { const s = await chatSnap(); return s.len >= before.len + 2 && !s.busy && !s.aipBusy; }, 60000, 300, 'второй ход + ответ бота');
        await sleep(4000);
        const after = await chatSnap();
        const d = { turn: countKind('turn') - k0.turn, thought: countKind('thought') - k0.thought, bot: countKind('bot') - k0.bot };
        check(d.turn === 1 && d.bot >= 1, `ход не состоялся: ${JSON.stringify(d)}`);
        check(d.thought === 0, `были запросы мыслей: ${d.thought}`);
        check(after.log === before.log, 'aip_log вырос');
        return { off, mockDelta: d, aipLog: after.log };
    });

    // ---------- Шаг 8 ----------
    await step('8. Тела запросов к моку: system первым, роли, ключ только в заголовке, secret_id не протекает', async () => {
        const recs = readMock();
        const secretId = evidence.profile?.secretId;
        const mine = recs.filter(r => ['turn', 'thought', 'test'].includes(r.kind));
        const problems = [];
        for (const r of mine) {
            const m = r.body?.messages || [];
            const roles = m.map(x => x.role);
            if (roles[0] !== 'system') problems.push(`${r.kind}: первый не system (${roles.join(',')})`);
            if (roles.filter(x => x === 'system').length !== 1) problems.push(`${r.kind}: system не один (${roles.join(',')})`);
            if (roles.some(x => !['system', 'user', 'assistant'].includes(x))) problems.push(`${r.kind}: странная роль`);
            if (roles[1] !== 'user') problems.push(`${r.kind}: после system не user (${roles.join(',')})`);
            for (let i = 2; i < roles.length; i++) if (roles[i] === roles[i - 1]) problems.push(`${r.kind}: две ${roles[i]} подряд`);
            if (roles.at(-1) !== 'user') problems.push(`${r.kind}: последний не user`);
            if (r.raw.includes(KEY)) problems.push(`${r.kind}: КЛЮЧ В ТЕЛЕ`);
            if (/secret_id/.test(r.raw) || (secretId && r.raw.includes(secretId))) problems.push(`${r.kind}: secret_id в теле`);
            if (r.headers.authorization !== `Bearer ${KEY}`) problems.push(`${r.kind}: заголовок Authorization = ${r.headers.authorization}`);
            if (r.body?.model !== 'mock-player') problems.push(`${r.kind}: модель ${r.body?.model}`);
        }
        // запросы браузер → ST: ключа нет, secret_id есть
        const gen = stReqs.filter(r => r.url.includes('/generate') && r.body.includes('mock-player'));
        for (const g of gen) {
            if (g.body.includes(KEY)) problems.push('браузер→ST: ключ в теле generate');
            if (!g.body.includes('secret_id')) problems.push('браузер→ST: нет secret_id');
        }
        const secretWrites = stReqs.filter(r => r.url.includes('/secrets/write'));
        const turn = mine.find(r => r.kind === 'turn');
        const bots = recs.filter(r => r.kind === 'bot');
        const models = recs.filter(r => r.kind === 'models');
        evidence.step8 = {
            counts: Object.fromEntries(['models', 'turn', 'thought', 'test', 'bot', 'unknown'].map(k => [k, recs.filter(r => r.kind === k).length])),
            turnRoles: turn?.body.messages.map(m => m.role), turnParams: turn && Object.fromEntries(Object.entries(turn.body).filter(([k]) => k !== 'messages')),
            turnSystemHead: turn?.body.messages[0].content.slice(0, 120),
            botAuth: bots.map(b => b.headers.authorization ? b.headers.authorization.replace(KEY, '<E2E-KEY>') : '(нет)'),
            modelsAuth: models.map(b => b.headers.authorization ? b.headers.authorization.replace(KEY, '<E2E-KEY>') : '(нет)'),
            browserGenerateBodies: gen.length, secretWriteSentKeyToST: secretWrites.length,
        };
        if (problems.length) return { ok: false, details: problems };
        return { checked: mine.length, kinds: evidence.step8.counts, turnRoles: evidence.step8.turnRoles };
    });

    // ---------- Шаг 9 ----------
    await step('9. secrets.json: ключ с меткой «AI Player · …»; settings.json без ключа', async () => {
        await sleep(2500);   // saveSettingsDebounced
        const sec = JSON.parse(fs.readFileSync(path.join(USER_DIR, 'secrets.json'), 'utf8'));
        const list = sec.api_key_custom;
        const arr = Array.isArray(list) ? list : [];
        const entry = arr.find(x => x.value === KEY);
        const set = JSON.parse(fs.readFileSync(path.join(USER_DIR, 'settings.json'), 'utf8'));
        const aip = set.extension_settings?.ai_player;
        const aipStr = JSON.stringify(aip || {});
        evidence.step9 = {
            secretsCustom: arr.map(x => ({ id: x.id, label: x.label, active: x.active, valueIsKey: x.value === KEY })),
            settingsProfiles: aip?.profiles, settingsHasKeyField: aip && ('key' in aip),
            settingsFileContainsKey: fs.readFileSync(path.join(USER_DIR, 'settings.json'), 'utf8').includes(KEY),
        };
        check(entry, 'ключа нет в secrets.json');
        check(/^AI Player · /.test(entry.label), `метка: ${entry.label}`);
        check(aip, 'нет extension_settings.ai_player в settings.json');
        check(!aipStr.includes(KEY) && !evidence.step9.settingsFileContainsKey, 'ключ в settings.json!');
        check(aip.profiles.some(p => p.secretId === entry.id), 'secretId профиля не совпадает с id секрета');
        return { label: entry.label, active: entry.active, totalCustomKeys: arr.length };
    });

    // ---------- Шаг 10: мобильный вьюпорт с перезагрузкой ----------
    await step('10a. Мобайл 400×800 (перезагрузка, mobile UA): окно настроек видно, вкладки работают', async () => {
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36');
        await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
        await loadST();
        await ctxEval(async () => { const c = SillyTavern.getContext(); await c.selectCharacterById(String(c.characters.findIndex(x => x.name === 'Seraphina'))); });
        await sleep(1500);
        await openSettingsViaMenu();
        const mob = await inspectModal('mobile');
        evidence.modalMobile = mob;
        const badTabs = Object.entries(mob.tabs).filter(([t, i]) => i.visiblePanels.join() !== t || i.panel.h <= 0).map(([t]) => t);
        check(mob.inView, `окно вне экрана/нулевое: ${JSON.stringify(mob.geo)}`);
        check(mob.geo.hitInsideModal, `центр окна перекрыт: ${mob.geo.hit}`);
        check(!badTabs.length, `вкладки: ${badTabs}`);
        return { modal: mob.geo.modal, vw: mob.geo.vw, vh: mob.geo.vh, tabs: Object.fromEntries(Object.entries(mob.tabs).map(([k, v]) => [k, v.panel.h])) };
    });
    await step('10b. Мобайл: окно мыслей видно', async () => {
        await ctxEval(() => document.getElementById('aip_close').click());
        await ctxEval(() => { const t = document.getElementById('aip_thoughts'); if (!t.classList.contains('aip-open')) document.getElementById('aip_menu_th').click(); });
        await sleep(700);
        const g = await ctxEval(() => { const t = document.getElementById('aip_thoughts'); const r = t.getBoundingClientRect(); return { open: t.classList.contains('aip-open'), x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, items: t.querySelectorAll('.aip-th-item').length }; });
        await shot('thoughts-mobile.png');
        check(g.open && g.h > 0 && g.y >= -1 && g.y + g.h <= g.vh + 1 && g.x >= -1 && g.x + g.w <= g.vw + 1, `геометрия ${JSON.stringify(g)}`);
        return g;
    });

    await step('10c. Читаемость полей ввода (контраст текста ≥ 4.5, плейсхолдера ≥ 3)', async () => {
        const all = [...(desk?.fields || []).map(f => ({ vp: 'desktop', ...f })), ...(evidence.modalMobile?.fields || []).map(f => ({ vp: 'mobile', ...f }))];
        const bad = all.filter(f => f.contrast == null || f.contrast < 4.5 || (f.placeholderContrast != null && f.placeholderContrast < 3) || (f.optionContrast != null && f.optionContrast < 4.5));
        evidence.fields = all;
        const min = all.reduce((a, f) => Math.min(a, f.contrast ?? 0), 99);
        if (bad.length) return { ok: false, details: bad.map(f => `${f.vp}/${f.tab}/${f.id}: text ${f.color} on ${f.bgEffective} = ${f.contrast}; ph=${f.placeholderContrast}; opt=${f.optionColors}`) };
        return { fields: all.length, minContrast: min, sample: all.slice(0, 3).map(f => `${f.id}: ${f.color} on ${f.bgEffective} (${f.contrast})`) };
    });

    // =====================================================================
    // Новые проверки 0.3.0
    // =====================================================================
    const readSecretsRaw = () => fs.readFileSync(path.join(USER_DIR, 'secrets.json'), 'utf8');
    const customSlots = () => { const a = JSON.parse(readSecretsRaw()).api_key_custom; return Array.isArray(a) ? a : []; };
    const mask = s => String(s ?? '').replaceAll(KEY, '<KEY>').replaceAll(KEY2, '<KEY2>').replaceAll(TAVERN_KEY, '<TAVERN_KEY>');
    const slotView = x => ({ label: x.label, active: x.active, value: x.value === '' ? '(пусто)' : mask(x.value) });
    const keyOptions = () => ctxEval(() => [...document.querySelectorAll('#aip_keySelect option')].map(o => o.textContent));
    const aipProfile = () => ctxEval(() => { const s = SillyTavern.getContext().extensionSettings.ai_player; return s.profiles.find(p => p.id === s.activeProfile); });
    const isIdle = () => ctxEval(() => getComputedStyle(document.getElementById('mes_stop')).display === 'none' && !document.getElementById('aip_play').classList.contains('aip-busy'));
    const thoughtsState = () => ctxEval(() => {
        const t = document.getElementById('aip_thoughts'), b = t.querySelector('.aip-th-body');
        return { open: t.classList.contains('aip-open'), min: t.classList.contains('aip-min'), hasNew: t.classList.contains('aip-has-new'),
            items: t.querySelectorAll('.aip-th-item').length, log: (SillyTavern.getContext().chatMetadata?.aip_log || []).length,
            scrollable: b.scrollHeight - b.clientHeight, top: b.scrollTop };
    });
    // пункт меню «бургера» ST (Regenerate / Close chat): как пользователь — через кнопку меню
    async function stMenu(id) {
        try {
            await page.click('#options_button');
            await page.waitForSelector(`#${id}`, { visible: true, timeout: 5000 });
            await page.click(`#${id}`);
        } catch {
            await ctxEval(i => $(`#${i}`).trigger('click'), id);
        }
    }
    // скриншот карточки API со списком ключей, развёрнутым в список (нативный select в headless не раскрывается)
    async function shotKeyCard(name) {
        await ctxEval(() => { const s = document.getElementById('aip_keySelect'); s.size = Math.max(2, s.options.length); });
        const card = await page.evaluateHandle(() => document.getElementById('aip_keyWrap').closest('.aip-card'));
        await card.asElement().screenshot({ path: path.join(SCREENS, name) });
        await ctxEval(() => document.getElementById('aip_keySelect').removeAttribute('size'));
    }
    async function regenerateAndWait(what) {
        const t0 = await thoughtsState();
        await stMenu('option_regenerate');
        await waitFor(async () => { const t = await thoughtsState(); return t.log >= t0.log + 1 && t.items >= t0.items + 1 && await isIdle(); }, 60000, 300, what);
        await sleep(600);
        return t0;
    }

    // ---------- Шаг 11 ----------
    await step('11. Десктоп 1366×900: перезагрузка, чат Seraphina, мысли снова включены', async () => {
        await page.setUserAgent(UA0);
        await page.setViewport({ width: 1366, height: 900 });
        await loadST();
        await ctxEval(async () => { const c = SillyTavern.getContext(); await c.selectCharacterById(String(c.characters.findIndex(x => x.name === 'Seraphina'))); });
        await waitFor(() => ctxEval(() => SillyTavern.getContext().chat.length >= 5 && document.querySelectorAll('#chat .mes').length >= 5), 20000, 300, 'чат Seraphina с прошлыми ходами');
        await sleep(800);
        await ctxEval(() => {
            if (!SillyTavern.getContext().extensionSettings.ai_player.reactions) document.querySelector('#aip_thoughts [data-act="on"]').click();
            const t = document.getElementById('aip_thoughts');
            if (!t.classList.contains('aip-open')) document.getElementById('aip_menu_th').click();
        });
        await sleep(600);
        const r = { reactions: await ctxEval(() => SillyTavern.getContext().extensionSettings.ai_player.reactions), ...(await thoughtsState()) };
        check(r.reactions === true && r.open && !r.min, `мысли: ${JSON.stringify(r)}`);
        check(r.items === r.log && r.log >= 1, `карточки ${r.items} ≠ aip_log ${r.log}`);
        return r;
    });

    // ---------- Шаг 12a: утечка ключа (у таверны ключа не было) ----------
    await step('12a. Утечка ключа: у таверны нет ключа → бот идёт без ключа расширения, активна заглушка', async () => {
        const recs = readMock();
        const slots = customSlots();
        const ph = slots.find(x => PLACEHOLDER_RE.test(x.label || ''));
        const ext = slots.find(x => x.value === KEY);
        const bots = recs.filter(r => r.kind === 'bot');
        const tavernSide = recs.filter(r => r.kind === 'bot' || (r.kind === 'models' && r.ts > T_KEY_SAVED));
        const leaks = tavernSide.filter(r => JSON.stringify(r.headers).includes(KEY) || r.raw.includes(KEY));
        const agent = recs.filter(r => ['turn', 'thought'].includes(r.kind) && r.ts > T_KEY_SAVED);
        const agentBad = agent.filter(r => r.headers.authorization !== `Bearer ${KEY}`);
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await waitFor(() => ctxEval(() => document.querySelectorAll('#aip_keySelect option').length > 0 && document.getElementById('aip_keyState').dataset.state), 10000, 200, 'список ключей');
        await sleep(400);
        const options = await keyOptions();
        await shotKeyCard('keys-no-tavern-key.png');
        await ctxEval(() => document.getElementById('aip_close').click());
        evidence.leak1 = {
            secrets: slots.map(slotView), botAuth: bots.map(b => mask(b.headers.authorization ?? '(нет)')),
            tavernModelsAuth: tavernSide.filter(r => r.kind === 'models').map(b => mask(b.headers.authorization ?? '(нет)')),
            agentAuth: agent.map(r => `${r.kind}: ${mask(r.headers.authorization)}`), options,
        };
        check(bots.length >= 2, `запросов бота мало: ${bots.length}`);
        check(!leaks.length, `КЛЮЧ РАСШИРЕНИЯ УШЁЛ В ЗАПРОСЫ ТАВЕРНЫ: ${leaks.map(r => `${r.kind} ${r.url} ${mask(r.headers.authorization)}`).join('; ')}`);
        check(ph, `в secrets.json нет заглушки: ${JSON.stringify(slots.map(slotView))}`);
        check(ph.active === true && ph.value === '', `заглушка не активна/не пустая: ${JSON.stringify(slotView(ph))}`);
        check(ext && ext.active === false, `ключ расширения active=${ext?.active}`);
        check(slots.filter(x => x.active).length === 1, 'активных ключей Custom не ровно один');
        check(agent.length >= 2 && !agentBad.length, `ход/мысли агента не с ключом расширения: ${agentBad.map(r => mask(r.headers.authorization)).join('; ')}`);
        check(!options.some(o => /заглушк|Пусто/i.test(o)), `заглушка видна в списке ключей: ${options}`);
        return { botAuth: evidence.leak1.botAuth, active: slotView(ph), extKeyActive: ext.active, agentRequests: agent.length, options };
    });

    // ---------- Шаг 12b: у таверны был свой ключ ----------
    await step('12b. Утечка ключа: у таверны свой ключ → после сохранения ключа расширения активен снова ключ таверны', async () => {
        // пользователь вводит свой ключ Custom в панели API таверны (ST пишет его тем же /api/secrets/write)
        const w = await ctxEval(async v => {
            const r = await fetch('/api/secrets/write', { method: 'POST', headers: SillyTavern.getContext().getRequestHeaders(), body: JSON.stringify({ key: 'api_key_custom', value: v, label: 'Ключ таверны E2E' }) });
            return { ok: r.ok, status: r.status };
        }, TAVERN_KEY);
        check(w.ok, `не удалось записать ключ таверны: ${w.status}`);
        const tv0 = customSlots().find(x => x.value === TAVERN_KEY);
        check(tv0?.active, 'ключ таверны не стал активным после записи');

        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await sleep(500);
        await ctxEval(() => { document.getElementById('aip_addKey').open = true; });
        await page.type('#aip_keyLabel', KEY2_LABEL);
        await page.type('#aip_keyInput', KEY2);
        await page.click('#aip_keySave');
        await waitFor(() => ctxEval(l => [...document.querySelectorAll('#aip_keySelect option')].some(o => o.textContent.includes(l)) && document.getElementById('aip_keyState').dataset.state === 'ok', KEY2_LABEL), 10000, 200, 'второй ключ в списке');
        await sleep(800);
        const options = await keyOptions();
        const prof = await aipProfile();
        await shotKeyCard('keys-with-tavern-key.png');
        await ctxEval(() => document.getElementById('aip_close').click());
        const slots = customSlots();
        const tv = slots.find(x => x.value === TAVERN_KEY), k1 = slots.find(x => x.value === KEY), k2 = slots.find(x => x.value === KEY2);
        const ph = slots.find(x => PLACEHOLDER_RE.test(x.label || ''));
        evidence.leak2 = { secrets: slots.map(slotView), options, profileSecretId: prof.secretId };
        check(tv?.active === true, `активен не ключ таверны: ${JSON.stringify(slots.map(slotView))}`);
        check(k1?.active === false && k2?.active === false, 'ключ расширения активен для всей таверны');
        check(!ph || ph.active === false, 'заглушка снова активна при наличии ключа таверны');
        check(k2 && prof.secretId === k2.id, 'профиль не выбрал новый ключ');
        check(/^AI Player · /.test(k2.label), `метка: ${k2.label}`);
        check(!options.some(o => /заглушк|Пусто/i.test(o)), `заглушка видна в списке: ${options}`);
        check(options.some(o => o.includes(KEY_LABEL)) && options.some(o => o.includes(KEY2_LABEL)), `ключи расширения не все в списке: ${options}`);
        check(options.some(o => /^↪/.test(o)), `нет пункта «ключ таверны»: ${options}`);
        check(!options.join().includes(KEY2) && !options.join().includes(TAVERN_KEY), 'полный ключ в списке');
        return { secrets: evidence.leak2.secrets, options };
    });

    // ---------- Шаг 13: перегенерация ----------
    await step('13. Перегенерация ответа бота (Regenerate) → новая карточка в окне мыслей', async () => {
        const n0 = readMock().length;
        const len0 = await ctxEval(() => SillyTavern.getContext().chat.length);
        const last0 = await ctxEval(() => { const m = SillyTavern.getContext().chat.at(-1); return { is_user: m.is_user, send_date: m.send_date }; });
        check(last0.is_user === false, 'последнее сообщение не от бота');
        const t0 = await regenerateAndWait('новая мысль после Regenerate');
        const t1 = await thoughtsState();
        const len1 = await ctxEval(() => SillyTavern.getContext().chat.length);
        const last1 = await ctxEval(() => { const c = SillyTavern.getContext(); const m = c.chat.at(-1); const e = c.chatMetadata.aip_log.at(-1); return { send_date: m.send_date, mes: m.mes.slice(0, 50), logMesId: e.mesId, logSendDate: e.sendDate, idx: c.chat.length - 1 }; });
        const fresh = readMock().slice(n0);
        const bots = fresh.filter(r => r.kind === 'bot'), thoughts = fresh.filter(r => r.kind === 'thought');
        evidence.regen = { t0, t1, len0, len1, last0, last1, fresh: fresh.map(r => `${r.kind} ${r.url} ${mask(r.headers.authorization ?? r.headers['x-api-key'])}`) };
        try { await (await page.$('#aip_thoughts')).screenshot({ path: path.join(SCREENS, 'thoughts-regenerate.png') }); } catch { /* */ }
        check(t1.items === t0.items + 1 && t1.log === t0.log + 1, `карточек ${t0.items}→${t1.items}, лог ${t0.log}→${t1.log}`);
        check(len1 === len0, `длина чата изменилась ${len0}→${len1}`);
        check(last1.send_date !== last0.send_date, 'ответ бота не обновился');
        check(last1.logMesId === last1.idx && last1.logSendDate === last1.send_date, 'запись лога не привязана к новому ответу');
        check(!fresh.some(r => r.kind === 'turn'), 'при перегенерации агент сделал ход');
        check(bots.length >= 1 && bots.every(b => b.headers.authorization === `Bearer ${TAVERN_KEY}`), `бот не с ключом таверны: ${bots.map(b => mask(b.headers.authorization))}`);
        check(thoughts.length === 1 && thoughts[0].headers.authorization === `Bearer ${KEY2}`, `мысль не с ключом расширения: ${thoughts.map(b => mask(b.headers.authorization))}`);
        return { items: `${t0.items}→${t1.items}`, botAuth: bots.map(b => mask(b.headers.authorization)), thoughtAuth: mask(thoughts[0].headers.authorization) };
    });

    // ---------- Шаг 14: кнопка «Новая мысль» не ловит клики в закрытом окне ----------
    await step('14. «Новая мысль»: после закрытия окна elementFromPoint в точке кнопки — не элемент расширения', async () => {
        // нужна прокрутка: добиваем карточек перегенерациями
        let st = await thoughtsState(), regens = 0;
        while (st.scrollable < 80 && regens < 4) { await regenerateAndWait('доп. перегенерация'); regens++; st = await thoughtsState(); }
        check(st.scrollable >= 80, `окно мыслей не прокручивается (${st.scrollable}px)`);
        await ctxEval(() => { const b = document.querySelector('#aip_thoughts .aip-th-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); });
        await sleep(300);
        await regenerateAndWait('мысль при прокрутке вверх'); regens++;
        await sleep(400);   // transition 160ms
        const btn = await ctxEval(() => {
            const describe = e => e ? `${e.tagName}#${e.id}.${String(e.className).slice(0, 50)}` : null;
            const t = document.getElementById('aip_thoughts'), b = t.querySelector('.aip-th-newbtn');
            const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const hit = document.elementFromPoint(cx, cy);
            return { hasNew: t.classList.contains('aip-has-new'), cx, cy, w: r.width, h: r.height, visibility: cs.visibility, opacity: cs.opacity, pe: cs.pointerEvents, hitIsBtn: !!hit && b.contains(hit), hit: describe(hit), text: b.textContent.trim() };
        });
        await shot('thoughts-newbtn.png');
        check(btn.hasNew && btn.visibility === 'visible' && btn.hitIsBtn, `кнопка «Новая мысль» не появилась/не кликабельна: ${JSON.stringify(btn)}`);
        await page.click('#aip_thoughts [data-act="close"]');
        await sleep(500);
        const after = await ctxEval((cx, cy) => {
            const describe = e => e ? `${e.tagName}#${e.id}.${String(e.className).slice(0, 50)}` : null;
            const t = document.getElementById('aip_thoughts');
            const hit = document.elementFromPoint(cx, cy);
            const host = document.getElementById('aip_host');
            const b = t.querySelector('.aip-th-newbtn'), cs = getComputedStyle(b);
            return { open: t.classList.contains('aip-open'), hasNew: t.classList.contains('aip-has-new'), hit: describe(hit), hitInExt: !!hit && host.contains(hit),
                btn: { visibility: cs.visibility, opacity: cs.opacity, pe: cs.pointerEvents } };
        }, btn.cx, btn.cy);
        evidence.newBtn = { regens, before: btn, after };
        // вернуть окно мыслей (thoughtsHidden=false) для следующих шагов
        await ctxEval(() => document.getElementById('aip_menu_th').click());
        await sleep(400);
        check(!after.open, 'окно не закрылось');
        check(!after.hitInExt, `в точке кнопки элемент расширения: ${after.hit}`);
        return { before: { hit: btn.hit, at: [Math.round(btn.cx), Math.round(btn.cy)] }, after: { hit: after.hit, hasNew: after.hasNew, btn: after.btn }, regens };
    });

    // ---------- Шаг 15: Claude через реверс-прокси ----------
    let claudeOk = false;
    await step('15a. Профиль «Claude через реверс-прокси»: поля, Тест ✔', async () => {
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await page.click('#aip_profNew');
        await sleep(300);
        await ctxEval(() => { const s = document.getElementById('aip_p_provider'); s.value = 'claude_proxy'; s.dispatchEvent(new Event('change', { bubbles: true })); });
        await sleep(400);
        if (await ctxEval(() => document.getElementById('aip_p_url').value) !== MOCK_URL) {
            await page.click('#aip_p_url', { clickCount: 3 }); await page.keyboard.press('Backspace');
            await page.type('#aip_p_url', MOCK_URL);
        }
        await page.type('#aip_p_proxyPassword', PROXY_PASS);
        await page.click('#aip_p_model', { clickCount: 3 }); await page.keyboard.press('Backspace');
        await page.type('#aip_p_model', CLAUDE_MODEL);
        const ui = await ctxEval(() => {
            const vis = el => { if (!el) return null; const r = el.getBoundingClientRect(); return getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0; };
            const $ = s => document.querySelector(s);
            return {
                providerLabel: $('#aip_p_provider').selectedOptions[0]?.textContent,
                urlVisible: vis($('#aip_urlWrap')), urlLabel: $('#aip_urlLabel').textContent, url: $('#aip_p_url').value,
                keyWrapVisible: vis($('#aip_keyWrap')), keySelectVisible: vis($('#aip_keySelect')), addKeyVisible: vis($('#aip_addKey')),
                passVisible: vis($('#aip_p_proxyPassword')), passType: $('#aip_p_proxyPassword').type,
                noteVisible: vis($('#aip_proxyWrap .aip-note')), note: $('#aip_proxyWrap .aip-note')?.textContent.trim().slice(0, 90),
                models: [...document.querySelectorAll('#aip_models option')].map(o => o.value),
                chip: document.getElementById('aip_chip')?.dataset.state,
            };
        });
        const n0 = readMock().length;
        await page.click('#aip_test');
        await waitFor(() => ctxEval(() => /^[✔✖]/.test(document.getElementById('aip_status').textContent)), 30000, 200, 'результат «Тест»');
        const status = await ctxEval(() => document.getElementById('aip_status').textContent);
        await shot('settings-claude-proxy.png');
        try { await (await page.evaluateHandle(() => document.getElementById('aip_proxyWrap').closest('.aip-card'))).asElement().screenshot({ path: path.join(SCREENS, 'settings-claude-proxy-card.png') }); } catch { /* */ }
        const prof = await aipProfile();
        const test = readMock().slice(n0).filter(r => r.api === 'anthropic');
        await ctxEval(() => document.getElementById('aip_close').click());
        evidence.claudeUi = { ui, status, profile: { ...prof, proxyPassword: prof.proxyPassword ? '<set>' : '' }, testReq: test.map(r => ({ url: r.url, kind: r.kind, xApiKey: r.headers['x-api-key'], auth: r.headers.authorization ?? null })) };
        check(ui.keyWrapVisible === false && ui.keySelectVisible === false, `блок ключей виден: ${JSON.stringify(ui)}`);
        check(ui.passVisible && ui.passType === 'password' && ui.noteVisible, `поле пароля/пояснение не видны: ${JSON.stringify(ui)}`);
        check(ui.urlVisible && ui.url === MOCK_URL, `адрес прокси: ${ui.url}`);
        check(status.startsWith('✔'), `статус: ${status}`);
        check(test.length === 1 && test[0].url === '/v1/messages' && test[0].kind === 'test', `запрос «Тест» к моку: ${JSON.stringify(evidence.claudeUi.testReq)}`);
        check(test[0].headers['x-api-key'] === PROXY_PASS, `x-api-key = ${test[0].headers['x-api-key']}`);
        check(prof.provider === 'claude_proxy' && prof.model === CLAUDE_MODEL && prof.proxyPassword === PROXY_PASS && !prof.secretId, `профиль: ${JSON.stringify(evidence.claudeUi.profile)}`);
        claudeOk = true;
        return { status, urlLabel: ui.urlLabel, note: ui.note, models: ui.models, chip: ui.chip };
    });

    await step('15b. Claude-прокси: ход ▶ и мысль через /v1/messages, x-api-key = пароль, system отдельно', async () => {
        check(claudeOk, 'профиль не настроен (15a)');
        const before = await chatSnap();
        const n0 = readMock().length;
        await page.click('#aip_play');
        await waitFor(async () => { const s = await chatSnap(); return s.len >= before.len + 2 && s.log >= before.log + 1 && !s.busy && !s.aipBusy; }, 60000, 300, 'ход Claude + ответ бота + мысль');
        await sleep(800);
        const fresh = readMock().slice(n0);
        const an = fresh.filter(r => r.api === 'anthropic');
        const turn = an.find(r => r.kind === 'turn'), thought = an.find(r => r.kind === 'thought');
        const bots = fresh.filter(r => r.kind === 'bot');
        const r = await ctxEval(() => {
            const c = SillyTavern.getContext(); const ui = c.chat.findLastIndex(m => m.is_user);
            return { badge: document.querySelector(`#chat .mes[mesid="${ui}"] .aip-badge`)?.textContent, aip: c.chat[ui].extra?.aip, last: c.chatMetadata.aip_log.at(-1)?.playerModel };
        });
        const problems = [];
        if (!turn) problems.push('нет запроса хода в /v1/messages');
        if (!thought) problems.push('нет запроса мысли в /v1/messages');
        for (const q of an) {
            if (q.url !== '/v1/messages') problems.push(`${q.kind}: путь ${q.url}`);
            if (q.headers['x-api-key'] !== PROXY_PASS) problems.push(`${q.kind}: x-api-key=${q.headers['x-api-key']}`);
            if (q.headers.authorization) problems.push(`${q.kind}: лишний Authorization ${mask(q.headers.authorization)}`);
            if (!q.headers['anthropic-version']) problems.push(`${q.kind}: нет anthropic-version`);
            if (q.body?.model !== CLAUDE_MODEL) problems.push(`${q.kind}: модель ${q.body?.model}`);
            const sys = systemText({ system: q.body?.system });
            if (!sys) problems.push(`${q.kind}: поле system пустое`);
            if ((q.body?.messages || []).some(m => m.role === 'system')) problems.push(`${q.kind}: system среди messages`);
            if (q.body?.messages?.[0]?.role !== 'user') problems.push(`${q.kind}: первое сообщение ${q.body?.messages?.[0]?.role}`);
            for (const s of [KEY, KEY2, TAVERN_KEY, PROXY_PASS]) if (q.raw.includes(s)) problems.push(`${q.kind}: секрет в теле`);
        }
        if (turn && !systemText({ system: turn.body.system }).includes('Ты — живой игрок')) problems.push('ход: system не системный промпт агента');
        if (thought && !systemText({ system: thought.body.system }).includes('выйди из роли')) problems.push('мысль: system не промпт «мыслей»');
        if (r.badge !== `🤖 ${CLAUDE_MODEL}`) problems.push(`бейдж: ${r.badge}`);
        if (r.aip?.provider && r.aip.provider !== 'claude_proxy') problems.push(`extra.aip.provider=${r.aip.provider}`);
        if (r.last !== CLAUDE_MODEL) problems.push(`aip_log.playerModel=${r.last}`);
        if (!bots.length || bots.some(b => b.headers.authorization !== `Bearer ${TAVERN_KEY}`)) problems.push(`бот: ${bots.map(b => mask(b.headers.authorization))}`);
        if (fresh.some(r => r.headers['x-api-key'] && r.api !== 'anthropic')) problems.push('пароль прокси ушёл не в /messages');
        evidence.claudeTurn = {
            requests: fresh.map(q => ({ kind: q.kind, url: q.url, api: q.api || 'openai', xApiKey: q.headers['x-api-key'] ?? null, auth: mask(q.headers.authorization ?? null) })),
            turnParams: turn && Object.fromEntries(Object.entries(turn.body).filter(([k]) => !['messages', 'system'].includes(k))),
            turnSystemHead: turn && systemText({ system: turn.body.system }).slice(0, 120),
            turnRoles: turn?.body.messages.map(m => m.role), headers: turn && { 'anthropic-version': turn.headers['anthropic-version'], 'anthropic-beta': turn.headers['anthropic-beta'] },
            badge: r.badge, aip: r.aip,
        };
        try { await (await page.$('#aip_thoughts')).screenshot({ path: path.join(SCREENS, 'thoughts-claude-proxy.png') }); } catch { /* */ }
        if (problems.length) return { ok: false, details: problems };
        return { requests: evidence.claudeTurn.requests.map(q => `${q.kind}@${q.url}${q.xApiKey ? ' x-api-key=' + q.xApiKey : ''}`), badge: r.badge, turnRoles: evidence.claudeTurn.turnRoles };
    });

    await step('15c. Пароль прокси: есть в settings.json тестового каталога, нет в secrets.json', async () => {
        await sleep(2500);   // saveSettingsDebounced
        const setRaw = fs.readFileSync(path.join(USER_DIR, 'settings.json'), 'utf8');
        const set = JSON.parse(setRaw);
        const profs = set.extension_settings?.ai_player?.profiles || [];
        const cp = profs.find(p => p.provider === 'claude_proxy');
        const secRaw = readSecretsRaw();
        evidence.proxyPass = { inSettings: setRaw.includes(PROXY_PASS), profileField: cp ? 'proxyPassword' : null, inSecrets: secRaw.includes(PROXY_PASS),
            settingsHasKeys: [KEY, KEY2, TAVERN_KEY].some(k => setRaw.includes(k)) };
        check(cp?.proxyPassword === PROXY_PASS, 'пароля нет в профиле settings.json');
        check(!secRaw.includes(PROXY_PASS), 'пароль прокси попал в secrets.json');
        check(!evidence.proxyPass.settingsHasKeys, 'API-ключ в settings.json!');
        return evidence.proxyPass;
    });

    await step('15d. Claude-прокси с пустым паролем (подсказка «пусто, если пароль не нужен»)', async () => {
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await page.click('#aip_p_proxyPassword', { clickCount: 3 }); await page.keyboard.press('Backspace');
        await sleep(200);
        const n0 = readMock().length;
        await ctxEval(() => { document.getElementById('aip_status').textContent = ''; });
        await page.click('#aip_test');
        await waitFor(() => ctxEval(() => /^[✔✖]/.test(document.getElementById('aip_status').textContent)), 30000, 200, 'результат «Тест»');
        const status = await ctxEval(() => document.getElementById('aip_status').textContent);
        const sent = readMock().slice(n0).filter(r => r.api === 'anthropic').length;
        const placeholder = await ctxEval(() => document.getElementById('aip_p_proxyPassword').placeholder);
        await shot('settings-claude-proxy-nopass.png');
        // вернуть пароль
        await page.type('#aip_p_proxyPassword', PROXY_PASS);
        await sleep(200);
        const restored = (await aipProfile()).proxyPassword === PROXY_PASS;
        await ctxEval(() => document.getElementById('aip_close').click());
        const stLogTail = fs.readFileSync(path.join(OUT, 'st-server.log'), 'utf8').split('\n').filter(l => /Claude API key is missing/.test(l)).slice(-1)[0] || null;
        evidence.emptyProxyPass = { status, requestsToProxy: sent, placeholder, stLog: stLogTail };
        check(restored, 'пароль не восстановлен');
        if (status.startsWith('✔')) return { status };
        // ST 1.19 sendClaudeRequest: apiKey = proxy_password; if (!apiKey) → 400 «Claude API key is missing» — до прокси не доходит
        return { known: true, details: `БАГ: при пустом пароле прокси «Тест» → ${status}; запросов к прокси: ${sent}; лог ST: ${stLogTail}` };
    });

    // ---------- Шаг 16: ▶ без открытого чата ----------
    await step('16. ▶ без открытого чата → предупреждение, 0 запросов к моку, новый чат не создан', async () => {
        const listChats = () => fs.readdirSync(path.join(USER_DIR, 'chats'), { recursive: true }).map(String).sort();
        await stMenu('option_close_chat');
        await waitFor(() => ctxEval(() => { const c = SillyTavern.getContext(); return c.getCurrentChatId() === undefined && c.characterId === undefined; }), 15000, 250, 'чат закрыт');
        await sleep(1500);
        const chats0 = listChats(), n0 = readMock().length, g0 = stReqs.filter(r => r.url.includes('/generate')).length;
        const st0 = await ctxEval(() => { const c = SillyTavern.getContext(); return { chatId: c.getCurrentChatId() ?? null, characterId: c.characterId ?? null, name2: c.name2, chatLen: c.chat.length }; });
        await ctxEval(() => toastr.clear());
        await sleep(300);
        // все тосты за время проверки (они исчезают сами через несколько секунд)
        await ctxEval(() => {
            window.__e2eToasts = [];
            window.__e2eToastObs?.disconnect();
            window.__e2eToastObs = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('toast')) window.__e2eToasts.push({ cls: n.className, text: n.textContent.trim() }); });
            window.__e2eToastObs.observe(document.body, { childList: true, subtree: true });
        });
        const c0 = consoleLog.length, pe0 = pageErrors.length;
        const playVisible = await ctxEval(() => { const b = document.getElementById('aip_play'); const r = b.getBoundingClientRect(); return getComputedStyle(b).display !== 'none' && r.width > 0; });
        let clickedVia = 'mouse';
        try { await page.click('#aip_play'); } catch { clickedVia = 'js'; await ctxEval(() => document.getElementById('aip_play').click()); }
        await sleep(1200);
        await shot('no-chat-warning.png');
        await sleep(3800);
        const toasts = await ctxEval(() => { window.__e2eToastObs.disconnect(); return window.__e2eToasts; });
        const st1 = await ctxEval(() => { const c = SillyTavern.getContext(); return { chatId: c.getCurrentChatId() ?? null, characterId: c.characterId ?? null, name2: c.name2, chatLen: c.chat.length, input: document.getElementById('send_textarea').value }; });
        const chats1 = listChats(), fresh = readMock().slice(n0), g1 = stReqs.filter(r => r.url.includes('/generate')).length;
        const modalOpen = await ctxEval(() => document.getElementById('aip_overlay').classList.contains('aip-open'));
        evidence.noChat = { st0, st1, toasts, playVisible, clickedVia,
            console: consoleLog.slice(c0).filter(m => m.type !== 'debug').map(m => `${m.type}: ${m.text.slice(0, 200)}`).slice(0, 30), pageErrors: pageErrors.slice(pe0), newMockRequests: fresh.map(r => `${r.kind} ${r.url}`), newChatFiles: chats1.filter(f => !chats0.includes(f)), browserGenerate: g1 - g0, modalOpen };
        const warn = toasts.find(t => /warning/.test(t.cls) && /Откройте чат/.test(t.text));
        check(warn, `нет предупреждения: ${JSON.stringify(toasts)}`);
        check(!fresh.length, `к моку ушли запросы: ${evidence.noChat.newMockRequests}`);
        check(g1 === g0, 'браузер отправил generate');
        check(!evidence.noChat.newChatFiles.length, `создан чат: ${evidence.noChat.newChatFiles}`);
        check(st1.chatId === null && st1.characterId === null, `открылся чат: ${JSON.stringify(st1)}`);
        check(!st1.input, 'ход оставлен в поле ввода');
        return { toast: warn.text, mockRequests: 0, newChats: 0, state: st1 };
    });

    evidence.console = {
        errors: consoleLog.filter(m => m.type === 'error').map(m => m.text),
        warnings: consoleLog.filter(m => m.type === 'warning' && /AI Player/.test(m.text)).map(m => m.text),
        aip: consoleLog.filter(m => /AI Player/.test(m.text)).map(m => m.text),
        pageErrors, dialogs,
    };
} catch (e) {
    record('инфраструктура', false, e?.stack || String(e));
} finally {
    try { await browser?.close(); } catch { /* */ }
    st.kill();
    await new Promise(r => mock.close(r));
    const rep = { when: new Date().toISOString(), failed, results, evidence };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 2));
    console.log(`\nИтого: ${results.length - failed}/${results.length} шагов прошли. Отчёт: ${path.join(OUT, 'report.json')}`);
    await sleep(500);
    process.exit(failed ? 1 : 0);
}
