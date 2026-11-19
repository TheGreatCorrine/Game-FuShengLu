# Phase 2A.2 · Stage 0 架构审查

基线为 main 的 1089c1645b8cc96169eec2425fdaf6da5a2d45d8。此分支仅含设计、诊断脚本与测试基准。按顺序审阅：

1. [现状与依赖图](01_CURRENT_STATE_AUDIT.md)
2. [实跑基线、分母与复现命令](02_BASELINE_BEHAVIOR.md)
3. [目标架构与领域边界](03_TARGET_ARCHITECTURE.md)
4. [字段所有权与引用映射](04_STATE_OWNERSHIP.md)
5. [迁移顺序、风险与验收](05_MIGRATION_PLAN.md)

请先决定三个问题：是否以人物在户记录为唯一成员来源；是否为旧随机键与旧继承排序保留兼容键；是否接受无法从旧快照恢复的婚期保持未知。均建议接受。批准 Stage 1 只开启家户迁移，人物图仍需独立审查。
