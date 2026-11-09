import { CLAUDE_MODELS, H, REQUEST_TIMEOUT, baseUrl, esc, num, post, srcOf } from './core.js';
import { AipError, kindByMessage, kindByStatus } from './errors.js';
import { ui } from './i18n.js';
import { VAULT, probeVault, vault, vaultCall } from './keys.js';

// ---------- Вызов модели через бэкенд ST ----------
// Лимиты ответа для служебных запросов: у Claude 5 мышление съедает часть лимита — даём запас
export const reactionMaxTokens = p => srcOf(p).source === 'claude' ? 1500 : 600;
export const memoryMaxTokens = p => srcOf(p).source === 'claude' ? 2500 : 1000;

// Разбор ответа об ошибке (бэкенд ST или плагин) в AipError
function responseError(r, j) {
    const e = j?.error;
    if (e && typeof e === 'object' && e.kind) return new AipError(e.kind, e.message || `HTTP ${r.status}`, e.status ?? null);
    const m = (typeof e === 'string' ? e : e?.message)
        || (e === true ? ui("Ошибка бэкенда ST — подробности в консоли сервера SillyTavern") : '')
        || j?.message || `HTTP ${r.status}`;
    const status = r.ok ? null : r.status;
    return new AipError(kindByMessage(m) || (status ? kindByStatus(status) : 'upstream'), m, status);
}

export async function callModel(p, s, system, messages, { maxTokens, signal, stop } = {}) {
    const src = srcOf(p);
    if (!p.model) throw new AipError('bad_request', ui("Не указана модель"));
    // отменили ещё до запроса (▶ повторно / смена чата) — не отправляем платный запрос
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(new DOMException('timeout', 'TimeoutError')), REQUEST_TIMEOUT);
    const onAbort = () => ctl.abort();
    signal?.addEventListener('abort', onAbort);
    try {
        // reasoning-модели OpenAI (o-серия, gpt-5) не принимают max_tokens/stop/temperature;
        // Claude 5 / Fable не принимают параметры сэмплинга. ST сам это правит только для своих
        // источников openai/openrouter, а для custom передаёт тело как есть.
        const reasoning = /(^|\/)(o\d|gpt-5)/i.test(p.model);
        const noSampling = /claude-(fable|opus-5|sonnet-5|haiku-5)/i.test(p.model);
        if (p.keyId) {
            // хранилище плагина: ключ на сервере, привязан к типу API и адресу
            if (!vault.checked) await probeVault();
            if (!vault.ok) throw new AipError('no_plugin', ui("Ключ профиля хранится в плагине AI Player, но плагин не найден. Проверьте папку SillyTavern/plugins/ai-player и enableServerPlugins: true в config.yaml."));
            const mt = maxTokens ?? num(s.maxTokens, 100, 16000, 1200);
            const vb = {
                keyId: p.keyId, provider: p.provider, url: p.url, model: p.model, system, messages, maxTokens: mt,
                maxTokensField: src.source === 'custom' && reasoning ? 'max_completion_tokens' : 'max_tokens',
            };
            if (s.sendTemperature && !reasoning && !noSampling) vb.temperature = num(p.temperature, 0, 2, 0.9);
            if (stop?.length && !reasoning) vb.stop = stop.slice(0, 4);
            let r;
            try { r = await fetch(`${VAULT}/generate`, { method: 'POST', signal: ctl.signal, headers: H(), body: JSON.stringify(vb) }); }
            catch (e) { if (ctl.signal.aborted) throw e; throw new AipError('network', ui("Нет связи с сервером SillyTavern")); }
            const j = await r.json().catch(() => null);
            if (!r.ok || j?.error || !j) {
                if (!j && (r.status === 404 || r.status === 405)) { vault.ok = false; throw new AipError('no_plugin', ui("Плагин AI Player не найден на сервере SillyTavern")); }
                throw responseError(r, j || {});
            }
            return { text: String(j.text || ''), usage: j.usage ?? null, truncated: !!j.truncated };
        }
        if (!src.proxy && !p.secretId) throw new AipError('no_key', ui("У профиля нет своего ключа. Добавьте ключ в окне AI Player — ключ основного подключения таверны не используется."));
        const body = {
            chat_completion_source: src.source,
            model: p.model,
            messages: [{ role: 'system', content: system }, ...messages],
            stream: false,
        };
        const mt = maxTokens ?? num(s.maxTokens, 100, 16000, 1200);
        if (src.source === 'custom' && reasoning) body.max_completion_tokens = mt;
        else body.max_tokens = mt;
        if (s.sendTemperature && !reasoning && !noSampling) {
            const t = num(p.temperature, 0, 2, 0.9);
            body.temperature = src.source === 'claude' ? Math.min(1, t) : t;
        }
        if (stop?.length && !reasoning) body.stop = src.source === 'custom' ? stop.slice(0, 4) : stop;   // у OpenAI максимум 4
        if (src.source === 'custom') {
            if (!baseUrl(p)) throw new AipError('bad_request', ui("Не указан URL"));
            body.custom_url = baseUrl(p);
            if (p.secretId) body.secret_id = p.secretId;
        } else {
            body.use_sysprompt = true;          // иначе ST превратит system в user-сообщение
            body.claude_use_sysprompt = true;   // то же поле в старых версиях ST
            if (src.proxy) {
                // как поле «Reverse Proxy» в самой ST: адрес (ST сам добавит /messages) + пароль прокси
                if (!baseUrl(p)) throw new AipError('bad_request', ui("Не указан адрес реверс-прокси"));
                if (!p.proxyPassword) throw new AipError('no_key', ui("SillyTavern не отправляет запрос к Claude-прокси без пароля. Если прокси пароль не требует — впишите любой символ"));
                body.reverse_proxy = baseUrl(p).replace(/\/messages$/, '');
                body.proxy_password = p.proxyPassword;
            } else if (p.secretId) {
                body.secret_id = p.secretId;
            }
        }
        let r;
        try {
            r = await fetch('/api/backends/chat-completions/generate', {
                method: 'POST', signal: ctl.signal, headers: H(), body: JSON.stringify(body),
            });
        } catch (e) { if (ctl.signal.aborted) throw e; throw new AipError('network', ui("Нет связи с сервером SillyTavern")); }
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.error) throw responseError(r, j);
        const ch = j?.choices?.[0];
        const text = ch?.message?.content
            || (Array.isArray(j?.content) ? j.content.filter(x => x.type === 'text').map(x => x.text).join('') : '')
            || '';
        return { text, usage: j?.usage ?? null, truncated: ch?.finish_reason === 'length' || j?.stop_reason === 'max_tokens' };
    } catch (e) {
        if (ctl.signal.reason?.name === 'TimeoutError') throw new AipError('timeout', ui("Превышено время ожидания ответа (3 мин)"));
        throw e;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
    }
}

export async function fetchModels(p) {
    if (srcOf(p).source === 'claude') return CLAUDE_MODELS;
    if (p.keyId) return (await vaultCall('/models', { keyId: p.keyId, url: p.url })).models || [];
    if (!p.secretId) throw new AipError('no_key', ui("Сначала добавьте ключ профиля"));
    const body = { chat_completion_source: 'custom', custom_url: baseUrl(p), secret_id: p.secretId };
    const r = await post('/api/backends/chat-completions/status', body);
    const j = await r.json().catch(() => ({}));
    if (j?.error) return [];
    const arr = j?.data ?? j?.models ?? [];
    return [...new Set((Array.isArray(arr) ? arr : []).map(m => m?.id ?? m).filter(x => typeof x === 'string'))].sort();
}

// ---------- Очистка ответа ----------
export function cleanReply(text, sync) {
    let t = String(text || '');
    t = t.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
    t = t.replace(/(?:\*\*)?\[{1,2}\s*OOC\s*\]{1,2}(?:\*\*)?[\s\S]*?(?:\[{1,2}\s*\/\s*OOC\s*\]{1,2}|$)/gi, '');
    t = t.trim();
    t = t.replace(new RegExp(`^\\s*(?:\\*\\*)?${esc(sync.personaName)}(?:\\*\\*)?\\s*:\\s*`, 'i'), '');
    for (const name of sync.partners) {
        const cut = t.search(new RegExp(`\\n\\s*(?:\\*\\*)?${esc(name)}(?:\\*\\*)?\\s*:`, 'i'));
        if (cut > 0) t = t.slice(0, cut);
    }
    return t.trim();
}
