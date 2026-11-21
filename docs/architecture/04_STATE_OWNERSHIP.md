# 旧字段 → 新所有者

P 表示 people[playerId]，H 表示主角当前户。ID 映射分人物和家户两个独立命名空间，同名 sibling 不可互查。下列为转换契约。

|现有 State 字段|唯一目标 / 转换|
|---|---|
|seed, mortality|meta.seed 与原样保留的死亡配置；显式固定规则与内容版本|
|birth, age, year|P.birthYear、clock.year；存活年龄派生，死亡人物用终止年龄冻结。验证旧年龄；不得从当前年强行重算死者年龄|
|name, surname, sex, home|P.identity 与 birthOrigin；原四编号稳定映射自耕、佃作、行商、吏员，保留旧抽样顺序|
|health, acute, vulnerability, risk, dead|P.health 与存活状态、最近风险快照|
|talent, skill, practice, training, work|P 能力、训练和现职；不新抽禀赋|
|residence, cash, assets, debt|P.currentHouseholdId；这三项只入该户一次|
|income, expenses|H 最近结算的展示值；其他旧户无快照记未知|
|estates, heads, closedHouses|其他户账、掌家记录、关闭年份；人和户的键各自转换；无余额关闭户仍保留 ID|
|purse, loans, settlements|P 私钱、finance.contracts、finance.estateSettlements；逐笔映射如下|
|npcs, candidate|people 表与稳定处理顺序；候选人单独注册并由婚议引用，未入经济户|
|spouse, marriage, unions|当前婚姻边、既往状态证据及旧序号。状态可知而日期未知则单独保留历史摘要；不反推年份|
|wedding.state / attempts / next, lastBirth|progression.courtship 与上次生育年份，保留冷却单位为主角年龄|
|promise.id / due, careYear, nextCollection, queue.age / cause|具名承诺对象、履约年、照护影响年、催收年龄、学习到期年龄及来源；年龄与历年分别标记|
|seen, pending|progression 事件履历、待选事件及其当前有效参与者；ID 保持不变|
|region, env|world 地区、价格/商路/收成/疾病环境|
|news, chronicle, ledger, exposure|保留逐项顺序与可见时点；消息是观察，年谱是展示，ledger 是决策/后果。exposure 的事件、load、cost 和 heard 分开保存|

|旧 Kin 字段|目标|
|---|---|
|id, born, age, alive, name, sex, tier, background|稳定人物键及旧兼容键、出生年、死亡截止或冻结年龄、身份与模拟层级、出身|
|role, parents, partner|展示称谓、亲子结构边、婚姻边。role 仅作来源证据；不把“父母同住”直接认定为有效婚姻|
|house|唯一 currentHouseholdId；亡者保留最后住户供结算，活人名册派生；候选人例外见上|
|money, work, position, health, acute|私钱、职业、头衔、健康。出生参照和当前头衔分开|
|goal, ambition, generosity|本人目标与性格|
|trust, closeness, conflict, history|NPC→主角单向关系及有序记忆；对侧未知。Memory.id 是事件类型，actors 才是人物引用；保留 year、trust、significance|
|memories|人物经历/已习得事实，保留原文和顺序；已被代码读取的串须逐个映射为等价标志|

**财务契约。** Loan.id 是契约键，debtor 是人物键，local-lender 是外部债权人；original、balance、year、due、writtenOff 原样保留。Settlement.owner 和 shares[].id 指人物，rule 是规则版本，assets、liabilities、paid、writtenOff、gross、charge、net 都是结算当时的凭据，不能再次入账。Entry.actors 映射人物；decision、cause、fact、changes、age、year、text 保持既有意义和缺省。chronicle/ledger 共有条目在投影中可关联，不按文本相等去重。
