export const BOTTOM_THRESHOLD_PX = 40;

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
