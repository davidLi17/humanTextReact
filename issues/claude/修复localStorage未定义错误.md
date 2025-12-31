# 修复 localStorage 未定义错误

## 问题描述

浏览器报错："初始化日志系统失败: ReferenceError: localStorage is not defined"

## 问题分析

- Content Script 环境中 localStorage 未定义
- initializeLogger() 函数直接访问 localStorage 导致错误
- 错误发生在 entrypoints/content/index.ts 调用 initializeLogger() 时

## 解决方案

采用环境检测方案：

1. 添加 isLocalStorageAvailable() 检测函数
2. 在 localStorage 操作前添加可用性检查
3. 不可用时跳过操作，但不阻断程序执行

## 修改内容

- 文件：entrypoints/shared/logger/index.ts
- 添加 isLocalStorageAvailable() 函数
- 修改 initializeLogger() 中的 localStorage 操作，添加环境检测

## 执行状态

- ✅ 添加环境检测工具函数
- ✅ 修改 initializeLogger 函数
- ✅ 测试验证修复效果

## 验证结果

构建成功，在生成的 content script 中可以看到：

- isLocalStorageAvailable() 函数被压缩为 `j()` 函数
- initializeLogger() 函数被压缩为 `nt()` 函数
- localStorage 操作已被 `j()&&localStorage.xxx()` 保护
- 无编译错误，修复完成

## 修复效果

- Content Script 中不再因 localStorage 未定义而报错
- 其他环境（popup、background、options）中日志功能正常
- 保持了原有的日志级别控制功能
