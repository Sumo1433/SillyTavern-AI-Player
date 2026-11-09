<div align="center">

# 🎭 AI Player

### Let an AI play your persona in SillyTavern

One model plays your character. Another plays their scene partner.<br>
Choose the models, shape the style, and watch the story unfold.

![Version 0.5.0](https://img.shields.io/badge/version-0.5.0-e99a25?style=flat-square)
![SillyTavern extension](https://img.shields.io/badge/SillyTavern-extension-555?style=flat-square)
[![MIT license](https://img.shields.io/badge/license-MIT-75b798?style=flat-square)](LICENSE)

**English** · [Русский](README.ru.md)

[Install](#installation) · [First turn](#your-first-turn) · [Features](#features) · [FAQ](#faq)

</div>

---

**AI Player** is a SillyTavern extension that connects a separate model to play `{{user}}`. The agent reads your persona and current chat, writes a turn, and can share impressions and update character notes after the bot replies.

Use it to experiment with models, compare roleplaying styles, or see how a scene develops between two AIs.

> **You start each new player turn by pressing ▶.** The bot's reply, impressions, and scheduled memory updates may follow automatically. There is no unattended continuous-play loop.

## Language support

- **Interface:** follows the language selected in SillyTavern. Russian and English are supported; other interface languages use English. Changing ST's language takes effect after its normal page reload.
- **Built-in prompts:** written in English, including the combined style, Actor, Director, Anti-cliché, impressions, and memory instructions.
- **Language of play:** the model is instructed to follow the user's recent in-character messages, or the current scene if the user has not spoken yet. It can continue in Russian, English, Ukrainian, or another language regardless of the interface language.
- **Impressions and notes:** use the language of play too. When no game language can be inferred, the ST interface locale is the fallback.

An explicit request to change the language of play takes priority. Language choice is handled by the model, not by automatic translation of your chat. Model compliance can vary. Your persona, card, custom instructions, and existing messages are preserved as entered.

On upgrade, exact copies of the old built-in Russian prompts are migrated to the English versions. Edited custom prompts are preserved; review them if they explicitly require a particular output language.

## Preview

![AI Player turn and a separate impressions window in SillyTavern](docs/screenshots/gameplay.jpg)

<sub>Screenshots from a live SillyTavern session: Kimi plays User, Gemini plays Seraphina. The interface and game are in English. The custom Wizard Tower Silver theme shown here is separate from the extension.</sub>

<details>
<summary><b>Game settings and English prompts</b></summary>

![AI Player game settings](docs/screenshots/game-settings.jpg)

![English prompt editor](docs/screenshots/prompt-editor.jpg)

</details>

## Installation

In SillyTavern, open **Extensions → Install extension** and paste:

```text
https://github.com/Sumo1433/SillyTavern-AI-Player
```

Reload the page after installation. Open the wand menu → **AI Player — settings**.

<details>
<summary>Manual installation</summary>

Copy the extension folder into `SillyTavern/data/default-user/extensions/` and restart SillyTavern. For another ST user, use that user's data folder.

</details>

**Compatibility:** requires a SillyTavern version with `SillyTavern.getContext()`. The project targets **1.19.0**; compatibility with other versions may vary.

## Your first turn

1. Open a character or group chat and select your persona.
2. In AI Player settings, choose the connection type, enter the API URL if needed, and save a key or proxy password.
3. Choose a model or enter its ID. Click **Test**.
4. Press **▶** near the input field to generate a turn for your persona.
5. With auto-send enabled, the turn is sent to chat. If Tavern's main API is connected, the bot replies as usual.

Press ▶ again during turn generation to cancel. With auto-send disabled, review and send the generated text from the input field yourself.

> A turn, an impression, and a memory update are **separate API requests**, each consuming tokens. Impressions and memory can be disabled.

## Features

| Feature | What it does |
| --- | --- |
| 🎭 Persona roleplay | Uses the current chat and persona description. Turn length is configurable; the default target is 50–200 words. |
| 🔌 Connection profiles | Switch models, API addresses, and keys. |
| 💭 Player impressions | A separate window for reactions to the bot's reply and a subjective partner rating. These comments are not sent to chat. |
| 📝 Character memory | Includes notes about goals, relationships, and events in later turns, even after old history is trimmed. |
| ✍️ Prompt editor | Custom instructions, style presets, ST macros, and prompt insertion at a chosen history depth. |
| 📊 Context meter | Shows the prompt, history, and response reserve, with overflow warnings. |
| 🤖 Model badges | Identifies the player model beside its messages. |
| 📦 Session export | Markdown and JSON with turns, models, word counts, response times, and impressions. |
| 👥 Group chats | Supports scenes with multiple characters. |
| 📱 Mobile layout | Responsive interface and optional animations. |

### Connections

| Connection type | Use it for | Required settings |
| --- | --- | --- |
| **OpenAI-compatible** | An API or reverse proxy using OpenAI format | Base URL, such as `https://api.openai.com/v1`, key, and model ID. |
| **Anthropic** | The official Claude API | Anthropic key and model ID. |
| **Claude reverse proxy** | A proxy using Anthropic format | Proxy address, password, and model ID. |

For OpenAI-compatible connections, the model list is requested from the server. For Claude, the extension offers a built-in list; you can enter another ID manually.

Claude proxy addresses usually end in `/v1`; ST adds `/messages`. ST requires a nonempty proxy password. If the service requires none, enter any character.

### Customize your game

<details>
<summary><b>Styles, presets, and custom prompts</b></summary>

The combined default prompt brings together three approaches, each also available as a preset:

- **Actor:** character desire, subtext, and a distinctive voice.
- **Director:** goals, scene movement, and stakes.
- **Anti-cliché:** concrete details, clean prose, and varied phrasing.

Edit the system prompt, turn reminder, impressions prompt, and memory prompt. Extension placeholders and SillyTavern macros are supported. `{language_rule}` inserts the output-language instruction, which is also appended automatically to rendered prompts.

A custom history prompt can use the `system` or `user` role. Depth **0** inserts it at the end, before the turn reminder; depth **N** inserts it before the last N history messages.

The limited-knowledge setting asks the model to use only what its character can know from the scene and background. Compliance depends on the model.

</details>

<details>
<summary><b>Player memory</b></summary>

Memory is enabled by default. Every **3 agent turns**, a separate request updates notes about the character's state, goals, relationships, promises, and unresolved matters. Change the interval on the **Session** tab.

Each chat has its own notes. Edit them, update them manually, or disable memory. The prompt asks the model to distinguish suspicions from facts, but important details still need checking.

Deleting a reference message may mark notes as stale. Review notes after editing history: automatic checks do not detect every content change.

</details>

<details>
<summary><b>Context and long chats</b></summary>

Only the open chat's history is used. When space runs out, older messages are dropped first, followed by the greeting if needed. A warning appears if even the latest message does not fit.

History trimming uses an approximate token estimate. The meter also uses ST's tokenizer, which may differ from the chosen model's tokenizer. Set the model context limit in its profile.

</details>

<details>
<summary><b>Keys and proxy passwords</b></summary>

API keys are saved through SillyTavern's key storage, in `secrets.json` on the server running Tavern. They are not saved in extension settings. Under standard ST settings, the browser receives masked values; this depends on `allowKeysExposure` in `config.yaml`.

Extension keys are labeled **AI Player**. This is shared ST storage, so those keys also appear in Tavern's main key manager; the extension profile selects its key separately. After adding a key, the extension attempts to restore Tavern's previous active key. If there was no main key, it creates an empty placeholder. Keep it until you add a main Tavern key. Check Tavern's main connection after key changes, especially after a server error.

**Claude proxy passwords are different:** they are saved in extension settings inside `settings.json` and loaded into the browser with those settings. Do not publish that file or backups containing passwords.

Model requests go through the SillyTavern server.

</details>

## FAQ

**Are impressions the same as character thoughts?**

No. `(thought: …)` inside a turn is part of the chat message and is visible to the bot. The 💭 window contains the player's impressions of the game, stored separately. Thought labels follow the language of play.

**Can the two sides use different models?**

Yes. Choose the player model in AI Player and the bot model in SillyTavern's main connection.

**Why was the turn left in the input field?**

Check auto-send, the main API connection, and ST's generation status. If Tavern is busy or sending is unavailable, the extension leaves the turn for manual submission.

**Are new impressions generated after regeneration?**

Yes, when impressions are enabled and the new reply follows an agent turn. Continue and service messages do not trigger a new impressions request.

**Are the word limit, language choice, prose style, and memory accuracy guaranteed?**

No. They are prompt instructions; results depend on the model, settings, and context.

## Development and tests

No build step is required: `index.js` contains the logic and interface, `style.css` the styles, and `manifest.json` the extension metadata. `prompts/` contains English prompt references and style variants.

**Unit tests:** 73 checks using jsdom and a simulated SillyTavern API, including localization, English request scaffolding, and migration of built-in prompts:

```sh
cd tests/unit
npm install
npm test
```

**End-to-end test:** real SillyTavern, a mock API, and Edge/Chrome:

```sh
cd tests/e2e
npm install
node run-e2e.mjs
```

The scenario uses a separate data folder and ports **8123/8124**. It looks for ST at `C:\Projects\SillyTavern` by default. Set `ST_DIR` for another path and `BROWSER` for the browser executable. See the [test scenario](tests/e2e/run-e2e.mjs).

Found a problem? [Open an issue](https://github.com/Sumo1433/SillyTavern-AI-Player/issues) with your ST version, connection type, steps to reproduce, and error message. Remove keys and passwords from attachments.

---

**Author:** Deadsum · [Telegram @Deadsum](https://t.me/Deadsum)

**License:** [MIT](LICENSE)
