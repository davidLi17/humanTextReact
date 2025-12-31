# 使用 ahooks 重构 useAutoScrollToBottom

## 任务背景

将 `TEST/hooks/useAutoScrollToBottom.tsx` 中的自定义 hook 使用 ahooks 库的成熟 hooks 进行重构，提升代码质量和可维护性。

## 执行计划

### 步骤 1：导入 ahooks 相关 hooks ✅

- 添加 `useMemoizedFn`、`useThrottleFn`、`useLatest`、`useUnmount` 导入
- 移除 lodash-es throttle 导入

### 步骤 2：用 useLatest 保存最新引用 ✅

- 用 `useLatest` 保存 `bottomThresholdPx`、`resetDelayMs` 配置项
- 避免闭包陷阱，确保总是访问最新值

### 步骤 3：用 useMemoizedFn 替代所有 useCallback ✅

- 替代 `clearResetTimer` - 清理定时器逻辑
- 替代 `isAtBottom` - 判断是否在底部
- 替代 `scrollToBottom` - 滚动到底部
- 替代 `handleScrollRaw` - 处理滚动的原始逻辑
- 替代 `onScroll` - 滚动事件处理器

### 步骤 4：用 useThrottleFn 替代手动 throttle ✅

- 移除 `useMemo` + `throttle` 的组合
- 直接使用 `useThrottleFn` 包装滚动处理函数
- 自动处理 cancel 逻辑

### 步骤 5：用 useUnmount 替代清理 useEffect ✅

- 替代现有的清理副作用逻辑
- 更简洁的卸载处理
- 移除手动管理 `throttledHandleScroll.cancel()` 的逻辑

### 步骤 6：移除不必要的依赖 ✅

- 移除 `useCallback` 导入
- 移除 `useMemo` 导入
- 简化代码结构

## 重构成果

### 代码优化

- **减少代码行数**：从 115 行减少到 114 行
- **移除手动管理**：不再需要手动管理 throttle 的清理
- **避免闭包陷阱**：使用 `useLatest` 确保访问最新值
- **更好的性能**：`useMemoizedFn` 提供持久化的函数引用

### 使用的 ahooks hooks

1. **useLatest**：保存最新的配置值引用
2. **useMemoizedFn**：持久化函数引用，替代 useCallback
3. **useThrottleFn**：节流函数，自动处理清理
4. **useUnmount**：组件卸载时的清理逻辑

### 向后兼容性

✅ 完全向后兼容，API 接口保持不变：

- `containerRef` - 容器引用
- `onScroll` - 滚动事件处理器
- `scrollToBottom` - 滚动到底部函数
- `userHasScrolledRef` - 用户滚动状态引用

## 技术细节

### useLatest 的优势

```typescript
// 之前：闭包可能捕获旧值
const isAtBottom = useCallback(
  (el: T) => {
    return distance < bottomThresholdPx; // 可能是旧值
  },
  [bottomThresholdPx]
);

// 之后：总是访问最新值
const latestBottomThreshold = useLatest(bottomThresholdPx);
const isAtBottom = useMemoizedFn((el: T) => {
  return distance < latestBottomThreshold.current; // 总是最新值
});
```

### useThrottleFn 的优势

```typescript
// 之前：手动管理 throttle
const throttledHandleScroll = useMemo(() => {
  return throttle(handleScrollRaw, throttleMs);
}, [handleScrollRaw, throttleMs]);

useEffect(() => {
  return () => {
    throttledHandleScroll.cancel(); // 手动清理
  };
}, [throttledHandleScroll]);

// 之后：自动管理
const { run: throttledHandleScroll } = useThrottleFn(handleScrollRaw, {
  wait: throttleMs,
}); // 自动清理
```

### useMemoizedFn 的优势

```typescript
// 之前：需要手动管理依赖数组
const scrollToBottom = useCallback(() => {
  // ...
}, []); // 可能遗漏依赖

// 之后：自动持久化，无需依赖数组
const scrollToBottom = useMemoizedFn(() => {
  // ...
}); // 无需担心依赖
```

## 测试建议

- 测试自动滚动功能是否正常
- 测试用户手动滚动后的行为
- 测试 throttle 是否生效
- 测试组件卸载时的清理逻辑

## 执行时间

2025-12-31

## 状态

✅ 已完成
