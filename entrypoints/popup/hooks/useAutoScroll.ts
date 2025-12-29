import { useRef, useEffect } from "react";
import { useMemoizedFn, useThrottleFn, useUnmount } from "ahooks";

/**
 * 自动滚动到底部的 Hook 配置项
 */
export interface UseAutoScrollOptions {
  /** 触发自动滚动的依赖数组变化时回调 */
  deps: React.DependencyList;
  /** 距离底部多少像素内视为"在底部"，默认 10px */
  bottomThreshold?: number;
  /** 节流延迟时间（毫秒），默认 16ms (≈60fps) */
  throttleDelay?: number;
  /** 延迟重置自动滚动的时间（毫秒），默认 1000ms */
  resetDelay?: number;
  /** 新内容到达时是否立即重置滚动状态，默认 true */
  resetOnNewContent?: boolean;
  /** 是否启用自动滚动，默认 true */
  enabled?: boolean;
}

/**
 * 自动滚动到底部的 Hook 返回值
 */
export interface UseAutoScrollReturn {
  /** 滚动容器引用 */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 节流后的滚动事件处理器 */
  handleScroll: () => void;
  /** 手动滚动到底部的方法 */
  scrollToBottom: () => void;
  /** 是否用户已手动滚动离开底部 */
  userHasScrolled: React.MutableRefObject<boolean>;
}

/**
 * 通用的自动滚动到底部 Hook
 *
 * @param options 配置选项
 * @returns 滚动相关的方法和引用
 *
 * @example
 * ```tsx
 * const { containerRef, handleScroll, scrollToBottom } = useAutoScroll({
 *   deps: [messageList],
 *   resetOnNewContent: true,
 * });
 *
 * <div ref={containerRef} onScroll={handleScroll}>
 *   {messageList.map(msg => <Message key={msg.id} {...msg} />)}
 * </div>
 * ```
 */
export function useAutoScroll(
  options: UseAutoScrollOptions
): UseAutoScrollReturn {
  const {
    deps,
    bottomThreshold = 10,
    throttleDelay = 16,
    resetDelay = 1000,
    resetOnNewContent = true,
    enabled = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 检查滚动容器是否在底部
   */
  const isAtBottom = useMemoizedFn((): boolean => {
    if (!containerRef.current) return false;
    const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
    return Math.abs(scrollHeight - scrollTop - clientHeight) < bottomThreshold;
  });

  /**
   * 手动滚动到底部（使用 RAF 优化性能）
   */
  const scrollToBottom = useMemoizedFn(() => {
    if (!enabled || !containerRef.current) return;

    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  });

  /**
   * 处理滚动事件（原始逻辑）
   */
  const handleScrollRaw = useMemoizedFn(() => {
    if (!containerRef.current) return;

    const atBottom = isAtBottom();
    const wasAtBottom = !userHasScrolledRef.current;

    // 更新用户滚动状态
    userHasScrolledRef.current = !atBottom;

    // 如果用户滚动离开底部，设置延迟重置定时器
    if (!atBottom && wasAtBottom) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (containerRef.current && isAtBottom()) {
          userHasScrolledRef.current = false;
        }
      }, resetDelay);
    }
  });

  /**
   * 使用 ahooks useThrottleFn 节流处理滚动事件
   */
  const { run: handleScroll } = useThrottleFn(handleScrollRaw, {
    wait: throttleDelay,
  });

  /**
   * 当依赖项变化时自动滚动到底部
   */
  useEffect(() => {
    if (!enabled) return;

    // 只有当用户未手动滚动时才自动滚动
    if (!userHasScrolledRef.current) {
      scrollToBottom();
    } else if (resetOnNewContent) {
      // 新内容到达时，如果用户之前滚动了，重置状态以便下次自动滚动
      userHasScrolledRef.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
  }, [deps, enabled, scrollToBottom, resetOnNewContent]);

  /**
   * 组件卸载时清理定时器
   */
  useUnmount(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  });

  return {
    containerRef,
    handleScroll,
    scrollToBottom,
    userHasScrolled: userHasScrolledRef,
  };
}

/**
 * 简化版：仅用于依赖变化时自动滚动
 *
 * @example
 * ```tsx
 * const { containerRef, handleScroll } = useSimpleAutoScroll([messages]);
 * ```
 */
export function useSimpleAutoScroll(
  deps: React.DependencyList,
  enabled = true
) {
  return useAutoScroll({ deps, enabled });
}
