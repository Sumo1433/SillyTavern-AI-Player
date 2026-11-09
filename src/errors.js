import { short } from './core.js';
import { ui } from './i18n.js';

// ---------- Ошибки запросов ----------
// kind: auth | rate | billing | timeout | network | upstream | bad_request | bad_response | empty |
//       no_key | key_mismatch | no_plugin | context | server | unknown
export class AipError extends Error {
    constructor(kind, message, status = null) { super(message); this.name = 'AipError'; this.kind = kind; this.status = status; }
}
export function kindByStatus(status) {
    if (status === 401 || status === 403) return 'auth';
    if (status === 429) return 'rate';
    if (status === 402) return 'billing';
    if (status === 408 || status === 504) return 'timeout';
    if (status >= 500) return 'upstream';
    if (status >= 400) return 'bad_request';
    return 'unknown';
}
// Бэкенд ST часто отдаёт только текст ошибки провайдера — разбираем его, без догадок сверх этого
export function kindByMessage(msg) {
    const t = String(msg || '');
    if (/\b(401|403)\b|unauthori[sz]ed|forbidden|invalid[^.\n]{0,20}(api[ _-]?key|token|credential)|authentication/i.test(t)) return 'auth';
    if (/\b429\b|rate[ _-]?limit|too many requests|quota/i.test(t)) return 'rate';
    if (/insufficient[ _-](balance|funds|credit)|\b402\b|payment required/i.test(t)) return 'billing';
    if (/timed? ?out|ETIMEDOUT|time-?out/i.test(t)) return 'timeout';
    if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|fetch failed|socket hang up|network/i.test(t)) return 'network';
    if (/\b50[0234]\b|bad gateway|service unavailable|overloaded/i.test(t)) return 'upstream';
    return null;
}
// Ни ключей, ни паролей, ни адресов с учётными данными в сообщениях и диагностике
export function redact(text) {
    return String(text ?? '')
        .replace(/Bearer\s+[^\s"']+/gi, 'Bearer ***')
        .replace(/\b(sk|pk|key)-[A-Za-z0-9_-]{6,}/g, '$1-***')
        .replace(/\b(AIza)[A-Za-z0-9_-]{10,}/g, '$1***')
        .replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, '$1***@')
        .replace(/([?&](?:key|api_key|apikey|token|password)=)[^&\s]+/gi, '$1***');
}
const STAGE_LABELS = () => ({ turn: ui("Ход"), reaction: ui("Впечатление"), memory: ui("Записи"), test: ui("Тест"), models: ui("Список моделей"), keys: ui("Ключи") });
const KIND_LABELS = () => ({
    auth: ui("ключ или пароль отклонён (ошибка авторизации)"),
    rate: ui("превышен лимит запросов провайдера, попробуйте позже"),
    billing: ui("провайдер сообщает о нехватке средств"),
    timeout: ui("провайдер не ответил вовремя"),
    network: ui("нет соединения с API"),
    upstream: ui("ошибка на стороне провайдера или прокси"),
    bad_request: ui("провайдер отклонил запрос"),
    bad_response: ui("провайдер вернул непонятный ответ"),
    empty: ui("модель вернула пустой ответ"),
    no_key: ui("ключ не найден"),
    key_mismatch: ui("ключ привязан к другому адресу или типу API"),
    no_plugin: ui("плагин AI Player недоступен"),
    context: ui("запрос не помещается в контекст модели"),
    server: ui("внутренняя ошибка"),
    unknown: ui("ошибка"),
});
// «Записи: провайдер не ответил вовремя (HTTP 504). подробности…»
export function describeError(e, stage) {
    const kind = e?.kind || kindByMessage(e?.message) || (e?.status ? kindByStatus(e.status) : 'unknown');
    const labels = KIND_LABELS();
    const head = `${STAGE_LABELS()[stage] || 'AI Player'}: ${labels[kind] || labels.unknown}${e?.status ? ` (HTTP ${e.status})` : ''}`;
    const detail = short(redact(e?.message || ''));
    return detail && detail !== labels[kind] ? `${head}. ${detail}` : head;
}
