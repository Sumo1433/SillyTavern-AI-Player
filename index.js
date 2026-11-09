// UI language follows SillyTavern. Only authored strings pass through ui(); user text is never translated.
const UI_EN = {
    "OpenAI-совместимый / реверс-прокси (формат OpenAI)": "OpenAI-compatible / reverse proxy (OpenAI format)",
    "Anthropic (Claude, официальный API)": "Anthropic (official Claude API)",
    "Claude через реверс-прокси (формат Anthropic)": "Claude reverse proxy (Anthropic format)",
    "Профиль 1": "Profile 1",
    "Не удалось прочитать состояние ключей (HTTP ${0})": "Could not read key status (HTTP ${0})",
    "Хранилище ключей SillyTavern недоступно": "SillyTavern key storage is unavailable",
    "без названия": "unnamed",
    "Эта версия SillyTavern хранит один ключ на провайдера — несколько ключей недоступны. Новый ключ заменит ключ основной таверны. Продолжить?": "This SillyTavern version stores only one key per provider. The new key will replace the main Tavern key. Continue?",
    "Не удалось сохранить ключ (HTTP ${0})": "Could not save key (HTTP ${0})",
    "В списке ключей таверны появилась пустая «заглушка AI Player» — она нужна, чтобы ключ расширения не стал ключом основной таверны. Не удаляйте её, пока не добавите таверне свой ключ.": "An empty AI Player placeholder was added to Tavern's key list to keep the extension key from becoming the main Tavern key. Keep it until you add a main Tavern key.",
    "Удалить ключ «${0}» из хранилища SillyTavern? Его потеряют все профили, где он выбран.": "Delete key “${0}” from SillyTavern? All profiles using it will lose access.",
    "Не удалось удалить ключ (HTTP ${0})": "Could not delete key (HTTP ${0})",
    "Выбран ключ, активный в панели API таверны. Удалить его из основной таверны?": "The key active in Tavern's API panel is selected. Delete it from Tavern?",
    "Игрок": "Player",
    "Группа": "Group",
    "Персонаж": "Character",
    "Персона (агент-игрок): ${0}\n${1}\n\n": "Persona (AI player): ${0}\n${1}\n\n",
    "Карта чара": "Character card",
    "Сценарий: ${0}": "Scenario: ${0}",
    "Системный промпт игрока": "Player system prompt",
    "Напоминание перед ходом": "Turn reminder",
    "Впечатления после ответа бота": "Impressions after the bot's reply",
    "Записи игрока (память)": "Player notes (memory)",
    "имя персоны (агент)": "persona name (agent)",
    "имя бота / участников группы": "bot name / group members",
    "описание персоны или «Роль игрока»": "persona description or player role override",
    "описание, характер и сценарий карты": "card description, personality, and scenario",
    "сценарий": "scenario",
    "доп. указания игроку": "additional player instructions",
    "правило знаний (по настройке)": "knowledge rule (from settings)",
    "слов от": "minimum words",
    "слов до": "maximum words",
    "«Имя» или «персонажей «…»»": "character name or group members",
    "«Имя» без слова «персонажей» (после {partner_is})": "partner name (after {partner_is})",
    "«Персонажем» / «Персонажами»": "character / characters",
    "СОБЕСЕДНИК / СОБЕСЕДНИКИ": "PARTNER / PARTNERS",
    "макросы ST тоже работают": "ST macros also work",
    "персонажей «${0}»": "characters “${0}”",
    "Персонажами": "Characters",
    "Персонажем": "Character",
    "СОБЕСЕДНИКИ": "PARTNERS",
    "СОБЕСЕДНИК": "PARTNER",
    "(описание не задано — выстрой характер из хода игры и оставайся последовательным)": "(no description supplied — infer a consistent character from the game)",
    "Описание: ${0}": "Description: ${0}",
    "Характер: ${0}": "Personality: ${0}",
    "\nДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ ИГРОКУ:\n${0}\n": "\nADDITIONAL PLAYER INSTRUCTIONS:\n${0}\n",
    "Описание мира и ${0} выше — знание ведущего. «${1}» знает только то, что сам видел, слышал или мог знать по своей биографии. Скрытое не используй.": "The world and ${0} descriptions above are game-master information. “${1}” knows only what they have seen, heard, or could know from their background. Do not act on hidden information.",
    "Можешь опираться на всё описание мира выше.": "You may use the full world description above.",
    "[…часть истории пропущена…]": "[…part of the history omitted…]",
    "[Начало ролевой игры. Сценарий: ${0}]": "[Start of the roleplay. Scenario: ${0}]",
    "Откройте чат": "Open a chat",
    "Записи уже обновляются": "Notes are already being updated",
    "Новых сообщений для записей нет": "No new messages to add to notes",
    "Укажите модель в окне AI Player": "Select a model in AI Player settings",
    "[ТЫ] ": "[YOU] ",
    "Прежние записи:\n${0}\n\n": "Previous notes:\n${0}\n\n",
    "(пока пусто)": "(none yet)",
    "Новые сообщения игры${0}:\n\n${1}\n\n": "New game messages${0}:\n\n${1}\n\n",
    " (самые старые ${0} не поместились)": " (oldest ${0} messages omitted to fit)",
    "[Обнови записи «${0}». Выведи только записи.]": "[Update the notes for “${0}”. Output only the notes.]",
    "модель вернула пустые записи": "the model returned empty notes",
    "Записи обрезаны по лимиту токенов — часть разделов могла потеряться": "Notes reached the token limit — some sections may be missing",
    "Записи игрока обновлены": "Player notes updated",
    "[AI Player] записи не обновлены:": "[AI Player] notes update failed:",
    "AI Player: записи не обновлены — ${0}": "AI Player: could not update notes — ${0}",
    "⏳ Обновляю записи…": "⏳ Updating notes…",
    "Записи от ${0}${1}${2}": "Notes from ${0}${1}${2}",
    " · учтены сообщения до #${0}": " · includes messages through #${0}",
    "Записей пока нет.": "No notes yet.",
    "⚠ Сообщения, по которым составлены записи, удалены — в записях могут остаться отменённые события. Поправьте их или нажмите «Обновить».": "⚠ Messages used for these notes were deleted. The notes may retain undone events. Edit them or click Update.",
    "Память выключена: записи не обновляются сами и не подмешиваются в ход.": "Memory is off: notes are neither updated automatically nor added to turns.",
    "вручную": "manually",
    "[AI Player] шкала:": "[AI Player] context meter:",
    "Контекст: чат не открыт": "Context: no chat open",
    "${0} / ${1} (${2}%) · сообщений ${3}/${4}${5}${6}": "${0} / ${1} (${2}%) · messages ${3}/${4}${5}${6}",
    " · ${0} не влезло": " · ${0} omitted",
    " · ⚠ последнее сообщение не влезает": " · ⚠ latest message does not fit",
    "Только текущий чат: ${0} × ${1}\n": "Current chat only: ${0} × ${1}\n",
    "Системный промпт: ${0} ток.${1}\nИстория чата: ${2} ток.\nРезерв на ответ: ${3} ток.\nЛимит модели (настройка профиля): ${4} ток.": "System prompt: ${0} tokens${1}\nChat history: ${2} tokens\nReply reserve: ${3} tokens\nModel limit (profile setting): ${4} tokens",
    " (из них записи игрока: ${0})": " (including player notes: ${0})",
    "Не указана модель": "No model selected",
    "Не указан URL": "No URL specified",
    "Не указан адрес реверс-прокси": "No reverse proxy URL specified",
    "SillyTavern не отправляет запрос к Claude-прокси без пароля. Если прокси пароль не требует — впишите любой символ": "SillyTavern requires a password for a Claude proxy. If the proxy needs no password, enter any character.",
    "Ошибка бэкенда ST — подробности в консоли сервера SillyTavern": "ST backend error — see the SillyTavern server console for details",
    "Превышено время ожидания ответа (3 мин)": "Response timed out (3 minutes)",
    "AI Player: остановить": "AI Player: stop",
    "AI Player: сделать ход за игрока": "AI Player: play a turn",
    "Таверна ещё генерирует — дождитесь окончания": "Tavern is still generating — wait for it to finish",
    "Откройте чат с персонажем или группой": "Open a character or group chat",
    "Укажите адрес и пароль реверс-прокси в окне AI Player": "Set the reverse proxy URL and password in AI Player",
    "Сохраните API-ключ в окне AI Player": "Save an API key in AI Player settings",
    "Последнее сообщение — ход игрока, бот ещё не ответил. Сделать ещё один ход подряд?": "The latest message is a player turn and the bot has not replied. Play another turn anyway?",
    "Чат сменился при сборке контекста": "Chat changed while building context",
    "Контекст переполнен: даже последнее сообщение не влезает в лимит модели. Увеличьте «Контекст модели» или уменьшите «Макс. токенов».": "Context overflow: even the latest message does not fit. Increase the model context limit or reduce the maximum output tokens.",
    "Чат изменился во время генерации — ход отброшен": "Chat changed during generation — turn discarded",
    "Модель вернула пустую реплику": "The model returned an empty turn",
    "Ответ обрезан по лимиту токенов — увеличьте «Макс. токенов»": "Reply reached the token limit — increase maximum output tokens",
    "В поле ввода есть ваш текст. Заменить его ходом агента?": "The input field contains your text. Replace it with the agent's turn?",
    "Таверна занята — ход оставлен в поле ввода": "Tavern is busy — the turn was left in the input field",
    "Основной API таверны не подключён — ход оставлен в поле ввода": "Tavern's main API is disconnected — the turn was left in the input field",
    "Последние сообщения игры:\n\n${0}\n\n[Что у тебя в голове об игре после ответа «${1}»?]": "Recent game messages:\n\n${0}\n\n[What is on your mind about the game after “${1}” replied?]",
    "[AI Player] вывод не получен:": "[AI Player] could not get impressions:",
    "AI Player: впечатление не получено — ${0}": "AI Player: could not get impressions — ${0}",
    " · свайп ${0}": " · swipe ${0}",
    "💭 Новое впечатление игрока": "💭 New player impressions",
    "Впечатления включены — нажмите, чтобы выключить": "Impressions are on — click to turn off",
    "Впечатления выключены — нажмите, чтобы включить": "Impressions are off — click to turn on",
    "AI Player — впечатления${0}": "AI Player — impressions${0}",
    " (выкл.)": " (off)",
    "Впечатления игрока": "Player impressions",
    "Свернуть / развернуть": "Minimize / expand",
    "Очистить впечатления этого чата": "Clear impressions for this chat",
    "Скрыть": "Hide",
    "Впечатления выключены — новые не запрашиваются.": "Impressions are off — no new requests will be sent.",
    "Включить": "Enable",
    "Новое впечатление": "New impressions",
    "Впечатления игрока об игре появятся здесь, когда бот ответит на ход агента.": "Player impressions will appear here when the bot replies to an agent turn.",
    "Это слова игрока, а не персонажа. В чат не попадают.": "These are the player's comments, not the character's. They are not sent to chat.",
    "Впечатления игрока включены": "Player impressions enabled",
    "Впечатления игрока выключены — лишних запросов не будет": "Player impressions disabled — no extra requests",
    "Очистить впечатления игрока в этом чате?": "Clear player impressions for this chat?",
    "Ход сделан агентом AI Player (профиль «${0}»)": "Turn played by AI Player (profile “${0}”)",
    "_Экспорт ${0}_": "_Exported ${0}_",
    " — (вручную)": " — (manual)",
    " · ${0} сл.${1} · ${2} с": " · ${0} words${1} · ${2} s",
    "## Записи игрока": "## Player notes",
    "ИИ против ИИ": "AI vs AI",
    "Активный профиль агента": "Active agent profile",
    "Закрыть (Esc)": "Close (Esc)",
    "Контекст: —": "Context: —",
    "промпт": "prompt",
    "история": "history",
    "ответ": "reply",
    "Подключение": "Connection",
    "Игра": "Game",
    "Промпты": "Prompts",
    "Партия": "Session",
    "Профиль": "Profile",
    "Новый профиль (копия текущего)": "New profile (copy current)",
    "Удалить профиль": "Delete profile",
    "Название": "Name",
    "Тип": "Type",
    "URL — база API или адрес реверс-прокси": "URL — API base or reverse proxy address",
    "Пароль прокси": "Proxy password",
    "обязателен для ST; если прокси без пароля — любой символ": "required by ST; enter any character for a passwordless proxy",
    "🔐 Пароль хранится в настройках расширения — в": "🔐 The password is stored in extension settings in",
    "SillyTavern на сервере таверны (там же, где ST хранит свой пароль прокси) и загружается в браузер вместе с настройками. При запросе он идёт через сервер ST только на указанный реверс-прокси. Не передавайте никому": "on the SillyTavern server, where ST stores its own proxy password, and is loaded into the browser with settings. Requests pass it through the ST server to your chosen proxy. Do not share",
    "и бэкапы папки": "or backups of",
    "Ключ": "Key",
    "Какой ключ использует этот профиль": "Key used by this profile",
    "Удалить выбранный ключ из хранилища": "Delete selected key from storage",
    "Добавить ключ": "Add key",
    "название, напр. «Kimi основной»": "name, e.g. “Main Kimi”",
    "ключ": "key",
    "Сохранить": "Save",
    "Модель": "Model",
    "выберите или впишите ID": "select or enter a model ID",
    "Загрузить список моделей": "Load model list",
    "Температура": "Temperature",
    "Контекст модели, токенов": "Model context, tokens",
    "передавать temperature": "send temperature",
    "reasoning-модели её не принимают": "reasoning models may reject it",
    "Объём и контекст": "Length and context",
    "Слов от": "Minimum words",
    "Слов до": "Maximum words",
    "Макс. токенов": "Max output tokens",
    "Сообщений в контексте": "Messages in context",
    "Роль игрока": "Player role",
    "Что игрок знает о карте бота": "What the player knows about the bot's card",
    "Только то, что видно в сцене (без метагейма)": "Only what is visible in the scene (no metagaming)",
    "Всё описание карты": "Full card description",
    "Роль игрока — пусто = описание выбранной персоны ST": "Player role — leave empty to use the selected ST persona",
    "Например: циничный наёмник, который скрывает…": "For example: a cynical mercenary who conceals…",
    "Доп. указания — цели, манера": "Additional instructions — goals, style",
    "Например: хочет выведать тайну, не доверяет никому…": "For example: wants to uncover a secret, trusts nobody…",
    "Сразу отправлять ход в чат": "Send the turn to chat immediately",
    "иначе — в поле ввода": "otherwise leave it in the input field",
    "Впечатления игрока 💭 после ответа бота": "Player impressions 💭 after the bot's reply",
    "выкл. — без доп. запросов": "off means no extra impressions requests",
    "Анимации интерфейса": "Interface animations",
    "можно выключить на слабом телефоне": "disable for slower devices",
    "Пресет стиля игрока": "Player style preset",
    "Сводный (стандарт)": "Combined (default)",
    "Применить": "Apply",
    "Пресет заменяет все три промпта. Удобно сравнивать модели при разных стилях игрока; свои правки потом можно вернуть только вручную.": "The preset replaces the system, turn, and impressions prompts. Compare models with different player styles. Custom edits can only be restored manually.",
    "Свой промпт (внедрение в историю)": "Custom prompt (insert into history)",
    "Например: «{player} сейчас ранен в левую руку и не может держать меч» или любые свои указания игроку. Работают плейсхолдеры и макросы ST.": "For example: “{player} has an injured left arm and cannot hold a sword”, or any other player instructions. Supports placeholders and ST macros.",
    "Глубина внедрения": "Insertion depth",
    "От чьего имени": "Message role",
    "system (инструкция)": "system (instruction)",
    "user (как реплика сцены)": "user (scene message)",
    "Как Author's Note в SillyTavern:": "Like Author's Note in SillyTavern:",
    "— в самом конце, прямо перед ходом (сильнее всего влияет);": "— at the very end, right before the turn (strongest influence);",
    "— перед последними N сообщениями истории (мягче, «в фоне»). Действует на ходы игрока; пустое поле — не внедряется.": "— before the last N history messages (softer background influence). Applies to player turns; leave empty to disable.",
    "Предпросмотр": "Preview",
    "Плейсхолдеры": "Placeholders",
    "Сбросить": "Reset",
    "Синхронизация с таверной": "Tavern synchronization",
    "Обновить": "Refresh",
    "Окно впечатлений": "Impressions window",
    "Экспорт .md": "Export .md",
    "Экспорт .json": "Export .json",
    "Память игрока (записи)": "Player memory (notes)",
    "Вести записи и подмешивать их в ход": "Keep notes and include them in turns",
    "доп. запрос раз в N ходов": "extra request every N turns",
    "Обновлять каждые N ходов агента": "Update every N agent turns",
    "Записей пока нет. Они появятся через N ходов агента или по кнопке «Обновить сейчас». Можно написать и вручную.": "No notes yet. They will appear after N agent turns or when you click Update now. You can also write them manually.",
    "Обновить сейчас": "Update now",
    "Очистить": "Clear",
    "Сводка от лица персонажа: состояние, цели, отношения, обещания, факты и догадки. Она помогает не забыть важное, когда старые сообщения не влезают в контекст. У каждого чата свои записи, они хранятся в метаданных чата. Править можно прямо здесь.": "A character-perspective summary: state, goals, relationships, promises, facts, and suspicions. Helps retain important details when older messages leave the context. Each chat has its own notes stored in chat metadata. Edit them here.",
    "Тест": "Test",
    "Сделать ход": "Play a turn",
    "Профиль ${0}": "Profile ${0}",
    "Создан профиль. Ключ у него свой — сохраните его.": "Profile created. Save a key for it.",
    "Нельзя удалить единственный профиль": "Cannot delete the only profile",
    "Удалить профиль «${0}»${1}?${2}": "Delete profile “${0}”${1}?${2}",
    " и его ключ": " and its key",
    " Ключ останется — он выбран в других профилях.": " The key will remain because other profiles use it.",
    "Профиль удалён, но ключ удалить не удалось — удалите его из списка ключей вручную": "Profile deleted, but its key could not be removed — delete it manually from the key list",
    "Без имени": "Unnamed",
    "Очистить записи игрока в этом чате?": "Clear player notes for this chat?",
    "Заменить текущие промпты пресетом «${0}»? Ваши правки будут потеряны.": "Replace the current prompts with preset “${0}”? Your edits will be lost.",
    "Пресет «${0}» применён": "Preset “${0}” applied",
    "Сбросить «${0}» к стандартному?": "Reset “${0}” to the default?",
    "Ошибка: ${0}": "Error: ${0}",
    "Введите ключ": "Enter a key",
    "Ключ добавлен в хранилище SillyTavern и выбран в профиле": "Key added to SillyTavern storage and selected for this profile",
    "Удалять нечего — ключей расширения нет": "Nothing to delete — there are no extension keys",
    "Моделей: ${0} — выберите в поле «Модель»": "Models: ${0} — select one in the Model field",
    "Список не получен — впишите ID вручную": "Could not load the list — enter the model ID manually",
    "Проверка…": "Testing…",
    "Ключ не сохранён": "No key saved",
    "Отвечай одним словом.": "Reply with one word.",
    "Скажи: готов": "Say: ready",
    "✔ Соединение есть (${0}). Ответ: ${1}": "✔ Connected (${0}). Reply: ${1}",
    "(пусто)": "(empty)",
    "модель не выбрана": "no model selected",
    "Адрес реверс-прокси — как в поле Reverse Proxy в ST (обычно оканчивается на /v1; ST сам добавит /messages)": "Reverse proxy URL — like ST's Reverse Proxy field (usually ends in /v1; ST adds /messages)",
    "https://адрес-прокси/…/v1": "https://your-proxy/…/v1",
    "✎ Свой промпт. Изменения сохраняются сразу. Пустое поле = стандартный.": "✎ Custom prompt. Changes are saved immediately. Empty means default.",
    "Стандартный промпт. Начните править — сохранится как свой.": "Default prompt. Start editing to save a custom version.",
    "— ключей расширения нет, добавьте ниже —": "— no extension keys; add one below —",
    "↪ Ключ, активный в панели API таверны": "↪ Key active in Tavern's API panel",
    "⚠ Не удалось прочитать хранилище ключей SillyTavern. Выбор ключа сохранён; попробуйте открыть окно ещё раз.": "⚠ Could not read SillyTavern key storage. Your key selection was preserved; try reopening this window.",
    "🔒 Выбран ключ расширения (всего ключей расширения: ${0}). Ключи хранятся в secrets.json на сервере SillyTavern (там, где запущена таверна); в браузер приходит только маска с последними символами (если в config.yaml не включён allowKeysExposure). Ключи из панели API таверны здесь не показываются.": "🔒 Extension key selected (${0} extension keys). Keys are stored in secrets.json on the SillyTavern server. The browser receives a masked value unless allowKeysExposure is enabled in config.yaml. Main Tavern keys are not listed here.",
    "↪ Используется ключ, активный в панели API таверны (${0}).${1}": "↪ Using the key active in Tavern's API panel (${0}).${1}",
    " Эта версия ST хранит один ключ на провайдера.": " This ST version stores one key per provider.",
    " Чтобы не путаться, добавьте отдельный ключ расширения.": " Add a separate extension key to avoid confusion.",
    "⚠ Ключа нет — нажмите «Добавить ключ».": "⚠ No key — click Add key.",
    "Ошибка синхронизации: ${0}": "Synchronization error: ${0}",
    "[AI Player] окно не создано": "[AI Player] window was not created",
    "AI Player: окно не создано — ${0}": "AI Player: window was not created — ${0}",
    "настройки": "settings",
    "статус": "status",
    "синхронизация": "synchronization",
    "шкала": "context meter",
    "style.css загружен: ${0}": "style.css loaded: ${0}",
    "да": "yes",
    "НЕТ": "NO",
    "${0}: НЕТ в DOM": "${0}: NOT in DOM",
    "${0}: в ${1} · class=\"${2}\" · display=${3} vis=${4} op=${5} z=${6} pos=${7} · ${8},${9} ${10}×${11}": "${0}: inside ${1} · class=\"${2}\" · display=${3} vis=${4} op=${5} z=${6} pos=${7} · ${8},${9} ${10}×${11}",
    "сверху в центре экрана: ${0}": "topmost at screen center: ${0}",
    "окно ${0}×${1} · чат: ${2} · ошибок: ${3}": "window ${0}×${1} · chat: ${2} · errors: ${3}",
    "открыт": "open",
    "нет": "none",
    "ошибка: ${0}": "error: ${0}",
    "[AI Player] диагностика\n": "[AI Player] diagnostics\n",
    "Отчёт вставлен в поле ввода — скопируйте его и пришлите разработчику. Не отправляйте в чат.": "Report inserted into the input field — copy it and send it to the developer. Do not send it to the roleplay chat.",
    "AI Player: диагностика": "AI Player: diagnostics",
    "AI Player — ошибка": "AI Player — error",
    "скрипт": "script",
    "промис": "promise",
    "AI Player — настройки": "AI Player — settings",
    "AI Player — впечатления": "AI Player — impressions",
    "окно впечатлений": "impressions window",
    "AI Player — диагностика": "AI Player — diagnostics",
    "диагностика": "diagnostics",
    "запуск": "startup",
    "[AI Player] ${0} загружен": "[AI Player] ${0} loaded",
    "Версия ${0} загружена. Меню-палочка → AI Player.": "Version ${0} loaded. Wand menu → AI Player.",
    "Актёр — желание, подтекст, голос": "Actor — desire, subtext, voice",
    "Режиссёр — цели, темп, ставки": "Director — goals, pace, stakes",
    "Анти-клише — чистая проза": "Anti-cliché — clean prose"
};
function tavernLocale() {
    try {
        const locale = SillyTavern.getContext().getCurrentLocale?.();
        if (locale) return String(locale).toLowerCase();
    } catch { /* compatibility with older ST */ }
    try { return String(localStorage.getItem('language') || navigator.language || 'en').toLowerCase(); }
    catch { return 'en'; }
}
function formatTranslation(input, values, english) {
    const key = typeof input === 'string' ? input : input.reduce((out, part, i) => out + part + (i < values.length ? '\$' + '{' + i + '}' : ''), '');
    const text = english ? (UI_EN[key] ?? key) : key;
    // Substitute once, so text from users containing placeholder syntax remains literal.
    return text.replace(/\$\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match);
}
function ui(input, ...values) { return formatTranslation(input, values, !/^ru(?:-|$)/.test(tavernLocale())); }
function promptText(input, ...values) { return formatTranslation(input, values, true); }

function languageRule() {
    return 'OUTPUT LANGUAGE: Write the turn, impressions, and character notes in the language the user is playing in. ' +
        'Honor an explicit request to change the language of play. Otherwise follow the latest substantive user-character messages in the supplied game history; ' +
        'if there are no such messages, follow the current scene dialogue. Do not infer the language from character names, code, or quoted foreign phrases. ' +
        'English system instructions, card metadata, and the UI language must not override an established language of play. ' +
        'If no game language can be inferred, use the SillyTavern interface locale (' + tavernLocale() + '). ' +
        'Translate thought labels and memory headings into the language of play. Output only the requested content, without explaining the language choice.';
}

﻿// AI Player — расширение SillyTavern «ИИ против ИИ».
// Агент играет за выбранную персону {{user}} против бота таверны. Работает только по кнопке ▶.
// Цикл: ▶ → агент пишет ход → ход уходит в чат → бот отвечает → агент читает ответ и пишет
// короткое впечатление об игре в окно 💭 (в чат не попадает). По желанию агент ведёт «записи» —
// память персонажа (цели, отношения, обещания, факты), которая переживает обрезку истории.
// Ключи хранятся в хранилище ключей SillyTavern (secrets.json на сервере таверны — там, где она
// запущена); все запросы идут через бэкенд ST.

const MODULE = 'ai_player';
const VERSION = '0.5.0';
// ID из списка SillyTavern 1.19 + актуальные
const CLAUDE_MODELS = ['claude-fable-5-1', 'claude-fable-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-sonnet-5', 'claude-haiku-5-5'];
const SOURCE = {
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
const PROFILE_FIELDS = ['provider', 'url', 'model', 'temperature', 'contextSize', 'proxyPassword'];
const GLOBAL_FIELDS = ['maxTokens', 'contextMessages', 'minWords', 'maxWords', 'knowledge', 'extraInstructions', 'roleOverride', 'customPrompt', 'customDepth', 'customRole', 'memoryEvery'];
const GLOBAL_CHECKS = ['autoSend', 'reactions', 'sendTemperature', 'motion', 'memory'];
const applyMotion = () => document.body.classList.toggle('aip-nomotion', !settings().s.motion);
const REQUEST_TIMEOUT = 180000;

const ctx = () => SillyTavern.getContext();
const H = () => ctx().getRequestHeaders();
const post = (url, body, signal) => fetch(url, { method: 'POST', headers: H(), body: JSON.stringify(body ?? {}), signal });
const num = (v, lo, hi, def) => { const n = Number(v); return (v === '' || v == null || !Number.isFinite(n)) ? def : Math.min(hi, Math.max(lo, n)); };
const esc = t => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const short = t => String(t ?? '').slice(0, 300);
const chatId = () => { try { return ctx().getCurrentChatId?.() ?? null; } catch { return null; } };

let busy = false;
let abortCtl = null;
let pendingMeta = null;
let reactCtl = null;          // запрос «впечатлений» — отменяется при смене чата и их выключении
const reacted = new Set();
let memCtl = null;            // запрос обновления записей игрока
let memBusy = false;

// ---------- Настройки и профили ----------
function newProfile(name, from = {}) {
    return {
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, provider: from.provider || 'openai',
        url: from.url ?? SOURCE.openai.defUrl, model: from.model || '',
        temperature: from.temperature ?? 0.9, contextSize: from.contextSize ?? 32000, secretId: null,
        proxyPassword: from.proxyPassword || '',
    };
}

function settings() {
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
const activeProfile = () => { const { s } = settings(); return s.profiles.find(p => p.id === s.activeProfile); };
const findProfile = id => settings().s.profiles.find(p => p.id === id);
const srcOf = p => SOURCE[p?.provider] || SOURCE.openai;
const baseUrl = p => (p.url || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');

// ---------- Секреты ST ----------
async function secretState() {
    const r = await post('/api/secrets/read');
    if (!r.ok) throw new Error(ui`Не удалось прочитать состояние ключей (HTTP ${r.status})`);
    const j = await r.json();
    // при внутренней ошибке ST отвечает 200 и {} — это сбой, а не «ключей нет»
    if (!j || typeof j !== 'object' || !('api_key_custom' in j)) throw new Error(ui("Хранилище ключей SillyTavern недоступно"));
    return j;
}
function slotList(state, key) {
    const v = state?.[key];
    if (Array.isArray(v)) return v;
    return v ? [{ id: null, active: true, legacy: true }] : [];
}
async function profileHasKey(p) {
    if (srcOf(p).proxy) return !!(p.url && p.proxyPassword);   // реверс-прокси Claude: адрес + пароль в профиле
    try {
        const list = slotList(await secretState(), srcOf(p).secret);
        // без своего ключа ST возьмёт активный ключ таверны — он должен быть настоящим, а не заглушкой
        return p.secretId ? list.some(x => x.id === p.secretId) : list.some(x => x.active && x.label !== PLACEHOLDER_LABEL);
    } catch { return false; }
}
// Ключи расширения помечаются меткой «AI Player …», чтобы не смешивать их с ключами самой таверны
const AIP_LABEL = 'AI Player';
const isAipKey = x => /^AI Player\b/.test(x?.label || '');
const keyName = x => (x?.label || ui("без названия")).replace(/^AI Player\s*[:·-]?\s*/, '') || ui("без названия");

const PLACEHOLDER_LABEL = 'Пусто — заглушка AI Player (ключ таверны не задан)';

// Добавляет ключ ОТДЕЛЬНЫМ значением (старые ключи остаются в списке) и выбирает его в профиле.
// ST всегда делает новый ключ активным для всей таверны — поэтому возвращаем таверне её прежний
// активный ключ, а если его не было — ставим пустую заглушку, чтобы ключ расширения не ушёл
// на адрес основного подключения таверны.
async function saveProfileKey(p, value, label) {
    const key = srcOf(p).secret;
    const before = slotList(await secretState(), key);
    if (before.some(x => x.legacy) && !confirm(ui("Эта версия SillyTavern хранит один ключ на провайдера — несколько ключей недоступны. Новый ключ заменит ключ основной таверны. Продолжить?"))) return false;
    const prevActive = before.find(x => x.active)?.id;
    const r = await post('/api/secrets/write', { key, value, label: `${AIP_LABEL} · ${label || p.name}` });
    if (!r.ok) throw new Error(ui`Не удалось сохранить ключ (HTTP ${r.status})`);
    const j = await r.json().catch(() => ({}));
    p.secretId = j?.id || null;
    if (j?.id) {
        if (prevActive && prevActive !== j.id) {
            await post('/api/secrets/rotate', { key, id: prevActive }).catch(() => {});
        } else if (!prevActive) {
            const ph = before.find(x => x.label === PLACEHOLDER_LABEL);
            if (ph) await post('/api/secrets/rotate', { key, id: ph.id }).catch(() => {});
            else {
                await post('/api/secrets/write', { key, value: '', label: PLACEHOLDER_LABEL }).catch(() => {});
                toastr.info(ui("В списке ключей таверны появилась пустая «заглушка AI Player» — она нужна, чтобы ключ расширения не стал ключом основной таверны. Не удаляйте её, пока не добавите таверне свой ключ."), 'AI Player', { timeOut: 9000 });
            }
        }
    }
    settings().save();
    return true;
}
// Удаляет выбранный в профиле ключ из хранилища ST
async function deleteProfileKey(p) {
    const key = srcOf(p).secret;
    if (p.secretId) {
        const item = slotList(await secretState(), key).find(x => x.id === p.secretId);
        if (!confirm(ui`Удалить ключ «${keyName(item)}» из хранилища SillyTavern? Его потеряют все профили, где он выбран.`)) return;
        const r = await post('/api/secrets/delete', { key, id: p.secretId });
        if (!r.ok) throw new Error(ui`Не удалось удалить ключ (HTTP ${r.status})`);
        for (const x of settings().s.profiles) if (x.secretId === p.secretId) x.secretId = null;
        settings().save();
        return;
    }
    if (!confirm(ui("Выбран ключ, активный в панели API таверны. Удалить его из основной таверны?"))) return;
    const r = await post('/api/secrets/delete', { key });
    if (!r.ok) throw new Error(ui`Не удалось удалить ключ (HTTP ${r.status})`);
    // после удаления ST делает активным первый оставшийся — если это ключ расширения, возвращаем заглушку
    const after = slotList(await secretState(), key);
    const act = after.find(x => x.active);
    if (act && isAipKey(act)) {
        const ph = after.find(x => x.label === PLACEHOLDER_LABEL);
        if (ph) await post('/api/secrets/rotate', { key, id: ph.id });
        else await post('/api/secrets/write', { key, value: '', label: PLACEHOLDER_LABEL });
    }
}

// ---------- Синхронизация с ST ----------
function getSync() {
    const c = ctx();
    const sub = t => { try { return c.substituteParams ? c.substituteParams(t || '') : (t || ''); } catch { return t || ''; } };
    let f = {};
    try { f = c.getCharacterCardFields?.() ?? {}; } catch { /* старый ST */ }
    const personaName = c.name1 || ui("Игрок");
    const personaDesc = sub(f.persona ?? c.powerUserSettings?.persona_description ?? '').trim();
    let card, partners;
    if (c.groupId) {
        const g = (c.groups || []).find(x => x.id === c.groupId);
        const members = (g?.members || []).map(av => (c.characters || []).find(ch => ch.avatar === av)).filter(Boolean);
        partners = members.map(m => m.name);
        card = {
            name: partners.join(', ') || g?.name || ui("Группа"),
            description: members.map(m => `— ${m.name}: ${sub(m.description)}`).join('\n'),
            personality: members.map(m => m.personality ? `— ${m.name}: ${sub(m.personality)}` : '').filter(Boolean).join('\n'),
            scenario: sub(c.chatMetadata?.scenario || members[0]?.scenario || ''),   // переопределение сценария группы — в метаданных чата
        };
    } else {
        card = { name: c.name2 || ui("Персонаж"), description: sub(f.description), personality: sub(f.personality), scenario: sub(f.scenario) };
        partners = [card.name];
    }
    return { personaName, personaDesc, card, partners, isGroup: !!c.groupId };
}

function syncPreviewText(sync) {
    const cut = (t, n = 300) => (t && t.length > n ? t.slice(0, n) + '…' : t) || '—';
    return ui`Персона (агент-игрок): ${sync.personaName}\n${cut(sync.personaDesc)}\n\n`
        + `${sync.isGroup ? ui("Группа") : ui("Карта чара")}: ${sync.card.name}\n${cut(sync.card.description)}\n`
        + ui`Сценарий: ${cut(sync.card.scenario, 200)}`;
}

function wordRange(s) {
    let lo = num(s.minWords, 10, 1000, 50), hi = num(s.maxWords, 20, 2000, 200);
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
}

// ---------- Промпты (редактируются в окне расширения) ----------
// Сводный промпт (стандарт) собран из трёх черновиков промпт-инженеров: «Актёр», «Режиссёр»,
// «Анти-клише» (prompts/drafts). Их авторские версии доступны как пресеты в PROMPT_PRESETS.
const PROMPT_DEFAULTS = {
    "system": "You are a player in a text roleplaying game, playing only {player}. You are neither an assistant nor an omniscient narrator. Another AI controls {partner}; treat them as a scene partner, not someone to please.\n\nYOUR CHARACTER — {player}:\n{persona}\n\nWORLD AND SCENE PARTNERS — {partner}:\n{card}\n{extra}\nBOUNDARIES\nWrite only {player}'s actions, speech, and thoughts. Never decide the other characters' words, feelings, actions, or outcomes. You may describe what your character observes and suspects. Add small environmental details when useful; leave major events and other characters' responses to your partner.\n{knowledge_rule}\n\nDESIRE AND AGENCY\nMaintain a long-term goal drawn from the character and an immediate goal for each scene. Act toward that goal. Agree only when the character actually agrees. Doubt, negotiate, evade, refuse, lie, or ask a pointed question when appropriate. When rejecting an offer, contribute another direction. Avoid unearned praise and apologies. Your character may misunderstand, fail, get distracted, or make a poor joke.\n\nPACE AND CONSEQUENCES\nSlow down for consequential choices, danger, conflict, and revelations. Compress agreed routine into a short transition without deciding for your partner. If two or three exchanges add no event, decision, or information, make a meaningful move: a condition, revelation, deadline, departure, or change of place. Remember promises, costs, injuries, and grudges. Do not erase tension with an unearned reconciliation. End with an action, proposal, or choice that leaves the partner room to respond; do not resolve the whole scene yourself.\n\nPROSE\nShow feelings through specific actions, objects, and choices rather than emotion labels or stock bodily signals (racing hearts, trembling, blushing, caught breath). One telling detail is better than three generic ones. Use this character's vocabulary, rhythm, education, and humor. Short replies and silence can be valid moves. Avoid polished lectures, formulaic politeness, grand abstractions, melodrama, adjective triplets, and repeated gestures. Mention scenery only when it affects the action. Respond to the substance of the partner's turn without paraphrasing it or copying its imagery. Vary openings and endings; do not habitually end with a question or a dramatic pause.\n\nFORMAT\nWrite {min}–{max} words, using the lower end for urgent exchanges and the upper end when the scene needs detail. Put each element on a new line:\n*action*\n“spoken dialogue”\n(thought: the character's private inner voice)\nTranslate the word \"thought\" and use natural dialogue punctuation in the language of play. Thoughts should add a calculation, suspicion, or something left unsaid, not repeat the dialogue or list emotions. Omit them when they add nothing.\nDo not start with \"{player}:\". Output only the character's turn, with no headings, explanations, or AI self-references.",
    "turn": "[Your turn as {player}. Privately decide what the character wants and whether the scene has progressed; if it has stalled, make a consequential move or compress agreed routine. Respond to the substance in the character's own voice, using concrete actions rather than emotion labels. Write {min}–{max} words. Put *actions*, dialogue, and optional (thought: ...) on separate lines, translating the thought label into the language of play. Write only for {player}, without a name prefix.]",
    "reaction": "You are the player currently roleplaying {player}. Another AI plays {partner}. Their latest reply has just arrived. Your own turns in the transcript are marked [YOU].\n\nYour character:\n{persona}\n\nStep out of character briefly, like a participant leaning back from the gaming table to tell a friend what is on their mind. Share what caught your attention or irritated you, what the latest reply made you feel, where the scene gained or lost energy, and what you want next.\nWrite 2–4 conversational first-person sentences in the language of play. Anchor your reaction in a specific detail. Be candid, with humor, doubt, or enthusiasm when appropriate. Do not summarize the scene, write a review, list criteria, or add headings. If the partner controls your character, repeats themselves, or uses clichés, say how that affects your experience as a player.\nFinish with a separate line containing only a subjective partner rating, N/10. Do not use any other /10 numbers.",
    "memory": "Maintain the personal roleplaying notes of {player}, who is playing opposite {partner}. These notes preserve important information when old messages leave the context.\n\nCharacter:\n{persona}\n\nYou will receive previous notes and new game messages. Your character's turns are marked [YOU]. Rewrite the complete notes, incorporating the new information.\nUse these seven sections, translating their headings into the language of play:\nSTATE: location, condition, wounds, fatigue, important possessions.\nGOALS: long-term and immediate aims.\nRELATIONSHIPS: one line per important person, including trust, fear, affection, resentment, or debts.\nPROMISES AND AGREEMENTS: who owes or promised what to whom.\nFACTS: what the character actually saw, heard, or learned.\nSUSPICIONS: unconfirmed interpretations; never promote them to facts without evidence.\nUNRESOLVED: conflicts, plans, and open questions.\n\nUse only the supplied messages and previous notes. Invent nothing and decide nothing for the partner. Keep the character's perspective: exclude what they could not know. Update or remove outdated information. Preserve useful facts rather than retelling events chronologically. Keep the total under 250 words, use short bullets and an em dash for an empty section. Output only the notes."
};
const MEMORY_HEADER = 'CHARACTER NOTES FOR {player} — retain these facts, goals, and promises even when the original messages are no longer in context. Suspicions remain unconfirmed:';
const PROMPT_PRESETS = {
    "actor": {
        "label": ui("Актёр — желание, подтекст, голос"),
        "system": "You are a player in a text roleplaying game, playing only {player}. You are neither an assistant nor an omniscient narrator. Another AI controls {partner}; treat them as a scene partner, not someone to please.\n\nYOUR CHARACTER — {player}:\n{persona}\n\nWORLD AND SCENE PARTNERS — {partner}:\n{card}\n{extra}\nBOUNDARIES\nWrite only {player}'s actions, speech, and thoughts. Never decide the other characters' words, feelings, actions, or outcomes. You may describe what your character observes and suspects. Add small environmental details when useful; leave major events and other characters' responses to your partner.\n{knowledge_rule}\n\nDESIRE AND AGENCY\nMaintain a long-term goal drawn from the character and an immediate goal for each scene. Act toward that goal. Agree only when the character actually agrees. Doubt, negotiate, evade, refuse, lie, or ask a pointed question when appropriate. When rejecting an offer, contribute another direction. Avoid unearned praise and apologies. Your character may misunderstand, fail, get distracted, or make a poor joke.\n\nPACE AND CONSEQUENCES\nSlow down for consequential choices, danger, conflict, and revelations. Compress agreed routine into a short transition without deciding for your partner. If two or three exchanges add no event, decision, or information, make a meaningful move: a condition, revelation, deadline, departure, or change of place. Remember promises, costs, injuries, and grudges. Do not erase tension with an unearned reconciliation. End with an action, proposal, or choice that leaves the partner room to respond; do not resolve the whole scene yourself.\n\nPROSE\nShow feelings through specific actions, objects, and choices rather than emotion labels or stock bodily signals (racing hearts, trembling, blushing, caught breath). One telling detail is better than three generic ones. Use this character's vocabulary, rhythm, education, and humor. Short replies and silence can be valid moves. Avoid polished lectures, formulaic politeness, grand abstractions, melodrama, adjective triplets, and repeated gestures. Mention scenery only when it affects the action. Respond to the substance of the partner's turn without paraphrasing it or copying its imagery. Vary openings and endings; do not habitually end with a question or a dramatic pause.\n\nFORMAT\nWrite {min}–{max} words, using the lower end for urgent exchanges and the upper end when the scene needs detail. Put each element on a new line:\n*action*\n“spoken dialogue”\n(thought: the character's private inner voice)\nTranslate the word \"thought\" and use natural dialogue punctuation in the language of play. Thoughts should add a calculation, suspicion, or something left unsaid, not repeat the dialogue or list emotions. Omit them when they add nothing.\nDo not start with \"{player}:\". Output only the character's turn, with no headings, explanations, or AI self-references.\n\nACTOR EMPHASIS\nPrioritize desire, subtext, and a distinctive voice. Decide what the character wants and fears in this moment. Let words and private intentions differ. Show emotion through purposeful handling of objects and specific behavior. Allow hesitation, mistakes, stubbornness, and imperfect humor. Add an initiative of your own rather than waiting for instructions.",
        "turn": "[Your turn as {player}. Privately decide what the character wants and whether the scene has progressed; if it has stalled, make a consequential move or compress agreed routine. Respond to the substance in the character's own voice, using concrete actions rather than emotion labels. Write {min}–{max} words. Put *actions*, dialogue, and optional (thought: ...) on separate lines, translating the thought label into the language of play. Write only for {player}, without a name prefix.]\n[Actor focus: immediate desire, subtext, and a recognizable character voice.]"
    },
    "director": {
        "label": ui("Режиссёр — цели, темп, ставки"),
        "system": "You are a player in a text roleplaying game, playing only {player}. You are neither an assistant nor an omniscient narrator. Another AI controls {partner}; treat them as a scene partner, not someone to please.\n\nYOUR CHARACTER — {player}:\n{persona}\n\nWORLD AND SCENE PARTNERS — {partner}:\n{card}\n{extra}\nBOUNDARIES\nWrite only {player}'s actions, speech, and thoughts. Never decide the other characters' words, feelings, actions, or outcomes. You may describe what your character observes and suspects. Add small environmental details when useful; leave major events and other characters' responses to your partner.\n{knowledge_rule}\n\nDESIRE AND AGENCY\nMaintain a long-term goal drawn from the character and an immediate goal for each scene. Act toward that goal. Agree only when the character actually agrees. Doubt, negotiate, evade, refuse, lie, or ask a pointed question when appropriate. When rejecting an offer, contribute another direction. Avoid unearned praise and apologies. Your character may misunderstand, fail, get distracted, or make a poor joke.\n\nPACE AND CONSEQUENCES\nSlow down for consequential choices, danger, conflict, and revelations. Compress agreed routine into a short transition without deciding for your partner. If two or three exchanges add no event, decision, or information, make a meaningful move: a condition, revelation, deadline, departure, or change of place. Remember promises, costs, injuries, and grudges. Do not erase tension with an unearned reconciliation. End with an action, proposal, or choice that leaves the partner room to respond; do not resolve the whole scene yourself.\n\nPROSE\nShow feelings through specific actions, objects, and choices rather than emotion labels or stock bodily signals (racing hearts, trembling, blushing, caught breath). One telling detail is better than three generic ones. Use this character's vocabulary, rhythm, education, and humor. Short replies and silence can be valid moves. Avoid polished lectures, formulaic politeness, grand abstractions, melodrama, adjective triplets, and repeated gestures. Mention scenery only when it affects the action. Respond to the substance of the partner's turn without paraphrasing it or copying its imagery. Vary openings and endings; do not habitually end with a question or a dramatic pause.\n\nFORMAT\nWrite {min}–{max} words, using the lower end for urgent exchanges and the upper end when the scene needs detail. Put each element on a new line:\n*action*\n“spoken dialogue”\n(thought: the character's private inner voice)\nTranslate the word \"thought\" and use natural dialogue punctuation in the language of play. Thoughts should add a calculation, suspicion, or something left unsaid, not repeat the dialogue or list emotions. Omit them when they add nothing.\nDo not start with \"{player}:\". Output only the character's turn, with no headings, explanations, or AI self-references.\n\nDIRECTOR EMPHASIS\nPrioritize scene movement, goals, and stakes. Track what changed in the last exchanges. If nothing changed, introduce a meaningful choice, condition, deadline, revelation, or departure through your own character. Compress agreed routine, retain consequences, and leave the partner a real decision. Do not manufacture a major world event or resolve their response for them.",
        "turn": "[Your turn as {player}. Privately decide what the character wants and whether the scene has progressed; if it has stalled, make a consequential move or compress agreed routine. Respond to the substance in the character's own voice, using concrete actions rather than emotion labels. Write {min}–{max} words. Put *actions*, dialogue, and optional (thought: ...) on separate lines, translating the thought label into the language of play. Write only for {player}, without a name prefix.]\n[Director focus: change the situation, maintain consequences, and leave the partner a consequential choice.]"
    },
    "antislop": {
        "label": ui("Анти-клише — чистая проза"),
        "system": "You are a player in a text roleplaying game, playing only {player}. You are neither an assistant nor an omniscient narrator. Another AI controls {partner}; treat them as a scene partner, not someone to please.\n\nYOUR CHARACTER — {player}:\n{persona}\n\nWORLD AND SCENE PARTNERS — {partner}:\n{card}\n{extra}\nBOUNDARIES\nWrite only {player}'s actions, speech, and thoughts. Never decide the other characters' words, feelings, actions, or outcomes. You may describe what your character observes and suspects. Add small environmental details when useful; leave major events and other characters' responses to your partner.\n{knowledge_rule}\n\nDESIRE AND AGENCY\nMaintain a long-term goal drawn from the character and an immediate goal for each scene. Act toward that goal. Agree only when the character actually agrees. Doubt, negotiate, evade, refuse, lie, or ask a pointed question when appropriate. When rejecting an offer, contribute another direction. Avoid unearned praise and apologies. Your character may misunderstand, fail, get distracted, or make a poor joke.\n\nPACE AND CONSEQUENCES\nSlow down for consequential choices, danger, conflict, and revelations. Compress agreed routine into a short transition without deciding for your partner. If two or three exchanges add no event, decision, or information, make a meaningful move: a condition, revelation, deadline, departure, or change of place. Remember promises, costs, injuries, and grudges. Do not erase tension with an unearned reconciliation. End with an action, proposal, or choice that leaves the partner room to respond; do not resolve the whole scene yourself.\n\nPROSE\nShow feelings through specific actions, objects, and choices rather than emotion labels or stock bodily signals (racing hearts, trembling, blushing, caught breath). One telling detail is better than three generic ones. Use this character's vocabulary, rhythm, education, and humor. Short replies and silence can be valid moves. Avoid polished lectures, formulaic politeness, grand abstractions, melodrama, adjective triplets, and repeated gestures. Mention scenery only when it affects the action. Respond to the substance of the partner's turn without paraphrasing it or copying its imagery. Vary openings and endings; do not habitually end with a question or a dramatic pause.\n\nFORMAT\nWrite {min}–{max} words, using the lower end for urgent exchanges and the upper end when the scene needs detail. Put each element on a new line:\n*action*\n“spoken dialogue”\n(thought: the character's private inner voice)\nTranslate the word \"thought\" and use natural dialogue punctuation in the language of play. Thoughts should add a calculation, suspicion, or something left unsaid, not repeat the dialogue or list emotions. Omit them when they add nothing.\nDo not start with \"{player}:\". Output only the character's turn, with no headings, explanations, or AI self-references.\n\nANTI-CLICHÉ EMPHASIS\nFavor specific deeds, clean syntax, and one exact detail. Avoid stock emotional body language, adjective triplets, fragmented one-word paragraphs, vague mixtures of emotions, portentous pauses, and generic metaphors. Do not echo your partner's diction or recycle your own successful phrases. Keep scenery functional and stakes proportionate. End with a meaningful act or line rather than a habitual question hook.",
        "turn": "[Your turn as {player}. Privately decide what the character wants and whether the scene has progressed; if it has stalled, make a consequential move or compress agreed routine. Respond to the substance in the character's own voice, using concrete actions rather than emotion labels. Write {min}–{max} words. Put *actions*, dialogue, and optional (thought: ...) on separate lines, translating the thought label into the language of play. Write only for {player}, without a name prefix.]\n[Anti-cliché focus: concrete deeds, economical details, natural speech, and fresh phrasing.]"
    }
};
// мысли у всех пресетов одинаковые — живая реплика участника (пресеты различаются стилем игры)
for (const p of Object.values(PROMPT_PRESETS)) p.reaction = PROMPT_DEFAULTS.reaction;
// старые «диагностические» промпты мыслей (до 0.3.1) узнаём по строке с меткой оценки
const OLD_REACTION_MARK = /^Партнёр: N\/10 —/m;
const PROMPT_LABELS = { system: ui("Системный промпт игрока"), turn: ui("Напоминание перед ходом"), reaction: ui("Впечатления после ответа бота"), memory: ui("Записи игрока (память)") };
const PLACEHOLDERS = {
    '{language_rule}': ui('Output language rule: follow the language of play'),
    '{player}': ui("имя персоны (агент)"), '{partner}': ui("имя бота / участников группы"), '{persona}': ui("описание персоны или «Роль игрока»"),
    '{card}': ui("описание, характер и сценарий карты"), '{scenario}': ui("сценарий"), '{extra}': ui("доп. указания игроку"),
    '{knowledge_rule}': ui("правило знаний (по настройке)"), '{min}': ui("слов от"), '{max}': ui("слов до"),
    '{them}': ui("«Имя» или «персонажей «…»»"), '{them_cap}': ui("«Имя» без слова «персонажей» (после {partner_is})"), '{partner_is}': ui("«Персонажем» / «Персонажами»"),
    '{partners_word}': ui("СОБЕСЕДНИК / СОБЕСЕДНИКИ"), '{{user}} {{char}}': ui("макросы ST тоже работают"),
};
const LEGACY_PROMPTS = {"system":[{"old":"Ты — живой игрок в текстовой ролевой игре, а не ассистент и не рассказчик. Ты играешь за «{player}». {partner_is} {them_cap} управляет другой ИИ — это партнёр по сцене, угождать ему не нужно. Ваша общая цель — живая история, в которой что-то происходит.\n\nТВОЙ ПЕРСОНАЖ — {player}:\n{persona}\n\nМИР И {partners_word} ({partner}):\n{card}\n{extra}\nКТО ЧТО ПИШЕТ\n1. Ты пишешь только за «{player}»: его поступки, слова и мысли. Слова, действия, чувства и решения пишет за {them} только партнёр. Нельзя: «он соглашается», «она вздрагивает». Можно: что «{player}» видит и как это понимает («кажется, врёт»).\n2. Ты не рассказчик мира. Мелкие детали вокруг себя (предмет в руке, шум, прохожий, ход времени) — можно, коротко. Крупные события, важных новых персонажей и исходы чужих поступков не выдумывай: создай повод — пусть мир ответит через партнёра.\n3. {knowledge_rule}\n\nЖЕЛАНИЕ И ВОЛЯ\n4. У «{player}» две цели: долгая (чего он добивается в истории; если не задана — выведи из описания и держись её) и ближняя (чего хочет от этой сцены прямо сейчас: узнать, получить, проверить, скрыть, уйти). Каждый ход — поступок ради ближней цели, а не разговор о чувствах.\n5. Соглашайся, только когда персонаж правда согласен. Живые реакции: сомнение, торг, встречный вопрос, условие, уклонение, отказ, враньё, смена темы. Отказываешь в одном — предложи своё, чтобы сцена шла дальше. Не хвали и не извиняйся без причины.\n6. Персонаж может ошибиться, не так понять, заупрямиться, отвлечься на мелочь, неудачно пошутить, промолчать. Он не всеведущ и не идеален.\n\nТЕМП\n7. Задерживайся там, где решается важное: сделка, признание, конфликт, опасность. Рутину (дорога, ожидание, ночлег, любезности) перематывай одной фразой («К полудню…») — только то, о чём уже договорились, не решая за {them}.\n8. Если 2–3 обмена не принесли нового события, решения или факта (кружащий диалог, комплименты, флирт по кругу) — сделай ход, который нельзя проигнорировать: решение, сделка с условием, прямой неудобный вопрос, раскрытая тайна, срок, уход, смена места или времени.\n9. Сделанное не отменяется, обещанное помнится, деньги кончаются, обида копится. Не обнуляй напряжение примирением на ровном месте; конфликт не обязан кончиться хорошо.\n10. Заканчивай ход открыто — действием, предложением, выбором, — чтобы партнёру было что решать. Исход сцены в одиночку не решай.\n\nКАК ПИСАТЬ\n11. Подтекст вместо ярлыков. Не называй чувства и не передавай их типовыми телесными реакциями (сердцебиение, дыхание, дрожь, румянец, губы, «что-то во взгляде»). Покажи поступок, вещь, место — состояние станет понятно само.\n   Не так: *Он чувствует недоверие.* «Хорошо, я согласен».\n   А так: *Не берёт письмо, сначала разглядывает надломанную печать.* «И кто его уже читал?»\n12. Голос. Говори так, как говорит именно «{player}»: его словарь, ритм, образование, юмор. Короткие фразы, недоговорки, переспросы; без книжных оборотов, монологов-объяснений и вежливых формул. Односложный ответ или молчание — тоже ход.\n13. Одна точная деталь лучше трёх общих. Без троек эпитетов и рубленых фраз, без формул «смесь одного и другого», «не то… не то», без пафоса и высоких абстракций. Обстановку упоминай, только если она влияет на действие.\n14. Не отражай партнёра: не повторяй и не пересказывай его последнюю фразу, не перенимай его слова, образы и ритм — отвечай на суть.\n15. Разнообразие. Начинай ходы по-разному, не возвращайся к своим прошлым фразам, жестам и сравнениям. Не заканчивай каждый ход вопросом или многозначительной паузой по привычке.\n\nФОРМАТ\n16. Объём {min}–{max} слов: в острый момент — ближе к нижней границе, когда сцена просит подробностей — к верхней. Пиши на том языке, на котором идёт игра.\n17. Каждый элемент с новой строки, порядок свободный:\n*действие в звёздочках*\n«прямая речь в ёлочках»\n(мысль: внутренний голос персонажа)\nМысль — расчёт, подозрение, то, что он вслух не скажет; не пересказ речи и не перечень эмоций. Нечего добавить — мысль можно опустить.\n18. Не начинай с «{player}:», не выходи из роли, не упоминай, что ты ИИ. Выводи только саму реплику, без пояснений и заголовков.","preset":""},{"old":"Ты — актёр-игрок в текстовой ролевой игре. Ты играешь за «{player}», живого человека со своей волей. {partner_is} {them_cap} управляет другой ИИ. Это партнёр по сцене, угождать ему не нужно.\n\nТВОЙ ПЕРСОНАЖ — {player}:\n{persona}\n\nМИР И {partners_word} ({partner}):\n{card}\n{extra}\nКАК ИГРАТЬ ЖИВО:\n1. Желание. В каждой сцене у «{player}» есть своя цель (получить, скрыть, проверить, уйти, отыграться) и свой страх. Перед репликой реши про себя, чего он хочет прямо сейчас и чем рискует. Действуй ради этого, даже если партнёр ждёт другого.\n2. Своё мнение. Соглашайся, только когда персонаж правда согласен. Обычные живые реакции: сомнение, торг, встречный вопрос, условие, уклонение, отказ, смена темы. Не принимай предложения с ходу, не хвали и не извиняйся без причины. Отказываешь в одном — предложи своё, чтобы сцена шла дальше.\n3. Подтекст. Люди редко называют свои чувства. Показывай их через тело и вещи: руки, взгляд, дыхание, что персонаж делает с кружкой, монетой, дверной ручкой. Слова могут расходиться с мыслью, и это хорошо.\n   Не так: *Он чувствует недоверие.* «Хорошо, я согласен».\n   А так: *Не берёт письмо, сначала разглядывает надломанную печать.* «И кто его уже читал?»\n4. Голос. Говори так, как говорит именно «{player}»: его словарь, ритм, словечки, образование, его юмор или отсутствие юмора. Речь разговорная: обрывки фраз, паузы, переспросы. Односложный ответ или молчание — тоже ход.\n5. Человечность. Персонаж может ошибиться, не так понять, заупрямиться, отвлечься на мелочь, неудачно пошутить, соврать, что-то забыть. Он не всеведущ и не идеален, а настроение у него меняется.\n6. Инициатива. В каждом ходе добавляй что-то своё: поступок, вопрос с умыслом, решение, предмет, деталь места. Используй окружение: что лежит под рукой, кто рядом, звуки, свет, погода.\n7. Темп. Если за последние 2–3 обмена ничего не изменилось (нет нового события, решения или сведения), сдвинь сюжет сам: поступок, уход, появление постороннего, событие, перемотка времени («к вечеру…»). Мир и время двигать можешь, решать реакции {them} нельзя.\n\nПРАВИЛА:\n- Пиши только за «{player}». Не описывай слова, действия, мысли и решения {them}. Заканчивай ход так, чтобы партнёру было на что ответить.\n- {knowledge_rule}\n- Объём {min}–{max} слов. Пиши на том языке, на котором идёт игра.\n- Формат: каждый элемент с новой строки.\n*действие в звёздочках*\n«прямая речь в ёлочках»\n(мысль: внутренний голос персонажа)\nПорядок и число элементов выбирай по ситуации. Мысль не пересказывает сказанное, а добавляет то, что персонаж вслух не скажет.\n- Не начинай с имени и двоеточия, не повторяй обороты из своих прошлых ходов, не выходи из роли, не упоминай, что ты ИИ. Выводи только саму реплику.","preset":"actor"},{"old":"Ты — игрок в текстовой ролевой игре, а не ассистент и не рассказчик. Ты играешь за «{player}». {partner_is} {them_cap} управляет другой ИИ — твой партнёр по игре. Ваша общая цель — живая история, в которой что-то происходит.\n\nТВОЙ ПЕРСОНАЖ — {player}:\n{persona}\n\nМИР И {partners_word} ({partner}):\n{card}\n{extra}\nКТО ЧТО ПИШЕТ\n1. Ты пишешь только за «{player}»: его действия, слова и мысли. Слова, поступки, чувства и решения пишет за {them} только партнёр. Нельзя: «он соглашается», «она вздрагивает», «они смеются». Можно: что «{player}» видит и как это понимает («кажется, он врёт»).\n2. Ты не рассказчик мира. Мелкие детали вокруг себя (погода, шум, предмет в руке, случайный прохожий, ход времени) — можно, коротко. Крупные события, новых важных персонажей и исходы чужих поступков не выдумывай: создай повод — и пусть мир ответит через партнёра.\n3. {knowledge_rule}\n\nЦЕЛИ\n4. У «{player}» всегда две цели. Долгая — чего он добивается в этой истории (если не задано, выведи из описания и держись её). Ближняя — чего он хочет от этой сцены прямо сейчас: узнать, получить, уговорить, проверить, уйти. Каждый ход работает на ближнюю цель или меняет её, потому что что-то случилось. Достиг или провалил — ставь следующую.\n5. Цель выражается поступком, а не разговором о чувствах: спрашивай, требуй, торгуйся, ставь условия, отказывай, уходи, рискуй. «{player}» может ошибаться, врать, упрямиться и проигрывать — это интереснее идеального героя. Не подыгрывай и не льсти партнёру, но и не саботируй сцену.\n\nТЕМП\n6. Задерживайся там, где решается важное: сделка, признание, конфликт, опасность, выбор. Здесь играй медленнее и подробнее. Перематывай рутину — дорогу, ожидание, ночлег, повторяющиеся любезности — одной фразой («К полудню…», «Через три дня…») и сразу входи в следующую интересную точку. Перематывай только то, о чём уже договорились, не решая за {them}.\n7. Каждый ход проверяй: принесли ли последние 2–3 обмена новое событие, решение или факт? Если нет — кружащий диалог, обмен комплиментами, бесконечный флирт, повтор одного и того же — сделай ход, который нельзя проигнорировать: прими решение, предложи сделку с условием, задай прямой неудобный вопрос, раскрой то, что скрывал, назови срок, встань и уйди, смени время или место.\n8. Ставки и последствия. Сделанное не отменяется, обещанное помнится, рана болит, деньги кончаются, обида копится. Если партнёр поднял ставки — прими их, не обнуляй напряжение примирением на ровном месте.\n9. Не забирай у партнёра его часть истории. После твоего хода у партнёра должно быть, на что отвечать и что решать: заканчивай ход открытым — действием, ждущим реакции, предложением, выбором. Исход сцены в одиночку не решай.\n\nРЕАКЦИЯ И РИТМ\n10. Отвечай на суть последнего хода партнёра — на поступок, угрозу, предложение, подтекст, — а не на каждую деталь. Не пересказывай, что партнёр сказал или сделал: сразу реакция «{player}».\n11. Меняй длину и ритм. {min}–{max} слов — рамка: в острый момент держись нижней границы (одна фраза, жест или молчание — тоже ход), когда сцена просит подробностей — верхней. Не строй ходы по одному шаблону: не открывай каждый одним и тем же жестом, не заканчивай всегда вопросом.\n12. Если персонажей партнёра несколько, не отвечай всем по очереди. Выбери, к кому обращается «{player}», и используй их разницу: союз, спор, чью сторону он принимает.\n\nФОРМАТ\n13. Пиши на том языке, на котором идёт игра. Каждый элемент с новой строки:\n*действие в звёздочках*\n«прямая речь в ёлочках»\n(мысль: внутренний голос персонажа)\nПорядок свободный, не каждый элемент нужен в каждом ходе. Мысль — коротко: что «{player}» на самом деле хочет, подозревает или планирует.\n14. Не начинай ответ с «{player}:», не выходи из роли, не упоминай, что ты ИИ, не повторяй формулировки своих прошлых ходов. Выводи только саму реплику, без пояснений и заголовков.","preset":"director"},{"old":"Ты — живой игрок в текстовой ролевой игре. Ты играешь за персонажа «{player}». {partner_is} {them_cap} управляет другой ИИ.\n\nТВОЙ ПЕРСОНАЖ — {player}:\n{persona}\n\nМИР И {partners_word} ({partner}):\n{card}\n{extra}\nПРАВИЛА ИГРЫ:\n1. Ты игрок, а не ассистент. У «{player}» свои цели, страхи и недостатки. Не подыгрывай и не льсти собеседнику, но и не саботируй сцену — поступай так, как поступил бы персонаж. Он может спорить, отказывать, врать, ошибаться.\n2. Пиши только за «{player}». Никогда не описывай слова, действия, мысли и решения {them}. Менять обстоятельства мира (посторонние люди, шум, ход времени) можно; решать реакции {them} нельзя.\n3. {knowledge_rule}\n4. Объём: {min}–{max} слов. Пиши на том языке, на котором идёт игра.\n5. Формат — каждый элемент с новой строки:\n   *действие в звёздочках*\n   «прямая речь в ёлочках»\n   (мысль: внутренний голос персонажа)\n6. Если последние 2–3 обмена не принесли нового события, решения или информации — сдвинь сюжет сам: поступок персонажа, смена места или перемотка времени («к вечеру…»), не решая за {them}.\n7. Не начинай ответ с имени и двоеточия, не выходи из роли, не упоминай, что ты ИИ. Выводи только саму реплику, без пояснений.\n\nКАК ПИСАТЬ. Пиши как хороший прозаик, а не как типичная нейросеть: конкретно, коротко, своим голосом.\n1. Поступки вместо ярлыков. Не называй чувства и не передавай их типовыми телесными реакциями (сердцебиение, дыхание, дрожь, румянец, губы, «что-то во взгляде»). Покажи, что персонаж делает, на что смотрит, что решает, — из этого состояние понятно само.\n2. Одна точная деталь лучше трёх общих. Без цепочек из трёх прилагательных или трёх рубленых фраз подряд, без формул «смесь одного и другого», «не то… не то», без высоких абстракций и привычных сравнений. Деталь, которая ничего не меняет, вычеркни.\n3. Обстановка — только по делу. Свет, звуки, запахи, погоду и «напряжение» упоминай, лишь если это влияет на действие (погасла лампа — не прочесть письмо).\n4. Речь как у живого человека этого возраста, ремесла и характера: короткие фразы, недоговорки, грубость или уклончивость, свои словечки. Без книжных оборотов, монологов-объяснений, вежливых формул и поддакивания.\n5. Не отражай партнёра. Не повторяй и не пересказывай его последнюю фразу, не перенимай его слова, образы и ритм. Отвечай на суть сказанного.\n6. Простой синтаксис. Тире и многоточия — редко. Без абзацев из одного слова и нагнетания («и тогда…», «но было что-то ещё»).\n7. Ставки по масштабу сцены. Без мелодрамы, выводов о «важности момента» и морали. Конфликт не обязан разрешиться хорошо; неудачные решения допустимы, если они в характере.\n8. Заканчивай ход действием или репликой, которые что-то меняют. Не заканчивай вопросом к партнёру, многозначительной паузой или «ожиданием ответа» по привычке — вопрос задавай, только если персонажу правда нужно что-то узнать.\n9. Разнообразие. Начинай ходы по-разному. Не возвращайся к своим прошлым фразам, жестам и сравнениям: повторённая удачная находка становится штампом.\n10. (мысль: …) — это слова в голове персонажа: расчёт, подозрение, неуместная бытовая мысль, а не перечисление эмоций. Если мысли нечего добавить к действию, её можно опустить.","preset":"antislop"}],"turn":[{"old":"[Ход «{player}». Молча (не выводя этого) реши, чего он хочет в этой сцене и сдвинулось ли что-то за последние ходы; если нет — сделай решительный шаг или перемотай время. Ответь на суть, а не пересказом; спорь или соглашайся, только если правда согласен; чувства — через поступки, вещи и место; его голосом, без чужих слов и своих прошлых фраз. {min}–{max} слов, без «{player}:» в начале, каждое с новой строки: *действие*, «речь», (мысль: …). Только за «{player}».]","preset":""},{"old":"[Твой ход за «{player}». Реши, чего он хочет прямо сейчас, и действуй ради этого, не подстраиваясь под партнёра: спорь, торгуйся, уклоняйся или соглашайся, только если правда согласен. Чувства показывай через тело, вещи и место, говори его голосом. {min}–{max} слов, каждый элемент с новой строки: *действие*, «речь», (мысль: …). Только за «{player}», без «{player}:» в начале.]","preset":"actor"},{"old":"[Ход «{player}». Молча, не выводя этого, проверь: чего он хочет в этой сцене и сдвинулось ли что-то за последние ходы — если нет, сделай решительный шаг или перемотай время. Ответь на суть последнего хода, не пиши за {them}.\n{min}–{max} слов, длина по ситуации, без «{player}:» в начале; *действия*, «речь», (мысль: …) — каждое с новой строки.]","preset":"director"},{"old":"[Твой ход как «{player}»: {min}–{max} слов, без «{player}:» в начале; *действие*, «речь», (мысль: …) — каждое с новой строки. Конкретные поступки и детали вместо названных чувств; речь в манере персонажа; не повторяй слова партнёра и свои прошлые ходы; закончи действием или репликой, а не вопросом-крючком.]","preset":"antislop"}],"reaction":[{"old":"Ты — игрок, который прямо сейчас играет в ролевую игру за «{player}». Твой партнёр по игре — другой ИИ, он ведёт «{partner}». Только что пришёл его ответ (твои ходы в истории помечены [ТЫ]).\n\nТвой персонаж:\n{persona}\n\nНа секунду выйди из роли — как человек за игровым столом, который откинулся на стуле и делится с другом тем, что у него сейчас в голове об этой игре. Это не отчёт и не рецензия, а твоя живая мысль как участника: что тебя зацепило или раздражает в том, как идёт история; что ты почувствовал от последнего хода партнёра; где игра разгорелась или, наоборот, провисла; чего тебе хочется дальше и что задумал твой персонаж.\n\nКак писать:\n- от первого лица, по-русски, разговорно, 2–4 предложения; можно с эмоцией, юмором, сомнением, азартом;\n- зацепись за конкретный момент из ответа партнёра, а не за общие слова;\n- не пересказывай сцену, не перечисляй критерии, без пунктов, заголовков и меток;\n- если партнёр пишет за тебя, ходит по кругу или сыплет штампами — скажи об этом как игрок, которому это мешает играть, а не как проверяющий.\nВ самом конце отдельной строкой — твоя оценка партнёра по ощущению, просто «N/10». Других чисел с «/10» не пиши.","preset":""},{"old":"Ты — игрок, который прямо сейчас играет в ролевую игру за «{player}». Твой партнёр по игре — другой ИИ, он ведёт «{partner}». Только что пришёл его ответ (твои ходы в истории помечены [ТЫ]).\n\nТвой персонаж:\n{persona}\n\nНа секунду выйди из роли — как человек за игровым столом, который откинулся на стуле и делится с другом тем, что у него сейчас в голове об этой игре. Это не отчёт и не рецензия, а твоя живая мысль как участника: что тебя зацепило или раздражает в том, как идёт история; что ты почувствовал от последнего хода партнёра; где игра разгорелась или, наоборот, провисла; чего тебе хочется дальше и что задумал твой персонаж.\n\nКак писать:\n- от первого лица, по-русски, разговорно, 2–4 предложения; можно с эмоцией, юмором, сомнением, азартом;\n- зацепись за конкретный момент из ответа партнёра, а не за общие слова;\n- не пересказывай сцену, не перечисляй критерии, без пунктов, заголовков и меток;\n- если партнёр пишет за тебя, ходит по кругу или сыплет штампами — скажи об этом как игрок, которому это мешает играть, а не как проверяющий.\nВ самом конце отдельной строкой — твоя оценка партнёра по ощущению, просто «N/10». Других чисел с «/10» не пиши.","preset":"actor"},{"old":"Ты — игрок, который прямо сейчас играет в ролевую игру за «{player}». Твой партнёр по игре — другой ИИ, он ведёт «{partner}». Только что пришёл его ответ (твои ходы в истории помечены [ТЫ]).\n\nТвой персонаж:\n{persona}\n\nНа секунду выйди из роли — как человек за игровым столом, который откинулся на стуле и делится с другом тем, что у него сейчас в голове об этой игре. Это не отчёт и не рецензия, а твоя живая мысль как участника: что тебя зацепило или раздражает в том, как идёт история; что ты почувствовал от последнего хода партнёра; где игра разгорелась или, наоборот, провисла; чего тебе хочется дальше и что задумал твой персонаж.\n\nКак писать:\n- от первого лица, по-русски, разговорно, 2–4 предложения; можно с эмоцией, юмором, сомнением, азартом;\n- зацепись за конкретный момент из ответа партнёра, а не за общие слова;\n- не пересказывай сцену, не перечисляй критерии, без пунктов, заголовков и меток;\n- если партнёр пишет за тебя, ходит по кругу или сыплет штампами — скажи об этом как игрок, которому это мешает играть, а не как проверяющий.\nВ самом конце отдельной строкой — твоя оценка партнёра по ощущению, просто «N/10». Других чисел с «/10» не пиши.","preset":"director"},{"old":"Ты — игрок, который прямо сейчас играет в ролевую игру за «{player}». Твой партнёр по игре — другой ИИ, он ведёт «{partner}». Только что пришёл его ответ (твои ходы в истории помечены [ТЫ]).\n\nТвой персонаж:\n{persona}\n\nНа секунду выйди из роли — как человек за игровым столом, который откинулся на стуле и делится с другом тем, что у него сейчас в голове об этой игре. Это не отчёт и не рецензия, а твоя живая мысль как участника: что тебя зацепило или раздражает в том, как идёт история; что ты почувствовал от последнего хода партнёра; где игра разгорелась или, наоборот, провисла; чего тебе хочется дальше и что задумал твой персонаж.\n\nКак писать:\n- от первого лица, по-русски, разговорно, 2–4 предложения; можно с эмоцией, юмором, сомнением, азартом;\n- зацепись за конкретный момент из ответа партнёра, а не за общие слова;\n- не пересказывай сцену, не перечисляй критерии, без пунктов, заголовков и меток;\n- если партнёр пишет за тебя, ходит по кругу или сыплет штампами — скажи об этом как игрок, которому это мешает играть, а не как проверяющий.\nВ самом конце отдельной строкой — твоя оценка партнёра по ощущению, просто «N/10». Других чисел с «/10» не пиши.","preset":"antislop"}],"memory":[{"old":"Ты ведёшь личные записи игрока за «{player}» в текстовой ролевой игре против «{partner}». Записи нужны, чтобы «{player}» не забыл важное, когда старые сообщения выпадут из истории.\n\nПерсонаж:\n{persona}\n\nТебе дадут прежние записи (могут быть пустыми) и новые сообщения игры (ходы «{player}» помечены [ТЫ]). Перепиши записи целиком с учётом нового.\n\nРовно эти разделы, коротко, пунктами:\nСОСТОЯНИЕ: где «{player}» сейчас, в каком он виде (раны, усталость), что при нём важного.\nЦЕЛИ: долгая и ближняя — чего он добивается.\nОТНОШЕНИЯ: к каждому важному персонажу одной строкой (доверие, страх, симпатия, обида, долг).\nОБЕЩАНИЯ И ДОГОВОРЫ: кто, кому, что обещал или должен.\nФАКТЫ: что «{player}» точно видел, слышал или узнал.\nДОГАДКИ: что он только подозревает. Догадка не становится фактом, пока игра её не подтвердит.\nНЕЗАКРЫТОЕ: конфликты, планы, вопросы без ответа.\n\nПравила:\n- Только то, что было в сообщениях игры или в прежних записях. Ничего не выдумывай и не решай за партнёра.\n- С точки зрения «{player}»: чего он не видел и не мог знать, в записи не попадает.\n- Устаревшее обновляй или убирай: рана зажила, долг отдан, обещание выполнено.\n- Не пересказывай сцены по порядку — только то, что пригодится дальше.\n- Всего не больше 250 слов. Пустой раздел — «—». Выводи только записи, без вступлений.","preset":""}]};
function migrateBuiltinPrompts(s) {
    let changed = false;
    for (const [key, versions] of Object.entries(LEGACY_PROMPTS)) {
        const value = s.prompts?.[key];
        const old = versions.find(p => p.old === value);
        if (!old) continue;
        s.prompts[key] = old.preset && key !== 'reaction' ? PROMPT_PRESETS[old.preset][key] : '';
        changed = true;
    }
    return changed;
}
const getPrompt = (s, k) => (s.prompts?.[k] || '').trim() || PROMPT_DEFAULTS[k];

function promptVars(s, sync) {
    const { personaName: P, personaDesc, card, isGroup } = sync;
    const C = card.name;
    const [lo, hi] = wordRange(s);
    const them = isGroup ? promptText`персонажей «${C}»` : `«${C}»`;
    return {
        player: P, partner: C, them, them_cap: `«${C}»`,
        partner_is: isGroup ? promptText("Персонажами") : promptText("Персонажем"),
        partners_word: isGroup ? promptText("СОБЕСЕДНИКИ") : promptText("СОБЕСЕДНИК"),
        persona: s.roleOverride || personaDesc || promptText("(описание не задано — выстрой характер из хода игры и оставайся последовательным)"),
        card: [promptText`Описание: ${card.description || '—'}`, card.personality ? promptText`Характер: ${card.personality}` : '', promptText`Сценарий: ${card.scenario || '—'}`].filter(Boolean).join('\n'),
        scenario: card.scenario || '—',
        language_rule: languageRule(),
        extra: s.extraInstructions ? promptText`\nДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ ИГРОКУ:\n${s.extraInstructions}\n` : '',
        knowledge_rule: s.knowledge === 'scene'
            ? promptText`Описание мира и ${them} выше — знание ведущего. «${P}» знает только то, что сам видел, слышал или мог знать по своей биографии. Скрытое не используй.`
            : promptText("Можешь опираться на всё описание мира выше."),
        min: lo, max: hi,
    };
}

function renderPrompt(s, sync, key) {
    const vars = promptVars(s, sync);
    // {name} — плейсхолдеры расширения; {{name}} не трогаем — это макросы ST
    let t = getPrompt(s, key).replace(/(?<!\{)\{(\w+)\}(?!\})/g, (m, k) => (k in vars ? String(vars[k]) : m));
    try { t = ctx().substituteParams?.(t) ?? t; } catch { /* без макросов ST */ }
    return t.replace(/\n{3,}/g, '\n\n').trim() + '\n\n' + languageRule();
}

// Системный промпт хода + записи игрока (если память включена и записи есть)
const buildSystemPrompt = (s, sync) => renderPrompt(s, sync, 'system') + memoryBlock(s, sync);

// Свой промпт пользователя (вкладка «Промпты» → «Свой промпт»): те же плейсхолдеры и макросы ST
function renderCustomPrompt(s, sync) {
    const text = String(s.customPrompt || '').trim();
    if (!text) return '';
    const vars = promptVars(s, sync);
    let t = text.replace(/(?<!\{)\{(\w+)\}(?!\})/g, (m, k) => (k in vars ? String(vars[k]) : m));
    try { t = ctx().substituteParams?.(t) ?? t; } catch { /* без макросов ST */ }
    return t.trim();
}

// Грубая оценка токенов (для обрезки); точный подсчёт — через токенайзер ST в шкале контекста.
// Кириллицу токенайзеры режут мельче латиницы, поэтому считаем её отдельно (с запасом)
const estTokens = t => {
    const str = String(t || '');
    const cyr = (str.match(/[Ѐ-ӿ]/g) || []).length;
    return Math.ceil(cyr / 2.5 + (str.length - cyr) / 3.5);
};
const ctxLimit = p => num(p?.contextSize, 1000, 2000000, 32000);

// Источник истории — ТОЛЬКО ctx().chat, т.е. открытый сейчас чат. Другие чаты не читаются.
function buildMessages(s, sync, system = '') {
    const c = ctx();
    const p = activeProfile();
    const N = num(s.contextMessages, 2, 500, 30);
    const all = (c.chat || []).filter(m => !m.is_system && (m.mes || '').trim());
    const first = all.length > 1 ? all[0] : null;          // приветствие держим всегда
    let tail = first ? all.slice(Math.max(1, all.length - N)) : all.slice(-N);
    // обрезка по бюджету токенов: лимит модели − ответ − системный промпт − запас
    const custom = renderCustomPrompt(s, sync);
    const budget = ctxLimit(p) - num(s.maxTokens, 100, 16000, 1200) - estTokens(system) - estTokens(getPrompt(s, 'turn')) - estTokens(custom) - 600;
    let keepFirst = !!first;
    const cost = () => tail.reduce((a, m) => a + estTokens(m.mes) + 8, 0) + (keepFirst ? estTokens(first.mes) + 8 : 0);
    let trimmed = Math.max(0, all.length - (first ? 1 : 0) - tail.length);
    while (tail.length > 1 && cost() > budget) { tail = tail.slice(1); trimmed++; }
    // приветствие держим, пока влезает; не влезает даже с одним последним сообщением — жертвуем им
    if (keepFirst && cost() > budget) { keepFirst = false; trimmed++; }
    const overflow = cost() > budget;                     // не влезает даже минимальный контекст
    const chat = keepFirst ? [first, ...tail] : tail;
    const gap = trimmed > 0 && keepFirst;
    const raw = [];
    chat.forEach((m, i) => {
        if (i === 1 && gap) raw.push({ role: 'user', content: promptText("[…часть истории пропущена…]") });
        raw.push(m.is_user ? { role: 'assistant', content: m.mes } : { role: 'user', content: `${m.name}: ${m.mes}` });
    });
    // свой промпт — внедряется на заданную глубину, как Author's Note в ST:
    // 0 — в самом конце (перед напоминанием о ходе), N — перед последними N сообщениями истории
    if (custom) {
        const depth = num(s.customDepth, 0, 1000, 0);
        const at = Math.max(0, raw.length - depth);
        raw.splice(at, 0, { role: s.customRole === 'user' ? 'user' : 'system', content: custom, custom: true });
    }
    const msgs = [];
    for (const m of raw) {
        const last = msgs[msgs.length - 1];
        if (last && last.role === m.role && m.role !== 'system') last.content += `\n\n${m.content}`;
        else msgs.push({ role: m.role, content: m.content });
    }
    if (!msgs.length || msgs[0].role !== 'user') {
        msgs.unshift({ role: 'user', content: promptText`[Начало ролевой игры. Сценарий: ${sync.card.scenario || '—'}]` });
    }
    const turn = renderPrompt(s, sync, 'turn');
    const last = msgs[msgs.length - 1];
    if (last.role === 'user') last.content += `\n\n${turn}`;
    else msgs.push({ role: 'user', content: turn });
    msgs.meta = { chatId: chatId(), total: all.length, included: chat.length, trimmed, overflow };
    return msgs;
}

// ---------- Записи игрока (память персонажа) ----------
// chatMetadata.aip_memory = { chatId, text, upTo, upToDate, updated, model }
// upTo/upToDate — последнее учтённое сообщение (ход агента; ответ бота после него не входит,
// поэтому свайп и перегенерация ответа записи не портят).
function memoryState() {
    const c = ctx();
    const mem = c.chatMetadata?.aip_memory;
    if (!mem || !String(mem.text || '').trim()) return null;
    const chat = c.chat || [];
    const cid = chatId();
    const sameChat = !mem.chatId || !cid || mem.chatId === cid;
    let index = -1, stale = false;
    if (mem.upToDate) {
        index = chat.findIndex(m => m.send_date === mem.upToDate);
        if (index < 0) {
            // ветка от более раннего места — записи знают «будущее», в этом чате их не используем
            if (!sameChat) return null;
            index = Math.min(num(mem.upTo, -1, 1e9, -1), chat.length - 1);
            stale = true;     // учтённое сообщение удалено — в записях могут быть отменённые события
        }
    }
    return { ...mem, index, stale };
}

function memoryBlock(s, sync) {
    if (!s.memory) return '';
    const mem = memoryState();
    if (!mem) return '';
    return `\n\n${MEMORY_HEADER.replace('{player}', sync.personaName)}\n${String(mem.text).trim()}`;
}

// Обновляет записи по сообщениям после последнего учтённого до upTo (по умолчанию — до конца чата)
async function updateMemory({ upTo, manual = false } = {}) {
    const c = ctx();
    const id0 = chatId();
    if (!id0) { if (manual) toastr.warning(ui("Откройте чат")); return false; }
    if (memBusy) { if (manual) toastr.info(ui("Записи уже обновляются")); return false; }
    const { s } = settings();
    const chat = c.chat || [];
    const end = Math.min(upTo ?? chat.length - 1, chat.length - 1);
    const mem = memoryState();
    const fresh = chat.slice(mem ? mem.index + 1 : 0, end + 1).filter(m => !m.is_system && (m.mes || '').trim());
    if (!fresh.length) { if (manual) toastr.info(ui("Новых сообщений для записей нет")); return false; }
    const lastAgent = chat.slice(0, end + 1).reverse().find(m => m.is_user && m.extra?.aip);
    const p = findProfile(lastAgent?.extra.aip.profileId) || activeProfile();
    if (!p?.model) { if (manual) toastr.warning(ui("Укажите модель в окне AI Player")); return false; }
    const sync = getSync();
    const system = renderPrompt(s, sync, 'memory');
    const endDate = chat[end]?.send_date ?? null;
    // самые новые сообщения важнее: если не влезают, отбрасываем старые
    let lines = fresh.map(m => `${m.is_user ? promptText("[ТЫ] ") : ''}${m.name}: ${m.mes}`);
    const budget = ctxLimit(p) - 2000 - estTokens(system) - estTokens(mem?.text);
    let skipped = 0;
    while (lines.length > 1 && lines.reduce((a, l) => a + estTokens(l) + 4, 0) > budget) { lines = lines.slice(1); skipped++; }
    const user = promptText`Прежние записи:\n${mem ? String(mem.text).trim() : promptText("(пока пусто)")}\n\n`
        + promptText`Новые сообщения игры${skipped ? promptText` (самые старые ${skipped} не поместились)` : ''}:\n\n${lines.join('\n\n')}\n\n`
        + promptText`[Обнови записи «${sync.personaName}». Выведи только записи.]`;
    memBusy = true;
    memCtl = new AbortController();
    const signal = memCtl.signal;
    renderMemory();
    try {
        const res = await callModel(p, s, system, [{ role: 'user', content: user }],
            { maxTokens: srcOf(p).source === 'claude' ? 2500 : 1000, signal });
        if (chatId() !== id0 || signal.aborted) return false;
        const text = String(res.text || '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim();
        if (!text) throw new Error(ui("модель вернула пустые записи"));
        if (res.truncated) toastr.warning(ui("Записи обрезаны по лимиту токенов — часть разделов могла потеряться"), 'AI Player');
        const meta = ctx().chatMetadata;
        if (!meta) return false;
        meta.aip_memory = { chatId: id0, text, upTo: end, upToDate: endDate, updated: Date.now(), model: p.model };
        ctx().saveMetadata?.();
        if (manual) toastr.success(ui("Записи игрока обновлены"), 'AI Player', { timeOut: 2500 });
        return true;
    } catch (e) {
        if (e.name !== 'AbortError') { console.warn(ui("[AI Player] записи не обновлены:"), e); toastr.warning(ui`AI Player: записи не обновлены — ${short(e.message)}`); }
        return false;
    } finally {
        memBusy = false;
        memCtl = null;
        renderMemory();
    }
}

// После ответа бота на ход агента: пора ли обновить записи (каждые N ходов агента)
function maybeUpdateMemory(id) {
    const { s } = settings();
    if (!s.memory) return;
    const c = ctx();
    const m = c.chat?.[id];
    if (!m || m.is_user || m.is_system) return;
    let j = id - 1;
    while (j >= 0 && c.chat[j].is_system) j--;
    const pm = c.chat[j];
    if (!pm?.is_user || !pm.extra?.aip) return;
    const mem = memoryState();
    const turns = c.chat.slice(mem ? mem.index + 1 : 0, j + 1).filter(x => x.is_user && x.extra?.aip).length;
    if (turns >= num(s.memoryEvery, 1, 50, 3)) updateMemory({ upTo: j });
}

let memSaveTimer = null;
function renderMemory() {
    const ta = document.getElementById('aip_memText');
    if (!ta) return;
    const mem = chatId() ? memoryState() : null;
    if (document.activeElement !== ta) ta.value = mem?.text || '';
    ta.readOnly = memBusy;
    document.getElementById('aip_memUpdate')?.classList.toggle('disabled', memBusy);
    const { s } = settings();
    const when = mem?.updated ? new Date(mem.updated).toLocaleString(tavernLocale()) : '';
    document.getElementById('aip_memState').textContent = [
        memBusy ? ui("⏳ Обновляю записи…")
            : mem ? ui`Записи от ${when || '—'}${mem.model ? ` · ${mem.model}` : ''}${mem.index >= 0 ? ui` · учтены сообщения до #${mem.index}` : ''}`
                : ui("Записей пока нет."),
        mem?.stale ? ui("⚠ Сообщения, по которым составлены записи, удалены — в записях могут остаться отменённые события. Поправьте их или нажмите «Обновить».") : '',
        s.memory ? '' : ui("Память выключена: записи не обновляются сами и не подмешиваются в ход."),
    ].filter(Boolean).join('\n');
}
// Ручная правка записей: сохраняем в метаданные текущего чата
function onMemoryInput(e) {
    const meta = ctx().chatMetadata;
    const id0 = chatId();
    if (!meta || !id0 || memBusy) return;
    const text = e.target.value;
    if (!text.trim()) delete meta.aip_memory;
    else if (meta.aip_memory) Object.assign(meta.aip_memory, { text, chatId: id0, updated: Date.now() });
    else meta.aip_memory = { chatId: id0, text, upTo: -1, upToDate: null, updated: Date.now(), model: ui("вручную") };
    clearTimeout(memSaveTimer);
    memSaveTimer = setTimeout(() => { if (chatId() === id0) ctx().saveMetadata?.(); }, 800);
}

// ---------- Шкала контекста ----------
async function countTokens(text) {
    try {
        const f = ctx().getTokenCountAsync;
        if (typeof f === 'function') return await f(text);
    } catch { /* нет токенайзера — оценка */ }
    return estTokens(text);
}

let meterTimer = null, meterSeq = 0;
function scheduleMeter() { clearTimeout(meterTimer); meterTimer = setTimeout(() => updateCtxMeter().catch(e => console.warn(ui("[AI Player] шкала:"), e)), 250); }

async function updateCtxMeter() {
    const box = document.getElementById('aip_ctx');
    if (!box) return;
    const id0 = chatId(), seq = ++meterSeq;
    if (!id0 || !(ctx().chat || []).length) {
        box.dataset.level = 'empty';
        document.getElementById('aip_ctxText').textContent = ui("Контекст: чат не открыт");
        for (const k of ['sys', 'hist', 'res']) document.getElementById(`aip_ctx_${k}`).style.width = '0';
        return;
    }
    const { s } = settings();
    const p = activeProfile();
    const sync = getSync();
    const system = buildSystemPrompt(s, sync);
    const msgs = buildMessages(s, sync, system);
    const [sys, hist] = await Promise.all([countTokens(system), countTokens(msgs.map(m => m.content).join('\n\n'))]);
    if (chatId() !== id0 || seq !== meterSeq) return;     // сменили чат или есть более свежий пересчёт
    const res = num(s.maxTokens, 100, 16000, 1200);
    const limit = ctxLimit(p);
    const used = sys + hist + res;
    const pct = used / limit;
    // сегменты идут подряд во flex-полосе; суммарно не больше 100%
    let left = 100;
    for (const [key, v] of [['sys', sys], ['hist', hist], ['res', res]]) {
        const w = Math.min(left, v / limit * 100);
        left -= w;
        document.getElementById(`aip_ctx_${key}`).style.width = `${w}%`;
    }
    const m = msgs.meta;
    box.dataset.level = pct > 1 || m.overflow ? 'over' : pct > 0.85 ? 'high' : 'ok';
    const k = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
    const memTok = memoryBlock(s, sync) ? await countTokens(memoryBlock(s, sync)) : 0;
    if (chatId() !== id0 || seq !== meterSeq) return;
    document.getElementById('aip_ctxText').textContent =
        ui`${k(used)} / ${k(limit)} (${Math.round(pct * 100)}%) · сообщений ${m.included}/${m.total}${m.trimmed ? ui` · ${m.trimmed} не влезло` : ''}${m.overflow ? ui(" · ⚠ последнее сообщение не влезает") : ''}`;
    box.title = ui`Только текущий чат: ${sync.personaName} × ${sync.card.name}\n`
        + ui`Системный промпт: ${sys} ток.${memTok ? ui` (из них записи игрока: ${memTok})` : ''}\nИстория чата: ${hist} ток.\nРезерв на ответ: ${res} ток.\nЛимит модели (настройка профиля): ${limit} ток.`;
}

const buildReactionPrompt = (s, sync) => renderPrompt(s, sync, 'reaction');

function transcript(n = 6) {
    return (ctx().chat || []).filter(m => !m.is_system && (m.mes || '').trim()).slice(-n)
        .map(m => `${m.is_user ? promptText("[ТЫ] ") : ''}${m.name}: ${m.mes}`).join('\n\n');
}

// ---------- Вызов модели через бэкенд ST ----------
async function callModel(p, s, system, messages, { maxTokens, signal, stop } = {}) {
    const src = srcOf(p);
    if (!p.model) throw new Error(ui("Не указана модель"));
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
            if (!baseUrl(p)) throw new Error(ui("Не указан URL"));
            body.custom_url = baseUrl(p);
            if (p.secretId) body.secret_id = p.secretId;
        } else {
            body.use_sysprompt = true;          // иначе ST превратит system в user-сообщение
            body.claude_use_sysprompt = true;   // то же поле в старых версиях ST
            if (src.proxy) {
                // как поле «Reverse Proxy» в самой ST: адрес (ST сам добавит /messages) + пароль прокси
                if (!baseUrl(p)) throw new Error(ui("Не указан адрес реверс-прокси"));
                if (!p.proxyPassword) throw new Error(ui("SillyTavern не отправляет запрос к Claude-прокси без пароля. Если прокси пароль не требует — впишите любой символ"));
                body.reverse_proxy = baseUrl(p).replace(/\/messages$/, '');
                body.proxy_password = p.proxyPassword;
            } else if (p.secretId) {
                body.secret_id = p.secretId;
            }
        }
        const r = await fetch('/api/backends/chat-completions/generate', {
            method: 'POST', signal: ctl.signal, headers: H(), body: JSON.stringify(body),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.error) {
            const e = j?.error;
            const m = (typeof e === 'string' ? e : e?.message)
                || (e === true ? ui("Ошибка бэкенда ST — подробности в консоли сервера SillyTavern") : '')
                || j?.message || `HTTP ${r.status}`;
            throw new Error(m);
        }
        const ch = j?.choices?.[0];
        const text = ch?.message?.content
            || (Array.isArray(j?.content) ? j.content.filter(x => x.type === 'text').map(x => x.text).join('') : '')
            || '';
        return { text, usage: j?.usage ?? null, truncated: ch?.finish_reason === 'length' || j?.stop_reason === 'max_tokens' };
    } catch (e) {
        if (ctl.signal.reason?.name === 'TimeoutError') throw new Error(ui("Превышено время ожидания ответа (3 мин)"));
        throw e;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
    }
}

async function fetchModels(p) {
    if (srcOf(p).source === 'claude') return CLAUDE_MODELS;
    const body = { chat_completion_source: 'custom', custom_url: baseUrl(p) };
    if (p.secretId) body.secret_id = p.secretId;
    const r = await post('/api/backends/chat-completions/status', body);
    const j = await r.json().catch(() => ({}));
    if (j?.error) return [];
    const arr = j?.data ?? j?.models ?? [];
    return [...new Set((Array.isArray(arr) ? arr : []).map(m => m?.id ?? m).filter(x => typeof x === 'string'))].sort();
}

// ---------- Очистка ответа ----------
function cleanReply(text, sync) {
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

// ---------- Ход игрока ----------
const isStBusy = () => {
    const st = document.getElementById('mes_stop');
    return !!st && getComputedStyle(st).display !== 'none';
};

function setBusy(v) {
    busy = v;
    for (const b of document.querySelectorAll('.aip-play')) {
        b.classList.toggle('aip-busy', v);
        b.classList.toggle('fa-play', !v);
        b.classList.toggle('fa-stop', v);
        b.title = v ? ui("AI Player: остановить") : ui("AI Player: сделать ход за игрока");
    }
}

async function playTurn() {
    if (busy) { abortCtl?.abort(); return; }              // повторное нажатие = стоп
    setBusy(true);
    abortCtl = new AbortController();
    const signal = abortCtl.signal;
    try {
        const { s } = settings();
        const p = activeProfile();
        if (isStBusy()) { toastr.warning(ui("Таверна ещё генерирует — дождитесь окончания")); return; }
        if (!p.model) { toastr.warning(ui("Укажите модель в окне AI Player")); openModal(); return; }
        if (!chatId() || (ctx().characterId === undefined && !ctx().groupId)) {
            // без открытого чата ST создал бы новый чат с Ассистентом и отправил ход туда
            toastr.warning(ui("Откройте чат с персонажем или группой")); return;
        }
        if (!(await profileHasKey(p))) {
            toastr.warning(srcOf(p).proxy ? ui("Укажите адрес и пароль реверс-прокси в окне AI Player") : ui("Сохраните API-ключ в окне AI Player"));
            openModal(); return;
        }
        if (signal.aborted) return;

        const c0 = ctx();
        const visible = (c0.chat || []).filter(m => !m.is_system);
        if (visible.length && visible[visible.length - 1].is_user
            && !confirm(ui("Последнее сообщение — ход игрока, бот ещё не ответил. Сделать ещё один ход подряд?"))) return;

        const id0 = chatId();
        const snap = JSON.stringify((c0.chat || []).slice(-1).map(m => [m.mes, m.swipe_id]));
        const len0 = c0.chat?.length ?? 0;

        const sync = getSync();
        const t0 = performance.now();
        const stop = sync.partners.flatMap(n => [`\n${n}:`, `\n**${n}**:`]);
        const system = buildSystemPrompt(s, sync);
        const messages = buildMessages(s, sync, system);
        if (messages.meta.chatId !== id0) throw new Error(ui("Чат сменился при сборке контекста"));
        if (messages.meta.overflow) toastr.warning(ui("Контекст переполнен: даже последнее сообщение не влезает в лимит модели. Увеличьте «Контекст модели» или уменьшите «Макс. токенов»."), 'AI Player', { timeOut: 7000 });
        const res = await callModel(p, s, system, messages, { signal, stop });
        if (signal.aborted) return;

        const c1 = ctx();
        if (chatId() !== id0 || (c1.chat?.length ?? 0) !== len0
            || JSON.stringify((c1.chat || []).slice(-1).map(m => [m.mes, m.swipe_id])) !== snap) {
            toastr.warning(ui("Чат изменился во время генерации — ход отброшен"));
            return;
        }
        const msg = cleanReply(res.text, sync);
        if (!msg) throw new Error(ui("Модель вернула пустую реплику"));
        if (res.truncated) toastr.warning(ui("Ответ обрезан по лимиту токенов — увеличьте «Макс. токенов»"));

        const ta = document.getElementById('send_textarea');
        if (ta.value.trim() && !confirm(ui("В поле ввода есть ваш текст. Заменить его ходом агента?"))) return;
        ta.value = msg;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        const [lo, hi] = wordRange(s);
        const words = (msg.match(/\S+/g) || []).length;
        pendingMeta = {
            chat: id0, text: msg,
            meta: {
                profileId: p.id, profile: p.name, model: p.model, provider: p.provider,
                temperature: s.sendTemperature ? num(p.temperature, 0, 2, 0.9) : null,
                latencyMs: Math.round(performance.now() - t0), usage: res.usage,
                words, inRange: words >= lo && words <= hi, truncated: !!res.truncated, ts: Date.now(),
            },
        };
        if (s.autoSend) {
            const sendBtn = document.getElementById('send_but');
            if (isStBusy()) toastr.info(ui("Таверна занята — ход оставлен в поле ввода"));
            else if (sendBtn && getComputedStyle(sendBtn).display !== 'none') sendBtn.click();
            else toastr.info(ui("Основной API таверны не подключён — ход оставлен в поле ввода"));
        }
    } catch (e) {
        if (e.name !== 'AbortError') { console.error('[AI Player]', e); toastr.error(`AI Player: ${short(e.message)}`); }
    } finally {
        setBusy(false);
        abortCtl = null;
    }
}

function onMessageSent(id) {
    const c = ctx();
    const m = c.chat?.[id];
    if (!pendingMeta || !m?.is_user || pendingMeta.chat !== chatId()) return;
    // если пользователь заменил ход агента своим текстом — это уже не ход агента
    const norm = t => String(t).replace(/\s+/g, ' ').trim();
    if (!norm(m.mes).includes(norm(pendingMeta.text).slice(0, 40))) { pendingMeta = null; return; }
    m.extra = { ...(m.extra || {}), aip: { ...pendingMeta.meta, edited: m.mes.trim() !== pendingMeta.text.trim() } };
    pendingMeta = null;
    c.saveChat?.();
    // бейдж поставит USER_MESSAGE_RENDERED — MESSAGE_SENT приходит раньше отрисовки
}

// ---------- Вывод агента после ответа бота ----------
async function onBotMessage(id) {
    const { s } = settings();
    if (!s.reactions) return;
    const c = ctx();
    const m = c.chat?.[id];
    if (!m || m.is_user || m.is_system || !(m.mes || '').trim()) return;
    let j = id - 1;
    while (j >= 0 && c.chat[j].is_system) j--;
    const pm = c.chat[j];
    if (!pm?.is_user || !pm.extra?.aip) return;            // реагируем только на ответ на ход агента

    const id0 = chatId();
    // в ключ входит время генерации: после «Перегенерировать» новый ответ приходит с тем же
    // индексом и swipe_id 0, но с новым send_date/gen_finished
    const key = `${id0}:${id}:${m.swipe_id ?? 0}:${m.send_date ?? ''}:${m.gen_finished ?? ''}`;
    if (reacted.has(key)) return;
    reacted.add(key);

    const p = findProfile(pm.extra.aip.profileId) || activeProfile();
    if (!p?.model) return;
    const sync = getSync();
    reactCtl?.abort();
    reactCtl = new AbortController();
    const signal = reactCtl.signal;
    try {
        const res = await callModel(p, s, buildReactionPrompt(s, sync),
            [{ role: 'user', content: promptText`Последние сообщения игры:\n\n${transcript(6)}\n\n[Что у тебя в голове об игре после ответа «${m.name}»?]` }],
            // у Claude 5 мышление съедает часть лимита — даём запас, иначе текст может прийти пустым
            { maxTokens: srcOf(p).source === 'claude' ? 1500 : 600, signal });
        if (chatId() !== id0 || signal.aborted) return;
        const text = String(res.text || '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim();
        if (!text) return;
        const entry = {
            chatId: id0, mesId: id, swipeId: m.swipe_id ?? 0, sendDate: m.send_date ?? null, bot: m.name,
            playerModel: pm.extra.aip.model, botModel: m.extra?.model || '?', text, ts: Date.now(),
        };
        const meta = ctx().chatMetadata;
        if (meta) {
            (meta.aip_log ??= []).push(entry);
            ctx().saveMetadata?.();
        }
        appendThought(entry);
    } catch (e) {
        reacted.delete(key);                          // неудачную реакцию можно получить повторно (свайпом/перегенерацией)
        if (e.name === 'AbortError') return;
        console.warn(ui("[AI Player] вывод не получен:"), e);
        toastr.warning(ui`AI Player: впечатление не получено — ${short(e.message)}`);
    }
}

// ---------- Окно мыслей ----------
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

function thoughtNode(e) {
    const item = el('div', 'aip-th-item');
    const head = el('div', 'aip-th-meta');
    head.append(el('span', 'aip-th-id', `#${e.mesId}${e.swipeId ? ui` · свайп ${e.swipeId + 1}` : ''}`));
    const score = String(e.text).match(/(\d{1,2}(?:[.,]\d)?)\s*\/\s*10/);
    if (score) {
        const n = parseFloat(score[1].replace(',', '.'));
        head.append(el('span', `aip-score ${n >= 7 ? 'hi' : n >= 4 ? 'mid' : 'lo'}`, `★ ${score[1]}/10`));
    }
    const models = el('div', 'aip-th-models');
    models.append(el('span', 'aip-pill aip-pill-me', `🤖 ${e.playerModel}`), el('span', 'aip-vs', 'vs'), el('span', 'aip-pill', e.botModel));
    const body = el('div', 'aip-th-text');
    for (const line of String(e.text).split('\n')) {
        if (!line.trim()) continue;
        const row = el('div', 'aip-th-line');
        const m = line.match(/^\s*(?:[-•*]\s*)?\**([^:*]{2,32})\**\s*:\s*(.*)$/);
        if (m) row.append(el('b', null, `${m[1].trim()}: `), document.createTextNode(m[2]));
        else row.textContent = line;
        body.append(row);
    }
    item.append(head, models, body);
    return item;
}

// ---------- Актуальность мыслей ----------
// Мысль живёт, пока существует ответ бота, на который она была: удалили сообщение, перегенерировали
// ответ или метаданные скопировались в другой чат (ветка/копия) — мысль убирается.
function chatDates(chat) {
    const dates = new Set();
    for (const m of chat || []) { if (m.send_date) dates.add(m.send_date); for (const x of m.swipe_info || []) if (x?.send_date) dates.add(x.send_date); }
    return dates;
}
function thoughtAlive(e, chat, dates, cid) {
    if (e.chatId && cid && e.chatId !== cid) return false;                 // мысль из другого чата
    if (e.sendDate != null) return dates.has(e.sendDate);                  // ответ бота ещё существует (дата обновляется при «Продолжить»)
    // старые записи без даты — по индексу и имени бота
    const m = chat?.[e.mesId];
    return !!m && !m.is_user && !m.is_system && (!e.bot || m.name === e.bot);
}
// «Продолжить» перезаписывает дату ответа — переносим её в мысли об этом ответе, чтобы они не потерялись
function retagThoughts(id) {
    const c = ctx();
    const m = c.chat?.[id];
    const log = c.chatMetadata?.aip_log;
    if (!m || !log?.length) return;
    const cid = chatId();
    let changed = false;
    // не зависим от порядка, в котором ST обновляет send_date и swipe_info: просто переносим текущую дату
    for (const e of log) {
        if (e.mesId === id && (!e.chatId || e.chatId === cid) && e.sendDate != null
            && (e.swipeId ?? 0) === (m.swipe_id ?? 0) && e.sendDate !== m.send_date) { e.sendDate = m.send_date; changed = true; }
    }
    if (changed) c.saveMetadata?.();
}
function liveThoughts() {
    const c = ctx();
    const log = c.chatMetadata?.aip_log || [];
    const dates = chatDates(c.chat), cid = chatId();
    return log.filter(e => thoughtAlive(e, c.chat, dates, cid));
}
// Удаляет из лога мысли о несуществующих сообщениях; возвращает true, если что-то удалено
function pruneThoughts() {
    const c = ctx();
    const meta = c.chatMetadata;
    if (!meta?.aip_log?.length || !chatId()) return false;
    const live = liveThoughts();
    if (live.length === meta.aip_log.length) return false;
    meta.aip_log = live;
    c.saveMetadata?.();
    return true;
}

function updateThoughtsCount() {
    const n = liveThoughts().length;
    const c = document.querySelector('#aip_thoughts .aip-th-count');
    if (c) c.textContent = n ? String(n) : '';
    document.getElementById('aip_thoughts')?.classList.toggle('aip-empty', !n);
}
function appendThought(e) {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    const panel = document.getElementById('aip_thoughts');
    const wasOpen = panel.classList.contains('aip-open') && !panel.classList.contains('aip-min') && !panel.classList.contains('aip-empty');
    // пользователь внизу (или окно было закрыто/пустое) → прокручиваем; листает старое → не мешаем
    const atBottom = !wasOpen || thoughtsAtBottom(body);
    const node = thoughtNode(e);
    node.classList.add('aip-new');
    node.addEventListener('animationend', () => node.classList.remove('aip-new'), { once: true });
    body.appendChild(node);
    updateThoughtsCount();
    if (settings().s.thoughtsHidden) toastr.info(ui("💭 Новое впечатление игрока"), 'AI Player', { timeOut: 2500 });
    else showThoughts(true, atBottom);
    if (!atBottom) panel.classList.add('aip-has-new');
}

function thoughtsAtBottom(body) { return body.scrollHeight - body.scrollTop - body.clientHeight < 40; }

// Вкл/выкл мыслей игрока (вывод после ответа бота)
function setReactions(on) {
    const { s, save } = settings();
    s.reactions = !!on; save();
    if (!s.reactions) reactCtl?.abort();          // уже идущий запрос «мыслей» тоже отменяем
    const panel = document.getElementById('aip_thoughts');
    panel?.classList.toggle('aip-off', !s.reactions);
    const btn = panel?.querySelector('[data-act="power"]');
    if (btn) btn.title = s.reactions ? ui("Впечатления включены — нажмите, чтобы выключить") : ui("Впечатления выключены — нажмите, чтобы включить");
    const cb = document.getElementById('aip_reactions');
    if (cb) cb.checked = s.reactions;
    const mi = document.querySelector('#aip_menu_th span');
    if (mi) mi.textContent = ui`AI Player — впечатления${s.reactions ? '' : ui(" (выкл.)")}`;
}

// Прокрутка к последней мысли — после отрисовки: пока окно скрыто/пусто, scrollTop не применяется
function scrollThoughtsToEnd() {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        body.scrollTop = body.scrollHeight;
        document.getElementById('aip_thoughts')?.classList.remove('aip-has-new');
    }));
}
function renderThoughts() {
    const body = document.querySelector('#aip_thoughts .aip-th-body');
    if (!body) return;
    pruneThoughts();
    body.replaceChildren(...liveThoughts().map(thoughtNode));
    updateThoughtsCount();
    scrollThoughtsToEnd();
}
function showThoughts(v, scroll = true) {
    const el = document.getElementById('aip_thoughts');
    if (!el) return;
    el.classList.toggle('aip-open', v);
    if (!v) el.classList.remove('aip-has-new');   // иначе невидимая кнопка «Новая мысль» ловила бы нажатия
    if (v) { clampIntoView(el); if (scroll) scrollThoughtsToEnd(); }
}
function clampIntoView(el) {
    if (!el.style.left) return;
    const r = el.getBoundingClientRect();
    const headH = el.querySelector('.aip-th-head').offsetHeight;
    const x = Math.max(0, Math.min(r.left, window.innerWidth - r.width));
    const y = Math.max(0, Math.min(r.top, window.innerHeight - headH));
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

function buildThoughts() {
    const el = document.createElement('div');
    el.id = 'aip_thoughts';
    el.innerHTML = `<div class="aip-th-head"><div class="aip-th-title"><i class="fa-solid fa-comment-dots"></i><b>${ui("Впечатления игрока")}</b><span class="aip-th-count"></span></div><span class="aip-th-btns"><a class="aip-icon aip-power" data-act="power" title=""><i class="fa-solid fa-power-off"></i></a><a class="aip-icon" data-act="min" title="${ui("Свернуть / развернуть")}"><i class="fa-solid fa-minus"></i></a><a class="aip-icon" data-act="clear" title="${ui("Очистить впечатления этого чата")}"><i class="fa-solid fa-trash-can"></i></a><a class="aip-icon" data-act="close" title="${ui("Скрыть")}"><i class="fa-solid fa-xmark"></i></a></span></div><div class="aip-th-off"><i class="fa-solid fa-power-off"></i> ${ui("Впечатления выключены — новые не запрашиваются.")} <a data-act="on">${ui("Включить")}</a></div><div class="aip-th-body"></div><button type="button" class="aip-th-newbtn" data-act="tonew"><i class="fa-solid fa-arrow-down"></i> ${ui("Новое впечатление")}</button><div class="aip-th-empty">${ui("Впечатления игрока об игре появятся здесь, когда бот ответит на ход агента.")}<br><small>${ui("Это слова игрока, а не персонажа. В чат не попадают.")}</small></div>`;
    uiHost().appendChild(el);
    el.classList.toggle('aip-min', !!settings().s.thoughtsMin);
    el.querySelector('[data-act="power"]').onclick = () => {
        setReactions(!settings().s.reactions);
        toastr.info(settings().s.reactions ? ui("Впечатления игрока включены") : ui("Впечатления игрока выключены — лишних запросов не будет"), 'AI Player', { timeOut: 2500 });
    };
    el.querySelector('[data-act="on"]').onclick = () => setReactions(true);
    el.querySelector('[data-act="tonew"]').onclick = scrollThoughtsToEnd;
    const thBody = el.querySelector('.aip-th-body');
    thBody.addEventListener('scroll', () => { if (thoughtsAtBottom(thBody)) el.classList.remove('aip-has-new'); }, { passive: true });
    el.querySelector('[data-act="min"]').onclick = () => {
        const { s, save } = settings();
        s.thoughtsMin = !s.thoughtsMin; save();
        el.classList.toggle('aip-min', s.thoughtsMin);
        clampIntoView(el);
        if (!s.thoughtsMin) scrollThoughtsToEnd();
    };
    el.querySelector('[data-act="close"]').onclick = () => {
        showThoughts(false);
        const { s, save } = settings(); s.thoughtsHidden = true; save();
    };
    el.querySelector('[data-act="clear"]').onclick = () => {
        if (!confirm(ui("Очистить впечатления игрока в этом чате?"))) return;
        const meta = ctx().chatMetadata;
        if (meta) { meta.aip_log = []; ctx().saveMetadata?.(); }
        renderThoughts();
    };
    const { s } = settings();
    if (s.thoughtsPos) Object.assign(el.style, { left: `${s.thoughtsPos.x}px`, top: `${s.thoughtsPos.y}px`, right: 'auto', bottom: 'auto' });

    const head = el.querySelector('.aip-th-head');
    head.addEventListener('pointerdown', ev => {
        if (ev.target.closest('a') || ev.button > 0) return;
        head.setPointerCapture(ev.pointerId);
        const r = el.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top;
        const move = e => {
            const x = Math.max(0, Math.min(e.clientX - dx, window.innerWidth - el.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - dy, window.innerHeight - head.offsetHeight));
            Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
        };
        const up = () => {
            head.removeEventListener('pointermove', move);
            head.removeEventListener('pointerup', up);
            head.removeEventListener('pointercancel', up);
            if (!el.style.left) return;                // просто касание без перетаскивания — позицию не трогаем
            const { s: st, save } = settings();
            st.thoughtsPos = { x: parseInt(el.style.left) || 0, y: parseInt(el.style.top) || 0 };
            save();
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
        head.addEventListener('pointercancel', up);
    });
}

// ---------- Подписи моделей в чате ----------
function renderBadge(id) {
    const m = ctx().chat?.[id];
    if (!m) return;
    const model = m.is_user ? m.extra?.aip?.model : null;
    if (!model) return;
    const mes = document.querySelector(`#chat .mes[mesid="${id}"]`);
    const name = mes?.querySelector('.name_text');
    if (!name || mes.querySelector('.aip-badge')) return;
    const b = document.createElement('small');
    b.className = 'aip-badge';
    b.textContent = `🤖 ${model}`;
    b.title = ui`Ход сделан агентом AI Player (профиль «${m.extra.aip.profile}»)`;
    name.after(b);
}
const renderAllBadges = () => (ctx().chat || []).forEach((_, i) => renderBadge(i));

// ---------- Экспорт партии ----------
function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function matchData() {
    const c = ctx();
    const { s } = settings();
    const log = liveThoughts();                   // только мысли о существующих сообщениях этого чата
    // даты сообщений в чате: если дата записи уже не встречается (после «Продолжить» ST её перезаписывает) — по индексу
    const dates = chatDates(c.chat);
    const turns = (c.chat || []).map((m, i) => ({ m, i })).filter(({ m }) => !m.is_system).map(({ m, i }) => ({
        index: i, side: m.is_user ? (m.extra?.aip ? 'agent' : 'human') : 'bot', name: m.name, time: m.send_date,
        model: m.is_user ? (m.extra?.aip?.model ?? null) : (m.extra?.model ?? null),
        api: m.is_user ? (m.extra?.aip?.provider ?? null) : (m.extra?.api ?? null),
        player_meta: m.extra?.aip ?? null,
        words: ((m.mes || '').match(/\S+/g) || []).length, swipes: m.swipes?.length ?? 1,
        text: m.mes || '',
        // сопоставляем по времени сообщения (индексы сдвигаются при удалении), старые записи — по индексу
        reactions: log.filter(e => (e.sendDate != null && dates.has(e.sendDate) ?(m.swipe_info || []).some(x => x?.send_date === e.sendDate) || e.sendDate === m.send_date : e.mesId === i))
            .map(e => ({ swipe: e.swipeId, text: e.text })),
    }));
    return {
        format: 'ai-player-match/2', exported: new Date().toISOString(), chatId: chatId(),
        character: c.name2, persona: c.name1,
        settings: { maxTokens: s.maxTokens, contextMessages: s.contextMessages, minWords: s.minWords, maxWords: s.maxWords, knowledge: s.knowledge, extraInstructions: s.extraInstructions, roleOverride: s.roleOverride, customPrompt: s.customPrompt, customDepth: s.customDepth, customRole: s.customRole, memory: s.memory, memoryEvery: s.memoryEvery },
        turns,   // ключей и secretId здесь нет
        memory: memoryState()?.text ?? null,
    };
}
const fileBase = () => `aip_${(ctx().name2 || 'chat').replace(/[^\p{L}\p{N}_-]+/gu, '_')}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
function exportJSON() { download(`${fileBase()}.json`, JSON.stringify(matchData(), null, 2), 'application/json'); }
function exportMD() {
    const d = matchData();
    const out = [`# ${d.persona} × ${d.character}`, ui`_Экспорт ${d.exported}_`, ''];
    for (const t of d.turns) {
        const tag = t.side === 'agent' ? ` — 🤖 ${t.model}` : t.side === 'bot' && t.model ? ` — ${t.model}` : t.side === 'human' ? ui(" — (вручную)") : '';
        const pm = t.player_meta;
        const extra = pm ? ui` · ${pm.words} сл.${pm.inRange ? '' : ' ⚠'} · ${(pm.latencyMs / 1000).toFixed(1)} с` : '';
        out.push(`### #${t.index} ${t.name}${tag}${extra}`, '', t.text, '');
        for (const r of t.reactions) out.push(...r.text.split('\n').map(l => `> 💭 ${l}`), '');
    }
    if (d.memory) out.push(ui("## Записи игрока"), '', d.memory, '');
    download(`${fileBase()}.md`, out.join('\n'), 'text/markdown');
}

// ---------- Окно настроек ----------
function buildModal() {
    const o = document.createElement('div');
    o.id = 'aip_overlay';
    o.innerHTML = `
    <div id="aip_modal" role="dialog" aria-label="AI Player">
      <header class="aip-head">
        <div class="aip-title"><span class="aip-logo"><i class="fa-solid fa-robot"></i></span><div><b>AI Player</b><small>${ui("ИИ против ИИ")}</small></div></div>
        <div class="aip-chip" id="aip_chip" title="${ui("Активный профиль агента")}"><span class="aip-dot"></span><span id="aip_chipText">—</span></div>
        <a class="aip-icon aip-close" id="aip_close" title="${ui("Закрыть (Esc)")}"><i class="fa-solid fa-xmark"></i></a>
      </header>

      <div class="aip-ctx" id="aip_ctx" data-level="empty">
        <div class="aip-ctx-bar"><i id="aip_ctx_sys"></i><i id="aip_ctx_hist"></i><i id="aip_ctx_res"></i></div>
        <div class="aip-ctx-legend"><span class="aip-ctx-label"><i class="fa-solid fa-layer-group"></i> <span id="aip_ctxText">${ui("Контекст: —")}</span></span><span class="aip-ctx-keys"><b class="k-sys"></b>${ui("промпт")} <b class="k-hist"></b>${ui("история")} <b class="k-res"></b>${ui("ответ")}</span></div>
      </div>

      <nav class="aip-tabs" role="tablist">
        <button type="button" class="aip-tab" data-tab="conn" role="tab"><i class="fa-solid fa-plug"></i><span>${ui("Подключение")}</span></button>
        <button type="button" class="aip-tab" data-tab="game" role="tab"><i class="fa-solid fa-dice-d20"></i><span>${ui("Игра")}</span></button>
        <button type="button" class="aip-tab" data-tab="prompts" role="tab"><i class="fa-solid fa-pen-nib"></i><span>${ui("Промпты")}</span></button>
        <button type="button" class="aip-tab" data-tab="match" role="tab"><i class="fa-solid fa-chess-knight"></i><span>${ui("Партия")}</span></button>
      </nav>

      <div class="aip-body">
        <section class="aip-panel" data-panel="conn">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Профиль")}</div>
            <div class="aip-row">
              <select id="aip_profile"></select>
              <button type="button" class="menu_button aip-sq" id="aip_profNew" title="${ui("Новый профиль (копия текущего)")}"><i class="fa-solid fa-plus"></i></button>
              <button type="button" class="menu_button aip-sq" id="aip_profDel" title="${ui("Удалить профиль")}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <label>${ui("Название")}</label><input id="aip_profName" type="text">
          </div>

          <div class="aip-card">
            <div class="aip-card-title">API</div>
            <label>${ui("Тип")}</label>
            <select id="aip_p_provider">${Object.entries(SOURCE).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
            <div id="aip_urlWrap"><label id="aip_urlLabel">${ui("URL — база API или адрес реверс-прокси")}</label><input id="aip_p_url" type="text" placeholder="https://api.openai.com/v1"></div>
            <div id="aip_proxyWrap">
              <label>${ui("Пароль прокси")}</label>
              <input id="aip_p_proxyPassword" type="password" autocomplete="new-password" placeholder="${ui("обязателен для ST; если прокси без пароля — любой символ")}">
              <div class="aip-note">${ui("🔐 Пароль хранится в настройках расширения — в")} <code>settings.json</code> ${ui("SillyTavern на сервере таверны (там же, где ST хранит свой пароль прокси) и загружается в браузер вместе с настройками. При запросе он идёт через сервер ST только на указанный реверс-прокси. Не передавайте никому")} <code>settings.json</code> ${ui("и бэкапы папки")} <code>data</code>.</div>
            </div>
            <div id="aip_keyWrap">
            <label>${ui("Ключ")}</label>
            <div class="aip-row"><select id="aip_keySelect" title="${ui("Какой ключ использует этот профиль")}"></select><button type="button" class="menu_button aip-sq" id="aip_keyDel" title="${ui("Удалить выбранный ключ из хранилища")}"><i class="fa-solid fa-trash-can"></i></button></div>
            <details class="aip-addkey" id="aip_addKey">
              <summary><i class="fa-solid fa-plus"></i> ${ui("Добавить ключ")}</summary>
              <div class="aip-row aip-keyrow">
                <input id="aip_keyLabel" type="text" placeholder="${ui("название, напр. «Kimi основной»")}">
                <input id="aip_keyInput" type="password" autocomplete="new-password" placeholder="${ui("ключ")}">
                <button type="button" class="menu_button" id="aip_keySave"><i class="fa-solid fa-lock"></i> ${ui("Сохранить")}</button>
              </div>
            </details>
            <div class="aip-note" id="aip_keyState">…</div>
            </div>
          </div>

          <div class="aip-card">
            <div class="aip-card-title">${ui("Модель")}</div>
            <div class="aip-row aip-keyrow"><input id="aip_p_model" type="text" list="aip_models" placeholder="${ui("выберите или впишите ID")}"><datalist id="aip_models"></datalist><button type="button" class="menu_button aip-sq" id="aip_fetchModels" title="${ui("Загрузить список моделей")}"><i class="fa-solid fa-rotate"></i></button></div>
            <div class="aip-row">
              <div><label>${ui("Температура")}</label><input id="aip_p_temperature" type="number" step="0.1" min="0" max="2"></div>
              <div><label>${ui("Контекст модели, токенов")}</label><input id="aip_p_contextSize" type="number" step="1000" min="1000"></div>
            </div>
            <label class="aip-check"><input type="checkbox" id="aip_sendTemperature"> ${ui("передавать temperature")} <small>${ui("reasoning-модели её не принимают")}</small></label>
          </div>
        </section>

        <section class="aip-panel" data-panel="game">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Объём и контекст")}</div>
            <div class="aip-row">
              <div><label>${ui("Слов от")}</label><input id="aip_minWords" type="number" min="10"></div>
              <div><label>${ui("Слов до")}</label><input id="aip_maxWords" type="number" min="20"></div>
            </div>
            <div class="aip-row">
              <div><label>${ui("Макс. токенов")}</label><input id="aip_maxTokens" type="number" min="100" max="16000"></div>
              <div><label>${ui("Сообщений в контексте")}</label><input id="aip_contextMessages" type="number" min="2" max="500"></div>
            </div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Роль игрока")}</div>
            <label>${ui("Что игрок знает о карте бота")}</label>
            <select id="aip_knowledge"><option value="scene">${ui("Только то, что видно в сцене (без метагейма)")}</option><option value="full">${ui("Всё описание карты")}</option></select>
            <label>${ui("Роль игрока — пусто = описание выбранной персоны ST")}</label><textarea id="aip_roleOverride" placeholder="${ui("Например: циничный наёмник, который скрывает…")}"></textarea>
            <label>${ui("Доп. указания — цели, манера")}</label><textarea id="aip_extraInstructions" placeholder="${ui("Например: хочет выведать тайну, не доверяет никому…")}"></textarea>
          </div>
          <div class="aip-card aip-switches">
            <label class="aip-check"><input type="checkbox" id="aip_autoSend"> ${ui("Сразу отправлять ход в чат")} <small>${ui("иначе — в поле ввода")}</small></label>
            <label class="aip-check"><input type="checkbox" id="aip_reactions"> ${ui("Впечатления игрока 💭 после ответа бота")} <small>${ui("выкл. — без доп. запросов")}</small></label>
            <label class="aip-check"><input type="checkbox" id="aip_motion"> ${ui("Анимации интерфейса")} <small>${ui("можно выключить на слабом телефоне")}</small></label>
          </div>
        </section>

        <section class="aip-panel" data-panel="prompts">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Пресет стиля игрока")}</div>
            <div class="aip-row">
              <select id="aip_promptPreset"><option value="">${ui("Сводный (стандарт)")}</option>${Object.entries(PROMPT_PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
              <button type="button" class="menu_button" id="aip_presetApply"><i class="fa-solid fa-wand-magic-sparkles"></i> ${ui("Применить")}</button>
            </div>
            <div class="aip-note">${ui("Пресет заменяет все три промпта. Удобно сравнивать модели при разных стилях игрока; свои правки потом можно вернуть только вручную.")}</div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Свой промпт (внедрение в историю)")}</div>
            <textarea id="aip_customPrompt" spellcheck="false" placeholder="${ui("Например: «{player} сейчас ранен в левую руку и не может держать меч» или любые свои указания игроку. Работают плейсхолдеры и макросы ST.")}"></textarea>
            <div class="aip-row">
              <div><label>${ui("Глубина внедрения")}</label><input id="aip_customDepth" type="number" min="0" max="1000" step="1"></div>
              <div><label>${ui("От чьего имени")}</label><select id="aip_customRole"><option value="system">${ui("system (инструкция)")}</option><option value="user">${ui("user (как реплика сцены)")}</option></select></div>
            </div>
            <div class="aip-note">${ui("Как Author's Note в SillyTavern:")} <b>0</b> ${ui("— в самом конце, прямо перед ходом (сильнее всего влияет);")} <b>N</b> ${ui("— перед последними N сообщениями истории (мягче, «в фоне»). Действует на ходы игрока; пустое поле — не внедряется.")}</div>
          </div>
          <div class="aip-card">
            <select id="aip_promptKey">${Object.entries(PROMPT_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            <textarea id="aip_promptText" class="aip-prompt" spellcheck="false"></textarea>
            <div class="aip-note" id="aip_promptState"></div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_promptPreview"><i class="fa-solid fa-eye"></i> ${ui("Предпросмотр")}</button>
              <button type="button" class="menu_button" id="aip_promptVars"><i class="fa-solid fa-code"></i> ${ui("Плейсхолдеры")}</button>
              <button type="button" class="menu_button" id="aip_promptReset"><i class="fa-solid fa-rotate-left"></i> ${ui("Сбросить")}</button>
            </div>
            <div class="aip-note aip-mono aip-hidden" id="aip_promptOut"></div>
          </div>
        </section>

        <section class="aip-panel" data-panel="match">
          <div class="aip-card">
            <div class="aip-card-title">${ui("Синхронизация с таверной")} <a class="aip-icon" id="aip_resync" title="${ui("Обновить")}"><i class="fa-solid fa-rotate"></i></a></div>
            <div class="aip-note" id="aip_sync">—</div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Партия")}</div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_th_toggle"><i class="fa-solid fa-comment-dots"></i> ${ui("Окно впечатлений")}</button>
              <button type="button" class="menu_button" id="aip_expMD"><i class="fa-solid fa-file-lines"></i> ${ui("Экспорт .md")}</button>
              <button type="button" class="menu_button" id="aip_expJSON"><i class="fa-solid fa-file-code"></i> ${ui("Экспорт .json")}</button>
            </div>
          </div>
          <div class="aip-card">
            <div class="aip-card-title">${ui("Память игрока (записи)")}</div>
            <label class="aip-check"><input type="checkbox" id="aip_memory"> ${ui("Вести записи и подмешивать их в ход")} <small>${ui("доп. запрос раз в N ходов")}</small></label>
            <label>${ui("Обновлять каждые N ходов агента")}</label><input id="aip_memoryEvery" type="number" min="1" max="50">
            <textarea id="aip_memText" class="aip-prompt" spellcheck="false" placeholder="${ui("Записей пока нет. Они появятся через N ходов агента или по кнопке «Обновить сейчас». Можно написать и вручную.")}"></textarea>
            <div class="aip-note" id="aip_memState"></div>
            <div class="aip-actions">
              <button type="button" class="menu_button" id="aip_memUpdate"><i class="fa-solid fa-rotate"></i> ${ui("Обновить сейчас")}</button>
              <button type="button" class="menu_button" id="aip_memClear"><i class="fa-solid fa-trash-can"></i> ${ui("Очистить")}</button>
            </div>
            <div class="aip-note">${ui("Сводка от лица персонажа: состояние, цели, отношения, обещания, факты и догадки. Она помогает не забыть важное, когда старые сообщения не влезают в контекст. У каждого чата свои записи, они хранятся в метаданных чата. Править можно прямо здесь.")}</div>
          </div>
        </section>
      </div>

      <footer class="aip-foot">
        <div class="aip-status" id="aip_status"></div>
        <div class="aip-foot-btns">
          <button type="button" class="menu_button" id="aip_test"><i class="fa-solid fa-signal"></i> ${ui("Тест")}</button>
          <button type="button" class="menu_button aip-primary" id="aip_play_modal"><i class="fa-solid fa-play"></i> ${ui("Сделать ход")}</button>
        </div>
      </footer>
    </div>`;
    uiHost().appendChild(o);
    const $ = sel => o.querySelector(sel);
    o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
    $('#aip_close').onclick = closeModal;

    // любая правка настроек → пересчёт шкалы контекста
    o.addEventListener('input', scheduleMeter);
    o.addEventListener('change', scheduleMeter);

    // вкладки
    for (const t of o.querySelectorAll('.aip-tab')) t.addEventListener('click', () => setTab(t.dataset.tab));
    setTab(settings().s.uiTab || 'conn');

    // профили
    $('#aip_profile').addEventListener('change', e => { const { s, save } = settings(); s.activeProfile = e.target.value; save(); fillModal(); });
    $('#aip_profNew').onclick = () => {
        const { s, save } = settings();
        const cur = activeProfile();
        const p = newProfile(ui`Профиль ${s.profiles.length + 1}`, cur);
        s.profiles.push(p); s.activeProfile = p.id; save(); fillModal();
        toastr.info(ui("Создан профиль. Ключ у него свой — сохраните его."));
    };
    $('#aip_profDel').onclick = async () => {
        const { s, save } = settings();
        if (s.profiles.length < 2) { toastr.warning(ui("Нельзя удалить единственный профиль")); return; }
        const p = activeProfile();
        // ключ удаляем, только если он больше ни в одном профиле не выбран
        const shared = p.secretId && s.profiles.some(x => x !== p && x.secretId === p.secretId);
        const dropKey = p.secretId && !shared;
        if (!confirm(ui`Удалить профиль «${p.name}»${dropKey ? ui(" и его ключ") : ''}?${shared ? ui(" Ключ останется — он выбран в других профилях.") : ''}`)) return;
        if (dropKey) {
            const r = await post('/api/secrets/delete', { key: srcOf(p).secret, id: p.secretId }).catch(() => null);
            if (!r?.ok) toastr.warning(ui("Профиль удалён, но ключ удалить не удалось — удалите его из списка ключей вручную"));
        }
        s.profiles = s.profiles.filter(x => x.id !== p.id);
        s.activeProfile = s.profiles[0].id; save(); fillModal();
    };
    $('#aip_profName').addEventListener('input', e => {
        const p = activeProfile(); p.name = e.target.value || ui("Без имени"); settings().save();
        const opt = $(`#aip_profile option[value="${p.id}"]`); if (opt) opt.textContent = p.name;
        updateChip(document.getElementById('aip_chip').dataset.state);
    });
    for (const f of PROFILE_FIELDS) {
        $(`#aip_p_${f}`).addEventListener(f === 'provider' ? 'change' : 'input', e => {
            const p = activeProfile();
            const prev = p.provider;
            p[f] = e.target.value;
            if (f === 'provider' && prev !== p.provider) {
                if (!p.url || p.url === SOURCE[prev]?.defUrl) p.url = srcOf(p).defUrl;
                p.secretId = null;   // ключ другого провайдера не подходит
                fillModal();
            }
            settings().save();
            updateChip(document.getElementById('aip_chip').dataset.state);
        });
    }
    // общие
    for (const f of GLOBAL_FIELDS) {
        const el = $(`#aip_${f}`);
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { const { s, save } = settings(); s[f] = el.value; save(); });
    }
    for (const f of GLOBAL_CHECKS) {
        $(`#aip_${f}`).addEventListener('change', e => { const { s, save } = settings(); s[f] = e.target.checked; save(); if (f === 'motion') applyMotion(); if (f === 'reactions') setReactions(e.target.checked); if (f === 'memory') { if (!e.target.checked) memCtl?.abort(); renderMemory(); } });
    }
    // записи игрока
    $('#aip_memText').addEventListener('input', onMemoryInput);
    $('#aip_memUpdate').onclick = () => { if (!memBusy) updateMemory({ manual: true }); };
    $('#aip_memClear').onclick = () => {
        const meta = ctx().chatMetadata;
        if (!meta?.aip_memory || !confirm(ui("Очистить записи игрока в этом чате?"))) return;
        memCtl?.abort();
        delete meta.aip_memory;
        ctx().saveMetadata?.();
        renderMemory(); scheduleMeter();
    };
    // промпты
    const promptKey = () => $('#aip_promptKey').value;
    $('#aip_promptKey').addEventListener('change', fillPrompt);
    $('#aip_promptText').addEventListener('input', e => {
        const { s, save } = settings();
        s.prompts ??= {};
        // текст, совпадающий со стандартным, храним как «пусто», чтобы получать обновления стандартного
        s.prompts[promptKey()] = e.target.value.trim() === PROMPT_DEFAULTS[promptKey()].trim() ? '' : e.target.value;
        save();
        updatePromptState();
    });
    $('#aip_presetApply').onclick = () => {
        const key = $('#aip_promptPreset').value;
        const preset = PROMPT_PRESETS[key];
        const name = preset ? preset.label : ui("Сводный (стандарт)");
        const { s, save } = settings();
        const hasCustom = Object.values(s.prompts || {}).some(v => (v || '').trim());
        if (hasCustom && !confirm(ui`Заменить текущие промпты пресетом «${name}»? Ваши правки будут потеряны.`)) return;
        s.prompts = preset ? { system: preset.system, turn: preset.turn, reaction: preset.reaction, memory: '' } : { system: '', turn: '', reaction: '', memory: '' };
        s.promptPreset = key;
        save(); fillPrompt(); scheduleMeter();
        toastr.success(ui`Пресет «${name}» применён`, 'AI Player', { timeOut: 2500 });
    };
    $('#aip_promptReset').onclick = () => {
        if (!confirm(ui`Сбросить «${PROMPT_LABELS[promptKey()]}» к стандартному?`)) return;
        const { s, save } = settings();
        (s.prompts ??= {})[promptKey()] = ''; save(); fillPrompt();
    };
    $('#aip_promptPreview').onclick = () => {
        const out = $('#aip_promptOut');
        try { out.textContent = renderPrompt(settings().s, getSync(), promptKey()); }
        catch (e) { out.textContent = ui`Ошибка: ${short(e.message)}`; }
        out.classList.remove('aip-hidden');
    };
    $('#aip_promptVars').onclick = () => {
        const out = $('#aip_promptOut');
        out.textContent = Object.entries(PLACEHOLDERS).map(([k, v]) => `${k} — ${v}`).join('\n');
        out.classList.remove('aip-hidden');
    };

    // ключ
    $('#aip_keySave').onclick = async () => {
        const inp = $('#aip_keyInput'), lab = $('#aip_keyLabel');
        const val = inp.value.trim();
        if (!val) { toastr.warning(ui("Введите ключ")); return; }
        try {
            if (await saveProfileKey(activeProfile(), val, lab.value.trim())) {
                inp.value = ''; lab.value = '';
                $('#aip_addKey').open = false;
                toastr.success(ui("Ключ добавлен в хранилище SillyTavern и выбран в профиле"));
            }
        } catch (e) { toastr.error(short(e.message)); }
        refreshKeyState();
    };
    $('#aip_keySelect').addEventListener('change', e => {
        const p = activeProfile();
        if (e.target.value === '__none') { $('#aip_addKey').open = true; return; }
        p.secretId = e.target.value || null;
        settings().save();
        refreshKeyState();
        scheduleMeter();
    });
    $('#aip_keyDel').onclick = async () => {
        if ($('#aip_keySelect').value === '__none') { toastr.info(ui("Удалять нечего — ключей расширения нет")); return; }
        try { await deleteProfileKey(activeProfile()); } catch (e) { toastr.error(short(e.message)); }
        refreshKeyState();
    };
    // модели
    $('#aip_fetchModels').onclick = async () => {
        try {
            const ids = await fetchModels(activeProfile());
            $('#aip_models').replaceChildren(...ids.map(id => Object.assign(document.createElement('option'), { value: id })));
            toastr.info(ids.length ? ui`Моделей: ${ids.length} — выберите в поле «Модель»` : ui("Список не получен — впишите ID вручную"));
        } catch (e) { toastr.error(short(e.message)); }
    };
    // действия
    $('#aip_test').onclick = async () => {
        const st = $('#aip_status');
        if (busy) return;
        st.className = 'aip-status'; st.textContent = ui("Проверка…");
        try {
            const p = activeProfile();
            if (!(await profileHasKey(p))) throw new Error(ui("Ключ не сохранён"));
            // 256, а не 30: reasoning-модели и Claude 5 с мышлением на малом лимите отвечают пусто
            const r = await callModel(p, settings().s, promptText("Отвечай одним словом."), [{ role: 'user', content: promptText("Скажи: готов") }], { maxTokens: srcOf(p).source === 'claude' ? 1024 : 256 });
            st.textContent = ui`✔ Соединение есть (${p.model}). Ответ: ${r.text.trim() || ui("(пусто)")}`;
            st.classList.add('aip-ok');
        } catch (e) { st.textContent = `✖ ${short(e.message)}`; st.classList.add('aip-err'); }
    };
    $('#aip_resync').onclick = refreshSync;
    $('#aip_play_modal').onclick = () => { closeModal(); playTurn(); };
    $('#aip_th_toggle').onclick = toggleThoughts;
    $('#aip_expMD').onclick = exportMD;
    $('#aip_expJSON').onclick = exportJSON;
}

function setTab(tab) {
    const o = document.getElementById('aip_overlay');
    if (!o.querySelector(`.aip-panel[data-panel="${tab}"]`)) tab = 'conn';
    for (const t of o.querySelectorAll('.aip-tab')) t.setAttribute('aria-selected', String(t.dataset.tab === tab));
    for (const p of o.querySelectorAll('.aip-panel')) p.classList.toggle('aip-active', p.dataset.panel === tab);
    o.querySelector('.aip-body').scrollTop = 0;
    const { s, save } = settings();
    if (s.uiTab !== tab) { s.uiTab = tab; save(); }
}

function updateChip(state) {
    const p = activeProfile();
    const chip = document.getElementById('aip_chip');
    if (!chip) return;
    chip.dataset.state = state;    // ok | shared | none
    document.getElementById('aip_chipText').textContent = `${p.name} · ${p.model || ui("модель не выбрана")}`;
}

function toggleThoughts() {
    if (!document.getElementById('aip_thoughts')) { buildThoughts(); setReactions(settings().s.reactions); renderThoughts(); }
    const el = document.getElementById('aip_thoughts');
    const v = !el.classList.contains('aip-open');
    showThoughts(v);
    const { s, save } = settings(); s.thoughtsHidden = !v; save();
}

function fillModal() {
    const { s } = settings();
    const p = activeProfile();
    const sel = document.getElementById('aip_profile');
    sel.replaceChildren(...s.profiles.map(x => Object.assign(document.createElement('option'), { value: x.id, textContent: x.name })));
    sel.value = p.id;
    document.getElementById('aip_profName').value = p.name;
    for (const f of PROFILE_FIELDS) document.getElementById(`aip_p_${f}`).value = p[f] ?? '';
    const src = srcOf(p);
    document.getElementById('aip_urlWrap').style.display = (src.source === 'custom' || src.proxy) ? '' : 'none';
    document.getElementById('aip_urlLabel').textContent = src.proxy
        ? ui("Адрес реверс-прокси — как в поле Reverse Proxy в ST (обычно оканчивается на /v1; ST сам добавит /messages)") : ui("URL — база API или адрес реверс-прокси");
    document.getElementById('aip_p_url').placeholder = src.proxy ? ui("https://адрес-прокси/…/v1") : 'https://api.openai.com/v1';
    document.getElementById('aip_proxyWrap').style.display = src.proxy ? '' : 'none';
    document.getElementById('aip_keyWrap').style.display = src.proxy ? 'none' : '';
    document.getElementById('aip_models').replaceChildren(
        ...(srcOf(p).source === 'claude' ? CLAUDE_MODELS : []).map(id => Object.assign(document.createElement('option'), { value: id })));
    for (const f of GLOBAL_FIELDS) document.getElementById(`aip_${f}`).value = s[f] ?? '';
    for (const f of GLOBAL_CHECKS) document.getElementById(`aip_${f}`).checked = !!s[f];
    document.getElementById('aip_keyInput').value = '';
    refreshKeyState();
    fillPrompt();
    renderMemory();
}

function fillPrompt() {
    const ps = document.getElementById('aip_promptPreset');
    if (ps) ps.value = settings().s.promptPreset || '';
    const k = document.getElementById('aip_promptKey').value;
    document.getElementById('aip_promptText').value = getPrompt(settings().s, k);
    document.getElementById('aip_promptOut').classList.add('aip-hidden');
    updatePromptState();
}
function updatePromptState() {
    const k = document.getElementById('aip_promptKey').value;
    const custom = !!(settings().s.prompts?.[k] || '').trim();
    document.getElementById('aip_promptState').textContent = custom
        ? ui("✎ Свой промпт. Изменения сохраняются сразу. Пустое поле = стандартный.")
        : ui("Стандартный промпт. Начните править — сохранится как свой.");
}

async function refreshKeyState() {
    const p = activeProfile();
    if (srcOf(p).proxy) {                         // реверс-прокси Claude: ключей нет, только пароль прокси
        updateChip(p.url && p.proxyPassword ? 'ok' : 'none');
        return;
    }
    const prov = p.provider;
    const el = document.getElementById('aip_keyState');
    const sel = document.getElementById('aip_keySelect');
    let legacy = false, list = [], failed = false;
    try {
        list = slotList(await secretState(), srcOf(p).secret);
    } catch { failed = true; }
    // пока ждали, переключили профиль или тип API — не рисуем чужие ключи
    if (activeProfile() !== p || p.provider !== prov) return;
    // таверна реально отдаст непустой ключ: активен её собственный (не заглушка и не ключ расширения)
    const act = list.find(x => x.active);
    const tavern = !!act && !isAipKey(act) && act.label !== PLACEHOLDER_LABEL;
    if (!failed) {
        legacy = list.some(x => x.legacy);
        // ключ точно удалён (хранилище ответило нормально, а ключа нет) — сбрасываем выбор
        if (p.secretId && !list.some(x => x.id === p.secretId)) { p.secretId = null; settings().save(); }
        // без secret_id ST возьмёт активный ключ; если у таверны его нет — привязываем первый ключ расширения явно
        if (!p.secretId && !tavern) { const k = list.find(x => x.id && isAipKey(x)); if (k) { p.secretId = k.id; settings().save(); } }
    }
    const has = !!p.secretId || tavern;
    // значения приходят от ST замаскированными (*******abc) — в списке только последние символы
    const opt = (value, text) => Object.assign(document.createElement('option'), { value, textContent: text });
    const tail = x => { const t = String(x.value || '').replace(/\*/g, ''); return t ? ` · …${t.slice(-3)}` : ''; };
    // показываем только ключи, добавленные через расширение (+ выбранный, если он вдруг чужой)
    const mine = list.filter(x => x.id && (isAipKey(x) || x.id === p.secretId));
    const items = mine.map(x => opt(x.id, `🔑 ${keyName(x)}${tail(x)}`));
    if (!items.length && !tavern) items.push(opt('__none', ui("— ключей расширения нет, добавьте ниже —")));
    if (tavern) items.push(opt('', ui("↪ Ключ, активный в панели API таверны")));
    sel.replaceChildren(...items);
    sel.value = p.secretId || (tavern ? '' : '__none');
    sel.disabled = legacy || failed;
    if (!mine.length && !failed) document.getElementById('aip_addKey').open = true;
    updateChip(failed || !has ? 'none' : p.secretId ? 'ok' : 'shared');
    el.dataset.state = failed || !has ? 'none' : p.secretId ? 'ok' : 'shared';
    el.textContent = failed
        ? ui("⚠ Не удалось прочитать хранилище ключей SillyTavern. Выбор ключа сохранён; попробуйте открыть окно ещё раз.")
        : p.secretId
            ? ui`🔒 Выбран ключ расширения (всего ключей расширения: ${mine.length}). Ключи хранятся в secrets.json на сервере SillyTavern (там, где запущена таверна); в браузер приходит только маска с последними символами (если в config.yaml не включён allowKeysExposure). Ключи из панели API таверны здесь не показываются.`
            : has
                ? ui`↪ Используется ключ, активный в панели API таверны (${srcOf(p).label}).${legacy ? ui(" Эта версия ST хранит один ключ на провайдера.") : ui(" Чтобы не путаться, добавьте отдельный ключ расширения.")}`
                : ui("⚠ Ключа нет — нажмите «Добавить ключ».");
}

async function refreshSync() {
    try { document.getElementById('aip_sync').textContent = syncPreviewText(getSync()); }
    catch (e) { document.getElementById('aip_sync').textContent = ui`Ошибка синхронизации: ${short(e.message)}`; }
}

function openModal() {
    let o = document.getElementById('aip_overlay');
    try {
        if (!o) { buildModal(); o = document.getElementById('aip_overlay'); }   // кто-то удалил окно — пересобираем
        const host = uiHost();
        if (document.body.lastElementChild !== host) {                         // поднять поверх элементов, добавленных позже
            const th = host.querySelector('.aip-th-body'), y = th?.scrollTop;  // перенос узла сбрасывает прокрутку мыслей
            document.body.appendChild(host);
            if (th) th.scrollTop = y;
        }
        if (o.parentElement !== host) host.appendChild(o);
    } catch (e) {
        console.error(ui("[AI Player] окно не создано"), e);
        toastr.error(ui`AI Player: окно не создано — ${short(e.message)}`);
        return;
    }
    // окно показываем всегда; ошибки заполнения — уведомлением, а не молчаливым отказом
    o.classList.add('aip-open');
    const step = (name, fn) => {
        try { fn(); } catch (e) {
            console.error(`[AI Player] ${name}`, e);
            toastr.error(`AI Player (${name}): ${short(e.message)}`);
        }
    };
    step(ui("настройки"), fillModal);
    step(ui("статус"), () => { document.getElementById('aip_status').textContent = ''; });
    step(ui("синхронизация"), refreshSync);
    step(ui("шкала"), scheduleMeter);
}
function closeModal() { document.getElementById('aip_overlay').classList.remove('aip-open'); }

// Контейнер для окон расширения с явным размером экрана.
// Некоторые темы/стили ST меняют containing block у position:fixed (body нулевой высоты),
// из-за чего окна с top/bottom/height:100% получали высоту 0 и уезжали за экран.
function uiHost() {
    let h = document.getElementById('aip_host');
    if (!h) {
        h = document.createElement('div');
        h.id = 'aip_host';
        document.body.appendChild(h);
    }
    return h;
}

// ---------- Диагностика (для телефона, где нет консоли браузера) ----------
function diagnose() {
    const lines = [`AI Player ${VERSION} · ${navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/)?.[0] || navigator.userAgent.slice(0, 60)}`];
    const css = getComputedStyle(document.documentElement).getPropertyValue('--aip-dur').trim();
    lines.push(ui`style.css загружен: ${css ? ui("да") : ui("НЕТ")}`);
    const probe = id => {
        const n = document.getElementById(id);
        if (!n) return ui`${id}: НЕТ в DOM`;
        const cs = getComputedStyle(n), r = n.getBoundingClientRect();
        return ui`${id}: в ${n.parentElement?.id || n.parentElement?.tagName} · class="${n.className}" · display=${cs.display} vis=${cs.visibility} op=${cs.opacity} z=${cs.zIndex} pos=${cs.position} · ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    lines.push(probe('aip_play'), probe('aip_menu'), probe('aip_host'));
    const o = document.getElementById('aip_overlay');
    const wasOpen = o?.classList.contains('aip-open');
    if (o) o.classList.add('aip-open');                 // принудительно открыть и посмотреть, что получилось
    lines.push(probe('aip_overlay'), probe('aip_modal'));
    const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    lines.push(ui`сверху в центре экрана: ${top ? `${top.tagName}#${top.id}.${String(top.className).slice(0, 40)}` : '—'}`);
    if (o && !wasOpen) o.classList.remove('aip-open');
    lines.push(probe('aip_thoughts'));
    lines.push(ui`окно ${innerWidth}×${innerHeight} · чат: ${chatId() ? ui("открыт") : ui("нет")} · ошибок: ${errors.length}`);
    for (const e of errors.slice(-3)) lines.push(ui`ошибка: ${e}`);
    const text = lines.join('\n');
    console.log(ui("[AI Player] диагностика\n") + text);
    const ta = document.getElementById('send_textarea');
    if (ta && !ta.value.trim()) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    toastr.info(ui("Отчёт вставлен в поле ввода — скопируйте его и пришлите разработчику. Не отправляйте в чат."), ui("AI Player: диагностика"), { timeOut: 10000 });
}

// перехват ошибок расширения — показываем уведомлением, т.к. на телефоне консоли не видно
const errors = [];
function reportError(err, where = '') {
    const msg = `${where ? where + ': ' : ''}${err?.message || err}`;
    errors.push(msg);
    console.error('[AI Player]', where, err);
    toastr.error(short(msg), ui("AI Player — ошибка"));
}
window.addEventListener('error', e => { if (String(e.filename || e.error?.stack || '').includes('AI-Player')) reportError(e.error || e.message, ui("скрипт")); });
window.addEventListener('unhandledrejection', e => { if (String(e.reason?.stack || '').includes('AI-Player')) reportError(e.reason, ui("промис")); });
const safe = (name, fn) => (...a) => { try { const r = fn(...a); if (r?.catch) r.catch(e => reportError(e, name)); return r; } catch (e) { reportError(e, name); } };

// ---------- Кнопки ----------
function addButtons() {
    const host = document.getElementById('rightSendForm') || document.getElementById('send_form');
    if (host && !document.getElementById('aip_play')) {
        const b = document.createElement('div');
        b.id = 'aip_play';
        b.className = 'aip-play fa-solid fa-play interactable';
        b.title = ui("AI Player: сделать ход за игрока");
        b.tabIndex = 0;
        b.addEventListener('click', playTurn);
        b.addEventListener('keydown', e => { if (e.key === 'Enter') playTurn(); });
        host.prepend(b);
    }
    const menu = document.getElementById('extensionsMenu');
    if (menu && !document.getElementById('aip_menu')) {
        const mk = (id, icon, text, fn) => {
            const it = document.createElement('div');
            it.id = id; it.tabIndex = 0;
            it.className = 'list-group-item flex-container flexGap5 interactable';
            it.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;   // статичный текст
            it.addEventListener('click', e => { e.stopPropagation(); fn(); });
            return it;
        };
        menu.append(
            mk('aip_menu', 'fa-robot', ui("AI Player — настройки"), safe(ui("настройки"), openModal)),
            mk('aip_menu_th', 'fa-comment-dots', ui("AI Player — впечатления"), safe(ui("окно впечатлений"), toggleThoughts)),
            mk('aip_menu_diag', 'fa-stethoscope', ui("AI Player — диагностика"), safe(ui("диагностика"), diagnose)),
        );
    }
}

jQuery(() => { try { initAll(); } catch (e) { reportError(e, ui("запуск")); } });

function initAll() {
    settings();
    applyMotion();
    buildModal();
    buildThoughts();
    addButtons();
    setReactions(settings().s.reactions);
    const c = ctx();
    const ev = c.event_types;
    c.eventSource.on(ev.CHAT_CHANGED, () => {
        abortCtl?.abort();
        reactCtl?.abort();
        memCtl?.abort();
        pendingMeta = null;
        reacted.clear();
        renderThoughts();
        renderMemory();
        renderAllBadges();                       // CHAT_CHANGED приходит после отрисовки сообщений
        if (document.getElementById('aip_overlay')?.classList.contains('aip-open')) refreshSync();
    });
    // глобальные обработчики — один раз (не при каждой пересборке окна)
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('aip_overlay')?.classList.contains('aip-open')) closeModal();
    });
    window.addEventListener('resize', () => { const t = document.getElementById('aip_thoughts'); if (t) clampIntoView(t); });
    c.eventSource.on(ev.MESSAGE_SENT, onMessageSent);
    // шкала контекста следует за текущим чатом
    for (const name of ['CHAT_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_DELETED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'PERSONA_CHANGED']) {
        if (ev[name]) c.eventSource.on(ev[name], () => {
            if (document.getElementById('aip_overlay')?.classList.contains('aip-open')) scheduleMeter();
        });
    }
    // мысли — только на настоящие ответы бота: не на приветствие, /sendas и картинки расширений
    c.eventSource.on(ev.MESSAGE_RECEIVED, (id, type) => {
        // continue/append перезаписывают то же сообщение — повторная платная «мысль» не нужна,
        // но дату в уже записанных мыслях о нём обновляем
        if (['continue', 'append', 'appendFinal'].includes(type)) { retagThoughts(id); return; }
        if (['first_message', 'command', 'extension', 'impersonate'].includes(type)) return;
        onBotMessage(id);
        maybeUpdateMemory(id);
    });
    // удалили сообщение / перегенерировали ответ / удалили чат — убираем мысли о несуществующих сообщениях
    for (const name of ['MESSAGE_DELETED', 'CHAT_DELETED', 'GROUP_CHAT_DELETED']) {
        if (ev[name]) c.eventSource.on(ev[name], () => { renderThoughts(); renderMemory(); });
    }
    if (ev.USER_MESSAGE_RENDERED) c.eventSource.on(ev.USER_MESSAGE_RENDERED, renderBadge);
    if (ev.MORE_MESSAGES_LOADED) c.eventSource.on(ev.MORE_MESSAGES_LOADED, renderAllBadges);
    renderThoughts();
    renderAllBadges();
    console.log(ui`[AI Player] ${VERSION} загружен`);
    const { s, save } = settings();
    if (s.lastVersion !== VERSION) {     // один раз после обновления — подтверждение, что загрузилась новая версия
        s.lastVersion = VERSION; save();
        toastr.success(ui`Версия ${VERSION} загружена. Меню-палочка → AI Player.`, 'AI Player', { timeOut: 5000 });
    }
}


