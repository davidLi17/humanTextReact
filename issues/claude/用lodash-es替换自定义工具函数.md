# 用 lodash-es 替换自定义工具函数

## 任务背景

用户已安装 lodash-es，需要替换项目中自定义的工具函数（debounce、throttle），使用成熟的工具库提升代码质量。

## 执行计划

1. 更新 helpers.ts 工具函数
2. 更新 TranslationArea.tsx 中的内联 throttle
3. 检查其他文件中的引用
4. 测试验证

## 涉及文件

- `entrypoints/popup/utils/helpers.ts`
- `entrypoints/popup/components/TranslationArea.tsx`

## 保留的自定义函数

- formatDateTime（特定格式需求）
- copyToClipboard（浏览器 API 特定）
- sendChromeMessage（Chrome 扩展特定）
- markdown 相关函数（用户要求保留）
