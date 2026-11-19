# 02 — 历史主轴、制度与地理（Historical Ruleset / Timeline）

## 1. 概念分层

- **Historical Ruleset**：一段时间/地区内可适用的制度约束，例如官员选拔、户籍/身份、婚姻、家庭财产与教育。规则有生效和失效年份，且可能仅在部分辖区适用。
- **Canonical Historical Timeline**：默认历史史实节点，按时间、持续时长、地理范围及史料可信度建档；**历史事实不因普通玩家选择而改变**。
- **Historical Geography**：历史行政地名、地理区块、交通网络与其有效时期；不能直接把现代省界映射为古代郡县。
- **Regional World State**：地区逐期的产出、供给、粮价指数、迁徙压力、战事风险、传染病暴露风险等。
- **Character Knowledge**：玩家听说/看到/推断出的事件，不等于史实本身。

## 2. 朝代推进顺序

1. **首发：西汉一段经过研究的窗口**（建议汉武帝在位时期：公元前 141–前 87；具体出生窗口需保证能覆盖完整人生或允许人物跨时期生活）。
2. 后续优先东汉、三国及两晋南北朝、隋唐、两宋、元、明；清朝排后。需要按阶段单独制定计划，不承诺全部覆盖。
3. 不以一个朝代标签替代完整制度：例如西汉人才举荐制度与明清制度化科举是不同机制。察举等选官方式在汉武帝时期得到发展；必须按生效年代实施。
4. 女性角色与男性角色使用同一基础生命系统，但教育、继承、婚姻、行动空间、政治影响路径由**性别 × 家庭 × 地区 × 年代 × 身份**共同决定，不能写成永恒不变的二元职业表。

## 3. 历史事件三类

| 类型 | 机制 | 例子 |
| --- | --- | --- |
| 点状事件 | 特定时点发生，可触发后续链条 | 政令、皇位更替、战事爆发 |
| 持续冲击 | 按月份/季节/年度更新各地区 | 战争、饥荒、持续疫病、迁移潮 |
| 结构转变 | 规则在时间区间中变化 | 选官、土地、税役与身份制度变迁 |

**必须区分** `event happened`、`world impacted`、`player experienced`、`player learned` 四种状态：事件发生 ≠ 必然导致某地区损失 ≠ 主角一定遭受损失 ≠ 主角一定理解原因。

## 4. 地区影响模型

```text
Historical Event
  -> region exposure (distance + routes + politics + geography)
  -> local mechanism (war / trade / tax / migration / harvest / disease)
  -> local indicators (prices, safety, demand, population pressure ...)
  -> household exposure (profession, resources, assets, contacts)
  -> personal outcome (health, wealth, choices, family)
  -> subjective observation (knowledge, rumor, direct witness)
```

- 遥远地区可以**几乎没有直接损失**；但可能通过商贸、迁徙、财政或信息传播出现延迟的间接影响。绝不假设所有地区必定受灾。
- 交通距离不是唯一参数：河流/驿道/山脉、贸易关系、行政隶属、战线、战争持续时间、人物实际迁移都重要。
- 粮价指数必须是**地点+时间**函数，且受供需/运输变化影响；没有可靠原始史料时，标记为游戏模拟指数，不宣称是实际历史价格。
- 疾病要区分环境暴露、接触机会、感染、严重程度、死亡，并避免以现代疾病诊断倒推全部古代记载。

## 5. 安史之乱示例（仅作为未来唐朝内容设计，不属于西汉 MVP）

史实主轴：公元 755–763 年安史之乱及其长期影响。史学研究确认其对北方腹地、人口流动和唐宋社会经济变迁具有重要影响，但具体到个人和偏远地区不可机械套同一损失。参考 Cambridge *Economic History of China* 相关章节与 Oxford 研究条目（见 06 文档）。

| 角色所在位置/身份 | 可见的生活表现 | 信息程度 | 可能后果 |
| --- | --- | --- | --- |
| 近战区农户 | 军队、征发、逃亡、生产中断 | 直接看到局势危险，不一定清楚政治起因 | 农业收入骤降、迁居、亲属分离 |
| 交通枢纽商户 | 货运迟延、价格震荡、交易对手失联 | 商贸网络传闻 | 停业或改道、转业 |
| 京畿官员家庭 | 政局消息、出逃或效忠抉择 | 较高但仍可能不完整 | 政治风险、官职/资产波动 |
| 较远乡村居民 | 可能长期没有异常，也可能后期见到迁入者 | 低或滞后 | 低直接冲击、间接人口/价格变化 |

这只是可能的机制，不是“每个同类家庭都必定发生”。

## 6. 史实不被免费模式改写

- 正史节点具有 `canonical=true`，触发时按世界时钟生效。
- 玩家可以改变**自身命运、家庭命运、局部结果**，但不得使固定大事件凭空消失。
- 若历史人物出现在可遇见范围，其存活时间和已证实的重大公共事迹受时间线约束；未知私人细节不得伪装史实。
- 未来付费架空分支在分支点克隆时间线；此后冲突的史实需要按依赖图禁用、修改或重评估，不允许“皇帝已去世还发布圣旨”。

## 7. 建议数据结构

```ts
interface HistoricalEvent {
  id: string;
  labelInternal: string;        // 开发者可见，玩家未必可见
  fromYear: number;             // BCE 使用负整数，仅内部时间轴约定
  toYear?: number;
  regionIds: string[];
  kind: 'point' | 'ongoing' | 'structural';
  canonical: true;
  effects: RegionalImpactRule[];
  knowledge: KnowledgeExposureRule[];
  evidence: EvidenceRecord[];
}

interface HistoricalRule {
  id: string;
  activeFrom: number;
  activeTo: number;
  regionScope: string[];
  eligibility: Condition[];
  consequences: Effect[];
  evidence: EvidenceRecord[];
}
```

**时间注意**：历史公元纪年没有公元 0 年；内部需要一套一致的 astronomical year 编码与 BCE/CE 显示转换规则，并为跨年/闰月等历史历法保留适配层。

## 8. 知识传播

```text
state: UNKNOWN -> RUMOR -> INFERRED -> CONFIRMED_BY_CHARACTER
source: family | market | official_notice | letter | personal_experience
reliability: low | medium | high (角色视角，不等于真值)
arrivalDelay: 按距离、交流网络、社会身份抽样
```

玩家选择可以影响自己获得信息的机会（买消息、写信、迁徙、社交），但严禁角色“自动知道未来历史”；终局揭示用全知史实视角，与当年认知并列展示。
