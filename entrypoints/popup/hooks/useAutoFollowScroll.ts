import { RefObject, useCallback, useRef } from "react";
import { useEventListener, useUpdateEffect } from "ahooks";

interface UseAutoFollowScrollOptions {
  containerRef: RefObject<HTMLElement | null>;
  watchValues: unknown[];
  enabled?: boolean;
  bottomOffset?: number;
}

export const useAutoFollowScroll = ({
  containerRef,
  watchValues,
  enabled = true,
  bottomOffset = 1,
}: UseAutoFollowScrollOptions) => {
  const shouldFollowRef = useRef(true);

  const updateFollowState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + bottomOffset;
    shouldFollowRef.current = isAtBottom;
  }, [bottomOffset, containerRef]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [containerRef]);

  const resetFollow = useCallback(
    (shouldScroll = true) => {
      shouldFollowRef.current = true;
      if (shouldScroll && enabled) {
        scrollToBottom();
      }
    },
    [enabled, scrollToBottom]
  );

  useEventListener("scroll", updateFollowState, { target: containerRef });

  useUpdateEffect(() => {
    if (!enabled || !shouldFollowRef.current) return;
    scrollToBottom();
  }, watchValues);

  return {
    resetFollow,
    scrollToBottom,
  };
};
