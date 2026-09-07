// 阈值设为 15px：只要用户离开最底部，立刻解除自动跟随锁定并浮现 GPT 胶囊
export const BOTTOM_THRESHOLD_PX = 15;

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ScrollFollowState {
  isAtBottom: boolean;
  userHasScrolledUp: boolean;
}

export function isNearBottom(metrics: ScrollMetrics): boolean {
  return (
    metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <=
    BOTTOM_THRESHOLD_PX
  );
}

export function getScrollFollowState(
  metrics: ScrollMetrics,
  isProgrammaticScroll: boolean
): ScrollFollowState {
  const isAtBottom = isNearBottom(metrics);
  return {
    isAtBottom,
    userHasScrolledUp: isProgrammaticScroll ? false : !isAtBottom,
  };
}

export function getResetScrollFollowState(): ScrollFollowState {
  return { isAtBottom: true, userHasScrolledUp: false };
}
