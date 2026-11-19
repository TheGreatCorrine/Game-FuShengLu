# 能力和身体审计
下表中出生指 engine.generate，亲属生成指 family.kin。玩家只能在开发详情看到原始数值。保留机会、学习结果、身体和人际关系的独立作用。

|字段及初始化|变化与实际读取者|结果与可见性|重合与决策|
|---|---|---|---|
|talent，出生按种子|稳定；support、mature、decide(career)|求学获准、结业或接账概率；只见结果|与skill共同起作用，保留，不加IQ|
|skill，出生0|learn、halfDays、结业累积；career、livelihood、婚议、developFamily读取|可接账、晋升、教孩子；年谱可见入学及职业|识字熟练度，区别于机会|
|training，出生空；queue空|十五岁决定、争执、十八岁结业；eligible、household、advance读取|资格、学习用度、实作及后续事件|保留培训阶段；半日与全日成本需要复核|
|practice，出生0|健康非全日学习的成年年份及试做增长；livelihood读取|管田、织作、经营机会；过门槛后数值差异弱|保留门槛，拟按实际劳动/学习积累|
|health，主角80–99、亲属65–94|annualHealth逐年恢复或下降；household、mature、livelihood、developFamily、authority读取；护理可改善|停工、学业中断、生育、掌家与职业；界面有文字|保留连续状态；旅行暂无独立判定|
|acute，初始空|年度病/伤抽取、翌年重算；经济、练习、生育、照护读取|当年减产加医费，护理会消耗下一年工时|与长期健康不同；未单独记录复发或伤残|
|vulnerability，出生抽取；亲属由ID固定|annualHealth放大基础危险，不随年刷新|死亡概率变化；玩家不能直接感知|仅校准诊断，保留|
|risk，初始0；mortality，出生读配置|annualHealth计算当年risk并抽死亡；risk存值供调试，mortality控制年龄曲线和上限|任意年龄可死亡，低健康不直接判死|不追加玩家指标；不调整幼年风险|
|goal、ambition、generosity，亲属生成|goal可因授业/储蓄完成而变；helpChance、support、participant、developFamily读取|能拒绝、独自换业、教授孩子；对白和纪事可见|目标与性格应分开；主角无独立人格分|
|trust、closeness、conflict，亲属生成|remember和互动更新；协商、参与者排序、学习支持读取|相同请求可得到不同答复；多为间接反馈|先用回访体现差异，暂不加好感条|
|history、memories，初始空|前者存具名行为及关系变动；后者存所学及人生节点；婚议、亲属职业、人物页读取|与谁约定、是否受教影响以后|两套记忆部分重叠；新增内容优先引用同一条因果记录|
|home、region、sex、legal、position|出生按地区抽背景；法律身份全员同一；亲属官职随退休或转业清空|读书资源、初业和借约；头衔可见|身份不等于能力；homes.income不是年度生产公式|

建议受控回放同一资质只变家人支持，再固定家庭只变学习经历。病后允许补课，重活与轻活分开；长期影响先用已有健康和带因果的纪事表示。连续病年和低健康年是诊断代理，不能直接称为伤残。
