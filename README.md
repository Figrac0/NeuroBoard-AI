# NeuroBoard AI — seller dashboard + продвинутый agentic harness

Личный кабинет продавца с AI-ассистентом для объявлений на Авито, **расширенный до демонстрации
продвинутого agentic harness**. Базовое приложение (каталог, карточка, форма, AI-помощь по описанию и
цене) играет роль «бизнеса», которым управляет автономный агент: harness превращает **цель** в **план**,
исполняет шаги под контролем (ретраи, таймаут, бюджет токенов), **проверяет** результат, **откатывает**
состояние и **учится** между прогонами. Поверх — измеримые **evals** и **параллельная оркестрация 5+
агентов**.

> Важно про demo-версию на Vercel:
> для публичного статического показа может использоваться frontend demo mode без backend и без реальной БД.
> В таком режиме приложение работает на локальной заглушке с sample-товарами, чтобы можно было открыть список, карточки, редактирование и базовые пользовательские сценарии даже без сервера.
> Это сделано именно для удобной демонстрации интерфейса. Основной локальный сценарий проекта по-прежнему рассчитан на запуск вместе с backend.
<div align="center">
  <a href="https://neuro-board-ai.vercel.app/ads" target="_blank">
    <img
      src="https://github.com/Figrac0/Figrac0/blob/main/href.svg"
      alt="Quick Access - Visit Site"
      width="50%"
    />
  </a>
</div>

---

<div align="center">
  
## 📸 Предварительный просмотр

</div>
<div align="center">
  <details>
    <summary><strong>Показать фото и гифки</strong></summary>
    <br/>

| 1 | 2 |
| :---: | :---: |
| <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/11.png" width="600"/> | <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/22.png" width="600"/> |
| <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/33.png" width="600"/> | <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/44.png" width="600"/> |

<br/>

<p align="center">
  <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/1.gif" width="900"/>
</p>

<p align="center">
  <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/2.gif" width="900"/>
</p>

<p align="center">
  <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/3.gif" width="900"/>
</p>

<p align="center">
  <img src="https://github.com/Figrac0/NeuroBoard-AI/blob/main/git/4.gif" width="900"/>
</p>

  </details>
</div>

---

## Содержание

- [Что это и зачем](#что-это-и-зачем)
- [Три экспоната harness](#три-экспоната-harness)
- [Часть 1. Продуктовое приложение](#часть-1-продуктовое-приложение)
- [Часть 2. Agentic harness](#часть-2-agentic-harness)
- [Часть 3. Eval Lab](#часть-3-eval-lab)
- [Часть 4. Параллельная оркестрация 5+ агентов](#часть-4-параллельная-оркестрация-5-агентов)
- [Spec-Driven и документация](#spec-driven-и-документация)
- [Архитектура и поток](#архитектура-и-поток)
- [Стек](#стек)
- [Структура проекта](#структура-проекта)
- [Установка и запуск](#установка-и-запуск)
- [Переменные окружения](#переменные-окружения)
- [Скрипты и проверки качества](#скрипты-и-проверки-качества)
- [Документация по backend](#документация-по-backend)
- [Что дальше](#что-дальше)

## Что это и зачем

Контекст — harness-инженерия: задача в том, чтобы LLM перестала ждать промпт, а **доводила цель до
результата** сама. «Harness» — это обвязка вокруг модели: план, инструменты, проверки, бюджеты, память,
эскалация и откат. Этот репозиторий показывает harness на живом продукте (объявления на Авито) и
доказывает его пользу измеримо.

Базовый продукт остался прежним (личный кабинет продавца + AI по описанию/цене/чату). Новое — слой
**`src/agent-harness/`** и инфраструктура вокруг него.

## Три экспоната harness

| Экспонат | Что показывает | Где |
| --- | --- | --- |
| **Свой harness** | цель → план → действия → проверка → рефайн → эскалация → rollback, память, автозаполнение всех полей товара | `src/agent-harness/`, панель в форме `/ads/:id/edit` |
| **Eval Lab** | измеримое сравнение «модель × политика harness»: avg score, success-rate, токены | страница `/lab` |
| **Параллельная оркестрация** | 5+ агентов (Claude Code) в git-worktree + tmux, переживающий ребут | `infra/` |

## Часть 1. Продуктовое приложение

Личный кабинет продавца на React + TypeScript.

- список объявлений `/ads` (поиск, сортировка, фильтры, пагинация, grid/list, бейдж «требует доработок»);
- просмотр `/ads/:id` (характеристики по категории, галерея, блок недостающих полей);
- редактирование `/ads/:id/edit` (динамические характеристики, счётчик символов, автосохранение черновика
  в `localStorage`, сравнение «Было → Стало»);
- AI-функции: придумать/улучшить описание, оценить рыночную цену (устойчивый парсинг неидеального JSON),
  чат по объявлению;
- тёмная тема, переключение `RU/EN`, отмена запросов при переходах, unit-тесты, `docker compose`,
  совместимый mock-backend (`GET/PUT /items`).

`needsRevision` считается на клиенте; вся логика LLM изолирована в `src/services/llm.ts`.

## Часть 2. Agentic harness

Изолированный модуль `src/agent-harness/`, интегрируется через чистые интерфейсы, не ломает базовый
функционал. Строгий TypeScript (без `any`, без `enum` — включён `erasableSyntaxOnly`).

### Agentic loop
Цель → **план (goal-graph)** → исполнение шага под контролем → **верификация** результата → при провале
**рефайн** по фидбеку → **эскалация** (сильная модель или needs-human) → применение патча → запись в
**evidence**. Перед каждым шагом снимается **snapshot** для отката.

### Модули
- `goal-graph.ts` — цель как **DAG**: топологические слои (Kahn), независимые шаги исполняются
  параллельно. Линейный план — частный случай (цепочка), поэтому исполнитель один на оба режима.
- `runner.ts` — исполнитель: per-step **timeout**, **ретраи** на сбой, **бюджет токенов**, цикл
  **verify → refine → escalate**, ограничение параллелизма, `runPlan`/`runGraph`.
- `planner.ts` — plan mode: LLM-планировщик с **детерминированным фолбэком** (graceful degradation).
- `tools.ts` — инструменты-возможности с `run` **и** `verify`: `suggest-category`, `fill-attributes`,
  `improve-title`, `improve-description`, `estimate-price` — агент заполняет **все** поля товара
  (категория, характеристики, заголовок, описание, цена).
- `model-client.ts` + `config.ts` — **сменный транспорт** к модели: OmniRoute (Claude Sonnet 4.5) по
  умолчанию + Ollama (qwen3:8b) как офлайн-фолбэк через resilient-обёртку.
- `memory.ts` + `memory-zep.ts` + `memory-config.ts` — **memory-слой**: recall перед планом, write после
  прогона. Backend сменный: локальный flat-vector (по умолчанию) или **Zep + Graphiti** (temporal
  knowledge graph) через backend-роут `/memory`.
- `evidence.ts` — журнал прогона: каждая запись фиксирует **что сделал, почему, результат** + токены.
- `snapshot.ts` — снимки состояния и откат.

### UI
`src/features/edit/AgentHarnessPanel.tsx` (+ `useAgentHarness.ts`) — панель «AI-агент · plan mode» в форме
редактирования: план со статусами шагов, live evidence-лог, список снимков с кнопкой **«Откатить сюда»**,
блок памяти.

## Часть 3. Eval Lab

Страница **`/lab`** (`src/pages/HarnessLabPage.tsx`, движок — `src/agent-harness/evals/`).

Прогоняет одни и те же golden-задачи под выбранными связками **модель × политика** и показывает таблицу:
**avg score / success-rate / токены / рефайны / эскалации**. Конфиги по умолчанию: `Sonnet+harness`,
`Sonnet naive` (verify/ретраи выключены), `Haiku+harness`, `Ollama qwen3+harness`.

Зачем: измеримо показать **вклад самого harness** (verify on/off на одной модели) и тезис «открытая модель
+ harness против фронтира-naive». Скорер детерминированный — сравнение воспроизводимо.

## Часть 4. Параллельная оркестрация 5+ агентов

Каталог **`infra/`** — запуск нескольких реальных кодинг-агентов (Claude Code) одновременно:

- `spawn-agents.sh` — N агентов, **каждый в своём git-worktree** (изоляция, single-writer по построению),
  в одной tmux-сессии;
- `tasks/QUEUE.md` — общий список задач; `claim.sh` — **single-writer lock** (атомарный `mkdir`);
- `tmux.conf` — tpm + **tmux-resurrect** + **tmux-continuum** (`@continuum-restore on`): прогоны
  переживают SSH-таймаут и ребут; `zellij-layout.kdl` — альтернатива на zellij.

Запускается в WSL2 Ubuntu (на Windows). Одно-командная альтернатива — Claude Squad. Подробности и
команды — в [`infra/README.md`](infra/README.md).

## Spec-Driven и документация

- **`openspec/`** — спеки в формате OpenSpec: `specs/` (источник истины по capability) + `changes/`
  (дельты `ADDED`/`MODIFIED`), цикл **Propose → Apply → Archive**. Почему OpenSpec на brownfield и Spec
  Kit на greenfield — в [`openspec/WHY-OPENSPEC.md`](openspec/WHY-OPENSPEC.md).
- **`docs/HARNESS-COMPARISON.md`** — сравнение OpenHands / OpenCode / нашего harness по agent loop,
  tool-API, orchestration model и почему это важно для evals.
- **`docs/MEMORY-LAYERS.md`** — flat-vector vs temporal knowledge graph.
- **`docs/SETUP-ZEP.md`** — как включить Zep + Graphiti как backend памяти.
- **`docs/DEMO-SCRIPT.md`** — порядок показа на демо (каждый пункт ↔ требование).

## Архитектура и поток

```text
OmniRoute (OpenAI-совместимый шлюз) ──► Claude Sonnet 4.5  ─┐
                                        Claude Haiku 4.5     ├─► Часть 2: harness в приложении
Ollama (qwen3:8b, офлайн-фолбэк) ───────────────────────────┘     (plan → verify → escalate → memory)
                                                                  └─► Часть 3: Eval Lab сравнивает связки

Claude Max ──► 5× Claude Code ──► git worktrees ──► tmux (Часть 4: параллельный флот, переживает ребут)

openspec/ + docs/ ── как ведутся спеки и сравниваются harness-системы
```

- Frontend (SPA): маршрутизация, список/карточка/форма, harness-панель, Eval Lab, локализация, тема.
- Backend (`server/`): mock API `GET/PUT /items`, раздача изображений, JSON-storage; роут `/memory` для
  Zep (ключ только на сервере).
- Транспорт к модели — единственная точка (`model-client.ts`), поэтому провайдер меняется одной env.

## Стек

**Frontend:** React 19, TypeScript (strict), Vite, React Router, TanStack Query, React Hook Form, Zod,
Zustand, ESLint, Prettier, Vitest.
**Backend:** Node.js (нативный HTTP, без внешней БД), JSON-storage; опционально `@getzep/zep-cloud` для памяти.
**Harness/infra:** OmniRoute (OpenAI-совместимый шлюз), Ollama, tmux (resurrect+continuum) / zellij,
git worktrees, Claude Code.

## Структура проекта

```text
.
├─ openspec/                 # spec-driven: specs (источник истины) + changes (дельты)
├─ docs/                     # comparison, memory-layers, setup-zep, demo-script
├─ infra/                    # tmux.conf, spawn-agents.sh, claim.sh, tasks/QUEUE.md, zellij-layout.kdl
├─ server/
│  ├─ data/  ├─ images/  └─ src/   # mock backend + /memory (Zep)
├─ src/
│  ├─ agent-harness/         # ★ harness: runner, goal-graph, planner, tools, model-client,
│  │   │                     #   memory(+zep), evidence, snapshot, evals/  (+ *.test.ts)
│  ├─ features/edit/         # AgentHarnessPanel.tsx, useAgentHarness.ts
│  ├─ pages/                 # AdsListPage, AdDetailsPage, AdEditPage, HarnessLabPage
│  ├─ services/              # items.ts, llm.ts (промпты/парсеры + транспорт через harness)
│  ├─ components/ ├─ lib/ ├─ stores/ └─ types/
├─ docker-compose.yml ├─ Dockerfile ├─ vite.config.ts └─ README.md
```

## Установка и запуск

### Предварительные требования
- Node.js `20+`, npm.
- Бэкенд модели: **OmniRoute** (OpenAI-совместимый шлюз) на `:20128` — по умолчанию; либо **Ollama** с
  моделью `qwen3:8b` как фолбэк/офлайн.

### Веб-приложение + harness
```bash
npm install
npm run dev          # клиент http://localhost:5173/ads  +  backend http://localhost:8080
```
- harness-агент: `/ads/:id/edit` → секция «AI-агент · plan mode»;
- evals: `/lab`.

Раздельно: `npm run dev:client` (только фронт), `npm run server:start` (только backend).
Через Docker: `docker compose up --build`.

### Ollama-фолбэк (опционально)
```bash
ollama serve && ollama pull qwen3:8b
```

### 5 параллельных агентов (опционально, WSL2 Ubuntu)
```bash
# в Ubuntu, из корня репозитория:
cp infra/tmux.conf ~/.tmux.conf
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm   # затем prefix+I в tmux
bash infra/spawn-agents.sh 5
```
Подробно — [`infra/README.md`](infra/README.md).

## Переменные окружения

Создай `.env` на основе `.env.example`:

```env
VITE_API_PROXY_TARGET=http://localhost:8080

# Провайдер модели для harness: omniroute (по умолчанию) или ollama
VITE_MODEL_PROVIDER=omniroute
VITE_OMNIROUTE_URL=http://localhost:20128/v1
VITE_OMNIROUTE_MODEL=kr/claude-sonnet-4.5
# VITE_OMNIROUTE_API_KEY=

# Memory backend: local (по умолчанию) или zep (temporal KG через backend /memory)
VITE_MEMORY_BACKEND=local

VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen3:8b
VITE_REQUEST_TIMEOUT_MS=20000
VITE_ENABLE_DEMO_FALLBACK=true
# VITE_FORCE_DEMO_MODE=true
```

- `VITE_MODEL_PROVIDER` — куда идёт harness: `omniroute` (Sonnet) или `ollama` (qwen3).
- `VITE_OMNIROUTE_*` — адрес/модель/ключ шлюза (OpenAI-совместимый).
- `VITE_MEMORY_BACKEND` — `local` (flat-vector, офлайн) или `zep`. Ключ Zep ставится в окружении
  **сервера** (`ZEP_API_KEY`), не в `VITE_` — см. `docs/SETUP-ZEP.md`.
- `VITE_OLLAMA_*` — адрес и модель Ollama (фолбэк / участник Eval Lab).
- `VITE_ENABLE_DEMO_FALLBACK` / `VITE_FORCE_DEMO_MODE` — demo-режим без backend (Vercel).

## Скрипты и проверки качества

```bash
npm run dev          # клиент + backend
npm run lint         # ESLint (--max-warnings=0)
npm test             # Vitest (включая capability-тесты harness: runner/goal-graph/evals/memory)
npm run build        # tsc -b + vite build
npm run format       # Prettier
```

Качество: строгий TypeScript, **28 unit-тестов** (логика runner — verify/refine/escalate/budget/retry,
goal-graph, evals, memory), линт и production-сборка — зелёные.

## Документация по backend

Контракт (как в задании): `GET /items`, `GET /items/:id`, `PUT /items/:id`. Данные — `server/data/items.json`
(seed создаётся при первом запуске), изображения — `server/images`. Дополнительно: `POST /memory/remember`
и `POST /memory/recall` для Zep-памяти (отвечают `501`, пока `ZEP_API_KEY` не задан).

`GET /items` поддерживает `q`, `limit`, `skip`, `needsRevision`, `categories`, `sortColumn`, `sortDirection`.

```bash
curl "http://localhost:8080/items?q=macbook&categories=electronics&limit=10&skip=0"
curl "http://localhost:8080/items/el-001"
curl -X PUT "http://localhost:8080/items/el-001" -H "Content-Type: application/json" -d '{
  "category":"electronics","title":"MacBook Pro 16","description":"Обновлённое описание",
  "price":120000,"params":{"type":"laptop","brand":"Apple","model":"M1 Pro","condition":"used","color":"gray"}
}'
```

## Что дальше

- включить Zep + Graphiti как основной backend памяти (сейчас по умолчанию локальный flat-vector);
- собрать живые цифры для `docs/HARNESS-COMPARISON.md`, прогнав OpenHands и OpenCode по разу;
- авто-quarantine падающих провайдеров модели и явная индикация фолбэка в evidence;
- e2e-тесты и публичный деплой связки frontend + backend.
