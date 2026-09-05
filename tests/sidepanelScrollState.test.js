import { describe, expect, test } from "bun:test";
import {
  getResetScrollFollowState,
  getScrollFollowState,
  isNearBottom,
} from "../entrypoints/sidepanel/scrollState.ts";

describe("sidepanel scroll follow state", () => {
  test("treats exactly 40 pixels from the end as bottom", () => {
    expect(
      isNearBottom({ scrollTop: 560, scrollHeight: 1000, clientHeight: 400 })
    ).toBe(true);
    expect(
      isNearBottom({ scrollTop: 559, scrollHeight: 1000, clientHeight: 400 })
    ).toBe(false);
  });

  test("resets a newly selected session to follow its latest message", () => {
    expect(getResetScrollFollowState()).toEqual({
      isAtBottom: true,
      userHasScrolledUp: false,
    });
  });

  test("keeps following during an intermediate programmatic scroll frame", () => {
    expect(
      getScrollFollowState(
        { scrollTop: 100, scrollHeight: 1000, clientHeight: 400 },
        true
      )
    ).toEqual({ isAtBottom: false, userHasScrolledUp: false });
  });

  test("pauses following after a real user scroll away from the bottom", () => {
    expect(
      getScrollFollowState(
        { scrollTop: 100, scrollHeight: 1000, clientHeight: 400 },
        false
      )
    ).toEqual({ isAtBottom: false, userHasScrolledUp: true });
  });

  test("resumes following when the user returns to the bottom", () => {
    expect(
      getScrollFollowState(
        { scrollTop: 600, scrollHeight: 1000, clientHeight: 400 },
        false
      )
    ).toEqual({ isAtBottom: true, userHasScrolledUp: false });
  });
});
