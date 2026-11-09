import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setup, agentTurn, botReply, waitFor, isTurnCall, isReactionCall, isMemoryCall, PROFILE, MEMORY_TEXT, iso } from './harness.mjs';

let t;
afterEach(() => { t?.close(); t = null; });
const legacy = JSON.parse(readFileSync(new URL('./legacy-prompts.json', import.meta.url)));

for (const locale of ['ru', 'ru-RU', 'en', 'en-US', 'uk-UA', 'de-DE']) {
    test(`UI follows ST language: ${locale}`, () => {
        t = setup({ locale });
        t.click('#aip_menu');
        const ru = /^ru/i.test(locale);
        assert.equal(t.$('.aip-tab[data-tab="conn"] span').textContent, ru ? 'Подключение' : 'Connection');
        assert.equal(t.$('#aip_play').title, ru ? 'AI Player: сделать ход за игрока' : 'AI Player: play a turn');
        assert.equal(t.$('#aip_keyInput').placeholder, ru ? 'ключ' : 'key');
        assert.equal(t.$('#aip_promptPreset option[value="actor"]').textContent, ru ? 'Актёр — желание, подтекст, голос' : 'Actor — desire, subtext, voice');
        assert.equal(t.$('#aip_roleOverride').value, '');
        assert.equal(t.s().profiles[0].name, 'Тест', 'do not translate profile names');
    });
}

test('ST locale API takes precedence over browser storage', () => {
    t = setup({ locale: 'ru', contextLocale: 'en-GB' });
    assert.equal(t.$('#aip_menu span').textContent, 'AI Player — settings');
});

for (const locale of ['ru', 'en']) {
    test(`English prompt instructions preserve the game language with ${locale} UI`, async () => {
        t = setup({ locale });
        t.s().memoryEvery = 1;
        await agentTurn(t);
        await botReply(t);
        await waitFor(() => t.c.chatMetadata.aip_memory?.text === MEMORY_TEXT);
        for (const match of [isTurnCall, isReactionCall, isMemoryCall]) {
            const request = t.calls.find(match);
            assert.ok(request);
            const system = request.body.messages[0].content;
            assert.match(system, /OUTPUT LANGUAGE:/);
            assert.match(system, /being played in Russian \(detected from the latest game messages\)/);
            assert.match(system, /Honor an explicit in-game request to switch languages/);
            assert.doesNotMatch(system, /по-русски|Ты —|Описание:/);
            assert.match(request.body.messages.map(m => m.content).join('\n'), /Боб|Мне эля/);
        }
        assert.equal(t.c.chat.at(-2).mes, '*кивает* «Мне эля, пожалуйста»', 'Russian game output stays untouched in English UI');
    });
}

for (const preset of ['actor', 'director', 'antislop']) {
    test(`Upgrade exact legacy ${preset} prompts without replacing custom edits`, () => {
        const old = legacy.presets[preset];
        t = setup({ extensionSettings: { ai_player: {
            profiles: [PROFILE()], activeProfile: 'p1', promptPreset: preset,
            prompts: { system: old.system, turn: old.turn, reaction: legacy.defaults.reaction, memory: 'Мои собственные записи: {player}' },
        } } });
        assert.match(t.s().prompts.system, /You are a player/);
        assert.match(t.s().prompts.turn, /Your turn/);
        assert.equal(t.s().prompts.reaction, '');
        assert.equal(t.s().prompts.memory, 'Мои собственные записи: {player}');
    });
}

test('Modified legacy preset is preserved', () => {
    const edited = legacy.presets.actor.system + '\nМоя правка';
    t = setup({ extensionSettings: { ai_player: {
        profiles: [PROFILE()], activeProfile: 'p1', promptPreset: 'actor', prompts: { system: edited },
    } } });
    assert.equal(t.s().prompts.system, edited);
});

test('English dynamic labels interpolate values without stray placeholders', async () => {
    t = setup({ locale: 'en' });
    t.click('#aip_menu');
    await t.aip.updateCtxMeter();
    assert.match(t.$('#aip_ctxText').textContent, /messages 3\/3/);
    assert.doesNotMatch(t.$('#aip_ctxText').textContent, /\$\{|\\/);
    t.click('#aip_profNew');
    assert.equal(t.s().profiles.at(-1).name, 'Profile 2');
});

test('English UI leaves role overrides, custom prompts, and model output intact', () => {
    t = setup({ locale: 'en' });
    t.s().roleOverride = 'Український мандрівник';
    t.s().customPrompt = 'Збережи цей текст: ${0}';
    t.click('#aip_menu');
    assert.equal(t.$('#aip_roleOverride').value, 'Український мандрівник');
    const messages = t.aip.buildMessages(t.s(), t.aip.getSync(), '');
    assert.ok(messages.some(m => m.content.includes('Збережи цей текст: ${0}')));
    assert.match(t.aip.buildSystemPrompt(t.s(), t.aip.getSync()), /Український мандрівник/);
});

test('English static interface has no Russian labels or tooltips', () => {
    t = setup({ locale: 'en' });
    const root = t.$('#aip_overlay');
    for (const node of root.querySelectorAll('label, .aip-card-title, .aip-note, button, [title], [placeholder]')) {
        assert.doesNotMatch(node.textContent + (node.getAttribute('title') || '') + (node.getAttribute('placeholder') || ''), /[А-Яа-яЁё]/);
    }
});

// Ошибка 0.5.2: игра на английском, персона описана по-русски, интерфейс ST ru — впечатления выходили по-русски
const EN_CHAT = () => [
    { name: 'Алиса', is_user: false, mes: 'Welcome to the tavern, stranger! What brings you here on such a cold night?', send_date: iso(0), extra: {}, swipe_id: 0, swipes: ['x'], swipe_info: [{ send_date: iso(0), extra: {} }] },
    { name: 'Боб', is_user: true, mes: '*steps in* "Just looking for a warm meal and a quiet corner, if you have one."', send_date: iso(10), extra: {} },
    { name: 'Алиса', is_user: false, mes: '"A quiet corner is the one thing this place never has. Sit by the fire, I will bring you stew."', send_date: iso(20), extra: { api: 'openai', model: 'bot-model' }, swipe_id: 0, swipes: ['x'], swipe_info: [{ send_date: iso(20), extra: {} }] },
];
for (const locale of ['ru', 'en']) {
    test(`English game with Russian persona and ${locale} UI: turn, impressions, and notes are requested in English`, async () => {
        t = setup({ locale, chat: EN_CHAT(), turnReply: '*nods* "Stew sounds good. And an ale, if you have any."' });
        t.s().memoryEvery = 1;
        await agentTurn(t);
        await botReply(t, '"Ale we have, and plenty of it. Three coppers, and you can tell me where you came from."');
        await waitFor(() => t.c.chatMetadata.aip_memory?.text === MEMORY_TEXT);
        for (const match of [isTurnCall, isReactionCall, isMemoryCall]) {
            const system = t.calls.find(match).body.messages[0].content;
            assert.match(system, /being played in English/);
            assert.doesNotMatch(system, /played in Russian|interface locale \(/);
        }
    });
}

test('Impressions follow the language of the bot reply they react to', async () => {
    t = setup({ locale: 'ru' });            // русская игра
    await agentTurn(t);
    await botReply(t, '"Fine, I will switch to English then. Three coppers for the ale, and not a coin less."');
    await waitFor(() => t.calls.some(isReactionCall));
    assert.match(t.calls.find(isReactionCall).body.messages[0].content, /being played in English/);
});

test('Turn keeps the language of the player messages when the bot slips into the card language', () => {
    t = setup({ locale: 'ru' });
    t.c.chat.push({ name: 'Боб', is_user: true, mes: '*садится у огня* «Налей мне чего-нибудь горячего, хозяйка»', send_date: iso(25), extra: {} });
    t.c.chat.push({ name: 'Алиса', is_user: false, mes: '"Sure, the ale is on the house tonight, and the stew is fresh."', send_date: iso(30), extra: {} });
    const turnSystem = t.aip.renderPrompt(t.s(), t.aip.getSync(), 'system');
    assert.match(turnSystem, /being played in Russian/, 'turn follows the player, not the slipped bot reply');
    const reactionSystem = t.aip.renderPrompt(t.s(), t.aip.getSync(), 'reaction', t.c.chat.length - 1);
    assert.match(reactionSystem, /being played in English/, 'impressions follow the reply they react to');
});

test('Language detection by text of the game', () => {
    t = setup();
    const d = t.aip.detectLanguage;
    assert.equal(d('*smiles* "Hello there, what can I get you tonight?"'), 'English');
    assert.equal(d('*улыбается* «Привет, что тебе налить сегодня?»'), 'Russian');
    assert.equal(d('Привіт, що тобі налити сьогодні ввечері? Їжі немає.'), 'Ukrainian');
    // другие языки на латинице не принимаются за английский (общие слова «a», «in», «me», «was»)
    assert.equal(d('Hola, ¿qué te sirvo esta noche, forastero cansado?'), 'latin');
    assert.equal(d('Me dijo a ella que a veces no quiere ir a la casa de su madre.'), 'latin');
    assert.equal(d('Was ist das? Ich bin in der Stadt an der Ecke und warte auf dich.'), 'latin');
    assert.equal(d('Ho detto a lui che non è possibile andare in città stasera.'), 'latin');
    assert.equal(d("Je lui ai dit que ce n'est pas possible, il est trop tard pour partir."), 'latin');
    assert.equal(d('*Nods.* Sure thing, boss. Coming right up.'), null, 'short English without markers is undecided, not latin');
    // другая кириллица не выдаётся за русский
    assert.equal(d('Добро дошли у нашу крчму, путниче. Шта желиш да попијеш вечерас?'), 'cyrillic');
    assert.equal(d('Добре дошъл в нашата кръчма, пътнико. Какво ще пиеш тази вечер?'), 'cyrillic');
    assert.equal(d('Добро пожаловать в таверну, путник. Что будешь пить сегодня?'), 'Russian');
    // имена и заимствования с диакритикой не мешают английскому
    assert.equal(d('José walked into the café and ordered a crème brûlée with his friend.'), 'English');
    // короткая японская цитата не меняет язык игры
    assert.equal(d('Она поклонилась и сказала: «ありがとう ございます», потом ушла.'), 'Russian');
    assert.equal(d('She bowed. "ありがとう," she said, and the door closed behind her with a soft click.'), 'English');
    // японский с большой долей кандзи
    assert.equal(d('東京大学図書館所蔵資料閲覧申請書提出。今日は寒い。'), 'Japanese');
    // статус-панель на другом языке и блок размышлений не влияют
    assert.equal(d('<div class="status">HP: 20/20 | Location: Tavern | Mood: calm and tired</div>\n*улыбается* «Садись у огня, сейчас принесу похлёбку»'), 'Russian');
    assert.equal(d('<think>The user wants a reply in the same style as before, keep it short</think>«Садись у огня, сейчас принесу похлёбку»'), 'Russian');
    assert.equal(d('今日はとても寒いですね。温かいスープはいかがですか。'), 'Japanese');
    assert.equal(d('你好，今晚想喝点什么？我们有很好的酒。'), 'Chinese');
    assert.equal(d('ok'), null, 'too short');
    assert.equal(d('```js\nconst x = 1;\n```  <b>Да</b>'), null, 'code and markup are ignored');
});
