src/agent-harness/
├─ runner.ts ★ ← исполнитель: snapshot→run→verify→refine→escalate; таймаут/ретраи/бюджет/параллель (runStep, DEFAULT_POLICY)
├─ planner.ts ★ ← plan mode: LLM-план + правила-фолбэк + resilient-склейка (createDefaultPlanner)
├─ goal-graph.ts ★ ← цель = DAG: топослои (Kahn), linear/parallel (buildLayers)
├─ tools.ts ★ ← 5 инструментов (run+verify): категория/характеристики/заголовок/описание/цена (createDefaultRegistry)
├─ model-client.ts ★ ← сменный транспорт к модели: OmniRoute + Ollama + resilient (createResilientModelClient)
├─ config.ts ← сборка ModelClient из env (createConfiguredModelClient)
├─ memory.ts ← интерфейс MemoryStore + локальный flat-vector адаптер (recall/write)
├─ memory-zep.ts ← адаптер Zep+Graphiti (temporal-KG) через backend /memory
├─ memory-config.ts ← выбор backend памяти по env (local | zep)
├─ evidence.ts ← журнал прогона: что/почему/результат + токены (фазы loop)
├─ snapshot.ts ← снимки состояния + откат (rollback)
├─ index.ts ← barrel-экспорт (точка входа для UI/сервисов)
├─ evals/ ← Eval Lab (измерение модель × политика)
│ ├─ tasks.ts ← golden-задачи
│ ├─ score.ts ← детерминированный скорер (описание + цена)
│ ├─ matrix.ts ← прогон матрицы задача × конфиг + агрегаты
│ └─ configs.ts ← дефолтные конфиги (Sonnet/Haiku/Ollama × harness/naive)
└─ (тесты) ← capability-тесты
├─ runner.test.ts ← verify/refine/escalate/budget/retry
├─ goal-graph.test.ts ← слои, циклы, linear/parallel
├─ planner.test.ts ← правила выбирают верные шаги
├─ memory.test.ts ← remember/recall/limit
└─ evals/{score,matrix}.test.ts ← скорер + матрица
