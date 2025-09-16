# 修复双 Logger 和路径别名问题

## 背景

项目中存在两份 Logger 实现和路径别名配置不一致的问题，影响构建和开发体验。

## 计划

1. 统一使用 entrypoints/shared/logger.ts
2. 修正 tsconfig.json 和 wxt.config.ts 中的路径别名
3. 删除旧的 shared/utils/logger.ts
4. 统一所有 import 为@/logger 别名
5. 验证构建和功能

## 执行状态

- [x] 创建任务记录
- [ ] 分析 Logger 功能差异
- [ ] 修正路径配置
- [ ] 迁移代码
- [ ] 验证功能
