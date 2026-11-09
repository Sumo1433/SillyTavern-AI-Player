// Сценарии ТЗ к 0.5.0 (выпуск 0.5.1): изоляция ключей через плагин (п. 1), актуальность и бюджет
// памяти (п. 2–3), привязка и повтор впечатлений (п. 4), понятные ошибки без секретов (п. 5).
// Все ключи вымышленные.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    setup, waitFor, sleep, agentTurn, botReply, botSwipe, PROFILE, newId,
    isGenerate, isBackendGenerate, isVaultGenerate, isReactionCall, isMemoryCall, isTurnCall, isSecretCall, isPluginCall,
    MEMORY_TEXT, REACTION_TEXT, sysOf,
} from './harness.mjs';

let t;
afterEach(() => { t?.close(); t = null; });

const VKEY = { id: 'vk1', label: 'Kimi', provider: 'openai', base: 'https://proxy.example/v1', value: 'sk-vault-key-9999' };
const vaultProfile = (patch = {}) => ({ ...PROFILE(), secretId: null, keyId: 'vk1', ...patch });
const settingsWith = (profiles, extra = {}) => ({ ai_player: { profiles, activeProfile: profiles[0].id, lastVersion: '0.5.0', ...extra } });
const secretsSnapshot = () => JSON.stringify(t.secrets);
const ready = () => waitFor(() => t.aip.vault.checked, { msg: 'проверка плагина' });

// ================================================================ п. 1 — ключи
test('K1. Плагин: добавление ключа — не трогает secrets ST, ключ не в настройках; ход идёт ключом плагина', async () => {
    t = setup({ plugin: true, extensionSettings: settingsWith([{ ...PROFILE(), secretId: null }]) });
    await ready();
    const before = secretsSnapshot();
    t.click('#aip_menu');
    await waitFor(() => t.$('#aip_storeMode').dataset.mode === 'vault', { msg: 'режим плагина' });
    await waitFor(() => t.$('#aip_keySelect').options[0]?.value === '__none', { msg: 'ключей нет' });
    t.$('#aip_keyLabel').value = 'Kimi';
    t.$('#aip_keyInput').value = 'sk-new-vault-ABCD';
    t.click('#aip_keySave');
    await waitFor(() => t.s().profiles[0].keyId === 'v1', { msg: 'keyId в профиле' });
    assert.equal(secretsSnapshot(), before, 'secrets.json таверны не изменился');
    assert.ok(!t.calls.some(c => isSecretCall(c, 'write') || isSecretCall(c, 'rotate') || isSecretCall(c, 'delete')), 'нет write/rotate/delete в общее хранилище');
    assert.deepEqual(t.calls.find(c => isPluginCall(c, 'keys/add')).body, { provider: 'openai', url: PROFILE().url, value: 'sk-new-vault-ABCD', label: 'Kimi' });
    assert.ok(!JSON.stringify(t.c.extensionSettings).includes('sk-new-vault'), 'ключа нет в настройках');
    assert.ok(t.toasts.some(x => x.type === 'success' && /Менеджер ключей таверны не изменился/.test(x.msg)));
    t.click('#aip_close');
    await agentTurn(t);
    const turn = t.calls.find(isTurnCall);
    assert.ok(isVaultGenerate(turn), 'ход через плагин');
    assert.ok(!t.calls.some(isBackendGenerate), 'бэкенд ST с ключом не вызывался');
    assert.equal(t.vault.used.at(-1).value, 'sk-new-vault-ABCD', 'запрос ушёл ключом расширения');
    assert.ok(!JSON.stringify(turn.body).includes('sk-'), 'значение ключа не передаётся из браузера');
    assert.equal(secretsSnapshot(), before);
});

test('K2. Плагин: у основного подключения нет ключа — расширение не создаёт заглушку и не подставляет свой ключ', async () => {
    t = setup({ plugin: true, secrets: {}, extensionSettings: settingsWith([{ ...PROFILE(), secretId: null }]) });
    await ready();
    t.click('#aip_menu');
    await waitFor(() => t.$('#aip_storeMode').dataset.mode === 'vault');
    t.$('#aip_keyInput').value = 'sk-only-vault-1234';
    t.click('#aip_keySave');
    await waitFor(() => !!t.s().profiles[0].keyId);
    assert.deepEqual(t.secrets, {}, 'общее хранилище пустым и осталось — ни ключа, ни заглушки');
});

test('K3. Плагин: переключение профиля, удаление ключа и профиля — secrets ST и активный ключ таверны прежние', async () => {
    t = setup({
        plugin: true,
        vaultKeys: [VKEY, { ...VKEY, id: 'vk2', label: 'Второй', value: 'sk-vault-key-8888' }],
        extensionSettings: settingsWith([vaultProfile(), vaultProfile({ id: 'p2', name: 'Второй', keyId: 'vk2' })]),
    });
    await ready();
    const before = secretsSnapshot();
    t.click('#aip_menu');
    await waitFor(() => t.$('#aip_keySelect').value === 'vk1');
    t.input('#aip_profile', 'p2', 'change');
    await waitFor(() => t.$('#aip_keySelect').value === 'vk2', { msg: 'ключ второго профиля' });
    t.click('#aip_keyDel');
    await waitFor(() => t.s().profiles[1].keyId === null, { msg: 'ключ удалён' });
    assert.deepEqual(t.vault.keys.map(k => k.id), ['vk1']);
    t.click('#aip_profDel');
    await waitFor(() => t.s().profiles.length === 1);
    assert.equal(secretsSnapshot(), before, 'ST не изменился');
    assert.ok(!t.calls.some(c => /\/api\/secrets\/(write|rotate|delete)$/.test(c.url)));
    assert.equal(t.secrets.api_key_custom.find(x => x.active).id, 't1');
});

test('K4. Плагин: HTTP 500 и сетевой сбой при сохранении — нет ложного успеха, прежний ключ профиля сохранён', async () => {
    t = setup({ plugin: true, vaultKeys: [VKEY], extensionSettings: settingsWith([vaultProfile()]) });
    await ready();
    t.click('#aip_menu');
    await waitFor(() => t.$('#aip_keySelect').value === 'vk1');
    t.env.fail['plugins/ai-player/keys/add'] = { status: 500, body: { error: { kind: 'server', message: 'disk full' } } };
    t.$('#aip_keyInput').value = 'sk-fail-1';
    t.click('#aip_keySave');
    await waitFor(() => t.toasts.some(x => x.type === 'error'), { msg: 'ошибка' });
    delete t.env.fail['plugins/ai-player/keys/add'];
    t.env.netFail.push('plugins/ai-player/keys/add');
    t.$('#aip_keyInput').value = 'sk-fail-2';
    t.click('#aip_keySave');
    await waitFor(() => t.toasts.filter(x => x.type === 'error').length === 2, { msg: 'вторая ошибка' });
    assert.ok(!t.toasts.some(x => x.type === 'success' && /[Кк]люч/.test(x.msg)), 'нет сообщения об успехе: ' + JSON.stringify(t.toasts.map(x => [x.type, x.msg])));
    assert.equal(t.s().profiles[0].keyId, 'vk1', 'прежний корректный ключ остался');
    assert.ok(!t.toasts.some(x => /sk-fail/.test(x.msg)), 'значение ключа не попадает в сообщения');
});

test('K5. Плагин: ключ привязан к адресу — после смены URL ход не уходит и объяснение понятное', async () => {
    t = setup({ plugin: true, vaultKeys: [VKEY], extensionSettings: settingsWith([vaultProfile({ url: 'https://other.example/v1' })]) });
    await ready();
    t.click('#aip_play');
    await waitFor(() => t.toasts.some(x => x.type === 'error'), { msg: 'ошибка хода' });
    const err = t.toasts.find(x => x.type === 'error').msg;
    assert.match(err, /^Ход: ключ привязан к другому адресу/);
    assert.equal(t.vault.used.length, 0, 'ключ не ушёл на другой адрес');
    assert.ok(!t.calls.some(isBackendGenerate));
    t.click('#aip_menu');
    await waitFor(() => /другого адреса API/.test(t.$('#aip_keyState').textContent), { msg: 'предупреждение в окне' });
});

test('K6. Ключ в плагине, а плагин пропал — ход не уходит через ST с ключом таверны', async () => {
    t = setup({ plugin: false, extensionSettings: settingsWith([vaultProfile()]) });
    await ready();
    t.click('#aip_play');
    await waitFor(() => !t.aip.busy && t.toasts.length > 0);
    await sleep(10);
    assert.ok(!t.calls.some(isGenerate), 'ни одного запроса к модели');
    assert.ok(t.toasts.some(x => /Сохраните API-ключ/.test(x.msg)));
});

test('K7. Миграция: ключ профиля переносится на сервере (import), общая копия остаётся до отдельного действия', async () => {
    t = setup({ plugin: true, extensionSettings: settingsWith([{ ...PROFILE() }, { ...PROFILE(), id: 'p2', name: 'Копия' }]) });
    await ready();
    const before = secretsSnapshot();
    t.click('#aip_menu');
    await waitFor(() => !t.$('#aip_keyMigrate').classList.contains('aip-hidden'), { msg: 'кнопка переноса' });
    assert.match(t.$('#aip_keyState').textContent, /старый ключ из общего хранилища/);
    t.click('#aip_keyMigrate');
    await waitFor(() => t.s().profiles[0].keyId, { msg: 'перенесён' });
    const imp = t.calls.find(c => isPluginCall(c, 'keys/import'));
    assert.deepEqual(imp.body, { secretKey: 'api_key_custom', secretId: 'k1', provider: 'openai', url: PROFILE().url, label: '' });
    assert.equal(t.vault.keys[0].value, 'sk-aip-test-1111', 'значение скопировано сервером');
    for (const p of t.s().profiles) {
        assert.equal(p.secretId, null);
        assert.equal(p.keyId, t.vault.keys[0].id, 'профиль с тем же ключом и адресом переехал тем же ключом');
        assert.equal(p.legacySecretId, 'k1');
    }
    assert.equal(secretsSnapshot(), before, 'общая копия не удалена автоматически');
    assert.ok(!JSON.stringify(t.calls).includes('sk-aip-test-1111'), 'значение ключа не проходит через браузер');
});

test('K8. Очистка старых общих копий: только неактивные и не используемые, с подтверждением; основной ключ не меняется', async () => {
    t = setup({
        plugin: true,
        secrets: { api_key_custom: [
            { id: 'old1', label: 'AI Player · Старый', value: 'sk-old-1111', active: false },
            { id: 'old2', label: 'AI Player · Ещё выбран', value: 'sk-old-2222', active: false },
            { id: 'old3', label: 'AI Player · Активен в таверне', value: 'sk-old-3333', active: true },
            { id: 'mine', label: 'Ключ таверны', value: 'sk-tavern-4444', active: false },
        ] },
        extensionSettings: settingsWith([vaultProfile(), { ...PROFILE(), id: 'p2', secretId: 'old2' }]),
        vaultKeys: [VKEY],
    });
    await ready();
    t.env.confirmAnswer = false;
    await t.aip.cleanLegacyCopies();
    assert.equal(t.secrets.api_key_custom.length, 4, 'отказ в подтверждении — ничего не удалено');
    t.env.confirmAnswer = true;
    const r = await t.aip.cleanLegacyCopies();
    assert.deepEqual(JSON.parse(JSON.stringify(r)), { deleted: 1, failed: 0, kept: 2 });
    assert.deepEqual(t.secrets.api_key_custom.map(x => x.id), ['old2', 'old3', 'mine'], 'удалена только неактивная неиспользуемая копия');
    assert.equal(t.secrets.api_key_custom.find(x => x.active).id, 'old3', 'активный ключ основного подключения прежний');
    assert.ok(t.confirms.at(-1).includes('Старый') && t.confirms.at(-1).includes('Не трогаем ещё 2'));
});

test('K9. Плагин: пароль Claude-прокси переносится в хранилище плагина и исчезает из настроек', async () => {
    t = setup({ plugin: true, extensionSettings: settingsWith([{ ...PROFILE(), provider: 'claude_proxy', url: 'https://proxy.example/v1', model: 'claude-sonnet-5', secretId: null, proxyPassword: 'proxy-pass-777' }]) });
    await ready();
    assert.equal(await t.aip.migrateProfileKey(t.aip.activeProfile()), true);
    const p = t.s().profiles[0];
    assert.equal(p.proxyPassword, '');
    assert.equal(t.vault.keys[0].provider, 'claude_proxy');
    assert.ok(!JSON.stringify(t.c.extensionSettings).includes('proxy-pass-777'));
    await agentTurn(t);
    assert.equal(t.vault.used.at(-1).value, 'proxy-pass-777', 'ход идёт паролем из плагина');
});

// ================================================================ п. 2 — актуальность памяти
async function memoryInFlight(change, { expectSaved = false } = {}) {
    t = setup();
    t.s().reactions = false;
    t.s().memoryEvery = 1;
    t.c.chatMetadata.aip_memory = { chatId: 'chat-1', text: 'СТАРЫЕ ЗАПИСИ', upTo: -1, upToDate: null, rev: 5, updated: 1 };
    await agentTurn(t);
    const release = t.gate('backends/chat-completions/generate');
    const id = await botReply(t);
    await waitFor(() => t.calls.some(isMemoryCall), { msg: 'запрос записей ушёл' });
    await change(id);
    release();
    await waitFor(() => !t.aip.memBusy, { msg: 'запрос завершён' });
    await sleep(5);
    if (!expectSaved) assert.notEqual(t.c.chatMetadata.aip_memory?.text, MEMORY_TEXT, 'устаревший результат не сохранён');
    return t;
}

test('M3. Запрос записей + правка учтённого сообщения — результат отброшен, прежние записи целы', async () => {
    await memoryInFlight(() => { t.c.chat[1].mes = 'исправленный ход'; });
    assert.equal(t.c.chatMetadata.aip_memory.text, 'СТАРЫЕ ЗАПИСИ');
    assert.ok(t.toasts.some(x => /изменились сообщения/.test(x.msg)));
});

test('M4. Запрос записей + удаление учтённого сообщения — результат отброшен', async () => {
    await memoryInFlight(async () => { t.c.chat.splice(1, 1); await t.emit(t.event_types.MESSAGE_DELETED, 1); });
    assert.equal(t.c.chatMetadata.aip_memory.text, 'СТАРЫЕ ЗАПИСИ');
});

test('M5. Запрос записей + смена свайпа учтённого ответа бота — результат отброшен', async () => {
    await memoryInFlight(() => { const m = t.c.chat[2]; m.swipes.push('«Другой вариант»'); m.swipe_id = 1; m.mes = '«Другой вариант»'; });
    assert.equal(t.c.chatMetadata.aip_memory.text, 'СТАРЫЕ ЗАПИСИ');
});

test('M6. Запрос записей + новое сообщение после диапазона — результат сохранён', async () => {
    await memoryInFlight(() => { t.c.chat.push({ name: 'Боб', is_user: true, mes: 'новый ход после', send_date: 'later', extra: {} }); }, { expectSaved: true });
    assert.equal(t.c.chatMetadata.aip_memory.text, MEMORY_TEXT);
    assert.equal(t.c.chatMetadata.aip_memory.rev, 6, 'ревизия выросла');
});

test('M7. Запрос записей + ручная очистка или правка — свежая ручная правка важнее', async () => {
    await memoryInFlight(() => { delete t.c.chatMetadata.aip_memory; });
    assert.equal(t.c.chatMetadata.aip_memory, undefined, 'очистка не отменена результатом запроса');
    await memoryInFlight(() => { Object.assign(t.c.chatMetadata.aip_memory, { text: 'РУЧНАЯ ПРАВКА', rev: 6 }); });
    assert.equal(t.c.chatMetadata.aip_memory.text, 'РУЧНАЯ ПРАВКА');
    assert.ok(t.toasts.some(x => /изменили вручную/.test(x.msg)));
});

test('M8. Сохранённые записи: правка учтённой истории → «требуют проверки» (та же send_date не спасает); ручная правка снимает пометку', async () => {
    t = setup();
    t.s().reactions = false;
    t.s().memoryEvery = 1;
    await agentTurn(t);
    await botReply(t);
    await waitFor(() => t.c.chatMetadata.aip_memory?.text === MEMORY_TEXT);
    assert.equal(t.aip.memoryState().stale, false);
    t.c.chat[2].mes = 'отредактировано без смены даты';
    assert.equal(t.aip.memoryState().stale, true, 'изменение содержимого обнаружено');
    t.click('#aip_menu');
    await waitFor(() => /Требуют проверки/.test(t.$('#aip_memState').textContent));
    t.input('#aip_memText', 'Проверено мной');
    assert.equal(t.aip.memoryState().stale, false, 'ручная правка = проверено');
});

// ================================================================ п. 3 — бюджет памяти
test('B1. Длинные прежние записи при малом контексте — запрос не отправляется, причина понятна, записи не обрезаны', async () => {
    t = setup();
    t.s().profiles[0].contextSize = 3000;
    const long = 'Очень важная запись. '.repeat(400);
    t.c.chatMetadata.aip_memory = { chatId: 'chat-1', text: long, upTo: -1, upToDate: null, rev: 1 };
    assert.equal(await t.aip.updateMemory({ manual: true }), false);
    assert.ok(!t.calls.some(isMemoryCall), 'переполненный запрос не ушёл');
    assert.ok(t.toasts.some(x => /не помещается в контекст/.test(x.msg) && /прежние записи/.test(x.msg)));
    assert.equal(t.c.chatMetadata.aip_memory.text, long, 'прежние записи не тронуты');
});

test('B2. Одно очень длинное сообщение — запрос не отправляется', async () => {
    t = setup();
    t.s().profiles[0].contextSize = 4000;
    t.c.chat.push({ name: 'Алиса', is_user: false, mes: 'Огромный ответ. '.repeat(1500), send_date: 'x1', extra: {} });
    assert.equal(await t.aip.updateMemory({ manual: true }), false);
    assert.ok(!t.calls.some(isMemoryCall));
    assert.ok(t.toasts.some(x => /сообщение #3 слишком длинное/.test(x.msg)));
});

for (const [name, patch, maxOut] of [
    ['OpenAI-совместимый', {}, 1000],
    ['Claude', { provider: 'anthropic', url: '', model: 'claude-sonnet-5', secretId: 'c1' }, 2500],
]) {
    test(`B3. ${name}: лимит ответа ${maxOut}, отправленный запрос укладывается в бюджет; пропуск старых сообщений обозначен`, async () => {
        const chat = Array.from({ length: 40 }, (_, i) => ({ name: i % 2 ? 'Боб' : 'Алиса', is_user: !!(i % 2), mes: `Реплика ${i}. `.repeat(60), send_date: `d${i}`, extra: {} }));
        t = setup({ chat, secrets: { api_key_custom: [{ id: 'k1', label: 'AI Player · x', value: 'sk-x-1111', active: false }], api_key_claude: [{ id: 'c1', label: 'AI Player · c', value: 'sk-ant-1111', active: false }] } });
        Object.assign(t.s().profiles[0], patch, { contextSize: 8000 });
        assert.equal(await t.aip.updateMemory({ manual: true }), true);
        const call = t.calls.find(isMemoryCall);
        assert.equal(call.body.max_tokens, maxOut, 'фактический лимит ответа провайдера');
        const est = t.aip.estTokens(sysOf(call)) + t.aip.estTokens(call.body.messages.at(-1).content) + maxOut;
        assert.ok(est <= 8000, `запрос ${est} > 8000`);
        assert.match(call.body.messages.at(-1).content, /самые старые \d+ не поместились|oldest \d+ messages omitted/);
        assert.ok(t.c.chatMetadata.aip_memory.skipped > 0);
        assert.ok(t.toasts.some(x => /не поместились в контекст и не учтены/.test(x.msg)), 'пропуск обозначен пользователю');
    });
}

// ================================================================ п. 4 — впечатления
async function reactionInFlight(change) {
    t = setup();
    t.s().memory = false;
    await agentTurn(t);
    const release = t.gate('backends/chat-completions/generate');
    const id = await botReply(t);
    await waitFor(() => t.calls.some(isReactionCall), { msg: 'запрос впечатления ушёл' });
    await change(id);
    release();
    await sleep(20);
    return id;
}

test('R1. Впечатление + свайп исходного ответа во время запроса — не привязывается к новой версии', async () => {
    await reactionInFlight(async id => { await botSwipe(t, id, '«Другая версия ответа»'); });
    await sleep(20);
    const log = t.c.chatMetadata.aip_log || [];
    // впечатление может быть только о новой версии (запрошено заново после свайпа), но не о старой
    assert.ok(log.every(e => e.swipeId === 1), JSON.stringify(log));
    assert.ok(!log.some(e => e.swipeId === 0));
});

test('R2. Впечатление + правка исходного ответа — отброшено', async () => {
    await reactionInFlight(id => { t.c.chat[id].mes = 'отредактированный ответ'; });
    assert.equal((t.c.chatMetadata.aip_log || []).length, 0);
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 0);
});

test('R3. Впечатление + удаление исходного ответа — отброшено (журнал, окно, экспорт)', async () => {
    await reactionInFlight(async id => { t.c.chat.splice(id, 1); await t.emit(t.event_types.MESSAGE_DELETED, id); });
    assert.equal((t.c.chatMetadata.aip_log || []).length, 0);
    assert.ok(t.aip.matchData().turns.every(x => x.reactions.length === 0));
});

test('R4. Пустой ответ модели не блокирует повтор; ручной повтор без нового хода и ответа бота', async () => {
    t = setup();
    t.s().memory = false;
    t.env.reactionText = '';
    await agentTurn(t);
    await botReply(t);
    await waitFor(() => !!t.aip.reactionFailure, { msg: 'неудача записана' });
    assert.ok(t.$('#aip_thoughts').classList.contains('aip-has-failed'), 'кнопка «Повторить» видна');
    const toast = t.toasts.find(x => x.type === 'warning' && /^Впечатление: модель вернула пустой ответ/.test(x.msg));
    assert.ok(toast?.opts?.onclick, 'уведомление с повтором по нажатию');
    const len = t.c.chat.length, sent = t.sent.length, turns = t.calls.filter(isTurnCall).length;
    t.env.reactionText = undefined;
    t.click('#aip_thoughts [data-act="retry"]');
    await waitFor(() => t.c.chatMetadata.aip_log?.length === 1, { msg: 'впечатление после повтора' });
    assert.equal(t.c.chatMetadata.aip_log[0].text, REACTION_TEXT);
    assert.equal(t.c.chat.length, len, 'новых сообщений в чате нет');
    assert.equal(t.sent.length, sent, 'ход не отправлялся повторно');
    assert.equal(t.calls.filter(isTurnCall).length, turns, 'запроса хода не было');
    assert.ok(!t.$('#aip_thoughts').classList.contains('aip-has-failed'));
});

test('R5. Повтор после изменения исходного ответа не выполняется', async () => {
    t = setup();
    t.s().memory = false;
    await agentTurn(t);
    t.env.fail['backends/chat-completions/generate'] = { status: 500, body: { error: { message: 'boom' } } };
    const id = await botReply(t);
    await waitFor(() => !!t.aip.reactionFailure, { msg: 'неудача записана' });
    delete t.env.fail['backends/chat-completions/generate'];
    t.c.chat[id].mes = 'ответ изменён после сбоя';
    const n = t.calls.filter(isReactionCall).length;
    t.aip.retryReaction();
    await sleep(10);
    assert.equal(t.calls.filter(isReactionCall).length, n, 'повторного запроса нет');
    assert.ok(t.toasts.some(x => /повторять нечего/.test(x.msg)));
    assert.equal(t.aip.reactionFailure, null);
});

// ================================================================ п. 5 — ошибки
test('E1. Этап и вид ошибки: 401 от провайдера через плагин, 429 и таймаут — коротко и понятно', () => {
    t = setup();
    const d = (kind, status, msg, stage) => t.aip.describeError(Object.assign(new t.w.Error(msg), { kind, status }), stage);
    assert.match(d('auth', 401, 'Invalid API key', 'turn'), /^Ход: ключ или пароль отклонён \(ошибка авторизации\) \(HTTP 401\)/);
    assert.match(d(undefined, null, 'Request failed with status 429: rate limit', 'memory'), /^Записи: превышен лимит запросов/);
    assert.match(d(undefined, null, 'ETIMEDOUT', 'reaction'), /^Впечатление: провайдер не ответил вовремя/);
    assert.match(d(undefined, 502, 'Bad Gateway', 'turn'), /^Ход: ошибка на стороне провайдера или прокси \(HTTP 502\)/);
});

test('E2. Секреты и адреса с учётными данными вырезаются из сообщений об ошибках', async () => {
    t = setup();
    t.env.fail['backends/chat-completions/generate'] = { status: 401, body: { error: { message: 'Incorrect API key provided: sk-proj-ABCDEFGH12345. Proxy https://user:hunter2@proxy.example/v1?key=SECRET1 Bearer abc.def' } } };
    t.click('#aip_play');
    await waitFor(() => t.toasts.some(x => x.type === 'error'));
    const msg = t.toasts.find(x => x.type === 'error').msg;
    assert.match(msg, /^Ход: ключ или пароль отклонён/);
    for (const s of ['ABCDEFGH12345', 'hunter2', 'SECRET1', 'abc.def']) assert.ok(!msg.includes(s), `${s} в сообщении: ${msg}`);
});

test('E3. Сбой впечатления и записей не создаёт сообщений в чате и не повторяет ход', async () => {
    t = setup();
    t.s().memoryEvery = 1;
    await agentTurn(t);
    t.env.fail['backends/chat-completions/generate'] = { status: 503, body: { error: { message: 'Service Unavailable' } } };
    const len = t.c.chat.length + 1, sent = t.sent.length;
    await botReply(t);
    await waitFor(() => t.toasts.filter(x => x.type === 'warning').length >= 2, { msg: 'две ошибки: впечатление и записи' });
    assert.equal(t.c.chat.length, len, 'только ответ бота');
    assert.equal(t.sent.length, sent);
    assert.equal(t.calls.filter(isTurnCall).length, 1, 'ход не повторялся');
    assert.ok(t.toasts.some(x => /^Впечатление: ошибка на стороне провайдера или прокси \(HTTP 503\)/.test(x.msg)));
    assert.ok(t.toasts.some(x => /^Записи: ошибка на стороне провайдера или прокси \(HTTP 503\)/.test(x.msg)));
});

// ================================================================ п. 7 — обновление не теряет данных
test('U1. Данные 0.5.0 переживают обновление: профили, выбранные ключи, свои промпты, записи, журнал впечатлений', async () => {
    const profiles = [{ ...PROFILE() }, { ...PROFILE(), id: 'p2', name: 'Прокси', provider: 'claude_proxy', url: 'https://proxy.example/v1', proxyPassword: 'pp-1', secretId: null }];
    const prompts = { system: 'Мой системный {player}', turn: '', reaction: 'Моя реакция', memory: 'Мои записи' };
    t = setup({ extensionSettings: { ai_player: { profiles: structuredClone(profiles), activeProfile: 'p2', prompts: structuredClone(prompts), customPrompt: 'Свой', lastVersion: '0.5.0' } } });
    const memory = { chatId: 'chat-1', text: 'Записи до обновления', upTo: 2, upToDate: t.c.chat[2].send_date, updated: 1, model: 'm' };
    const log = [{ chatId: 'chat-1', mesId: 2, swipeId: 0, sendDate: t.c.chat[2].send_date, bot: 'Алиса', playerModel: 'a', botModel: 'b', text: 'Впечатление 8/10', ts: 1 }];
    t.c.chatMetadata.aip_memory = structuredClone(memory);
    t.c.chatMetadata.aip_log = structuredClone(log);
    await t.emit(t.event_types.CHAT_CHANGED);
    await ready();
    t.click('#aip_menu');
    await sleep(20);
    const s = t.s();
    assert.deepEqual(s.profiles.map(p => [p.id, p.name, p.provider, p.secretId ?? null, p.proxyPassword ?? '']), profiles.map(p => [p.id, p.name, p.provider, p.secretId ?? null, p.proxyPassword ?? '']));
    assert.equal(s.activeProfile, 'p2');
    assert.deepEqual({ ...s.prompts }, prompts);
    assert.equal(s.customPrompt, 'Свой');
    assert.equal(t.c.chatMetadata.aip_memory.text, 'Записи до обновления');
    assert.equal(t.aip.memoryState().stale, false, 'записи без отпечатка истории не считаются устаревшими');
    assert.deepEqual(JSON.parse(JSON.stringify(t.c.chatMetadata.aip_log)), log);
    assert.equal(t.$$('#aip_thoughts .aip-th-item').length, 1);
});
