import { ui } from './i18n.js';
import { migrateBuiltinPrompts } from './migrations.js';
import { OLD_REACTION_MARK } from './prompts-en.js';

// Общее ядро: версия, типы подключений, настройки по умолчанию, доступ к контексту ST, профили.

const MODULE = 'ai_player';
export const VERSION = '0.5.1';
// ID из списка SillyTavern 1.19 + актуальные
export const CLAUDE_MODELS = ['claude-fable-5-1', 'claude-fable-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-sonnet-5', 'claude-haiku-5-5'];
export const SOURCE = {
    openai: { source: 'custom', secret: 'api_key_custom', label: ui("OpenAI-совместимый / реверс-прокси (формат OpenAI)"), defUrl: 'https://api.openai.com/v1' },
    anthropic: { source: 'claude', secret: 'api_key_claude', label: ui("Anthropic (Claude, официальный API)"), defUrl: '' },
    claude_proxy: { source: 'claude', secret: null, label: ui("Claude через реверс-прокси (формат Anthropic)"), defUrl: '', proxy: true },
};
const DEFAULTS = {
    profiles: [],
    activeProfile: '',
    sendTemperature: true,     // reasoning-модели OpenAI отклоняют temperature
    maxTokens: 1200,
    contextMessages: 30,
    minWords: 50,
    maxWords: 200,
    knowledge: 'scene',        // 'scene' — карта бота как знание ведущего, игрок не метагеймит; 'full' — без ограничения
    autoSend: true,
    reactions: true,
    extraInstructions: '',
    roleOverride: '',
    thoughtsHidden: false,
    thoughtsPos: null,
    prompts: { system: '', turn: '', reaction: '' },   // пусто = стандартный промпт
    customPrompt: '',          // свой промпт, внедряемый в историю
    customDepth: 0,            // глубина внедрения: 0 — в конце, N — перед последними N сообщениями
    customRole: 'system',      // от чьего имени: system | user
    motion: true,              // анимации интерфейса
    uiTab: 'conn',
    thoughtsMin: false,
    memory: true,              // записи игрока (память персонажа) — доп. запрос раз в N ходов
    memoryEvery: 3,            // обновлять записи каждые N ходов агента
};
export const PROFILE_FIELDS = ['provider', 'url', 'model', 'temperature', 'contextSize', 'proxyPassword'];
export const GLOBAL_FIELDS = ['maxTokens', 'contextMessages', 'minWords', 'maxWords', 'knowledge', 'extraInstructions', 'roleOverride', 'customPrompt', 'customDepth', 'customRole', 'memoryEvery'];
export const GLOBAL_CHECKS = ['autoSend', 'reactions', 'sendTemperature', 'motion', 'memory'];
export const applyMotion = () => document.body.classList.toggle('aip-nomotion', !settings().s.motion);
export const REQUEST_TIMEOUT = 180000;

export const ctx = () => SillyTavern.getContext();
export const H = () => ctx().getRequestHeaders();
export const post = (url, body, signal) => fetch(url, { method: 'POST', headers: H(), body: JSON.stringify(body ?? {}), signal });
export const num = (v, lo, hi, def) => { const n = Number(v); return (v === '' || v == null || !Number.isFinite(n)) ? def : Math.min(hi, Math.max(lo, n)); };
export const esc = t => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const short = t => String(t ?? '').slice(0, 300);
export const chatId = () => { try { return ctx().getCurrentChatId?.() ?? null; } catch { return null; } };

// ---------- Настройки и профили ----------
export function newProfile(name, from = {}) {
    return {
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, provider: from.provider || 'openai',
        url: from.url ?? SOURCE.openai.defUrl, model: from.model || '',
        temperature: from.temperature ?? 0.9, contextSize: from.contextSize ?? 32000, secretId: null, keyId: null,
        proxyPassword: from.proxyPassword || '',
    };
}

export function settings() {
    const { extensionSettings, saveSettingsDebounced } = ctx();
    const s = extensionSettings[MODULE] ??= {};
    let dirty = false;
    for (const k of ['key', 'useProxy']) if (k in s) { delete s[k]; dirty = true; }   // ключи в настройках не храним
    for (const k of Object.keys(DEFAULTS)) if (s[k] === undefined) s[k] = structuredClone(DEFAULTS[k]);
    if (!Array.isArray(s.profiles)) s.profiles = [];
    if (!s.profiles.length) {   // миграция с v0.1
        s.profiles.push(newProfile(ui("Профиль 1"), { provider: s.provider, url: s.url, model: s.model, temperature: s.temperature }));
        delete s.provider; delete s.url; delete s.model; delete s.temperature;
        dirty = true;
    }
    if (!s.profiles.some(p => p.id === s.activeProfile)) { s.activeProfile = s.profiles[0].id; dirty = true; }
    // миграция 0.3.1: промпт мыслей, сохранённый из пресета 0.3.0 (диагностика), меняем на новый стандартный
    if (s.promptPreset && OLD_REACTION_MARK.test(s.prompts?.reaction || '')) { s.prompts.reaction = ''; dirty = true; }
    if (migrateBuiltinPrompts(s)) dirty = true;
    if (dirty) saveSettingsDebounced();
    return { s, save: saveSettingsDebounced };
}
export const activeProfile = () => { const { s } = settings(); return s.profiles.find(p => p.id === s.activeProfile); };
export const findProfile = id => settings().s.profiles.find(p => p.id === id);
export const srcOf = p => SOURCE[p?.provider] || SOURCE.openai;
export const baseUrl = p => (p.url || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
