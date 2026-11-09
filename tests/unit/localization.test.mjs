import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setup, agentTurn, botReply, waitFor, isTurnCall, isReactionCall, isMemoryCall, PROFILE, MEMORY_TEXT } from './harness.mjs';

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
            assert.match(system, /latest substantive user-character messages/);
            assert.match(system, /Honor an explicit request to change/);
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
