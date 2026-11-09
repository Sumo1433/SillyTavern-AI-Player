// Сквозной E2E-тест расширения AI Player на настоящей SillyTavern.
// Запуск: cd tests/e2e && npm install && node run-e2e.mjs
// Переменные окружения: ST_DIR (по умолчанию C:\Projects\SillyTavern), BROWSER (путь к Edge/Chrome), HEADFUL=1,
//   EXT_SRC (папка с index.js/style.css/manifest.json другой версии расширения).
// Фаза A (без серверного плагина, «общий режим»): шаги 1–17 — базовый сценарий, утечка ключа (12a/12b),
//   профиль без своего ключа (12c), перегенерации и привязка впечатлений (13–13c), прокрутка (14–14b),
//   Claude через реверс-прокси (15a–15d), ▶ без чата (16), язык (17).
// Фаза B (с плагином server-plugin → SillyTavern/plugins/ai-player, enableServerPlugins: true):
//   P1-* — хранилище плагина, миграция, очистка общих копий, ошибки, перезапуск, два пользователя;
//   P2/P3 — записи игрока (устаревший результат, переполнение); P4-* — впечатления (свайп, повтор).
// Статусы: PASS, FAIL, KNOWN (подтверждённый известный дефект — не засчитывается как пройденный, прогон
//   не валит), SKIP (не проверялось, причина в деталях). Итоги раздельно — в консоли и report.json.
// Пользовательские data/ и config.yaml ST не трогаются: отдельный --dataRoot и --configPath в .tmp-data.
// Папка плагина SillyTavern/plugins/ai-player: если её не было — создаётся на время прогона и удаляется;
//   если была и отличается — сохраняется копия и в конце возвращается.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startMock, systemText, addRule, clearRules, mockCtl, MEMORY_TEXT } from './mock-server.mjs';

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
const KEY_V = 'sk-e2e-VAULT-1111222233334444';        // ключ, добавленный при установленном плагине
const KEY_V_LABEL = 'E2E ключ плагина';
const KEY_TMP = 'sk-e2e-VAULTTMP-5555666677778888';   // ключ временного профиля (удаляется вместе с профилем)
const KEY_ACT = 'sk-e2e-ACTIVECOPY-999900001111';     // общая копия AI Player, выбранная активной в самой таверне
const KEY_U2 = 'sk-e2e-USER2-aaaa0000bbbb1111';       // ключ второго пользователя ST
const ALL_SECRETS = [KEY, KEY2, TAVERN_KEY, PROXY_PASS, KEY_V, KEY_TMP, KEY_ACT, KEY_U2];
const CLAUDE_MODEL = 'claude-sonnet-5';
const PLACEHOLDER_RE = /^Пусто — заглушка AI Player/;
const PLUGIN_SRC = path.join(EXT_SRC, 'server-plugin');
const PLUGIN_DST = path.join(ST_DIR, 'plugins', 'ai-player');
const KEYS_FILE = path.join(USER_DIR, 'ai-player', 'keys.json');
const SECRETS_FILE = path.join(USER_DIR, 'secrets.json');
const CONFIG_FILE = path.join(TMP, 'config.yaml');
const BROWSERS = [
    process.env.BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const evidence = {};
const counts = { PASS: 0, FAIL: 0, KNOWN: 0, SKIP: 0 };
// значения ключей/паролей в выводе и отчёте заменяются метками
const maskAll = s => { let t = String(s ?? ''); for (const [i, k] of ALL_SECRETS.entries()) t = t.replaceAll(k, `<SECRET${i}>`); return t; };

// status: 'PASS' | 'FAIL' | 'KNOWN' (подтверждённый известный дефект, не засчитывается как пройденный) | 'SKIP'
function record(step, status, details) {
    const d = details == null ? details : JSON.parse(maskAll(JSON.stringify(details)));
    results.push({ step, status, details: d });
    counts[status]++;
    console.log(`${status.padEnd(5)} ${step}${d ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)) : ''}`);
}
async function step(name, fn) {
    try {
        const r = await fn();
        if (r && r.ok === false) record(name, 'FAIL', r.details);
        else if (r && r.known) record(name, 'KNOWN', r.details);
        else if (r && r.skip) record(name, 'SKIP', r.details);
        else record(name, 'PASS', r?.details ?? r);
    } catch (e) {
        record(name, 'FAIL', e?.stack?.split('\n').slice(0, 3).join(' | ') || String(e));
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
        try { last = await fn(); if (last) return last; } catch (e) { if (e?.fatal) throw e; last = e; }
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

// тестовый config.yaml — копия стандартного; плагины выключены (фаза A), автообновление плагинов через git — нет
fs.copyFileSync(path.join(ST_DIR, 'default', 'config.yaml'), CONFIG_FILE);
function patchConfig(patch) {
    let t = fs.readFileSync(CONFIG_FILE, 'utf8');
    for (const [k, v] of Object.entries(patch)) {
        const re = new RegExp(`^(${k}):.*$`, 'm');
        t = re.test(t) ? t.replace(re, `$1: ${v}`) : `${t}\n${k}: ${v}\n`;
    }
    fs.writeFileSync(CONFIG_FILE, t);
}
patchConfig({ enableServerPlugins: false, enableServerPluginsAutoUpdate: false, enableUserAccounts: false });

// папка плагина в ST: запоминаем, была ли она до прогона
const pluginPreexisted = fs.existsSync(PLUGIN_DST);
let pluginBackup = null, pluginInstalled = false;
const dirSig = d => fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).map(String).sort()
    .map(f => { const p = path.join(d, f); return fs.statSync(p).isFile() ? `${f}:${fs.readFileSync(p, 'utf8')}` : f; }).join('\n') : null;
function installPlugin() {
    if (pluginPreexisted && dirSig(PLUGIN_DST) !== dirSig(PLUGIN_SRC)) {
        pluginBackup = path.join(OUT, 'plugin-backup');
        fs.cpSync(PLUGIN_DST, pluginBackup, { recursive: true });
        fs.rmSync(PLUGIN_DST, { recursive: true, force: true });
    }
    if (!fs.existsSync(PLUGIN_DST)) fs.cpSync(PLUGIN_SRC, PLUGIN_DST, { recursive: true });
    pluginInstalled = true;
}
function uninstallPlugin() {
    if (!pluginInstalled) return;
    if (!pluginPreexisted) fs.rmSync(PLUGIN_DST, { recursive: true, force: true });
    else if (pluginBackup) { fs.rmSync(PLUGIN_DST, { recursive: true, force: true }); fs.cpSync(pluginBackup, PLUGIN_DST, { recursive: true }); }
}

const stLog = fs.createWriteStream(path.join(OUT, 'st-server.log'));
let st = null, stExited = true;
async function startST() {
    const proc = spawn(process.execPath, [
        'server.js',
        '--configPath', CONFIG_FILE,
        '--dataRoot', TMP,
        '--port', String(ST_PORT),
        '--listen', 'false',
        '--browserLaunchEnabled', 'false',
    ], { cwd: ST_DIR, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0' } });
    stLog.write(`\n===== старт ST ${new Date().toISOString()} =====\n`);
    proc.stdout.pipe(stLog, { end: false }); proc.stderr.pipe(stLog, { end: false });
    stExited = false;
    proc.on('exit', c => { if (proc === st) stExited = true; console.log(`ST завершилась (код ${c})`); });
    st = proc;
    await waitFor(async () => {
        if (stExited) throw Object.assign(new Error('ST упала, см. .tmp-data/_e2e/st-server.log'), { fatal: true });
        // с enableUserAccounts «/» перенаправляет на страницу входа — достаточно, что сервер отвечает
        const r = await fetch(BASE, { redirect: 'manual' }); return r.status > 0 && r.status < 500;
    }, 120000, 500, 'старт ST');
}
async function stopST() {
    if (!st || stExited) return;
    const done = new Promise(r => st.once('exit', r));
    st.kill();
    await Promise.race([done, sleep(15000)]);
    await sleep(800);
}

let browser;
try {
    await startST();
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
    // (0.5.1: точка входа index.js + ES-модули src/*.js; prompts/ и server-plugin/ — как в установленной копии)
    fs.mkdirSync(EXT_DST, { recursive: true });
    for (const f of ['index.js', 'style.css', 'manifest.json']) fs.copyFileSync(path.join(EXT_SRC, f), path.join(EXT_DST, f));
    for (const d of ['src', 'prompts', 'server-plugin']) if (fs.existsSync(path.join(EXT_SRC, d))) fs.cpSync(path.join(EXT_SRC, d), path.join(EXT_DST, d), { recursive: true });
    check(fs.existsSync(path.join(EXT_DST, 'src', 'core.js')), 'src/ не скопирована в папку расширения');

    // ---------- браузер ----------
    const exe = BROWSERS.find(p => fs.existsSync(p));
    check(exe, 'не найден Edge/Chrome');
    browser = await puppeteer.launch({
        executablePath: exe, headless: process.env.HEADFUL ? false : true,
        args: ['--no-first-run', '--no-default-browser-check', '--lang=ru-RU', '--window-size=1366,900'],
        defaultViewport: { width: 1366, height: 900 },
    });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { if (!localStorage.getItem('language')) localStorage.setItem('language', 'ru-ru'); });
    const UA0 = await browser.userAgent();
    const consoleLog = [], pageErrors = [], dialogs = [], stReqs = [];
    page.on('console', m => consoleLog.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', e => pageErrors.push(String(e?.stack || e)));
    page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
    page.on('request', r => {
        const u = r.url();
        if (/\/api\/(backends\/chat-completions\/(generate|status)|secrets\/|plugins\/ai-player\/)/.test(u)) stReqs.push({ ts: Date.now(), url: u.replace(BASE, '/'), body: r.postData() || '' });
    });
    // ответы плагина браузеру: проверка, что значения ключей в браузер не приходят
    const pluginResps = [];
    page.on('response', async r => {
        const u = r.url();
        if (/\/api\/plugins\/ai-player\//.test(u)) { try { pluginResps.push({ url: u.replace(BASE, '/'), status: r.status(), text: await r.text() }); } catch { /* */ } }
    });
    page.setDefaultTimeout(30000);

    const ctxEval = (fn, ...a) => page.evaluate(fn, ...a);
    // все тосты страницы (исчезают сами через несколько секунд) — копим с отметкой порядка
    const installToastSpy = () => ctxEval(() => {
        window.__e2eToasts = [];
        window.__e2eToastObs?.disconnect();
        window.__e2eToastObs = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('toast')) window.__e2eToasts.push({ cls: n.className, text: n.textContent.trim() }); });
        window.__e2eToastObs.observe(document.body, { childList: true, subtree: true });
    });
    const toastMark = () => ctxEval(() => (window.__e2eToasts || []).length);
    const toastsFrom = mark => ctxEval(m => (window.__e2eToasts || []).slice(m), mark);
    const loadST = async () => {
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction(() => window.SillyTavern?.getContext && document.getElementById('aip_play')
            && document.getElementById('aip_overlay') && !document.getElementById('preloader'), { timeout: 120000 });
        await installToastSpy();
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

    // режим хранения ключей в окне (#aip_storeMode[data-mode]) — проверка после открытия окна
    async function storeMode() {
        await waitFor(() => ctxEval(() => document.getElementById('aip_storeMode').dataset.mode !== 'unknown'), 10000, 200, 'режим хранения определён');
        return ctxEval(() => { const b = document.getElementById('aip_storeMode'); const r = b.getBoundingClientRect(); return { mode: b.dataset.mode, text: b.textContent.trim(), visible: r.height > 0 }; });
    }
    await step('5b. Без плагина: пометка «общий режим» (data-mode=legacy) с инструкцией по установке', async () => {
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        const m = await storeMode();
        try { await (await page.$('#aip_storeMode')).screenshot({ path: path.join(SCREENS, 'store-mode-legacy.png') }); } catch { /* */ }
        const migrateVisible = await ctxEval(() => !document.getElementById('aip_keyMigrate').classList.contains('aip-hidden'));
        await ctxEval(() => document.getElementById('aip_close').click());
        evidence.storeLegacy = m;
        check(m.mode === 'legacy' && m.visible, `режим: ${JSON.stringify(m)}`);
        check(/не установлен/.test(m.text) && /secrets\.json/.test(m.text) && /enableServerPlugins/.test(m.text), `текст пометки: ${m.text}`);
        check(!migrateVisible, 'кнопка переноса видна без плагина');
        return { mode: m.mode, text: m.text.slice(0, 90) + '…' };
    });

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
    const mask = maskAll;
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
        // с 0.5.1 ключ основного подключения таверны профилю не предлагается (запасным не используется)
        check(!options.some(o => /таверн|^↪/i.test(o)), `в списке предлагается ключ таверны: ${options}`);
        check(options.length === 2, `в списке не только ключи расширения: ${options}`);
        check(!options.join().includes(KEY2) && !options.join().includes(TAVERN_KEY), 'полный ключ в списке');
        return { secrets: evidence.leak2.secrets, options };
    });

    // ---------- Шаг 12c: профиль без своего ключа ----------
    const chatLen = () => ctxEval(() => SillyTavern.getContext().chat.length);
    const genCount = () => stReqs.filter(r => /\/generate$/.test(r.url)).length;
    const selectProfile = id => ctxEval(id => { const s = document.getElementById('aip_profile'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); }, id);
    const selectKey = id => ctxEval(id => { const s = document.getElementById('aip_keySelect'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); }, id);
    let profile1Id = null, profile3Id = null;
    await step('12c. Профиль без своего ключа: ▶ и «Тест» не отправляют запросов (ключ таверны как запасной не используется)', async () => {
        const p1 = await aipProfile();
        profile1Id = p1.id;
        check(customSlots().find(x => x.value === TAVERN_KEY)?.active, 'у таверны нет активного ключа — сценарий не имеет смысла');
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await page.click('#aip_profNew');
        await sleep(600);
        const p3 = await aipProfile();
        check(p3.id !== p1.id && !p3.secretId && !p3.keyId && p3.model === 'mock-player', `новый профиль: ${JSON.stringify(p3)}`);
        profile3Id = p3.id;
        await ctxEval(() => document.getElementById('aip_close').click());
        const n0 = readMock().length, g0 = genCount(), len0 = await chatLen(), mark = await toastMark();
        await page.click('#aip_play');
        await sleep(2500);
        const toasts = await toastsFrom(mark);
        const modalOpened = await ctxEval(() => document.getElementById('aip_overlay').classList.contains('aip-open'));
        if (!modalOpened) await openSettingsViaMenu();
        await ctxEval(() => { document.getElementById('aip_status').textContent = ''; });
        await page.click('#aip_test');
        await waitFor(() => ctxEval(() => /^[✔✖]/.test(document.getElementById('aip_status').textContent)), 20000, 200, 'результат «Тест»');
        const status = await ctxEval(() => document.getElementById('aip_status').textContent);
        const keyState = await ctxEval(() => document.getElementById('aip_keyState').textContent);
        const adoptShown = await ctxEval(() => !document.getElementById('aip_keyAdopt').classList.contains('aip-hidden'));
        const fresh = readMock().slice(n0), g1 = genCount(), len1 = await chatLen();
        // профилю 3 даём старый первый ключ расширения — он понадобится в фазе B (копия, выбранная в профиле без переноса)
        const k1 = customSlots().find(x => x.value === KEY);
        await selectKey(k1.id);
        await sleep(500);
        const p3b = await aipProfile();
        await selectProfile(p1.id);
        await sleep(500);
        await ctxEval(() => document.getElementById('aip_close').click());
        evidence.noOwnKey = { toasts, status, keyState, modalOpened, fresh: fresh.map(r => r.kind), browserGenerate: g1 - g0, p3secret: p3b.secretId === k1.id };
        const warn = toasts.find(t => /warning/.test(t.cls) && /Сохраните API-ключ/.test(t.text));
        check(!fresh.length, `к моку ушли запросы: ${fresh.map(r => `${r.kind} ${mask(r.headers.authorization)}`)}`);
        check(g1 === g0, 'браузер отправил generate');
        check(len1 === len0, 'в чат что-то добавилось');
        check(warn, `нет предупреждения «Сохраните API-ключ»: ${JSON.stringify(toasts)}`);
        check(status.startsWith('✖') && /ключ/i.test(status), `«Тест»: ${status}`);
        check(/Сам AI Player ключ основного подключения таверны не берёт/i.test(keyState), `пояснение у ключа: ${keyState}`);
        // 0.5.2: у таверны есть свой ключ — профилю предлагается явно взять его (без нажатия ничего не меняется)
        check(adoptShown && /Взять ключ из подключения таверны/.test(keyState), `нет кнопки «Взять ключ из подключения таверны»: ${keyState}`);
        check(p3b.secretId === k1.id, 'профилю 3 не назначен старый ключ');
        return { toast: warn.text, test: status, mockRequests: 0 };
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

    // ---------- Шаг 13b: несколько перегенераций подряд ----------
    const lastBotState = () => ctxEval(() => {
        const no = t => { const m = [...String(t).matchAll(/ответ №(\d+)/g)]; return m.length ? Number(m.at(-1)[1]) : null; };
        const c = SillyTavern.getContext(); const idx = c.chat.length - 1; const m = c.chat[idx];
        const log = c.chatMetadata.aip_log || [];
        return { idx, sendDate: m.send_date, isUser: m.is_user, swipeId: m.swipe_id ?? 0, swipes: m.swipes?.length ?? 1, no: no(m.mes),
            entries: log.filter(e => e.mesId === idx).map(e => ({ sameDate: e.sendDate === m.send_date, swipeId: e.swipeId ?? 0, no: no(e.text) })),
            log: log.length, items: document.querySelectorAll('#aip_thoughts .aip-th-item').length };
    });
    await step('13b. Три перегенерации подряд: каждая → одно впечатление о своей версии, прежние убираются', async () => {
        const n0 = readMock().length;
        const rounds = [];
        for (let i = 0; i < 3; i++) {
            const before = await lastBotState();
            await stMenu('option_regenerate');
            await waitFor(async () => {
                const s = await lastBotState();
                return s.sendDate !== before.sendDate && !s.isUser && s.entries.some(e => e.sameDate) && await isIdle();
            }, 60000, 300, `впечатление после перегенерации ${i + 1}`);
            await sleep(1000);
            rounds.push(await lastBotState());
        }
        const fresh = readMock().slice(n0);
        evidence.regen3 = { rounds, fresh: fresh.map(r => `${r.kind}${r.botNo ? '#' + r.botNo : ''}${r.aboutNo ? '→' + r.aboutNo : ''}`) };
        try { await (await page.$('#aip_thoughts')).screenshot({ path: path.join(SCREENS, 'thoughts-regenerate-x3.png') }); } catch { /* */ }
        const bad = rounds.filter(r => r.entries.length !== 1 || !r.entries[0].sameDate || r.entries[0].no !== r.no || r.items !== r.log);
        check(!fresh.some(r => r.kind === 'turn'), 'при перегенерации агент сделал ход');
        check(fresh.filter(r => r.kind === 'thought').length === 3, `запросов впечатлений: ${fresh.filter(r => r.kind === 'thought').length}`);
        check(new Set(rounds.map(r => r.no)).size === 3, `версии ответа не различаются: ${rounds.map(r => r.no)}`);
        if (bad.length) return { ok: false, details: { bad, rounds } };
        return rounds.map(r => `#${r.idx}: ответ №${r.no} → впечатление о №${r.entries[0].no}; в журнале ${r.log}, в окне ${r.items}`);
    });

    // ---------- Шаг 13c: привязка впечатлений: журнал, окно, экспорт ----------
    // Каждое впечатление в журнале должно относиться к существующей версии ответа (сообщение, свайп, дата),
    // и мок называет номер ответа, о котором его спросили, — номер должен совпасть с текстом этой версии.
    const bindingReport = () => ctxEval(() => {
        const no = t => { const m = [...String(t).matchAll(/ответ №(\d+)/g)]; return m.length ? Number(m.at(-1)[1]) : null; };
        const c = SillyTavern.getContext(), cid = c.getCurrentChatId();
        const log = c.chatMetadata.aip_log || [];
        const problems = [];
        const rows = log.map(e => {
            const m = c.chat[e.mesId], sw = e.swipeId ?? 0;
            const text = m ? (Array.isArray(m.swipes) ? m.swipes[sw] : sw === 0 ? m.mes : undefined) : undefined;
            const date = m ? (m.swipe_info?.[sw]?.send_date ?? (sw === (m.swipe_id ?? 0) ? m.send_date : undefined)) : undefined;
            const row = { mesId: e.mesId, swipeId: sw, aboutNo: no(e.text), versionNo: no(text), dateOk: e.sendDate === date };
            if (!m || m.is_user || m.is_system) problems.push(`#${e.mesId}: сообщения нет / не бот`);
            else if (text === undefined) problems.push(`#${e.mesId} свайп ${sw}: такой версии нет`);
            else if (row.aboutNo !== row.versionNo) problems.push(`#${e.mesId} свайп ${sw}: впечатление о ответе №${row.aboutNo}, а версия — №${row.versionNo}`);
            if (m && !row.dateOk) problems.push(`#${e.mesId} свайп ${sw}: дата записи не совпадает с датой версии`);
            if (e.chatId && e.chatId !== cid) problems.push(`#${e.mesId}: из другого чата`);
            return row;
        });
        const items = [...document.querySelectorAll('#aip_thoughts .aip-th-item')].map(n => ({ id: n.querySelector('.aip-th-id')?.textContent, about: no(n.textContent) }));
        if (items.length !== log.length) problems.push(`в окне ${items.length} карточек, в журнале ${log.length}`);
        items.forEach((it, i) => { if (log[i] && it.about !== no(log[i].text)) problems.push(`карточка ${i}: о №${it.about}, запись журнала о №${no(log[i].text)}`); });
        return { problems, rows, items: items.length, log: log.length };
    });
    const exportReport = () => ctxEval(async () => {
        const no = t => { const m = [...String(t).matchAll(/ответ №(\d+)/g)]; return m.length ? Number(m.at(-1)[1]) : null; };
        let blob = null;
        const origUrl = URL.createObjectURL, origClick = HTMLAnchorElement.prototype.click;
        URL.createObjectURL = b => { blob = b; return 'blob:e2e-export'; };
        HTMLAnchorElement.prototype.click = function () { /* не скачивать */ };
        try { document.getElementById('aip_expJSON').click(); } finally { URL.createObjectURL = origUrl; HTMLAnchorElement.prototype.click = origClick; }
        if (!blob) return { error: 'экспорт не создал файл' };
        const d = JSON.parse(await blob.text());
        const c = SillyTavern.getContext();
        const problems = [];
        let total = 0;
        for (const t of d.turns) {
            for (const r of t.reactions) {
                total++;
                const m = c.chat[t.index];
                const text = m?.swipes?.[r.swipe ?? 0] ?? (r.swipe ? undefined : m?.mes);
                if (no(r.text) !== no(text)) problems.push(`экспорт #${t.index} свайп ${r.swipe}: впечатление о №${no(r.text)}, версия №${no(text)}`);
            }
        }
        const log = (c.chatMetadata.aip_log || []).length;
        if (total !== log) problems.push(`в экспорте впечатлений ${total}, в журнале ${log}`);
        if (/sk-e2e|secret_id|keyId/.test(JSON.stringify(d))) problems.push('в экспорте ключ/secret_id/keyId');
        return { problems, total, log };
    });
    await step('13c. Привязка: в журнале, окне и экспорте .json — только впечатления о существующих версиях ответа', async () => {
        const b = await bindingReport();
        const x = await exportReport();
        evidence.binding = { journal: b, export: x };
        const problems = [...b.problems, ...(x.problems || [x.error])];
        if (problems.length) return { ok: false, details: problems };
        return { journal: b.log, window: b.items, export: x.total };
    });

    // ---------- Шаг 14: кнопка «Новая мысль» не ловит клики в закрытом окне ----------
    await step('14. «Новая мысль»: после закрытия окна elementFromPoint в точке кнопки — не элемент расширения', async () => {
        // Независимые ходы сохраняют отдельные впечатления: перегенерация может удалить старые карточки.
        async function addTurnForScroll() {
            const before = await thoughtsState();
            await page.click('#aip_play');
            await waitFor(async () => { const after = await thoughtsState(); return after.log > before.log && await isIdle(); }, 60000, 300, 'новый ход для прокрутки');
            await sleep(600);
        }
        let st = await thoughtsState(), regens = 0;
        while (st.scrollable < 80 && regens < 4) { await addTurnForScroll(); regens++; st = await thoughtsState(); }
        check(st.scrollable >= 80, `окно мыслей не прокручивается (${st.scrollable}px)`);
        await ctxEval(() => { const b = document.querySelector('#aip_thoughts .aip-th-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); });
        await sleep(300);
        await addTurnForScroll(); regens++;
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

    // ---------- Шаг 14b: прокрутка окна впечатлений ----------
    await step('14b. Прокрутка окна впечатлений: внизу — автопрокрутка к новому; листаешь вверх — позиция не сбивается; «Новое впечатление» → вниз', async () => {
        const scrollInfo = () => ctxEval(() => { const t = document.getElementById('aip_thoughts'), b = t.querySelector('.aip-th-body');
            return { open: t.classList.contains('aip-open'), top: Math.round(b.scrollTop), gap: Math.round(b.scrollHeight - b.scrollTop - b.clientHeight), scrollable: b.scrollHeight - b.clientHeight, hasNew: t.classList.contains('aip-has-new'), items: t.querySelectorAll('.aip-th-item').length }; });
        const turnAndWait = async what => {
            const before = await thoughtsState();
            await page.click('#aip_play');
            await waitFor(async () => { const a = await thoughtsState(); return a.log > before.log && await isIdle(); }, 60000, 300, what);
            await sleep(900);
        };
        await ctxEval(() => { const t = document.getElementById('aip_thoughts'); if (!t.classList.contains('aip-open')) document.getElementById('aip_menu_th').click(); });
        await sleep(400);
        // 1) пользователь внизу → новое впечатление прокручивается в видимую область
        await ctxEval(() => { const b = document.querySelector('#aip_thoughts .aip-th-body'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); });
        await sleep(300);
        await turnAndWait('впечатление (окно внизу)');
        const atBottom = await scrollInfo();
        // 2) пользователь листает старое → позиция сохраняется, появляется кнопка
        await ctxEval(() => { const b = document.querySelector('#aip_thoughts .aip-th-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); });
        await sleep(300);
        await turnAndWait('впечатление (окно прокручено вверх)');
        const scrolledUp = await scrollInfo();
        // 3) кнопка «Новое впечатление» прокручивает к последнему
        let clicked = true;
        try { await page.click('#aip_thoughts .aip-th-newbtn'); } catch { clicked = false; }
        await sleep(600);
        const afterBtn = await scrollInfo();
        evidence.thoughtsScroll = { atBottom, scrolledUp, afterBtn, clicked };
        check(atBottom.scrollable > 0, `окно не прокручивается (${atBottom.scrollable}px)`);
        check(atBottom.gap < 40 && !atBottom.hasNew, `окно внизу не прокрутилось к новому: ${JSON.stringify(atBottom)}`);
        check(scrolledUp.top < 40 && scrolledUp.hasNew, `позиция сбита или нет кнопки: ${JSON.stringify(scrolledUp)}`);
        check(clicked && afterBtn.gap < 40 && !afterBtn.hasNew, `кнопка не прокрутила вниз: ${JSON.stringify(afterBtn)}`);
        return { atBottom: `gap ${atBottom.gap}px`, scrolledUp: `top ${scrolledUp.top}px, кнопка ${scrolledUp.hasNew}`, afterBtn: `gap ${afterBtn.gap}px` };
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
        if (turn && !systemText({ system: turn.body.system }).includes('You are a player')) problems.push('ход: system не системный промпт агента');
        if (thought && !systemText({ system: thought.body.system }).includes('Step out of character')) problems.push('мысль: system не промпт «мыслей»');
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

    // Ожидаемое поведение (ST 1.19 не отправляет запрос к Claude-прокси без пароля): пустой пароль
    // отклоняется расширением ДО запроса, с понятным сообщением; к прокси ничего не уходит.
    await step('15d. Claude-прокси с пустым паролем: отклонён до запроса, к прокси ничего не ушло, сообщение понятно', async () => {
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await page.click('#aip_p_proxyPassword', { clickCount: 3 }); await page.keyboard.press('Backspace');
        await sleep(300);
        const emptied = (await aipProfile()).proxyPassword === '';
        const n0 = readMock().length, g0 = genCount(), len0 = await chatLen();
        await ctxEval(() => { document.getElementById('aip_status').textContent = ''; });
        await page.click('#aip_test');
        await waitFor(() => ctxEval(() => /^[✔✖]/.test(document.getElementById('aip_status').textContent)), 30000, 200, 'результат «Тест»');
        const status = await ctxEval(() => document.getElementById('aip_status').textContent);
        const placeholder = await ctxEval(() => document.getElementById('aip_p_proxyPassword').placeholder);
        await shot('settings-claude-proxy-nopass.png');
        // ▶ с пустым паролем
        await ctxEval(() => document.getElementById('aip_close').click());
        const mark = await toastMark();
        await page.click('#aip_play');
        await sleep(2500);
        const toasts = await toastsFrom(mark);
        const fresh = readMock().slice(n0), g1 = genCount(), len1 = await chatLen();
        // вернуть пароль
        if (!(await ctxEval(() => document.getElementById('aip_overlay').classList.contains('aip-open')))) await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        await page.click('#aip_p_proxyPassword', { clickCount: 3 }); await page.keyboard.press('Backspace');
        await page.type('#aip_p_proxyPassword', PROXY_PASS);
        await sleep(300);
        const restored = (await aipProfile()).proxyPassword === PROXY_PASS;
        await ctxEval(() => document.getElementById('aip_close').click());
        const warn = toasts.find(t => /warning|error/.test(t.cls) && /парол/i.test(t.text));
        evidence.emptyProxyPass = { status, placeholder, toasts, requests: fresh.map(r => `${r.kind} ${r.url}`), browserGenerate: g1 - g0 };
        check(emptied, 'пароль в профиле не очистился');
        check(!fresh.length, `к прокси/моку ушли запросы: ${evidence.emptyProxyPass.requests}`);
        check(g1 === g0, 'браузер отправил generate');
        check(len1 === len0, 'в чат что-то добавилось');
        check(status.startsWith('✖') && /парол|ключ/i.test(status), `«Тест» не отклонил пустой пароль понятно: ${status}`);
        check(warn, `▶: нет понятного предупреждения о пароле: ${JSON.stringify(toasts)}`);
        check(/обязателен|любой символ/.test(placeholder), `подсказка поля: ${placeholder}`);
        check(restored, 'пароль не восстановлен');
        return { test: status, play: warn.text, placeholder, requestsToProxy: 0 };
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
        const tmark = await toastMark();
        const c0 = consoleLog.length, pe0 = pageErrors.length;
        const playVisible = await ctxEval(() => { const b = document.getElementById('aip_play'); const r = b.getBoundingClientRect(); return getComputedStyle(b).display !== 'none' && r.width > 0; });
        let clickedVia = 'mouse';
        try { await page.click('#aip_play'); } catch { clickedVia = 'js'; await ctxEval(() => document.getElementById('aip_play').click()); }
        await sleep(1200);
        await shot('no-chat-warning.png');
        await sleep(3800);
        const toasts = await toastsFrom(tmark);
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

    await step('17. UI follows ST locale after reload: en and ru; prompts remain English', async () => {
        for (const locale of ['en', 'ru-ru']) {
            await ctxEval(locale => localStorage.setItem('language', locale), locale);
            await loadST();
            await openSettingsViaMenu();
            const state = await ctxEval(() => ({
                connection: document.querySelector('.aip-tab[data-tab="conn"] span').textContent,
                play: document.getElementById('aip_play').title,
                locale: SillyTavern.getContext().getCurrentLocale(),
            }));
            check(state.locale === locale, 'ST locale differs: ' + JSON.stringify(state));
            check(state.connection === (locale === 'en' ? 'Connection' : 'Подключение'), 'wrong interface language');
            await page.click('.aip-tab[data-tab="prompts"]');
            const prompt = await page.$eval('#aip_promptText', el => el.value);
            check(prompt.startsWith('You are a player'), 'built-in prompt is not English');
            await shot('localization-' + locale + '.png');
            await ctxEval(() => document.getElementById('aip_close').click());
        }
    });

    // =====================================================================
    // Фаза B: серверный плагин ключей (ТЗ п.1) и аварийные сценарии п.2–4
    // =====================================================================
    const secretsNorm = () => { const j = JSON.parse(readSecretsRaw()); return JSON.stringify(Object.keys(j).sort().map(k => [k, j[k]])); };
    const readKeys = () => fs.existsSync(KEYS_FILE) ? (JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')).keys || []) : [];
    const keysView = () => readKeys().map(k => ({ id: k.id, label: k.label, provider: k.provider, base: k.base, value: mask(k.value) }));
    const secretsChanges = r0 => stReqs.slice(r0).filter(r => /\/api\/secrets\/(write|rotate|delete)/.test(r.url)).map(r => r.url);
    const settingsRaw = () => fs.readFileSync(path.join(USER_DIR, 'settings.json'), 'utf8');
    const stApi = (url, body) => ctxEval(async (url, body) => {
        const r = await fetch(url, { method: 'POST', headers: SillyTavern.getContext().getRequestHeaders(), body: JSON.stringify(body ?? {}) });
        return { ok: r.ok, status: r.status, j: await r.json().catch(() => null) };
    }, url, body);
    async function openSeraphina() {
        await ctxEval(async () => { const c = SillyTavern.getContext(); await c.selectCharacterById(String(c.characters.findIndex(x => x.name === 'Seraphina'))); });
        await waitFor(() => ctxEval(() => SillyTavern.getContext().chat.length >= 3 && document.querySelectorAll('#chat .mes').length >= 3), 20000, 300, 'чат Seraphina');
        await sleep(800);
    }
    async function openConn(profileId) {
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="conn"]');
        if (profileId && (await aipProfile()).id !== profileId) { await selectProfile(profileId); await sleep(600); }
        await waitFor(() => ctxEval(() => document.getElementById('aip_storeMode').dataset.mode !== 'unknown'), 10000, 200, 'режим хранения');
        await sleep(300);
    }
    const closeModalUi = () => ctxEval(() => document.getElementById('aip_close').click());
    async function addKeyViaUi(label, value) {
        await ctxEval(() => { document.getElementById('aip_addKey').open = true; });
        await page.click('#aip_keyLabel', { clickCount: 3 }); await page.keyboard.press('Backspace');
        await page.type('#aip_keyLabel', label);
        await page.type('#aip_keyInput', value);
        await page.click('#aip_keySave');
        await waitFor(() => ctxEval(l => [...document.querySelectorAll('#aip_keySelect option')].some(o => o.textContent.includes(l)) && document.getElementById('aip_keyState').dataset.state === 'ok', label), 10000, 200, `ключ «${label}» в списке`);
        await sleep(500);
    }
    async function playAndWait(what) {
        const before = await chatSnap();
        await page.click('#aip_play');
        await waitFor(async () => { const s = await chatSnap(); return s.len >= before.len + 2 && s.log >= before.log + 1 && !s.busy && !s.aipBusy; }, 60000, 300, what);
        await sleep(800);
    }
    // ход ▶ через плагин: запросы агента — с ключом расширения, ответ бота — с ключом таверны (или без ключа)
    async function playViaPlugin(expectKey, botKey, what) {
        const n0 = readMock().length, r0 = stReqs.length;
        await playAndWait(what);
        const fresh = readMock().slice(n0), reqs = stReqs.slice(r0);
        const problems = [];
        const agent = fresh.filter(r => ['turn', 'thought', 'memory'].includes(r.kind)), bots = fresh.filter(r => r.kind === 'bot');
        if (fresh.filter(r => r.kind === 'turn').length !== 1) problems.push(`ходов: ${fresh.filter(r => r.kind === 'turn').length}`);
        if (!fresh.some(r => r.kind === 'thought')) problems.push('нет запроса впечатления');
        for (const r of agent) if (r.headers.authorization !== `Bearer ${expectKey}`) problems.push(`${r.kind}: Authorization ${mask(r.headers.authorization ?? '(нет)')}`);
        if (!bots.length) problems.push('нет запроса бота');
        for (const b of bots) {
            const a = b.headers.authorization ?? '';
            if (botKey ? a !== `Bearer ${botKey}` : ALL_SECRETS.some(s => a.includes(s))) problems.push(`бот: Authorization ${mask(a || '(нет)')}`);
        }
        for (const r of fresh) if (ALL_SECRETS.some(s => r.raw.includes(s))) problems.push(`${r.kind}: секрет в теле запроса`);
        const pg = reqs.filter(r => /plugins\/ai-player\/generate$/.test(r.url));
        if (pg.length < 2) problems.push(`запросов браузер→плагин /generate: ${pg.length}`);
        if (pg.some(r => ALL_SECRETS.some(s => r.body.includes(s)))) problems.push('секрет в теле запроса браузер→плагин');
        if (pg.some(r => !/"keyId":"[^"]+"/.test(r.body))) problems.push('в запросе к плагину нет keyId');
        if (reqs.some(r => /backends\/chat-completions\/generate$/.test(r.url) && /mock-player|claude-/.test(r.body))) problems.push('запрос агента ушёл через бэкенд ST, а не через плагин');
        if (secretsChanges(r0).length) problems.push(`расширение меняло secrets.json: ${secretsChanges(r0)}`);
        return { problems, requests: fresh.map(r => `${r.kind} ${mask(r.headers.authorization ?? r.headers['x-api-key'] ?? '(нет)')}`) };
    }
    async function editMessage(id, suffix) {
        return ctxEval(async (id, suffix) => {
            const c = SillyTavern.getContext(); const before = c.chat[id].mes;
            const w = ms => new Promise(r => setTimeout(r, ms));
            $(`#chat .mes[mesid="${id}"] .mes_edit`).trigger('click');
            for (let i = 0; i < 40 && !document.getElementById('curEditTextarea'); i++) await w(100);
            const ta = document.getElementById('curEditTextarea');
            if (!ta) return { ok: false, why: 'редактор ST не открылся' };
            $(ta).val(ta.value + suffix).trigger('input');
            $(`#chat .mes[mesid="${id}"] .mes_edit_done`).trigger('click');
            for (let i = 0; i < 40 && c.chat[id].mes === before; i++) await w(100);
            return { ok: c.chat[id].mes !== before };
        }, id, suffix);
    }
    const thoughtFailState = () => ctxEval(() => {
        const t = document.getElementById('aip_thoughts'), f = t.querySelector('.aip-th-fail'), r = f.getBoundingClientRect();
        const a = f.querySelector('[data-act="retry"]');
        return { failed: t.classList.contains('aip-has-failed'), visible: getComputedStyle(f).display !== 'none' && r.height > 0, text: f.textContent.trim(), retry: a ? a.textContent.trim() : null };
    });
    const ensureThoughtsOpen = async () => {
        await ctxEval(() => { const t = document.getElementById('aip_thoughts'); if (!t.classList.contains('aip-open')) document.getElementById('aip_menu_th').click(); if (t.classList.contains('aip-min')) t.querySelector('[data-act="min"]').click(); });
        await sleep(400);
    };
    const vaultGuard = () => check(vaultOk, 'плагин не загрузился (P1-0) — проверка невозможна');

    let vaultOk = false;
    await step('P1-0. Установка плагина: server-plugin → SillyTavern/plugins/ai-player, enableServerPlugins: true, перезапуск ST', async () => {
        const sec0 = secretsNorm();
        await stopST();
        installPlugin();
        patchConfig({ enableServerPlugins: true });
        await startST();
        await page.setUserAgent(UA0);
        await page.setViewport({ width: 1366, height: 900 });
        await loadST();
        await openSeraphina();
        const log = fs.readFileSync(path.join(OUT, 'st-server.log'), 'utf8');
        const probe = await stApi('/api/plugins/ai-player/probe', {});
        evidence.pluginInstall = { preexisted: pluginPreexisted, backup: !!pluginBackup, loadedLine: log.match(/\[AI Player plugin\][^\n]*/)?.[0], probe };
        check(/\[AI Player plugin\] [\d.]+ loaded/.test(log), 'в логе ST нет «[AI Player plugin] … loaded»');
        check(probe.ok && probe.j?.ok, `probe: ${JSON.stringify(probe)}`);
        check(secretsNorm() === sec0, 'secrets.json изменился при перезапуске');
        vaultOk = true;
        return { probe: probe.j, pluginFolderPreexisted: pluginPreexisted };
    });

    await step('P1-1. С плагином: пометка data-mode=vault; у профиля со старым secretId — кнопки «Перенести» и «Удалить старые общие копии»', async () => {
        vaultGuard();
        await openConn(profile1Id);
        const m = await storeMode();
        await waitFor(() => ctxEval(() => !document.getElementById('aip_keyMigrate').classList.contains('aip-hidden')), 10000, 200, 'кнопка переноса').catch(() => null);
        const st = await ctxEval(() => ({ migrate: !document.getElementById('aip_keyMigrate').classList.contains('aip-hidden'), clean: !document.getElementById('aip_legacyClean').classList.contains('aip-hidden'), keyState: document.getElementById('aip_keyState').textContent, options: [...document.querySelectorAll('#aip_keySelect option')].map(o => o.textContent) }));
        const p = await aipProfile();
        await shotKeyCard('keys-vault-before-migrate.png');
        await closeModalUi();
        evidence.vaultMode = { mode: m, ui: st };
        check(m.mode === 'vault' && m.visible && /Плагин AI Player/.test(m.text), `режим: ${JSON.stringify(m)}`);
        check(p.secretId && !p.keyId, `профиль: secretId=${!!p.secretId} keyId=${p.keyId}`);
        check(st.migrate && st.clean, `кнопки: ${JSON.stringify(st)}`);
        check(/Перенести в хранилище AI Player/.test(st.keyState), `пояснение: ${st.keyState}`);
        return { mode: m.mode, options: st.options };
    });

    let secAtMigration = null;
    await step('P1-2. Перенос ключа: keys/import на сервере, ключ в keys.json плагина, secrets.json не изменился', async () => {
        vaultGuard();
        const k2 = customSlots().find(x => x.value === KEY2);
        await openConn(profile1Id);
        const p0 = await aipProfile();
        check(k2 && p0.secretId === k2.id, 'профиль 1 не на старом ключе 2');
        const sec0 = secretsNorm(), r0 = stReqs.length, pr0 = pluginResps.length, mark = await toastMark();
        await page.click('#aip_keyMigrate');
        await waitFor(async () => !!(await aipProfile()).keyId, 10000, 200, 'keyId в профиле');
        await sleep(2500);   // saveSettingsDebounced
        const p1 = await aipProfile();
        const reqs = stReqs.slice(r0), keys = readKeys(), toasts = await toastsFrom(mark);
        const kv = keys.find(k => k.id === p1.keyId);
        const imp = reqs.find(r => /keys\/import$/.test(r.url));
        const migrateHidden = await ctxEval(() => document.getElementById('aip_keyMigrate').classList.contains('aip-hidden'));
        await closeModalUi();
        evidence.migration = { importBody: imp && mask(imp.body), keys: keysView(), profile: { keyId: !!p1.keyId, secretId: p1.secretId, legacySecretId: p1.legacySecretId }, toasts: toasts.map(t => t.text) };
        secAtMigration = sec0;
        check(imp && imp.body.includes(k2.id) && !ALL_SECRETS.some(s => imp.body.includes(s)), `запрос keys/import: ${imp && mask(imp.body)}`);
        check(kv && kv.value === KEY2 && kv.provider === 'openai' && kv.base === MOCK_URL, `в keys.json: ${JSON.stringify(keysView())}`);
        check(!p1.secretId && p1.legacySecretId === k2.id, `профиль после переноса: ${JSON.stringify(evidence.migration.profile)}`);
        check(secretsNorm() === sec0 && !secretsChanges(r0).length, `secrets.json изменился: ${secretsChanges(r0)}`);
        check(!pluginResps.slice(pr0).some(r => ALL_SECRETS.some(s => r.text.includes(s))), 'значение ключа пришло в браузер в ответе плагина');
        check(!settingsRaw().includes(KEY2), 'ключ в settings.json');
        check(migrateHidden, 'кнопка переноса осталась видна');
        check(toasts.some(t => /перенесён/.test(t.text)), `нет подтверждения: ${toasts.map(t => t.text)}`);
        return { keyInVault: { label: kv.label, base: kv.base }, secretsUnchanged: true };
    });

    await step('P1-3. ▶ с перенесённым ключом: ход/впечатление через плагин с ключом расширения, бот — с ключом таверны; secrets.json тот же', async () => {
        vaultGuard();
        const r = await playViaPlugin(KEY2, TAVERN_KEY, 'ход через плагин (перенесённый ключ)');
        evidence.playMigrated = r;
        if (secretsNorm() !== secAtMigration) r.problems.push('secrets.json изменился до очистки');
        if (r.problems.length) return { ok: false, details: r.problems };
        return r.requests;
    });

    await step('P1-4. «Удалить старые общие копии»: удалены только неактивные и не выбранные в профилях; активный ключ таверны прежний', async () => {
        vaultGuard();
        // пользователь сделал одну копию AI Player активным ключом основного подключения (в менеджере ключей ST)
        const w = await stApi('/api/secrets/write', { key: 'api_key_custom', value: KEY_ACT, label: 'AI Player · активная копия' });
        check(w.ok, `не записали активную копию: ${w.status}`);
        const before = customSlots();
        const act = before.find(x => x.active), k1 = before.find(x => x.value === KEY), k2 = before.find(x => x.value === KEY2);
        const ph = before.find(x => PLACEHOLDER_RE.test(x.label || '')), tv = before.find(x => x.value === TAVERN_KEY);
        check(act?.value === KEY_ACT, 'копия не стала активной');
        const p3 = (await ctxEval(() => SillyTavern.getContext().extensionSettings.ai_player.profiles)).find(p => p.id === profile3Id);
        check(p3?.secretId === k1?.id, 'профиль 3 не держит старый ключ 1');
        await openConn(profile1Id);
        const d0 = dialogs.length, mark = await toastMark(), r0 = stReqs.length;
        await page.click('#aip_legacyClean');
        await waitFor(async () => (await toastsFrom(mark)).some(t => /Удалено|Удалять нечего/.test(t.text)), 15000, 200, 'итог очистки');
        await sleep(1500);
        await closeModalUi();
        const after = customSlots(), ids = new Set(after.map(x => x.id));
        const deletes = stReqs.slice(r0).filter(r => /secrets\/delete/.test(r.url)).map(r => JSON.parse(r.body).id);
        const confirmText = dialogs.slice(d0).join('\n---\n');
        const toasts = (await toastsFrom(mark)).map(t => t.text);
        const p1 = await aipProfile();
        evidence.cleanup = { before: before.map(slotView), after: after.map(slotView), deleted: deletes.length, confirm: confirmText, toasts };
        const expectDel = [k2?.id, ph?.id].filter(Boolean);
        check(confirmText.includes('Удалить из общего хранилища'), `не было подтверждения: ${confirmText}`);
        check(expectDel.every(id => !ids.has(id)), `не удалены неактивные неиспользуемые: ${JSON.stringify(after.map(slotView))}`);
        check(ids.has(k1.id), 'удалён ключ, выбранный в профиле без переноса');
        check(ids.has(act.id) && after.find(x => x.active)?.id === act.id, 'активная копия удалена или активный ключ сменился');
        check(ids.has(tv.id), 'удалён собственный ключ таверны');
        check(deletes.length === expectDel.length, `удалений: ${deletes.length}, ожидалось ${expectDel.length}`);
        check(!p1.legacySecretId, 'в профиле осталась ссылка на удалённую копию');
        // вернуть таверне её собственный ключ (как пользователь в менеджере ключей ST)
        const rot = await stApi('/api/secrets/rotate', { key: 'api_key_custom', id: tv.id });
        check(rot.ok && customSlots().find(x => x.active)?.value === TAVERN_KEY, 'не удалось вернуть активный ключ таверны');
        return { deleted: deletes.length, kept: after.map(x => slotView(x).label), activeKept: 'AI Player · активная копия' };
    });

    let secBaseline = null;
    await step('P1-5. Ключ через окно AI Player с плагином: лёг в keys.json, secrets.json не изменился, в settings.json и списке значения нет', async () => {
        vaultGuard();
        secBaseline = secretsNorm();
        const r0 = stReqs.length, pr0 = pluginResps.length;
        await openConn(profile1Id);
        await addKeyViaUi(KEY_V_LABEL, KEY_V);
        await sleep(2500);
        const p = await aipProfile();
        const kv = readKeys().find(k => k.id === p.keyId);
        const options = await keyOptions();
        const keyState = await ctxEval(() => document.getElementById('aip_keyState').textContent);
        await shotKeyCard('keys-vault-added.png');
        await closeModalUi();
        evidence.vaultAdd = { options, keyState, keys: keysView() };
        check(kv && kv.value === KEY_V && kv.base === MOCK_URL && kv.label === KEY_V_LABEL, `keys.json: ${JSON.stringify(keysView())}`);
        check(!p.secretId, 'у профиля остался secretId');
        check(secretsNorm() === secBaseline && !secretsChanges(r0).length, `secrets.json изменился: ${secretsChanges(r0)}`);
        check(!settingsRaw().includes(KEY_V), 'ключ в settings.json');
        check(!options.join().includes(KEY_V) && options.some(o => o.includes(KEY_V_LABEL) && o.includes('…444')), `список: ${options}`);
        check(!pluginResps.slice(pr0).some(r => r.text.includes(KEY_V)), 'значение ключа пришло в браузер');
        check(/хранилища AI Player/.test(keyState), `состояние: ${keyState}`);
        return { options, keyState };
    });

    await step('P1-6. ▶ с новым ключом: ход и впечатление — Authorization = ключ расширения (через плагин), бот — ключ таверны', async () => {
        vaultGuard();
        const r = await playViaPlugin(KEY_V, TAVERN_KEY, 'ход через плагин (новый ключ)');
        evidence.playVault = r;
        if (secretsNorm() !== secBaseline) r.problems.push('secrets.json изменился');
        if (r.problems.length) return { ok: false, details: r.problems };
        return r.requests;
    });

    // ---------- П.2: записи + задержка + правка учтённого сообщения ----------
    await step('P2. Записи: во время задержанного запроса правят учтённое сообщение → устаревший результат отброшен; без правки — записи обновляются', async () => {
        vaultGuard();
        await ctxEval(() => { const c = SillyTavern.getContext(); delete c.chatMetadata.aip_memory; c.saveMetadata?.(); });
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="match"]');
        const m0 = countKind('memory'), mark = await toastMark();
        addRule({ kind: 'memory', delayMs: 7000 });
        await page.click('#aip_memUpdate');
        await waitFor(() => countKind('memory') > m0 && mockCtl.inflight > 0, 15000, 100, 'задержанный запрос записей у мока');
        const busyText = await ctxEval(() => document.getElementById('aip_memState').textContent);
        await closeModalUi();
        const edited = await editMessage(1, ' (правка E2E во время запроса записей)');
        await waitFor(() => mockCtl.inflight === 0, 20000, 200, 'мок ответил на запрос записей');
        await sleep(2000);
        const stale = await ctxEval(() => SillyTavern.getContext().chatMetadata.aip_memory ?? null);
        const toasts = (await toastsFrom(mark)).map(t => t.text);
        // контроль: без правки записи обновляются
        await openSettingsViaMenu();
        await page.click('.aip-tab[data-tab="match"]');
        const m1 = countKind('memory');
        await page.click('#aip_memUpdate');
        await waitFor(() => ctxEval(() => !!SillyTavern.getContext().chatMetadata.aip_memory?.text), 20000, 200, 'записи обновлены (контроль)');
        const fresh = await ctxEval(() => SillyTavern.getContext().chatMetadata.aip_memory);
        const memUi = await ctxEval(() => document.getElementById('aip_memText').value);
        await closeModalUi();
        evidence.memoryStale = { busyText, edited, stale, toasts, control: { upTo: fresh?.upTo, text: fresh?.text, rev: fresh?.rev } };
        check(edited.ok, `правка не удалась: ${edited.why}`);
        check(/Обновляю записи/.test(busyText), `во время запроса: ${busyText}`);
        check(!stale, `устаревшие записи сохранены: ${JSON.stringify(stale)}`);
        check(toasts.some(t => /Записи не обновлены: пока шёл запрос, изменились сообщения/.test(t)), `нет пояснения: ${toasts}`);
        check(countKind('memory') === m1 + 1 && fresh?.text === MEMORY_TEXT && memUi === MEMORY_TEXT, `контроль без правки: ${JSON.stringify(evidence.memoryStale.control)}`);
        return { discarded: true, toast: toasts.find(t => /Записи не обновлены/.test(t)), control: `записи до #${fresh.upTo}` };
    });

    // ---------- П.3: переполнение запроса записей ----------
    await step('P3. Записи: «Контекст модели» 4000 + длинные записи → запрос не отправлен, тост «не помещается»', async () => {
        vaultGuard();
        const LONG = 'Важная запись о событиях в лесу и о людях вокруг. '.repeat(400);
        await openConn(profile1Id);
        const setCtx = v => ctxEval(v => { const i = document.getElementById('aip_p_contextSize'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, v);
        await setCtx('4000');
        await page.click('.aip-tab[data-tab="match"]');
        await page.click('#aip_memClear');
        await sleep(300);
        await ctxEval(t => { const ta = document.getElementById('aip_memText'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, LONG);
        await sleep(1200);
        const m0 = countKind('memory'), r0 = stReqs.length, mark = await toastMark();
        await page.click('#aip_memUpdate');
        await sleep(3000);
        const toasts = await toastsFrom(mark);
        const sent = countKind('memory') - m0;
        const pluginGen = stReqs.slice(r0).filter(r => /generate$/.test(r.url)).length;
        const memAfter = await ctxEval(() => SillyTavern.getContext().chatMetadata.aip_memory?.text ?? null);
        const ctxSize = (await aipProfile()).contextSize;
        // вернуть как было
        await page.click('#aip_memClear');
        await page.click('.aip-tab[data-tab="conn"]');
        await setCtx('32000');
        await sleep(500);
        await closeModalUi();
        const warn = toasts.find(t => /не помещается в контекст модели/.test(t.text));
        evidence.memoryOverflow = { ctxSize, sent, pluginGen, toasts: toasts.map(t => t.text), kept: memAfter === LONG };
        check(String(ctxSize) === '4000', `контекст профиля: ${ctxSize}`);
        check(sent === 0 && pluginGen === 0, `запрос всё же ушёл: к моку ${sent}, браузер→сервер ${pluginGen}`);
        check(warn && /warning/.test(warn.cls), `нет предупреждения: ${JSON.stringify(evidence.memoryOverflow.toasts)}`);
        check(memAfter === LONG, 'записи изменились');
        return { toast: warn.text.slice(0, 200) };
    });

    // ---------- П.4: впечатления — свайп во время ожидания ----------
    await step('P4a. Впечатление задержано, ответ бота свайпнули на другую версию → устаревшее впечатление отброшено, к другой версии не привязано', async () => {
        vaultGuard();
        await ensureThoughtsOpen();
        await playAndWait('ход для сценария свайпа');
        const v0 = await lastBotState();
        check(v0.entries.length === 1 && v0.swipes === 1, `исходное состояние: ${JSON.stringify(v0)}`);
        addRule({ kind: 'thought', delayMs: 15000 });
        const th0 = countKind('thought');
        await ctxEval(() => $('#chat .last_mes .swipe_right').trigger('click'));
        await waitFor(() => countKind('thought') > th0 && mockCtl.inflight > 0, 40000, 200, 'задержанный запрос впечатления о новой версии');
        const v1 = await lastBotState();
        const pending = readMock().filter(r => r.kind === 'thought').at(-1);
        // ST игнорирует свайп, пока не закончилась анимация/обработка предыдущего, — повторяем как пользователь
        let swipedBackWhilePending = false, attempts = 0;
        const cl0 = consoleLog.length;
        for (; attempts < 12; attempts++) {
            await waitFor(isIdle, 10000, 200, 'таверна свободна').catch(() => null);
            await ctxEval(() => $('#chat .last_mes .swipe_left').trigger('click'));
            await sleep(800);
            if ((await lastBotState()).swipeId === 0) { swipedBackWhilePending = mockCtl.inflight > 0; break; }
        }
        if ((await lastBotState()).swipeId !== 0) {
            const swipeLog = consoleLog.slice(cl0).map(m => m.text).filter(t => /swipe|свайп/i.test(t)).slice(0, 10);
            const dom = await ctxEval(() => ({ left: $('#chat .last_mes .swipe_left').length, generating: getComputedStyle(document.getElementById('mes_stop')).display, swiping: document.body.dataset.swiping ?? null }));
            return { ok: false, details: { why: 'свайп назад не сработал', attempts, swipeLog, dom, v1 } };
        }
        check(swipedBackWhilePending, 'свайп назад случился уже после ответа на запрос впечатления — сценарий не воспроизведён');
        await waitFor(() => mockCtl.inflight === 0, 30000, 200, 'мок ответил на задержанный запрос');
        await sleep(2500);
        const v2 = await lastBotState();
        const b = await bindingReport();
        const fail = await thoughtFailState();
        evidence.swipeDuringThought = { v0, v1, v2, pendingAbout: pending?.aboutNo, binding: b.problems, fail };
        check(v1.swipeId === 1 && v1.swipes === 2 && v1.no !== v0.no, `новая версия не появилась: ${JSON.stringify(v1)}`);
        check(pending?.aboutNo === v1.no, `задержанный запрос не о новой версии: о №${pending?.aboutNo}, версия №${v1.no}`);
        check(v2.swipeId === 0 && v2.no === v0.no, `не вернулись на версию 0: ${JSON.stringify(v2)}`);
        check(v2.entries.length === 1 && v2.entries[0].swipeId === 0 && v2.entries[0].no === v0.no, `впечатления о сообщении: ${JSON.stringify(v2.entries)}`);
        check(v2.log === v0.log, `журнал ${v0.log}→${v2.log}`);
        check(!b.problems.length, `привязка: ${b.problems}`);
        check(!fail.failed, 'отброшенное впечатление показано как сбой');
        return { pendingAbout: `ответ №${pending.aboutNo} (свайп 1)`, shownVersion: `ответ №${v2.no} (свайп 0)`, entries: v2.entries };
    });

    await step('P4b. Пустой ответ на запрос впечатления → полоса «Повторить»; повтор даёт впечатление без нового хода и сообщения в чате', async () => {
        vaultGuard();
        await ensureThoughtsOpen();
        addRule({ kind: 'thought', empty: true });
        const before = await chatSnap(), mark = await toastMark();
        await page.click('#aip_play');
        await waitFor(async () => { const s = await chatSnap(); return s.len >= before.len + 2 && !s.busy && !s.aipBusy && (await thoughtFailState()).failed; }, 60000, 300, 'полоса ошибки впечатления');
        await sleep(600);
        const fail = await thoughtFailState();
        try { await (await page.$('#aip_thoughts')).screenshot({ path: path.join(SCREENS, 'thoughts-failed-retry.png') }); } catch { /* */ }
        const toasts = await toastsFrom(mark);
        const k0 = { turn: countKind('turn'), bot: countKind('bot'), thought: countKind('thought') };
        const s0 = await lastBotState(), len0 = await chatLen();
        await page.click('#aip_thoughts [data-act="retry"]');
        await waitFor(async () => { const s = await lastBotState(); return s.log > s0.log && !(await thoughtFailState()).failed; }, 30000, 300, 'впечатление после «Повторить»');
        await sleep(800);
        const s1 = await lastBotState(), len1 = await chatLen();
        const d = { turn: countKind('turn') - k0.turn, bot: countKind('bot') - k0.bot, thought: countKind('thought') - k0.thought };
        const b = await bindingReport();
        evidence.thoughtRetry = { fail, toasts: toasts.map(t => t.text), delta: d, s0, s1, binding: b.problems };
        check(fail.failed && fail.visible, `полоса не видна: ${JSON.stringify(fail)}`);
        check(/Впечатление: модель вернула пустой ответ/.test(fail.text) && fail.retry === 'Повторить', `текст полосы: ${fail.text}`);
        check(toasts.some(t => /Впечатление: модель вернула пустой ответ/.test(t.text)), `нет тоста: ${evidence.thoughtRetry.toasts}`);
        check(s0.entries.length === 0, 'впечатление записано несмотря на пустой ответ');
        check(d.turn === 0 && d.bot === 0 && d.thought === 1, `запросы при повторе: ${JSON.stringify(d)}`);
        check(len1 === len0, `в чате ${len0}→${len1} сообщений`);
        check(s1.entries.length === 1 && s1.entries[0].sameDate && s1.entries[0].no === s1.no, `впечатление после повтора: ${JSON.stringify(s1.entries)}`);
        check(!b.problems.length, `привязка: ${b.problems}`);
        return { strip: fail.text, retryRequests: d };
    });

    // ---------- П.1: переключение/удаление ключей и профилей ----------
    await step('P1-7. Переключение ключа, удаление ключа, создание и удаление профиля с ключом — secrets.json не меняется', async () => {
        vaultGuard();
        const sec0 = secretsNorm(), r0 = stReqs.length;
        const keys0 = readKeys();
        const kMig = keys0.find(k => k.value === KEY2), kV = keys0.find(k => k.value === KEY_V);
        check(kMig && kV, `ключи в хранилище: ${JSON.stringify(keysView())}`);
        await openConn(profile1Id);
        await selectKey(kMig.id); await sleep(500);
        const pA = await aipProfile();
        await selectKey(kV.id); await sleep(500);
        const pB = await aipProfile();
        const nProf0 = (await ctxEval(() => SillyTavern.getContext().extensionSettings.ai_player.profiles.length));
        await page.click('#aip_profNew'); await sleep(600);
        await addKeyViaUi('E2E временный', KEY_TMP);
        const kT = readKeys().find(k => k.value === KEY_TMP);
        await page.click('#aip_profDel');
        await waitFor(() => !readKeys().some(k => k.value === KEY_TMP), 10000, 200, 'ключ удалённого профиля удалён');
        await sleep(500);
        await openConn(profile1Id);
        await selectKey(kMig.id); await sleep(500);
        await page.click('#aip_keyDel');
        await waitFor(() => !readKeys().some(k => k.id === kMig.id), 10000, 200, 'перенесённый ключ удалён');
        await sleep(800);
        await selectKey(kV.id); await sleep(500);
        const p1 = await aipProfile();
        const nProf1 = (await ctxEval(() => SillyTavern.getContext().extensionSettings.ai_player.profiles.length));
        await closeModalUi();
        await sleep(2000);
        evidence.keySwitch = { keys: keysView(), secretsCalls: secretsChanges(r0) };
        check(pA.keyId === kMig.id && pB.keyId === kV.id, 'переключение ключа не сработало');
        check(kT, 'ключ временного профиля не сохранился');
        check(nProf1 === nProf0, `профилей ${nProf0}→${nProf1}`);
        check(p1.keyId === kV.id, 'профиль 1 не на ключе плагина');
        check(secretsNorm() === sec0 && !secretsChanges(r0).length, `secrets.json изменился: ${secretsChanges(r0)}`);
        return { keysLeft: readKeys().map(k => k.label), secretsUnchanged: true };
    });

    await step('P1-8. У основного подключения нет ключа: ход идёт, расширение не создаёт заглушку и не отдаёт свой ключ таверне', async () => {
        vaultGuard();
        // пользователь удалил все ключи Custom в менеджере ключей ST
        for (const x of customSlots()) await stApi('/api/secrets/delete', { key: 'api_key_custom', id: x.id });
        check(customSlots().length === 0, `ключи таверны не удалены: ${JSON.stringify(customSlots().map(slotView))}`);
        const sec0 = secretsNorm(), r0 = stReqs.length;
        const r = await playViaPlugin(KEY_V, null, 'ход без ключа таверны');
        // добавление ещё одного ключа расширения при пустом менеджере таверны
        await openConn(profile1Id);
        await addKeyViaUi('E2E временный 2', KEY_TMP);
        const kT = readKeys().find(k => k.value === KEY_TMP);
        await selectKey(readKeys().find(k => k.value === KEY_V).id); await sleep(500);
        await closeModalUi();
        await sleep(1500);
        evidence.noTavernKey = { requests: r.requests, secrets: customSlots().map(slotView), secretsCalls: secretsChanges(r0) };
        if (secretsNorm() !== sec0) r.problems.push(`secrets.json изменился: ${JSON.stringify(customSlots().map(slotView))}`);
        if (customSlots().some(x => PLACEHOLDER_RE.test(x.label || ''))) r.problems.push('создана заглушка');
        if (!kT) r.problems.push('ключ не добавлен в хранилище плагина');
        if (r.problems.length) return { ok: false, details: r.problems };
        return { requests: r.requests, tavernKeys: 0 };
    });

    await step('P1-9. Ошибки через плагин: mock 500 и 401 → тост «Ход: …» с видом ошибки и HTTP-кодом, без значения ключа', async () => {
        vaultGuard();
        const cases = [
            { status: 500, re: /Ход: ошибка на стороне провайдера или прокси \(HTTP 500\)/ },
            { status: 401, re: /Ход: ключ или пароль отклонён \(ошибка авторизации\) \(HTTP 401\)/ },
        ];
        const out = [];
        for (const cs of cases) {
            addRule({ kind: 'turn', status: cs.status });
            const len0 = await chatLen(), t0 = countKind('turn'), mark = await toastMark(), c0 = consoleLog.length;
            await page.click('#aip_play');
            await waitFor(async () => (await toastsFrom(mark)).some(t => /toast-error/.test(t.cls)) && await isIdle(), 30000, 200, `тост ошибки ${cs.status}`);
            await sleep(800);
            const toasts = await toastsFrom(mark);
            const err = toasts.find(t => /toast-error/.test(t.cls));
            const cons = consoleLog.slice(c0).map(m => m.text).join('\n');
            out.push({ status: cs.status, toast: err.text, turnRequests: countKind('turn') - t0, chat: (await chatLen()) - len0,
                leak: ALL_SECRETS.some(s => err.text.includes(s) || cons.includes(s)) || /sk-e2e-[A-Za-z]/.test(err.text), match: cs.re.test(err.text) });
        }
        clearRules();
        evidence.errors = out;
        const bad = out.filter(o => !o.match || o.leak || o.turnRequests !== 1 || o.chat !== 0);
        if (bad.length) return { ok: false, details: bad };
        return out.map(o => o.toast);
    });

    let claudeProfileId = null;
    await step('P1-10. Claude-прокси с плагином: перенос пароля в хранилище, ▶ с x-api-key = пароль, пароля больше нет в settings.json', async () => {
        vaultGuard();
        const sec0 = secretsNorm();
        claudeProfileId = (await ctxEval(() => SillyTavern.getContext().extensionSettings.ai_player.profiles)).find(p => p.provider === 'claude_proxy')?.id;
        check(claudeProfileId, 'нет профиля Claude-прокси');
        await openConn(claudeProfileId);
        await waitFor(() => ctxEval(() => !document.getElementById('aip_keyMigrate').classList.contains('aip-hidden')), 10000, 200, 'кнопка переноса пароля');
        const layout = await ctxEval(() => ({ keyLabel: document.getElementById('aip_keyLabelText').textContent, proxyWrap: getComputedStyle(document.getElementById('aip_proxyWrap')).display }));
        await page.click('#aip_keyMigrate');
        await waitFor(async () => !!(await aipProfile()).keyId, 10000, 200, 'keyId у профиля Claude');
        await sleep(2500);
        const p = await aipProfile();
        const kv = readKeys().find(k => k.id === p.keyId);
        await closeModalUi();
        const n0 = readMock().length;
        await playAndWait('ход Claude через плагин');
        const fresh = readMock().slice(n0).filter(r => r.api === 'anthropic');
        await openConn(profile1Id);
        await closeModalUi();
        await sleep(2000);
        evidence.claudeVault = { layout, key: kv && { provider: kv.provider, base: kv.base, value: mask(kv.value) }, requests: fresh.map(r => `${r.kind} x-api-key=${mask(r.headers['x-api-key'])}`) };
        check(layout.keyLabel === 'Пароль прокси' && layout.proxyWrap === 'none', `вид полей: ${JSON.stringify(layout)}`);
        check(kv && kv.provider === 'claude_proxy' && kv.value === PROXY_PASS && kv.base === MOCK_URL, `keys.json: ${JSON.stringify(keysView())}`);
        check(!p.proxyPassword, 'пароль остался в профиле');
        check(fresh.some(r => r.kind === 'turn') && fresh.every(r => r.headers['x-api-key'] === PROXY_PASS && r.url === '/v1/messages'), `запросы: ${evidence.claudeVault.requests}`);
        check(!settingsRaw().includes(PROXY_PASS), 'пароль прокси остался в settings.json');
        check(secretsNorm() === sec0, 'secrets.json изменился');
        return evidence.claudeVault.requests;
    });

    await step('P1-11. Перезапуск ST: ключи плагина на месте, профиль видит свой ключ, «Тест» ✔ с ключом расширения', async () => {
        vaultGuard();
        const keys0 = JSON.stringify(keysView()), sec0 = secretsNorm();
        await stopST();
        await startST();
        await loadST();
        await openSeraphina();
        await openConn(profile1Id);
        await waitFor(() => ctxEval(() => document.getElementById('aip_keyState').dataset.state === 'ok'), 10000, 200, 'ключ профиля после перезапуска');
        const options = await keyOptions(), m = await storeMode();
        const n0 = readMock().length;
        await ctxEval(() => { document.getElementById('aip_status').textContent = ''; });
        await page.click('#aip_test');
        await waitFor(() => ctxEval(() => /^[✔✖]/.test(document.getElementById('aip_status').textContent)), 20000, 200, 'результат «Тест»');
        const status = await ctxEval(() => document.getElementById('aip_status').textContent);
        const test = readMock().slice(n0).find(r => r.kind === 'test');
        await closeModalUi();
        evidence.restart = { options, mode: m.mode, status, testAuth: mask(test?.headers.authorization) };
        check(JSON.stringify(keysView()) === keys0, 'keys.json изменился после перезапуска');
        check(secretsNorm() === sec0, 'secrets.json изменился после перезапуска');
        check(m.mode === 'vault', `режим: ${m.mode}`);
        check(options.some(o => o.includes(KEY_V_LABEL)), `ключа нет в списке: ${options}`);
        check(status.startsWith('✔') && test?.headers.authorization === `Bearer ${KEY_V}`, `«Тест»: ${status}, ${mask(test?.headers.authorization)}`);
        return { options, status };
    });

    await step('P1-12. Ни один ответ плагина браузеру не содержит значений ключей и паролей', async () => {
        vaultGuard();
        const leaks = pluginResps.filter(r => ALL_SECRETS.some(s => r.text.includes(s)));
        evidence.pluginResponses = { total: pluginResps.length, byRoute: pluginResps.reduce((a, r) => { const k = r.url.replace(/^.*ai-player/, ''); a[k] = (a[k] || 0) + 1; return a; }, {}) };
        check(pluginResps.length > 5, 'ответов плагина почти нет');
        check(!leaks.length, `утечка в ответах: ${leaks.map(r => r.url)}`);
        return evidence.pluginResponses;
    });

    // ---------- П.1: два пользователя ST (без браузера, через HTTP API) ----------
    async function stSession() {
        const jar = new Map();
        const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
        const take = r => { for (const c of r.headers.getSetCookie?.() || []) { const kv = c.split(';')[0]; const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1)); } };
        const r0 = await fetch(BASE + 'csrf-token', { headers: { cookie: cookie() } });
        take(r0);
        const token = (await r0.json()).token;
        const post = async (u, body) => {
            const r = await fetch(BASE + u.replace(/^\//, ''), { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, cookie: cookie() }, body: JSON.stringify(body ?? {}) });
            take(r);
            const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* */ }
            return { status: r.status, j, t: t.slice(0, 200) };
        };
        return { post };
    }
    await step('P1-13. Два пользователя ST (enableUserAccounts): второй не видит ключей первого и не может ими пользоваться', async () => {
        vaultGuard();
        await browser.close().catch(() => {}); browser = null;   // дальше — только HTTP
        await stopST();
        patchConfig({ enableUserAccounts: true });
        await startST();
        const s1 = await stSession();
        const l1 = await s1.post('/api/users/login', { handle: 'default-user', password: '' });
        if (l1.status !== 200) return { skip: true, details: `вход default-user не удался (HTTP ${l1.status}: ${l1.t}) — проверено юнит-тестами плагина` };
        const list1 = await s1.post('/api/plugins/ai-player/keys/list', {});
        const cr = await s1.post('/api/users/create', { handle: 'e2e-second', name: 'E2E Second', password: '' });
        if (cr.status !== 200) return { skip: true, details: `второй пользователь не создан (HTTP ${cr.status}: ${cr.t}) — проверено юнит-тестами плагина` };
        const s2 = await stSession();
        const l2 = await s2.post('/api/users/login', { handle: 'e2e-second', password: '' });
        check(l2.status === 200, `вход второго: ${l2.status} ${l2.t}`);
        const kV = (list1.j?.keys || []).find(k => k.label === KEY_V_LABEL);
        check(kV, `у первого нет ключа плагина: ${JSON.stringify(list1)}`);
        const list2 = await s2.post('/api/plugins/ai-player/keys/list', {});
        const n0 = readMock().length;
        const gen2 = await s2.post('/api/plugins/ai-player/generate', { keyId: kV.id, provider: 'openai', url: MOCK_URL, model: 'mock-player', system: 'x', messages: [{ role: 'user', content: 'hi' }] });
        const mockAfterGen = readMock().length - n0;
        const del2 = await s2.post('/api/plugins/ai-player/keys/delete', { id: kV.id });
        // общая копия первого пользователя — второй не может её «перенести» к себе
        const w1 = await s1.post('/api/secrets/write', { key: 'api_key_custom', value: KEY_TMP, label: 'AI Player · проверка изоляции' });
        const imp2 = await s2.post('/api/plugins/ai-player/keys/import', { secretKey: 'api_key_custom', secretId: w1.j?.id, provider: 'openai', url: MOCK_URL });
        const add2 = await s2.post('/api/plugins/ai-player/keys/add', { provider: 'openai', url: MOCK_URL, value: KEY_U2, label: 'ключ второго' });
        const list1b = await s1.post('/api/plugins/ai-player/keys/list', {});
        const list2b = await s2.post('/api/plugins/ai-player/keys/list', {});
        const file2 = path.join(TMP, 'e2e-second', 'ai-player', 'keys.json');
        const raw2 = fs.existsSync(file2) ? fs.readFileSync(file2, 'utf8') : '';
        evidence.twoUsers = { list1: list1.j?.keys?.map(k => k.label), list2: list2.j, gen2: { status: gen2.status, kind: gen2.j?.error?.kind }, mockAfterGen, del2: { status: del2.status, kind: del2.j?.error?.kind },
            imp2: { status: imp2.status, kind: imp2.j?.error?.kind }, add2: add2.status, list1b: list1b.j?.keys?.map(k => k.label), list2b: list2b.j?.keys?.map(k => k.label), user2File: fs.existsSync(file2) };
        check(Array.isArray(list2.j?.keys) && list2.j.keys.length === 0, `второй видит ключи: ${JSON.stringify(list2.j)}`);
        check(gen2.status === 404 && gen2.j?.error?.kind === 'no_key' && mockAfterGen === 0, `второй воспользовался ключом первого: ${JSON.stringify(evidence.twoUsers.gen2)}, к моку ${mockAfterGen}`);
        check(del2.status === 404 && list1b.j?.keys?.some(k => k.id === kV.id), 'второй удалил ключ первого');
        check(w1.j?.id && imp2.status === 404, `импорт чужой общей копии: ${JSON.stringify(evidence.twoUsers.imp2)}`);
        check(add2.status === 200 && list2b.j?.keys?.length === 1 && !list1b.j.keys.some(k => k.label === 'ключ второго'), 'ключ второго виден первому или не сохранился');
        check(raw2.includes(KEY_U2) && !raw2.includes(KEY_V) && !fs.readFileSync(KEYS_FILE, 'utf8').includes(KEY_U2), 'хранилища пользователей не разделены на диске');
        await stopST();
        return { user1Keys: evidence.twoUsers.list1b, user2Keys: evidence.twoUsers.list2b, foreignGenerate: gen2.status, foreignDelete: del2.status, foreignImport: imp2.status };
    });

    evidence.console = {
        errors: consoleLog.filter(m => m.type === 'error').map(m => m.text),
        warnings: consoleLog.filter(m => m.type === 'warning' && /AI Player/.test(m.text)).map(m => m.text),
        aip: consoleLog.filter(m => /AI Player/.test(m.text)).map(m => m.text),
        pageErrors, dialogs,
    };
} catch (e) {
    record('инфраструктура', 'FAIL', e?.stack || String(e));
} finally {
    clearRules();
    try { await browser?.close(); } catch { /* */ }
    try { await stopST(); } catch { /* */ }
    try { st?.kill(); } catch { /* */ }
    try { uninstallPlugin(); } catch (e) { console.log('не удалось убрать папку плагина:', e.message); }
    mock.closeAllConnections?.();
    await new Promise(r => mock.close(r));
    const rep = { when: new Date().toISOString(), counts, total: results.length, results, evidence: JSON.parse(maskAll(JSON.stringify(evidence))) };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 2));
    console.log(`\nИтого: PASS ${counts.PASS}, FAIL ${counts.FAIL}, KNOWN ${counts.KNOWN}, SKIP ${counts.SKIP} (всего ${results.length}). Пройдено: ${counts.PASS}/${results.length}. Отчёт: ${path.join(OUT, 'report.json')}`);
    console.log(`Папка плагина ${PLUGIN_DST}: ${pluginPreexisted ? (pluginBackup ? 'была до прогона — восстановлена' : 'была до прогона — оставлена') : (fs.existsSync(PLUGIN_DST) ? 'НЕ УДАЛЕНА' : 'создавалась на время прогона — удалена')}`);
    await sleep(500);
    process.exit(counts.FAIL ? 1 : 0);
}
