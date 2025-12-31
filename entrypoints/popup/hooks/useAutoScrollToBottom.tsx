import { useLatest, useMemoizedFn, useThrottleFn, useUnmount } from "ahooks";
import { useEffect, useRef } from "react";

export type UseAutoScrollToBottomOptions = {
  enabled?: boolean;
  watch: readonly unknown[];
  bottomThresholdPx?: number;
  throttleMs?: number;
  resetDelayMs?: number;
  resetWhen?: boolean;
};

export function useAutoScrollToBottom<T extends HTMLElement>(
  options: UseAutoScrollToBottomOptions
) {
  const {
    enabled = true,
    watch,
    bottomThresholdPx = 10,
    throttleMs = 16,
    resetDelayMs = 1000,
    resetWhen = false,
  } = options;

  const containerRef = useRef<T | null>(null);
  const userHasScrolledRef = useRef<boolean>(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 使用 useLatest 保存最新的配置值，避免闭包陷阱
  const latestBottomThreshold = useLatest(bottomThresholdPx);
  const latestResetDelay = useLatest(resetDelayMs);

  // 使用 useMemoizedFn 替代 useCallback，持久化函数引用
  const clearResetTimer = useMemoizedFn(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  });

  const isAtBottom = useMemoizedFn((el: T) => {
    const distance = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight);
    return distance < latestBottomThreshold.current;
  });

  const scrollToBottom = useMemoizedFn(() => {
    const el = containerRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      const node = containerRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight;
    });
  });

  const handleScrollRaw = useMemoizedFn(() => {
    const el = containerRef.current;
    if (!el) return;

    const atBottom = isAtBottom(el);
    if (atBottom) {
      userHasScrolledRef.current = false;
      clearResetTimer();
      return;
    }

    userHasScrolledRef.current = true;

    clearResetTimer();
    resetTimerRef.current = setTimeout(() => {
      const node = containerRef.current;
      if (!node) return;
      if (isAtBottom(node)) {
        userHasScrolledRef.current = false;
      }
    }, latestResetDelay.current);
  });

  // 使用 useThrottleFn 替代手动 throttle，自动处理清理
  const { run: throttledHandleScroll } = useThrottleFn(handleScrollRaw, {
    wait: throttleMs,
  });

  const onScroll = useMemoizedFn<React.UIEventHandler<T>>(() => {
    throttledHandleScroll();
  });

  useEffect(() => {
    if (!enabled) return;
    if (userHasScrolledRef.current) return;
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scrollToBottom, ...watch]);

  useEffect(() => {
    if (!resetWhen) return;
    userHasScrolledRef.current = false;
    clearResetTimer();
  }, [resetWhen, clearResetTimer]);

  // 使用 useUnmount 简化清理逻辑
  useUnmount(() => {
    clearResetTimer();
  });

  return {
    containerRef,
    onScroll,
    scrollToBottom,
    userHasScrolledRef,
  };
}
