# 06 — 历史资料、概率与质量验证

## 1. 史料优先级

1. 同时代史料/考古证据（注意史料本身的立场和记录目的）。
2. 可靠史学研究、学术专著、同行评审论文。
3. 博物馆、大学、文化机构的审校资料。
4. 网络概述只用于寻找线索，不作为高争议历史参数的唯一依据。

**每条记录必须有**：sourceId、完整引用/URL、适用时期和地域、主张内容、可信度、最后审校日期、研究备注。

## 2. 三类内容不能混淆

- `documented`：可靠史料支持的事实，例如某年发生大事件、制度大体规则。
- `inferred`：基于研究的合理推断，例如战争导致一条商路安全下降。
- `gameplay`：玩法权重、具体 NPC 性格、单户结局以及用于平衡的概率。

**严格禁止**将 `gameplay` 的 15% 触发率包装成“古代确有 15% 人会这样”。

## 3. 时代与地理校验

- 每个规则/事件必须绑定年代和地区；处理古今地名转换时记录出处和不确定性。
- 明确历史纪年换算、没有公元零年、人物跨时代时制度变迁。
- 不同朝代同词异义的官职/考试/户籍不可直接共享一个全局 enum。
- 同一时期不同群体的性别与社会机会需交叉建模，记录例外与争议。

## 4. 疫病校验特别规范

古代中国疫病记录高度依赖传世文献、地理覆盖与当时称谓；既不能照搬现代病毒分类，也不能将未记载地区自动等同无疫情。对“某年某地流行什么病”应标注诊断不确定性。地区暴露与个人感染必须分开模拟。

参考：2009 年 *Epidemiology & Infection* 关于公元前 243 年至 1911 年疫病目录的研究；2026 年的 Chinese Historical Epidemic Dataset 提供以县级空间精度整理的年度疫病记录，但也需要研究其覆盖和偏差（参见参考资料）。

## 5. 标准研究记录模板

```yaml
id: hist.western_han.chaju
claim: '汉代的察举等举荐制度构成选官途径之一'
period: { from: -141, to: -87 }
regions: [western_han_core]
evidenceLevel: documented
sources: [src.chiculture.chaju, src.ntu.han-official-selection]
confidence: high
implementationNotes:
  - '不要使用明清童生/乡试/会试链'
  - '按身份、地方官府关系与时代约束资格'
reviewedAt: '2026-11-18'
```

`from` 年份为示意性内部年份编码；正式代码需要统一 BCE 换算，不应把简化窗口当成朝代所有时期的真实制度边界。

## 6. 史实与模拟分离审校

**历史专家/研究检查**：事实、年月、地名、制度限制、史料争议。

**游戏设计检查**：角色可达机会、自由度、重大事件影响范围、不同出身差异、信息视角。

**工程检查**：schema、概率合法性、数据关联与不变量、回归。

## 7. 批量模拟评测

每个主要测试场景建议至少跑数千局做统计趋势检查（不是声称符合真实人口比例）：

- 相同历史年份、不同地区/身份 → 历史冲击差异能否观察到？
- 偏远未受影响者 → 是否仍被硬弹历史新闻或强制灾难？
- 15 岁路线分歧 → 40 岁职业、家庭或资源分布是否有可解释的差异？
- 不同生理/社会性别与身份规则 → 机会差异是否符合当时制度及例外机制？
- 稀有事件是否真的稀有？常见人生是否仍然可读、可玩？
- `historical_truth` 是否被错误展示给无渠道获知的角色？
- 家人去世、迁徙、财产传承、疾病恢复是否自洽？

## 8. 关键参考资料（研发资料，不代表全部内容已考证）

1. Cambridge University Press, *The Economic History of China*, “Economic transformation in the Tang–Song transition (755 to 1127)”：https://www.cambridge.org/core/books/abs/economic-history-of-china/economic-transformation-in-the-tangsong-transition-755-to-1127/55D49F02EE80100AC5A4D9FA3CC04FA1
2. Oxford Academic, “An Lushan Rebellion (755–763)”：https://academic.oup.com/reference/62399/reference-article-abstract/573026203
3. Academy of Chinese Studies, “Chinese Recommendatory System”：https://chiculture.org.hk/index.php/en/china-five-thousand-years/2380
4. National Taiwan University Press, *The Official Selection and Promotion System during Western Han Dynasty*：https://press.ntu.edu.tw/en/publish/show.php?act=book&refer=ntup_book01380
5. *Epidemiology & Infection* (2009), “Epidemic and population patterns in the Chinese Empire (243 b.c.e. to 1911 c.e.)”：https://www.cambridge.org/core/journals/epidemiology-and-infection/article/epidemic-and-population-patterns-in-the-chinese-empire-243-bce-to-1911-ce-quantitative-analysis-of-a-unique-but-neglected-epidemic-catalogue/0625FFA65353AA61935822AD538F6450
6. *Scientific Data* (2026), “Chinese Historical Epidemic Dataset”：https://www.nature.com/articles/s41597-026-08290-0

以上参考仅支持特定的研究方向和历史事实；具体剧情、数字、制度需逐条回到对应文献核实。若来源有访问/版权限制，保存引用与摘要，不转载全文。
