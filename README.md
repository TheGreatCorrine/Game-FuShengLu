# 浮生录 · 西汉试玩版

解压后用现代浏览器打开 **PLAY.html** 即可离线游玩。取名后可逐年推进，也可快进到下一次抉择。人物志收录亲属近况，终章揭示当年影响本户的史实。刷新或另起一生会清除本局。

开发环境建议 Node.js 22、npm。进入本目录后执行：

```sh
npm ci
npm run dev
```

打开终端给出的本地地址。开发页底部可输入种子或检查隐藏状态。测试和打包：

```sh
npm test
npm run build
```

构建会生成 dist/ 和独立的 PLAY.html。二者均不含开发调试面板。首次安装依赖需要联网。参见 docs/ 中的实施计划、架构、参数与测试报告。原 GDD 位于 fushenglu_gdd/。

## Phase 1.5

本版使用一套可调规则。默认优先让玩家经历成长与选择。src/engine/mortality.ts 中 defaultMortality 可调整婴幼年、少年、成人、衰老以及急症风险；也可逐局调用 generate('试验', {infant: 0.002, childhood: 0.0005})。年龄 1 的结算代表出生到一周岁。人物健康、体质、急症和当年死亡概率分别存储。没有模式选择器。

Node 22.18+ 或 24 可直接执行 node scripts/cohort.mjs 和 node scripts/pair.mjs。结果与限制见 docs/PHASE_1_5_TEST_REPORT.md。原 Phase 1 文档保留作版本对照，以此报告和代码为当前规则。

## Phase 1.6 · 家庭连续性

打开 PLAY.html 即可离线试玩。家中人物列出同户及另户亲属；留意婚后家书和家人商量用度的抉择。开发版可在调试面板输入 family15，始终选择第一项，复现原家负债与家书。执行 node scripts/families.mjs 和 node scripts/memory-pair.mjs 可重放验收场景。当前机制、限制及测试见 docs/PHASE_1_6_*.md。

## Phase 1.6.1 · 家计与继承

解压后打开 PLAY.html。状态栏分别列出私钱、家户现金、家户欠债和本人契债。债主上门时先看借主是谁。父母死亡后，年谱会记下私产清偿及分配。开发调试可输入 debt2 并始终选第一项，重现分户索款。执行 node scripts/debt-runs.mjs 重放本期 512 局及两组受控对照。法律规则、证据边界和结算细节见 docs/DEBT_INHERITANCE_HISTORICAL_RULES.md。本期报告优先于早期版本文档。

最新家计简化修订与可重放示例见 docs/HOUSEHOLD_SIMPLIFICATION.md。仍可直接打开 PLAY.html 离线游玩。

## Phase 2A · 家人的打算

打开 PLAY.html 游玩。开发模式下输入 character29，第一次议亲先选「先同对方商量婚后用度」，其他抉择选当时可用的首项。到30岁可看到配偶周成提出改做织活。node scripts/character-runs.mjs 重放四组验收场景和256局诊断；见 docs/character-runs.json、docs/EVENT_DESIGN_GUIDELINES.md。
