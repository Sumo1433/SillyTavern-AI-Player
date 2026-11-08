import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    setup, waitFor, sleep, agentTurn, botReply, botSwipe, botContinue, regenerate, PROFILE, newId,
    isGenerate, isReactionCall, isTurnCall, isSecretCall, REACTION_TEXT, isMemoryCall, MEMORY_TEXT,
} from './harness.mjs';

let t;
afterEach(() => { t?.close(); t = null; });

const longChat = n => Array.from({ length: n }, (_, i) => i % 2 === 0
    ? { name: 'Алиса', is_user: false, mes: i === 0 ? 'Добро пожаловать в таверну!' : `Реплика бота номер ${i}. `.repeat(20), send_date: `d${i}` }
    : { name: 'Боб', is_user: true, mes: `Реплика игрока номер ${i}. `.repeat(20), send_date: `d${i}` });

// ---------------------------------------------------------------- 1
test('1. Инициализация: DOM-элементы, кнопка, пункты меню', () => {
    t = setup();
    for (const id of ['aip_host', 'aip_overlay', 'aip_thoughts', 'aip_play', 'aip_menu', 'aip_menu_th', 'aip_menu_diag'])
        assert.ok(t.doc.getElementById(id), `нет #${id}`);
    assert.equal(t.$('#aip_play').parentElement.id, 'rightSendForm');
    assert.ok(t.$('#aip_host #aip_overlay') && t.$('#aip_host #aip_thoughts'), 'окна лежат в #aip_host');
    assert.equal(t.$('#extensionsMenu').children.length, 3);
    assert.match(t.$('#aip_menu_th span').textContent, /впечатления$/);
    assert.ok(!t.$('#aip_overlay').classList.contains('aip-open'));
    assert.ok(t.logs.some(l => l.join(' ').includes('загружен')));
    assert.ok(!t.logs.some(l => l[0] === 'error' || l[0] === 'jsdomError'), JSON.stringify(t.logs));
});

test('1b. Миграция старых настроек v0.1 (key/useProxy удаляются, provider/url/model → профиль)', () => {
    t = setup({
        extensionSettings: { ai_player: { key: 'sk-OLD-SECRET', useProxy: true, provider: 'openai', url: 'https://old.example/v1', model: 'gpt-old', temperature: 0.5 } },
    });
    const s = t.s();
    for (const k of ['key', 'useProxy', 'provider', 'url', 'model', 'temperature']) assert.ok(!(k in s), `осталось поле ${k}`);
    assert.equal(s.profiles.length, 1);
    const p = s.profiles[0];
    assert.equal(p.name, 'Профиль 1');
    assert.equal(p.provider, 'openai');
    assert.equal(p.url, 'https://old.example/v1');
    assert.equal(p.model, 'gpt-old');
    assert.equal(p.temperature, 0.5);
    assert.equal(p.secretId, null);
    assert.equal(s.activeProfile, p.id);
    assert.ok(t.counters.saveSettings > 0, 'настройки сохранены');
    assert.ok(!JSON.stringify(s).includes('sk-OLD-SECRET'), 'ключ не должен остаться в настройках');
    // дефолты дописаны
    assert.equal(s.maxTokens, 1200);
    assert.equal(s.reactions, true);
});

// ---------------------------------------------------------------- 2
test('2. openModal: aip-open, вкладки, поля из профиля', async () => {
    t = setup();
    t.click('#aip_menu');
    const o = t.$('#aip_overlay');
    assert.ok(o.classList.contains('aip-open'));
    assert.equal(t.$('#aip_profName').value, 'Тест');
    assert.equal(t.$('#aip_p_provider').value, 'openai');
    assert.equal(t.$('#aip_p_url').value, 'https://proxy.example/v1/chat/completions/');
    assert.equal(t.$('#aip_p_model').value, 'gpt-test');
    assert.equal(t.$('#aip_p_temperature').value, '0.7');
    assert.equal(t.$('#aip_p_contextSize').value, '32000');
    assert.equal(t.$('#aip_profile').value, 'p1');
    assert.equal(t.$('#aip_maxTokens').value, '1200');
    assert.equal(t.$('#aip_autoSend').checked, true);
    assert.match(t.$('#aip_sync').textContent, /Боб/);
    assert.match(t.$('#aip_sync').textContent, /Алиса/);
    // вкладки
    assert.ok(t.$('.aip-panel[data-panel="conn"]').classList.contains('aip-active'));
    t.click('.aip-tab[data-tab="game"]');
    assert.ok(t.$('.aip-panel[data-panel="game"]').classList.contains('aip-active'));
    assert.ok(!t.$('.aip-panel[data-panel="conn"]').classList.contains('aip-active'));
    assert.equal(t.$('.aip-tab[data-tab="game"]').getAttribute('aria-selected'), 'true');
    assert.equal(t.$('.aip-tab[data-tab="conn"]').getAttribute('aria-selected'), 'false');
    assert.equal(t.s().uiTab, 'game');
    // правка поля профиля сохраняется в профиль
    t.input('#aip_p_model', 'gpt-other');
    assert.equal(t.s().profiles[0].model, 'gpt-other');
    // ключ профиля подтянут
    await waitFor(() => t.$('#aip_keySelect').value === 'k1', { msg: 'выбран ключ k1' });
    // закрытие
    t.click('#aip_close');
    assert.ok(!o.classList.contains('aip-open'));
});

// ---------------------------------------------------------------- 3
test('3. Ход игрока: тело запроса к generate, вставка и отправка', async () => {
    t = setup();
    await agentTurn(t);
    const turn = t.calls.filter(isTurnCall);
    assert.equal(turn.length, 1);
    const b = turn[0].body;
    assert.equal(b.chat_completion_source, 'custom');
    assert.equal(b.custom_url, 'https://proxy.example/v1', 'custom_url без /chat/completions и слэша');
    assert.equal(b.secret_id, 'k1');
    assert.equal(b.model, 'gpt-test');
    assert.equal(b.temperature, 0.7);
    assert.equal(b.stream, false);
    assert.equal(b.max_tokens, 1200);
    assert.ok(b.stop.includes('\nАлиса:') && b.stop.includes('\n**Алиса**:'));
    const m = b.messages;
    assert.equal(m[0].role, 'system');
    assert.match(m[0].content, /«Боб»/);
    assert.match(m[0].content, /Алиса — трактирщица/);
    assert.match(m[0].content, /Боб — циничный наёмник/);
    assert.doesNotMatch(m[0].content, /\{player\}|\{partner\}|\{min\}/);
    assert.deepEqual(m[1], { role: 'user', content: 'Алиса: Добро пожаловать в таверну!' });
    assert.deepEqual(m[2], { role: 'assistant', content: '*входит* «Привет»' });
    assert.equal(m[3].role, 'user');
    assert.ok(m[3].content.startsWith('Алиса: «Чего желаешь?»'));
    assert.match(m[3].content, /\[Ход «Боб»\./);
    assert.match(m[3].content, /50–200 слов/);
    assert.equal(m.length, 4);
    // запрос с CSRF-заголовками ST
    // ход отправлен
    assert.deepEqual(t.sent, ['*кивает* «Мне эля, пожалуйста»']);
    const last = t.c.chat.at(-1);
    assert.equal(last.is_user, true);
    assert.equal(last.mes, '*кивает* «Мне эля, пожалуйста»');
    assert.equal(t.$('#send_textarea').value, '');
    assert.ok(!t.$('#aip_play').classList.contains('aip-busy'));
});

test('3b. Первое сообщение (приветствие) сохраняется при обрезке по contextMessages', async () => {
    t = setup({ chat: longChat(7) });
    t.s().contextMessages = 2;
    t.c.chat.at(-1).mes = 'Последняя реплика';   // longChat(7): индексы 0..6, 6 — бот
    await agentTurn(t);
    const m = t.calls.find(isTurnCall).body.messages;
    assert.equal(m[0].role, 'system');
    assert.equal(m[1].role, 'user');
    assert.ok(m[1].content.startsWith('Алиса: Добро пожаловать в таверну!'), 'приветствие первым');
    assert.match(m[1].content, /часть истории пропущена/);
    assert.equal(m[2].role, 'assistant');
    assert.ok(!m[2].content.startsWith('Боб:'), 'реплики игрока без префикса');
    assert.equal(m.at(-1).role, 'user');
    assert.ok(m.at(-1).content.startsWith('Алиса: Последняя реплика'));
    assert.match(m.at(-1).content, /\[Ход «Боб»/);
    // роли чередуются
    for (let i = 2; i < m.length; i++) assert.notEqual(m[i].role, m[i - 1].role);
});

test('3c. Если последним стоит ход игрока — напоминание отдельным user-сообщением в конце', () => {
    t = setup();
    t.c.chat.push({ name: 'Боб', is_user: true, mes: 'Ещё ход', send_date: 'x' });
    const { aip } = t;
    const s = aip.settings().s;
    const msgs = aip.buildMessages(s, aip.getSync(), 'sys');
    assert.equal(msgs.at(-2).role, 'assistant');
    assert.equal(msgs.at(-1).role, 'user');
    assert.match(msgs.at(-1).content, /^\[Ход «Боб»/);
});

test('3f. Свой промпт: глубина 0 — в конце перед напоминанием; глубина N — перед последними N сообщениями; плейсхолдеры', () => {
    t = setup();
    const { aip } = t;
    const s = aip.settings().s;
    s.customPrompt = '{player} ранен в левую руку';
    s.customRole = 'system';
    s.customDepth = 0;
    let msgs = aip.buildMessages(s, aip.getSync(), 'sys');
    let i = msgs.findIndex(m => m.content === 'Боб ранен в левую руку');
    assert.ok(i > 0, 'свой промпт вставлен, плейсхолдер {player} подставлен');
    assert.equal(msgs[i].role, 'system');
    assert.equal(i, msgs.length - 2, 'глубина 0: сразу перед финальным напоминанием');
    assert.match(msgs.at(-1).content, /^\[Ход «Боб»/);
    // глубина = число сообщений истории → в самом начале истории
    const histLen = t.c.chat.filter(m => !m.is_system && (m.mes || '').trim()).length;
    s.customDepth = histLen;
    msgs = aip.buildMessages(s, aip.getSync(), 'sys');
    i = msgs.findIndex(m => m.content === 'Боб ранен в левую руку');
    assert.ok(i <= 1, `глубина ${histLen}: в начале истории (индекс ${i})`);
    // пустой — не внедряется
    s.customPrompt = '   ';
    msgs = aip.buildMessages(s, aip.getSync(), 'sys');
    assert.ok(!msgs.some(m => /ранен/.test(m.content)));
});

test('3d. Очистка ответа при ходе: <think>, [[OOC]], префикс своего имени, реплика за бота', async () => {
    t = setup({ turnReply: '<think>план хода</think>**Боб**: *кивает* «Привет»\n[[OOC]] заметка для автора [[/OOC]]\nАлиса: «Я тоже рада»' });
    await agentTurn(t);
    assert.equal(t.c.chat.at(-1).mes, '*кивает* «Привет»');
});

test('3e. cleanReply: отдельные случаи', () => {
    t = setup();
    const sync = { personaName: 'Боб', partners: ['Алиса'] };
    const cr = x => t.aip.cleanReply(x, sync);
    assert.equal(cr('<thinking>a\nb</thinking>\nТекст'), 'Текст');
    assert.equal(cr('<THINK>x</THINK>Текст'), 'Текст');
    assert.equal(cr('Боб: текст'), 'текст');
    assert.equal(cr('**Боб**:текст'), 'текст');
    assert.equal(cr('боб : текст'), 'текст');
    assert.equal(cr('Текст\n[[OOC]] до конца без закрытия'), 'Текст');
    assert.equal(cr('Текст [OOC]x[/OOC] ещё'), 'Текст  ещё');
    assert.equal(cr('*действие*\n«речь»\nАлиса: ответ за бота\nещё'), '*действие*\n«речь»');
    assert.equal(cr('*действие*\n**Алиса**: ответ'), '*действие*');
    assert.equal(cr('Говорю об Алиса: и всё'), 'Говорю об Алиса: и всё', 'имя бота не в начале строки — не режем');
    assert.equal(cr(''), '');
});

// ---------------------------------------------------------------- 4
test('4. Изоляция чатов: смена чата во время запроса — ход отброшен', async () => {
    t = setup();
    const release = t.gate('backends/chat-completions/generate');
    const len = t.c.chat.length;
    t.click('#aip_play');
    await waitFor(() => t.calls.some(isTurnCall), { msg: 'запрос хода' });
    t.state.chatId = 'chat-2';
    release();
    await waitFor(() => !t.aip.busy, { msg: 'ход завершён' });
    assert.equal(t.$('#send_textarea').value, '');
    assert.equal(t.c.chat.length, len);
    assert.equal(t.sent.length, 0);
    assert.equal(t.aip.pendingMeta, null);
    assert.ok(t.toasts.some(x => x.type === 'warning' && /отброшен/.test(x.msg)));
});

test('4b. Изоляция: новое сообщение в том же чате во время запроса — ход отброшен', async () => {
    t = setup();
    const release = t.gate('backends/chat-completions/generate');
    t.click('#aip_play');
    await waitFor(() => t.calls.some(isTurnCall));
    t.c.chat.push({ name: 'Алиса', is_user: false, mes: 'Вдруг ещё реплика', send_date: 'z' });
    release();
    await waitFor(() => !t.aip.busy);
    assert.equal(t.sent.length, 0);
    assert.equal(t.$('#send_textarea').value, '');
});

test('4c. CHAT_CHANGED во время запроса — запрос отменяется, без ошибки', async () => {
    t = setup();
    t.gate('backends/chat-completions/generate');
    t.click('#aip_play');
    await waitFor(() => t.calls.some(isTurnCall));
    t.state.chatId = 'chat-2';
    await t.emit(t.event_types.CHAT_CHANGED, 'chat-2');
    await waitFor(() => !t.aip.busy);
    assert.equal(t.calls.find(isTurnCall).signal.aborted, true);
    assert.equal(t.sent.length, 0);
    assert.ok(!t.toasts.some(x => x.type === 'error'), JSON.stringify(t.toasts));
});

// ---------------------------------------------------------------- 5
test('5. Повторное нажатие ▶ во время запроса = отмена (abort)', async () => {
    t = setup();
    t.gate('backends/chat-completions/generate');   // ответ так и не придёт
    t.click('#aip_play');
    await waitFor(() => t.calls.some(isTurnCall));
    assert.ok(t.$('#aip_play').classList.contains('aip-busy'));
    assert.ok(t.$('#aip_play').classList.contains('fa-stop'));
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy, { msg: 'busy снят' });
    assert.equal(t.calls.find(isTurnCall).signal.aborted, true, 'fetch получил abort');
    assert.ok(t.$('#aip_play').classList.contains('fa-play'));
    assert.equal(t.$('#send_textarea').value, '');
    assert.equal(t.sent.length, 0);
    assert.ok(!t.toasts.some(x => x.type === 'error'), 'отмена без сообщения об ошибке');
    assert.equal(t.calls.filter(isTurnCall).length, 1, 'второе нажатие не запускает новый ход');
});

test('5b. Отмена до начала запроса к модели (повторное ▶, пока идёт profileHasKey) — generate не уходит', async () => {
    t = setup();
    const release = t.gate('secrets/read');
    t.click('#aip_play');
    await waitFor(() => t.calls.some(c => c.url.endsWith('/api/secrets/read')));
    t.click('#aip_play');           // отмена
    release();
    await waitFor(() => !t.aip.busy);
    await sleep(20);
    assert.equal(t.sent.length, 0);
    assert.equal(t.calls.filter(isGenerate).length, 0,
        'после отмены не должно быть платного запроса к модели (callModel игнорирует уже отменённый signal)');
});

// ---------------------------------------------------------------- 6
test('6. MESSAGE_SENT помечает ход агента extra.aip', async () => {
    t = setup();
    const id = await agentTurn(t);
    const aip = t.c.chat[id].extra?.aip;
    assert.ok(aip, 'есть extra.aip');
    assert.equal(aip.model, 'gpt-test');
    assert.equal(aip.profileId, 'p1');
    assert.equal(aip.profile, 'Тест');
    assert.equal(aip.provider, 'openai');
    assert.equal(aip.edited, false);
    assert.equal(aip.words, 4);
    assert.equal(aip.inRange, false);
    assert.equal(aip.temperature, 0.7);
    assert.deepEqual(aip.usage, { total_tokens: 42 });
    assert.ok(t.counters.saveChat > 0);
    assert.equal(t.aip.pendingMeta, null);
    assert.ok(!('secretId' in aip));
});

test('6b. Пользователь заменил текст хода своим — сообщение не помечается', async () => {
    t = setup();
    t.s().autoSend = false;
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    assert.equal(t.$('#send_textarea').value, '*кивает* «Мне эля, пожалуйста»', 'ход вставлен в поле ввода');
    assert.equal(t.sent.length, 0, 'autoSend выкл. — не отправлено');
    assert.ok(t.aip.pendingMeta);
    t.$('#send_textarea').value = 'Совсем другой текст, написанный человеком';
    t.click('#send_but');
    await t.sendDone;
    assert.equal(t.c.chat.at(-1).extra?.aip, undefined);
    assert.equal(t.aip.pendingMeta, null);
});

test('6c. Пользователь дописал ход агента — помечается с edited: true', async () => {
    t = setup();
    t.s().autoSend = false;
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    t.$('#send_textarea').value += ' И ещё кое-что.';
    t.click('#send_but');
    await t.sendDone;
    assert.equal(t.c.chat.at(-1).extra?.aip?.edited, true);
});

// ---------------------------------------------------------------- 7
test('7. MESSAGE_RECEIVED после хода агента → «мысль» в chatMetadata.aip_log и карточка в окне', async () => {
    t = setup();
    await agentTurn(t);
    const botId = await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1, { msg: 'запись в aip_log' });
    const rc = t.calls.filter(isReactionCall);
    assert.equal(rc.length, 1);
    const b = rc[0].body;
    assert.equal(b.messages[0].role, 'system');
    assert.match(b.messages[0].content, /выйди из роли/);
    assert.doesNotMatch(b.messages[0].content, /Критерии:/);   // мысль участника, а не диагностика
    assert.match(b.messages[0].content, /«Боб»/);
    assert.match(b.messages[1].content, /\[ТЫ\] Боб: \*кивает\*/);
    assert.match(b.messages[1].content, /Держи эль/);
    assert.equal(b.secret_id, 'k1');
    const e = t.c.chatMetadata.aip_log[0];
    assert.equal(e.mesId, botId);
    assert.equal(e.swipeId, 0);
    assert.equal(e.bot, 'Алиса');
    assert.equal(e.playerModel, 'gpt-test');
    assert.equal(e.botModel, 'bot-model');
    assert.equal(e.text, REACTION_TEXT);
    assert.ok(t.counters.saveMetadata > 0);
    const items = t.doc.querySelectorAll('#aip_thoughts .aip-th-item');
    assert.equal(items.length, 1);
    assert.match(items[0].querySelector('.aip-score').textContent, /7\/10/);
    assert.equal(t.$('#aip_thoughts .aip-th-count').textContent, '1');
    assert.ok(t.$('#aip_thoughts').classList.contains('aip-open'));
    assert.ok(!t.$('#aip_thoughts').classList.contains('aip-empty'));
});

test('7b. Мысли выключены кнопкой питания (setReactions false) — запроса нет', async () => {
    t = setup();
    t.click('#aip_thoughts [data-act="power"]');
    assert.equal(t.s().reactions, false);
    assert.ok(t.$('#aip_thoughts').classList.contains('aip-off'));
    assert.match(t.$('#aip_menu_th span').textContent, /выкл/);
    await agentTurn(t);
    await botReply(t);
    await sleep(30);
    assert.equal(t.calls.filter(isReactionCall).length, 0);
    assert.equal(t.c.chatMetadata.aip_log, undefined);
});

test('7c. Мысли выключены в настройках (s.reactions = false) — запроса нет', async () => {
    t = setup();
    await agentTurn(t);
    t.s().reactions = false;
    await botReply(t);
    await sleep(30);
    assert.equal(t.calls.filter(isReactionCall).length, 0);
});

test('7d. Ответ бота на ручное сообщение пользователя — запроса нет', async () => {
    t = setup();
    t.c.chat.push({ name: 'Боб', is_user: true, mes: 'Пишу сам', send_date: 'm' });
    await botReply(t);
    await sleep(30);
    assert.equal(t.calls.filter(isGenerate).length, 0);
});

test('7e. Повтор того же id/свайпа не дублирует мысль; новый свайп — новая мысль', async () => {
    t = setup();
    await agentTurn(t);
    const id = await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    await t.emit(t.event_types.MESSAGE_RECEIVED, id);
    await t.emit(t.event_types.MESSAGE_RECEIVED, id);
    await sleep(30);
    assert.equal(t.calls.filter(isReactionCall).length, 1);
    assert.equal(t.c.chatMetadata.aip_log.length, 1);
    // свайп (ST: swipe_id++, новый send_date, MESSAGE_RECEIVED (id, 'swipe'))
    await botSwipe(t, id, 'Другой вариант ответа');
    await waitFor(() => t.c.chatMetadata.aip_log.length === 2, { msg: 'мысль на свайп' });
    assert.equal(t.c.chatMetadata.aip_log[1].swipeId, 1);
    assert.match(t.doc.querySelectorAll('#aip_thoughts .aip-th-id')[1].textContent, /свайп 2/);
    // повтор события на тот же свайп — без дубля
    await t.emit(t.event_types.MESSAGE_RECEIVED, id, 'swipe');
    await sleep(30);
    assert.equal(t.c.chatMetadata.aip_log.length, 2);
});

test('7f. Перегенерация (сообщение удалено и создано заново с тем же id, новый send_date) → новая мысль; повтор — без дубля', async () => {
    t = setup();
    await agentTurn(t);
    const id = await botReply(t, 'Первый ответ бота');
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    const firstDate = t.c.chat[id].send_date;
    // «Regenerate» в ST: deleteLastMessage(), затем новое сообщение с тем же индексом, swipe_id 0 и новым send_date
    const id2 = await regenerate(t, 'Совсем новый ответ после перегенерации');
    assert.equal(id2, id);
    assert.notEqual(t.c.chat[id2].send_date, firstDate);
    // мысль о старом (удалённом) ответе убрана, о новом — появилась
    await waitFor(() => t.calls.filter(isReactionCall).length === 2 && t.c.chatMetadata.aip_log.length === 1
        && t.c.chatMetadata.aip_log[0].sendDate === t.c.chat[id2].send_date, { msg: 'мысль на перегенерацию' });
    assert.match(t.calls.filter(isReactionCall)[1].body.messages[1].content, /Совсем новый ответ/);
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 1, 'в окне только мысль о новом ответе');
    // тот же самый ответ ещё раз (повторное событие) — дубля нет
    await t.emit(t.event_types.MESSAGE_RECEIVED, id2, 'regenerate');
    await sleep(30);
    assert.equal(t.calls.filter(isReactionCall).length, 2);
    assert.equal(t.c.chatMetadata.aip_log.length, 1);
});

test('7j. Удалили ответ бота — мысль о нём исчезает из лога и окна', async () => {
    t = setup();
    await agentTurn(t);
    await botReply(t, 'Ответ, который удалят');
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 1);
    t.c.chat.length = t.c.chat.length - 1;                       // «Удалить сообщение» в ST
    await t.emit(t.event_types.MESSAGE_DELETED, t.c.chat.length);
    await sleep(10);
    assert.equal(t.c.chatMetadata.aip_log.length, 0, 'мысль о удалённом сообщении убрана из лога');
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 0, 'и из окна');
});

test('7k. Мысли другого чата (скопированные с метаданными) не показываются и вычищаются', async () => {
    t = setup();
    await agentTurn(t);
    await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    // ветка/копия: метаданные с мыслью переехали в чат с другим id
    t.state.chatId = 'other-chat';
    await t.emit(t.event_types.CHAT_CHANGED, 'other-chat');
    await sleep(10);
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 0, 'чужая мысль не показывается');
    assert.equal(t.c.chatMetadata.aip_log.length, 0, 'и удалена из метаданных этого чата');
});

for (const type of ['first_message', 'command', 'extension']) {
    test(`7g. MESSAGE_RECEIVED с type '${type}' — мысль не запрашивается`, async () => {
        t = setup();
        await agentTurn(t);
        await botReply(t, 'Сообщение не от генерации', undefined, type);
        await sleep(30);
        assert.equal(t.calls.filter(isReactionCall).length, 0);
        assert.equal(t.c.chatMetadata.aip_log, undefined);
    });
}

test('7h. Выключение мыслей во время запроса мыслей → запрос отменён, в aip_log ничего', async () => {
    t = setup();
    await agentTurn(t);
    const release = t.gate('backends/chat-completions/generate');
    await botReply(t);
    await waitFor(() => t.calls.some(isReactionCall), { msg: 'запрос мыслей ушёл' });
    t.click('#aip_thoughts [data-act="power"]');
    assert.equal(t.s().reactions, false);
    assert.equal(t.calls.find(isReactionCall).signal.aborted, true, 'запрос мыслей получил abort');
    release();
    await sleep(30);
    assert.equal(t.c.chatMetadata.aip_log, undefined);
    assert.equal(t.doc.querySelectorAll('#aip_thoughts .aip-th-item').length, 0);
    assert.ok(!t.toasts.some(x => x.type === 'warning' && /вывод не получен/.test(x.msg)), 'отмена без предупреждения');
});

test('7i. Закрытие окна мыслей снимает aip-has-new', async () => {
    t = setup();
    await agentTurn(t);
    await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    const panel = t.$('#aip_thoughts');
    assert.ok(panel.classList.contains('aip-open'));
    panel.classList.add('aip-has-new');          // «Новая мысль» видна, пока пользователь листал старое
    t.click('#aip_thoughts [data-act="close"]');
    assert.ok(!panel.classList.contains('aip-open'));
    assert.ok(!panel.classList.contains('aip-has-new'), 'невидимая кнопка «Новая мысль» не должна оставаться');
    assert.equal(t.s().thoughtsHidden, true);
});

// ---------------------------------------------------------------- 8
test('8. Ключи: сохранение с меткой «AI Player · …», rotate на прежний, список, выбор, удаление', async () => {
    t = setup({
        extensionSettings: { ai_player: { profiles: [{ ...PROFILE(), secretId: null }], activeProfile: 'p1', lastVersion: '0.2.8' } },
        secrets: {
            api_key_custom: [
                { id: 't1', label: 'api_key_custom', value: 'sk-tavern-main-2222', active: true },
                { id: 'other', label: 'Чужой ключ', value: 'sk-other-3333', active: false },
            ],
        },
    });
    t.click('#aip_menu');
    const sel = t.$('#aip_keySelect');
    const K = newId(1);
    // 0.3.0: у таверны есть ключ → заглушки «ключей нет» нет, только пункт «ключ таверны»
    await waitFor(() => sel.options.length === 1 && sel.options[0].value === '', { msg: 'список: только ключ таверны' });
    assert.ok(t.$('#aip_addKey').open, 'блок «Добавить ключ» раскрыт — своих ключей нет');
    assert.equal(t.$('#aip_keyState').dataset.state, 'shared');

    t.$('#aip_keyLabel').value = 'Основной';
    t.$('#aip_keyInput').value = 'sk-secret-ABCD';
    t.click('#aip_keySave');
    await waitFor(() => t.s().profiles[0].secretId === K, { msg: 'ключ выбран в профиле' });
    const writes = t.calls.filter(c => isSecretCall(c, 'write'));
    assert.equal(writes.length, 1, 'заглушка не нужна — у таверны есть активный ключ');
    assert.deepEqual(writes[0].body, { key: 'api_key_custom', value: 'sk-secret-ABCD', label: 'AI Player · Основной' });
    const rotate = t.calls.find(c => isSecretCall(c, 'rotate'));
    assert.ok(rotate, 'был rotate');
    assert.deepEqual(rotate.body, { key: 'api_key_custom', id: 't1' }, 'таверне возвращён прежний активный ключ');
    assert.ok(t.calls.indexOf(rotate) > t.calls.indexOf(writes[0]));
    assert.equal(t.secrets.api_key_custom.find(x => x.active).id, 't1', 'в хранилище активен ключ таверны');
    assert.equal(t.$('#aip_keyInput').value, '', 'поле ключа очищено');
    assert.ok(!JSON.stringify(t.c.extensionSettings).includes('sk-secret-ABCD'), 'ключ не в настройках');

    await waitFor(() => [...sel.options].some(o => o.value === K), { msg: 'новый ключ в списке' });
    assert.deepEqual([...sel.options].map(o => o.value), [K, ''], 'только ключи AI Player + ключ таверны');
    assert.match(sel.options[0].textContent, /Основной/);
    assert.match(sel.options[0].textContent, /…BCD/, 'ST отдаёт *******BCD — видны 3 последних символа');
    assert.ok(!sel.options[0].textContent.includes('sk-secret'), 'полный ключ в браузер не попадает');
    assert.match(sel.options[1].textContent, /таверны/);
    assert.equal(sel.value, K);

    // выбор ключа таверны
    t.input('#aip_keySelect', '', 'change');
    assert.equal(t.s().profiles[0].secretId, null);
    // и обратно
    t.input('#aip_keySelect', K, 'change');
    assert.equal(t.s().profiles[0].secretId, K);

    // удаление
    await waitFor(() => sel.value === K);
    t.click('#aip_keyDel');
    await waitFor(() => t.calls.some(c => isSecretCall(c, 'delete')), { msg: 'delete' });
    const del = t.calls.find(c => isSecretCall(c, 'delete'));
    assert.deepEqual(del.body, { key: 'api_key_custom', id: K });
    assert.ok(t.confirms.some(m => m.includes('Основной')));
    await waitFor(() => t.s().profiles[0].secretId === null);
    await waitFor(() => ![...sel.options].some(o => o.value === K), { msg: 'ключ пропал из списка' });
    assert.deepEqual(t.secrets.api_key_custom.map(x => x.id), ['t1', 'other']);
});

test('8c. Первый ключ, у таверны ключей нет → write ключа, затем write пустой заглушки; заглушка не в списке', async () => {
    t = setup({
        extensionSettings: { ai_player: { profiles: [{ ...PROFILE(), secretId: null }], activeProfile: 'p1', lastVersion: '0.3.0' } },
        secrets: {},
    });
    t.click('#aip_menu');
    const sel = t.$('#aip_keySelect');
    await waitFor(() => sel.options.length && sel.options[0].value === '__none', { msg: '«ключей расширения нет»' });
    assert.equal(t.$('#aip_keyState').dataset.state, 'none');
    t.$('#aip_keyLabel').value = 'Первый';
    t.$('#aip_keyInput').value = 'sk-first-key-XYZ';
    t.click('#aip_keySave');
    await waitFor(() => t.s().profiles[0].secretId === newId(1), { msg: 'ключ выбран' });
    const writes = t.calls.filter(c => isSecretCall(c, 'write'));
    assert.equal(writes.length, 2);
    assert.deepEqual(writes[0].body, { key: 'api_key_custom', value: 'sk-first-key-XYZ', label: 'AI Player · Первый' });
    assert.deepEqual(writes[1].body, { key: 'api_key_custom', value: '', label: t.aip.PLACEHOLDER_LABEL });
    assert.match(t.aip.PLACEHOLDER_LABEL, /^Пусто — заглушка AI Player/);
    assert.ok(!t.calls.some(c => isSecretCall(c, 'rotate')), 'возвращать нечего — rotate не нужен');
    // в хранилище активна пустая заглушка — основной API таверны не получит ключ расширения
    const active = t.secrets.api_key_custom.find(x => x.active);
    assert.equal(active.label, t.aip.PLACEHOLDER_LABEL);
    assert.equal(active.value, '');
    await waitFor(() => [...sel.options].some(o => o.value === newId(1)), { msg: 'ключ в списке' });
    assert.deepEqual([...sel.options].map(o => o.value), [newId(1)], 'заглушка и «ключ таверны» не показываются');
    assert.ok(![...sel.options].some(o => /Пусто|заглушка/.test(o.textContent)));
    assert.equal(t.$('#aip_keyState').dataset.state, 'ok');

    // второй ключ: прежний активный — заглушка → rotate на неё, новой заглушки нет
    t.$('#aip_keyLabel').value = 'Второй';
    t.$('#aip_keyInput').value = 'sk-second-key-QWE';
    t.click('#aip_keySave');
    await waitFor(() => t.s().profiles[0].secretId === newId(3), { msg: 'второй ключ выбран' });
    assert.equal(t.calls.filter(c => isSecretCall(c, 'write')).length, 3);
    const rot = t.calls.filter(c => isSecretCall(c, 'rotate'));
    assert.equal(rot.length, 1);
    assert.deepEqual(rot[0].body, { key: 'api_key_custom', id: newId(2) });
    assert.equal(t.secrets.api_key_custom.find(x => x.active).id, newId(2));
});

test('8d. [БАГ] Остался только ключ-заглушка (ключ расширения удалён) — ▶ всё равно шлёт запрос с пустым ключом', async () => {
    t = setup({
        extensionSettings: { ai_player: { profiles: [{ ...PROFILE(), secretId: null }], activeProfile: 'p1', lastVersion: '0.3.0' } },
        secrets: { api_key_custom: [{ id: 'ph', label: 'Пусто — заглушка AI Player (ключ таверны не задан)', value: '', active: true }] },
    });
    t.click('#aip_menu');
    await waitFor(() => t.$('#aip_keyState').dataset.state === 'none', { msg: 'окно: «Ключа нет»' });
    assert.match(t.$('#aip_keyState').textContent, /Ключа нет/);
    t.click('#aip_close');
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    await sleep(10);
    assert.equal(t.generateCalls().length, 0,
        'окно говорит «Ключа нет», а profileHasKey считает пустую заглушку ключом (list.length > 0) — платный/ошибочный запрос уходит с пустым ключом');
    assert.ok(t.toasts.some(x => x.type === 'warning' && /Сохраните API-ключ/.test(x.msg)));
});

test('8e. Сбой /api/secrets/read (200 и {}) — выбор ключа не сбрасывается, статус «Не удалось прочитать хранилище»', async () => {
    t = setup();
    t.env.secretsReadBroken = true;
    t.click('#aip_menu');
    await waitFor(() => /Не удалось прочитать хранилище/.test(t.$('#aip_keyState').textContent), { msg: 'статус сбоя' });
    assert.equal(t.s().profiles[0].secretId, 'k1', 'secretId не сброшен');
    assert.equal(t.$('#aip_keySelect').disabled, true);
    assert.equal(t.$('#aip_keyState').dataset.state, 'none');
    // ▶ при сбое хранилища — запроса нет
    t.click('#aip_close');
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    assert.equal(t.generateCalls().length, 0);
    assert.equal(t.s().profiles[0].secretId, 'k1');
});

test('8f. Удаление профиля, чей ключ выбран и в другом профиле — /api/secrets/delete не вызывается', async () => {
    t = setup({
        extensionSettings: { ai_player: { profiles: [PROFILE(), { ...PROFILE(), id: 'p2', name: 'Второй' }], activeProfile: 'p1', lastVersion: '0.3.0' } },
    });
    t.click('#aip_menu');
    t.click('#aip_profDel');
    await waitFor(() => t.s().profiles.length === 1, { msg: 'профиль удалён' });
    assert.ok(!t.calls.some(c => isSecretCall(c, 'delete')));
    assert.ok(t.confirms.some(m => /Ключ останется/.test(m)));
    assert.equal(t.s().activeProfile, 'p2');
    assert.ok(t.secrets.api_key_custom.some(x => x.id === 'k1'), 'ключ остался в хранилище');
});

test('8g. Удаление профиля с собственным ключом — ключ удаляется из хранилища', async () => {
    t = setup({
        extensionSettings: { ai_player: { profiles: [PROFILE(), { ...PROFILE(), id: 'p2', name: 'Второй', secretId: 't1' }], activeProfile: 'p1', lastVersion: '0.3.0' } },
    });
    t.click('#aip_menu');
    t.click('#aip_profDel');
    await waitFor(() => t.s().profiles.length === 1, { msg: 'профиль удалён' });
    const del = t.calls.filter(c => isSecretCall(c, 'delete'));
    assert.equal(del.length, 1);
    assert.deepEqual(del[0].body, { key: 'api_key_custom', id: 'k1' });
    assert.ok(!t.toasts.some(x => x.type === 'warning'), 'ответ 204 без тела — не ошибка');
    assert.ok(!t.secrets.api_key_custom.some(x => x.id === 'k1'));
});

test('8b. Ключи: отмена confirm при удалении — ничего не удаляется', async () => {
    t = setup();
    t.click('#aip_menu');
    await waitFor(() => t.$('#aip_keySelect').value === 'k1');
    t.env.confirmAnswer = false;
    t.click('#aip_keyDel');
    await sleep(30);
    assert.ok(!t.calls.some(c => c.url.endsWith('/api/secrets/delete')));
    assert.equal(t.s().profiles[0].secretId, 'k1');
});

// ---------------------------------------------------------------- 9
test('9. Шкала контекста: проценты и сегменты', async () => {
    t = setup();
    t.click('#aip_menu');
    await t.aip.updateCtxMeter();
    const txt = t.$('#aip_ctxText').textContent;
    const { aip } = t;
    const s = aip.settings().s;
    const sync = aip.getSync();
    const system = aip.buildSystemPrompt(s, sync);
    const msgs = aip.buildMessages(s, sync, system);
    const sys = Math.ceil(system.length / 4);
    const hist = Math.ceil(msgs.map(m => m.content).join('\n\n').length / 4);
    const pct = Math.round((sys + hist + 1200) / 32000 * 100);
    assert.match(txt, new RegExp(`\\(${pct}%\\)`), txt);
    assert.match(txt, /\/ 32k/);
    assert.match(txt, /сообщений 3\/3/);
    assert.doesNotMatch(txt, /не влезло/);
    assert.equal(t.$('#aip_ctx').dataset.level, 'ok');
    const w = k => parseFloat(t.$(`#aip_ctx_${k}`).style.width);
    assert.ok(Math.abs(w('res') - 1200 / 32000 * 100) < 1e-9);
    assert.ok(w('sys') > 0 && w('hist') > 0);
});

test('9b. Шкала контекста: маленький contextSize → «не влезло», приветствие сохраняется', async () => {
    t = setup({ chat: longChat(20) });
    // сводный системный промпт ~1000 токенов, поэтому лимит 3000: история всё равно не влезает целиком
    t.s().profiles[0].contextSize = 3000;
    t.s().maxTokens = 100;
    t.click('#aip_menu');
    await t.aip.updateCtxMeter();
    const txt = t.$('#aip_ctxText').textContent;
    assert.match(txt, /\d+ не влезло/, txt);
    assert.match(txt, /сообщений \d+\/20/);
    // после обрезки история влезает в лимит — шкала не «переполнена»
    assert.ok(['ok', 'high'].includes(t.$('#aip_ctx').dataset.level), t.$('#aip_ctx').dataset.level);
    const sum = ['sys', 'hist', 'res'].reduce((a, k) => a + parseFloat(t.$(`#aip_ctx_${k}`).style.width), 0);
    assert.ok(sum <= 100.0001, `сумма сегментов ${sum}`);
    const s = t.aip.settings().s;
    const sync = t.aip.getSync();
    const msgs = t.aip.buildMessages(s, sync, t.aip.buildSystemPrompt(s, sync));
    assert.ok(msgs[0].content.startsWith('Алиса: Добро пожаловать в таверну!'));
    assert.match(msgs[0].content, /пропущена/);
    assert.ok(msgs.meta.trimmed > 0);
    assert.ok(msgs.meta.included < 20);
    // резерв ответа больше лимита модели → «переполнено»
    t.s().maxTokens = 4000;
    await t.aip.updateCtxMeter();
    assert.equal(t.$('#aip_ctx').dataset.level, 'over');
    assert.ok(parseFloat(t.$('#aip_ctx_res').style.width) <= 100);
});

test('9c. Шкала контекста: чат не открыт', async () => {
    t = setup({ chatId: null });
    t.click('#aip_menu');
    await t.aip.updateCtxMeter();
    assert.equal(t.$('#aip_ctx').dataset.level, 'empty');
    assert.match(t.$('#aip_ctxText').textContent, /чат не открыт/);
});

// ---------------------------------------------------------------- 10
test('10. Редактор промптов: плейсхолдеры подставляются, сброс к стандартному', async () => {
    t = setup();
    t.click('#aip_menu');
    t.click('.aip-tab[data-tab="prompts"]');
    t.input('#aip_promptKey', 'turn', 'change');
    const ta = t.$('#aip_promptText');
    assert.equal(ta.value, t.aip.PROMPT_DEFAULTS.turn);
    assert.match(t.$('#aip_promptState').textContent, /Стандартный/);
    t.input('#aip_promptText', 'Ход {player} против {partner}: {min}-{max} слов, {them}. {{user}}/{{char}} {unknown}');
    assert.equal(t.s().prompts.turn, 'Ход {player} против {partner}: {min}-{max} слов, {them}. {{user}}/{{char}} {unknown}');
    assert.match(t.$('#aip_promptState').textContent, /Свой промпт/);
    t.click('#aip_promptPreview');
    assert.equal(t.$('#aip_promptOut').textContent, 'Ход Боб против Алиса: 50-200 слов, «Алиса». Боб/Алиса {unknown}');
    assert.ok(!t.$('#aip_promptOut').classList.contains('aip-hidden'));
    // свой промпт уходит в запрос
    await agentTurn(t);
    assert.match(t.calls.find(isTurnCall).body.messages.at(-1).content, /Ход Боб против Алиса: 50-200 слов/);
    // текст, равный стандартному, хранится как пустой
    t.input('#aip_promptText', t.aip.PROMPT_DEFAULTS.turn);
    assert.equal(t.s().prompts.turn, '');
    // сброс
    t.input('#aip_promptText', 'что-то своё');
    t.click('#aip_promptReset');
    assert.ok(t.confirms.some(m => m.includes('Напоминание перед ходом')));
    assert.equal(t.s().prompts.turn, '');
    assert.equal(ta.value, t.aip.PROMPT_DEFAULTS.turn);
    assert.match(t.$('#aip_promptState').textContent, /Стандартный/);
    // плейсхолдеры перечислены
    t.click('#aip_promptVars');
    assert.match(t.$('#aip_promptOut').textContent, /\{player\} — имя персоны/);
});

test('10b. renderPrompt: макросы ST {{scenario}} / {{persona}} / {{user}} не портятся, {scenario} подставляется', () => {
    t = setup({ card: { scenario: 'Сценарий карты' } });
    const s = t.aip.settings().s;
    s.prompts.system = 'Сцена: {{scenario}}. Я: {{persona}}. Игрок {{user}}. Своё: {scenario}.';
    const out = t.aip.renderPrompt(s, t.aip.getSync(), 'system');
    assert.equal(out, 'Сцена: Сценарий карты. Я: Боб — циничный наёмник. Игрок Боб. Своё: Сценарий карты.');
    // без макросов ST видно, что сами {{…}} расширение не трогает
    t.c.substituteParams = undefined;
    const raw = t.aip.renderPrompt(s, t.aip.getSync(), 'system');
    assert.equal(raw, 'Сцена: {{scenario}}. Я: {{persona}}. Игрок {{user}}. Своё: Сценарий карты.');
});

// ---------------------------------------------------------------- 11
test('11. Экспорт JSON: turns без ключей/secretId', async () => {
    t = setup({
        extensionSettings: { ai_player: { profiles: [{ ...PROFILE(), secretId: 'k_secret_id_xyz' }], activeProfile: 'p1', lastVersion: '0.2.8' } },
        secrets: { api_key_custom: [{ id: 'k_secret_id_xyz', label: 'AI Player · Экспорт', value: 'sk-export-key-9999', active: false }] },
    });
    t.c.chat.push({ name: 'Боб', is_user: true, mes: 'Ручной ход', send_date: 'h' });
    t.c.chat.push({ name: 'Алиса', is_user: false, mes: 'Ответ', send_date: 'h2', extra: { model: 'bot-model', api: 'openai' } });
    t.c.chat.push({ name: 'Система', is_system: true, mes: 'служебное', send_date: 'sys' });
    await agentTurn(t);
    await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    t.click('#aip_menu');
    t.click('#aip_expJSON');
    assert.equal(t.blobs.length, 1);
    const text = await t.blobs[0].text();
    const d = JSON.parse(text);
    assert.equal(d.format, 'ai-player-match/2');
    assert.equal(d.chatId, 'chat-1');
    assert.equal(d.character, 'Алиса');
    assert.equal(d.persona, 'Боб');
    assert.equal(d.turns.length, t.c.chat.length - 1, 'системные сообщения не экспортируются');
    const agent = d.turns.filter(x => x.side === 'agent');
    assert.equal(agent.length, 1);
    assert.equal(agent[0].model, 'gpt-test');
    assert.equal(agent[0].player_meta.profileId, 'p1');
    assert.ok(d.turns.some(x => x.side === 'human' && x.text === 'Ручной ход'));
    assert.ok(d.turns.some(x => x.side === 'bot' && x.model === 'bot-model' && x.api === 'openai'));
    const last = d.turns.at(-1);
    assert.equal(last.reactions.length, 1);
    assert.equal(last.reactions[0].text, REACTION_TEXT);
    assert.ok(!/secretId|secret_id|k_secret_id_xyz|sk-|api_key/i.test(text), 'в экспорте нет ключей/secretId');
    assert.ok(!('profiles' in d.settings));
});

const exportJSON = async t => {
    t.click('#aip_menu');
    t.click('#aip_expJSON');
    return JSON.parse(await t.blobs.at(-1).text());
};

test('11b. Экспорт: мысль привязана к сообщению по sendDate после удаления сообщения выше', async () => {
    t = setup();
    await agentTurn(t);
    const botId = await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    const botDate = t.c.chat[botId].send_date;
    // удаляем сообщение выше (индексы сдвигаются), затем на старое место бота встаёт другое сообщение
    t.c.chat.splice(1, 1);
    await t.emit(t.event_types.MESSAGE_DELETED, 1);
    t.c.chat.push({ name: 'Боб', is_user: true, mes: 'Ручная реплика', send_date: new Date(t.tick()).toISOString(), extra: {} });
    assert.equal(t.c.chat[botId].mes, 'Ручная реплика', 'на старом индексе теперь другое сообщение');
    const d = await exportJSON(t);
    const bot = d.turns.find(x => x.time === botDate);
    assert.equal(bot.index, botId - 1);
    assert.equal(bot.reactions.length, 1, 'мысль осталась у своего ответа бота');
    assert.equal(bot.reactions[0].text, REACTION_TEXT);
    assert.equal(d.turns.find(x => x.index === botId).reactions.length, 0, 'не прилипла к сообщению на старом индексе');
});

test('11c. После «Продолжить» (continue) мысль о ответе сохраняется (в логе, окне и экспорте)', async () => {
    t = setup();
    await agentTurn(t);
    const botId = await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1);
    // ST continue: mes дописывается, send_date и swipe_info[swipe_id].send_date перезаписываются
    await botContinue(t, botId, ' И ещё кое-что.');
    await sleep(30);
    const log = t.c.chatMetadata.aip_log;
    const d = await exportJSON(t);
    const exported = d.turns.reduce((a, x) => a + x.reactions.length, 0);
    assert.equal(log.length, 1, 'мысль не потерялась');
    assert.equal(exported, 1, `в экспорте ${exported}`);
    t.aip.renderThoughts();
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 1, 'и в окне после перерисовки');
});

// ---------------------------------------------------------------- 12
test('12. ▶ без открытого чата (getCurrentChatId = null) — предупреждение, запросов нет', async () => {
    t = setup({ chatId: null });
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    await sleep(10);
    assert.ok(t.toasts.some(x => x.type === 'warning' && /Откройте чат/.test(x.msg)), JSON.stringify(t.toasts));
    assert.equal(t.calls.length, 0, 'ни secrets/read, ни generate');
    assert.equal(t.sent.length, 0);
});

test('12b. ▶ при characterId undefined и без groupId — предупреждение, запросов нет', async () => {
    t = setup();
    t.c.characterId = undefined;
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    await sleep(10);
    assert.ok(t.toasts.some(x => x.type === 'warning' && /Откройте чат/.test(x.msg)));
    assert.equal(t.calls.length, 0);
});

// ---------------------------------------------------------------- 13
const withModel = (patch, extra = {}) => setup({
    extensionSettings: { ai_player: { profiles: [{ ...PROFILE(), ...patch }], activeProfile: 'p1', lastVersion: '0.3.0' } },
    ...extra,
});

for (const model of ['o3', 'gpt-5-mini']) {
    test(`13. Тело запроса reasoning-модели (${model}, custom): max_completion_tokens, без temperature и stop`, async () => {
        t = withModel({ model });
        await agentTurn(t);
        const b = t.calls.find(isTurnCall).body;
        assert.equal(b.chat_completion_source, 'custom');
        assert.equal(b.max_completion_tokens, 1200);
        assert.ok(!('max_tokens' in b), 'max_tokens не передаётся');
        assert.ok(!('temperature' in b), 'temperature не передаётся');
        assert.ok(!('stop' in b), 'stop не передаётся');
        assert.equal(b.secret_id, 'k1');
        // мысли — тоже через max_completion_tokens
        await botReply(t);
        await waitFor(() => t.c.chatMetadata.aip_log?.length === 1, { msg: 'мысль от reasoning-модели' });
        const r = t.calls.find(isReactionCall).body;
        assert.equal(r.max_completion_tokens, 600);   // лимит «мыслей» для custom
        assert.ok(!('max_tokens' in r) && !('temperature' in r));
    });
}

test('13b. Тело запроса claude-sonnet-5 (Anthropic): без temperature, max_tokens, use_sysprompt, secret_id', async () => {
    t = withModel({ provider: 'anthropic', url: '', model: 'claude-sonnet-5', secretId: 'c1' }, {
        secrets: { api_key_claude: [{ id: 'c1', label: 'AI Player · Claude', value: 'sk-ant-api03-xxxxxxxx', active: false }, { id: 'c0', label: 'tavern', value: 'sk-ant-tavern-0000', active: true }] },
    });
    await agentTurn(t);
    const b = t.calls.find(isTurnCall).body;
    assert.equal(b.chat_completion_source, 'claude');
    assert.equal(b.model, 'claude-sonnet-5');
    assert.ok(!('temperature' in b), 'Claude 5 не принимает temperature');
    assert.equal(b.max_tokens, 1200);
    assert.ok(!('max_completion_tokens' in b));
    assert.equal(b.use_sysprompt, true);
    assert.equal(b.secret_id, 'c1');
    assert.ok(!('custom_url' in b) && !('reverse_proxy' in b));
    assert.ok(b.stop.length <= 4);
    // ST кладёт в choices только content[0].text (у думающей модели это thinking) — текст берётся из content
    assert.equal(t.c.chat.at(-1).mes, '*кивает* «Мне эля, пожалуйста»');
});

test('13c. Стоп-строки обрезаются до 4 (группа из 3 персонажей → 6 строк)', async () => {
    t = setup();
    Object.assign(t.c, {
        groupId: 'g1', characterId: undefined,
        groups: [{ id: 'g1', name: 'Компания', members: ['a.png', 'b.png', 'c.png'] }],
        characters: [
            { name: 'Алиса', avatar: 'a.png', description: 'трактирщица', scenario: 'Таверна' },
            { name: 'Вика', avatar: 'b.png', description: 'бард' },
            { name: 'Гоша', avatar: 'c.png', description: 'вышибала' },
        ],
    });
    await agentTurn(t);
    const b = t.calls.find(isTurnCall).body;
    assert.equal(b.stop.length, 4);
    assert.deepEqual(b.stop, ['\nАлиса:', '\n**Алиса**:', '\nВика:', '\n**Вика**:']);
    assert.equal(b.temperature, 0.7);
});

// ---------------------------------------------------------------- 14
const PROXY = { provider: 'claude_proxy', url: 'https://proxy.example/proxy/anthropic/', model: 'claude-opus-5', proxyPassword: 'pw-123', secretId: 'k1' };

test('14. Claude через реверс-прокси: тело запроса без secret_id, с reverse_proxy/proxy_password; ключи не читаются', async () => {
    t = withModel(PROXY);
    await agentTurn(t);
    const b = t.calls.find(isTurnCall).body;
    assert.equal(b.chat_completion_source, 'claude');
    assert.equal(b.reverse_proxy, 'https://proxy.example/proxy/anthropic');
    assert.equal(b.proxy_password, 'pw-123');
    assert.equal(b.use_sysprompt, true);
    assert.ok(!('secret_id' in b), 'secret_id не передаётся');
    assert.ok(!('custom_url' in b));
    assert.ok(!('temperature' in b), 'claude-opus-5 — без temperature');
    assert.ok(!t.calls.some(c => isSecretCall(c, 'read')), 'profileHasKey не обращается к /api/secrets/read');
    assert.equal(t.c.chat.at(-1).mes, '*кивает* «Мне эля, пожалуйста»');
});

test('14b. Claude через реверс-прокси: в окне скрыт блок ключей, виден блок пароля прокси', async () => {
    t = withModel(PROXY);
    t.click('#aip_menu');
    await sleep(300);           // шкала контекста и прочие асинхронные обновления
    assert.equal(t.$('#aip_keyWrap').style.display, 'none');
    assert.equal(t.$('#aip_proxyWrap').style.display, '');
    assert.equal(t.$('#aip_urlWrap').style.display, '');
    assert.equal(t.$('#aip_p_proxyPassword').value, 'pw-123');
    assert.match(t.$('#aip_urlLabel').textContent, /реверс-прокси/);
    assert.ok(!t.calls.some(c => isSecretCall(c, 'read')), 'хранилище ключей не читается');
    // переключение на обычный OpenAI — блок ключей снова виден
    t.input('#aip_p_provider', 'openai', 'change');
    assert.equal(t.$('#aip_keyWrap').style.display, '');
    assert.equal(t.$('#aip_proxyWrap').style.display, 'none');
});

test('14c. [БАГ] Claude через реверс-прокси с пустым паролем: ST отвечает 400 «Claude API key is missing»', async () => {
    t = withModel({ ...PROXY, proxyPassword: '' });
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy);
    await sleep(10);
    const g = t.calls.filter(isTurnCall);
    // sendClaudeRequest: apiKey = reverse_proxy ? proxy_password : …; if (!apiKey) → 400 { error: true }
    assert.ok(g.every(c => c.body.proxy_password), 'пустой proxy_password ST отклоняет — его нельзя отправлять (а UI пишет «пусто, если пароль не нужен»)');
    assert.ok(!t.toasts.some(x => x.type === 'error' && /Ошибка бэкенда ST/.test(x.msg)), JSON.stringify(t.toasts));
});

// ---------------------------------------------------------------- 0.4.0: записи игрока
test('M1. Память: после N ходов агента — запрос записей, записи в метаданных и в системном промпте хода', async () => {
    t = setup();
    t.s().memory = true; t.s().memoryEvery = 2; t.s().reactions = false;
    await agentTurn(t); await botReply(t);
    assert.equal(t.calls.filter(isMemoryCall).length, 0, 'после 1 хода записи ещё не обновляются');
    const turnIdx = await agentTurn(t); await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_memory, { msg: 'записи сохранены' });
    const mem = t.c.chatMetadata.aip_memory;
    assert.equal(mem.text, MEMORY_TEXT);
    assert.equal(mem.upTo, turnIdx, 'учтено до хода агента, ответ бота не входит');
    assert.equal(mem.chatId, 'chat-1');
    const mc = t.calls.find(isMemoryCall);
    assert.match(mc.body.messages[0].content, /СОСТОЯНИЕ:/);
    assert.doesNotMatch(mc.body.messages[0].content, /трактирщица/, 'описание карты (знание ведущего) в записи не идёт');
    // ход агента получает записи в системном промпте
    await agentTurn(t);
    const turn = t.calls.filter(isTurnCall).at(-1);
    assert.match(turn.body.messages[0].content, /ЗАПИСИ «Боб»[\s\S]*три медяка/);
    // выключили память — записи в ход не идут
    t.s().memory = false;
    await botReply(t); await agentTurn(t);
    assert.doesNotMatch(t.calls.filter(isTurnCall).at(-1).body.messages[0].content, /ЗАПИСИ «Боб»/);
});

test('M2. Память: копия метаданных в ветке от более раннего места не используется', async () => {
    t = setup();
    t.s().memory = true;
    t.c.chatMetadata.aip_memory = { chatId: 'other', text: 'будущее', upTo: 50, upToDate: 'нет-такой-даты', updated: 1 };
    const s = t.aip.settings().s, sync = t.aip.getSync();
    assert.doesNotMatch(t.aip.buildSystemPrompt(s, sync), /будущее/);
    t.c.chatMetadata.aip_memory.chatId = 'chat-1';    // в своём чате удалённое сообщение — записи остаются, но помечены
    assert.match(t.aip.buildSystemPrompt(s, sync), /будущее/);
});

test('O1. Переполнение: приветствие убирается, meta.overflow при невлезающем последнем сообщении', () => {
    t = setup({ chat: longChat(6) });
    const s = t.aip.settings().s, sync = t.aip.getSync();
    t.s().profiles[0].contextSize = 1000; t.s().maxTokens = 100;
    const msgs = t.aip.buildMessages(s, sync, 'x');
    assert.equal(msgs.meta.included, 1, 'осталось только последнее сообщение');
    assert.equal(msgs.meta.overflow, true);
    assert.doesNotMatch(msgs[0].content, /Добро пожаловать/);
});
