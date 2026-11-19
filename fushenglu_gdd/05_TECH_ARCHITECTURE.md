# 05 — 技术架构与接口规范

## 1. 架构原则

**MVP 完全客户端执行**：React + TypeScript + Vite；UI 与纯 TypeScript 模拟核心分离；静态资源使用 JSON/TS 数据文件，Cloudflare Pages 等静态托管可免费起步。无数据库、无账号、无存档、无每年/每回合 AI 调用。

**进阶付费分支另行增加服务端**，负责支付验证、AI API 密钥、额度/风控与架空史线编排，不改变基础版的离线模拟架构。

## 2. 模块与依赖

```text
UI (React)
  ├── GameController (UI adapter)
  └── GameEngine
      ├── HistoricalRuleset
      ├── HistoricalTimeline
      ├── HistoricalGeography / RegionalSimulator
      ├── WorldGenerator
      ├── SimulationEngine / Scheduler
      ├── LivingNPCSystem / HouseholdNetwork / NPCDecisionResolver
      ├── EventAndChoiceEngine
      ├── KnowledgeNarrativeEngine
      ├── CausalLedger / LifeMemory
      └── Ending / HistoricalFigureMatcher

Content bundles:
  history/**, rules/**, names/**, events/**, narratives/**, figures/**
```

Historical Timeline 本身只加载史实与冲击；RegionalSimulator 把冲击扩散到各地；KnowledgeEngine 决定玩家是否/如何察觉；CausalLedger 保证长期后果能查询。

## 3. 推荐项目结构

```text
src/
  app/                 # React 路由、视图、交互
  engine/
    core/              # 时钟、状态、RNG、scheduler
    history/           # timeline, geographic, ruleset
    generation/        # birth, family, NPC, regional conditions
    simulation/        # economy, health, relationship, migration
    npc/               # traits, goals, autonomous ticks, NPC decisions, memory
    household/         # household membership, marriage, in-laws, property authority
    events/            # eligibility, sampling, choice, outcomes
    knowledge/         # observed, rumor, inferred
    memory/            # causal graph, threads, audits
    ending/            # chronicle, reveal, similarity
  content/
    han-western/       # 时间窗、制度、地理、史实、事件和来源
    shared/            # 通用家庭/生活事件模板
  schemas/             # zod/json-schema 校验
  tests/
    unit/ property/ integration/ simulations/
  assets/
```

## 4. 单一状态入口

```ts
interface GameState {
  runId: string;
  seed: string;
  clock: { year: number; month: number };
  mode: 'canonical';
  world: WorldState;
  playerId: string;
  people: Record<string, PersonState>; // NPC traits/goals/knowledge/memory in authoritative run state
  families: Record<string, FamilyState>; // household resources, authority, relatives, marriage links
  regions: Record<string, RegionState>;
  knowledge: Record<string, KnowledgeEntry[]>;
  memory: LifeMemory;
  queue: ScheduledTask[];
  chronicle: ChronicleEntry[];
  pendingChoiceId?: string;
  status: 'active'|'ended';
}
```

`runId` 只在本局标识，不代表服务器存档。死亡时 `status=ended`，禁止继续触发生活事件。

## 5. 主要接口

```ts
interface GameEngine {
  start(config: { dynastyId: string; periodId: string; seed?: string }): GameState;
  advance(state: GameState, until: 'next-choice' | 'next-year'): GameState;
  choose(state: GameState, choiceId: string): GameState;
  observe(state: GameState): PlayerVisibleState; // only observable NPC info, not hidden traits
  finish(state: GameState): LifeEnding;
}
```

`observe` 是唯一对 UI 暴露故事文本的入口，不能把完整 `WorldState` 原封不动发给组件，否则前端容易意外暴露历史真相。客户端代码最终仍可被技术用户查看，**此处目标是叙事视角而不是安全保密**。

## 6. 时间推进示意

```ts
function advanceOnePeriod(state: GameState): GameState {
  let next = cloneState(state);
  next.clock = advanceCalendar(next.clock);
  next = timeline.applyCanonicalFacts(next);
  next = regions.propagateShocks(next);
  next = families.updateEconomy(next);
  next = npcSystem.advanceAutonomousLives(next);
  next = npcSystem.resolveHouseholdChanges(next);
  next = healthAndSkills.update(next);
  next = scheduler.resolveDueConsequences(next);
  const event = eventEngine.pickEligible(next);
  next = eventEngine.resolveOrPrompt(next, event);
  next = knowledge.updateObservations(next);
  assertStateInvariants(next);
  return next;
}
```

上面是设计伪代码，尚未落地，需决定函数式更新与性能实现细节。

## 7. 随机数与测试可复现性

- 不依赖裸 `Math.random()`；使用可种子的 PRNG，配合 `world`, `birth`, `people`, `events`, `outcomes` 独立随机子流。
- 测试可固定 seed 重放完整人生，记录内容包版本；正式用户不显示作弊用 seed 或载入按钮。
- 采样采用权重、条件概率和过程模拟，而非把社会身份与财富分数独立均匀随机。
- 内容 schema 在 build 阶段校验：时间范围、区域、人物生死、引用存在、前置条件、循环依赖。

## 8. 数据与性能

- 按朝代和时期拆分内容包（lazy import）；不要将全历史全部发送到首屏。
- 玩家附近 NPC 做个体模拟，远端人群做聚合指标；无每个普通居民的实时完整 agent。
- 目标（需实测）：中端手机普通年份推进可感知地流畅、首局可快速进入、静态资源按需加载；不要先写死未测试的毫秒 SLA。
- 默认不上传玩家数据；若将来做匿名统计，必须明确告知并提供选择。

## 9. AI 收费扩展安全边界

- 永不把 API key 放在浏览器中；付费内容仅通过服务端调用。
- 服务器验证支付与额度，限流、超额预算保护、内容审核、请求成本上限。
- AI 只输出结构化的 **BranchProposal**（含因果理由、变更建议、历史约束冲突），由 validator 验证并交给 engine 应用；不能执行任意代码或直接写入 state。
- 新史线需记录 `divergedAt`, `changedFacts`, `disabledCanonicalEvents`, `downstreamDependencies`，并进行一致性验证。
- 如果需要跨刷新保存用户购买额度，需要服务端购买记录/匿名凭证；这与“基础游戏不存档”不是一回事。

## 10. 推荐工程测试

- Unit：条件选择、权重、时间范围、区域传播、死亡校验。
- Property-based：任意种子下无死人再活、负年龄、同一角色同时位于两地、违反资格的职业事件；婚后姻亲/家户关系一致、财产控制权限合法。
- Golden seeds：验证固定种子的人生年谱稳定（改变内容包版本时接受有意更新）。
- Simulation batches：批量生成不同身份与地区的历史人生，检查丰富度、意外死亡、事件频率、剧情重复和因果可见性。
- Design acceptance：两个北极星测试必须过关；另加 v1.1 NPC 自主生活 / 人格差异 / 婚后家庭网络测试。

## 11. 人物模拟的最小接口契约（v1.1）

```ts
interface NpcSystem {
  generate(context: EraHouseholdContext, rng: RandomSource): PersonState;
  advanceAutonomousLives(state: GameState): GameState;
  decide(request: NpcRequest, state: GameState): NpcDecisionOutcome;
  updateMemories(outcome: NpcDecisionOutcome, state: GameState): GameState;
}

interface HouseholdSystem {
  marry(state: GameState, people: [string, string], context: MarriageContext): GameState;
  transferResidence(state: GameState, personId: string, householdId: string): GameState;
  adjustPropertyAuthority(state: GameState, change: PropertyAuthorityChange): GameState;
}
```

- 决策不是让玩家选择 NPC 的最终决定；`choose` 记录玩家**行动意图**，随后 `NpcSystem.decide` 得到结果，且可能被第三方/资源/制度否决。每个结果附 `reasonCodes` 便于验收与局内有节制的叙事解释。
- `PersonState` 不应直接传给 React。构建 `ObservedPersonProfile`（稳定身份、可得官职/职业、玩家见闻、传闻、未知项），禁止通过工具提示暴露特质分数。
- 允许 NPC 在不同人生中同名，但同局 `id` 必须唯一；婚嫁、过继、搬迁、丧偶时更新 household graph，不能复制实例制造两个同一人。
- 使用规则、权重和 seeded RNG 运行，任何 NPC 行动都不调用 AI。细节见 `09_LIVING_NPC_AND_HOUSEHOLDS.md`。

## 12. v1.2 Theme 与 NarrativeFeed 接口边界

- `themeId = resolveTheme(historicalRegionId, periodId)`：只控制 CSS variables 与静态背景素材；**不得**写入 GameState 的随机分支条件，也不得调用 RNG。UI 各页面结构相同。
- `NarrativeFeedItem = { id, kind: 'world_news' | 'life_note' | 'major_event', year, regionId, sourceHint?, reliabilityHint?, textKey, visibleToPlayer }`：引擎生成消息，UI 按类型呈现。`visibleToPlayer` 来自已知信息规则，不能暴露 canonical timeline 原文。
- 命名采用 `birthSurname` + `givenName`；`confirmBirthName()` 仅出生阶段调用一次，确认后 immutable；称谓单独存储。
- 可选 `knowledgeFlags: Record<string, boolean>` 仅供少数事件守卫条件使用，MVP 不依赖。
- 静态事件资料在编译/打包时进入游戏资源；基础模式不调用 LLM。参考 `11_REGIONAL_THEMES_AND_NO_AI_NARRATIVE.md`。
