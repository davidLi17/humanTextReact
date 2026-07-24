import { afterEach, describe, expect, test } from "bun:test";
import { RequestManager } from "../entrypoints/background/requestManager.ts";
import {
  POPUP_TRANSLATION_TARGET,
  createRequestId,
  createSelectionTarget,
  shouldAcceptRequestUpdate,
} from "../entrypoints/shared/requestProtocol.ts";

const tabOneTarget = createSelectionTarget(101);
const tabTwoTarget = createSelectionTarget(202);

afterEach(() => {
  RequestManager.cleanupTarget(POPUP_TRANSLATION_TARGET);
  RequestManager.cleanupTarget(tabOneTarget);
  RequestManager.cleanupTarget(tabTwoTarget);
});

describe("RequestManager", () => {
  test("new request cancels only the previous request for the same target", () => {
    const first = RequestManager.createRequest("first", tabOneTarget);
    const second = RequestManager.createRequest("second", tabOneTarget);

    expect(first.controller.signal.aborted).toBe(true);
    expect(second.controller.signal.aborted).toBe(false);
    expect(RequestManager.isActiveRequest("first")).toBe(false);
    expect(RequestManager.isActiveRequest("second")).toBe(true);
  });

  test("requests for different targets remain independent", () => {
    const popup = RequestManager.createRequest(
      "popup-request",
      POPUP_TRANSLATION_TARGET
    );
    const tab = RequestManager.createRequest("tab-request", tabOneTarget);

    RequestManager.cleanupRequest("popup-request");

    expect(popup.controller.signal.aborted).toBe(true);
    expect(tab.controller.signal.aborted).toBe(false);
    expect(RequestManager.isActiveRequest("tab-request")).toBe(true);
  });

  test("an old completion cannot remove a newer request", () => {
    RequestManager.createRequest("old", tabOneTarget);
    RequestManager.createRequest("new", tabOneTarget);

    expect(RequestManager.completeRequest("old")).toBe(false);
    expect(RequestManager.getActiveRequestId(tabOneTarget)).toBe("new");
  });

  test("a pending request can only be claimed once", () => {
    RequestManager.createRequest("claim-once", tabOneTarget);

    expect(RequestManager.claimRequest("claim-once")?.requestId).toBe(
      "claim-once"
    );
    expect(RequestManager.claimRequest("claim-once")).toBeUndefined();
  });

  test("closing a tab cleans every request for that tab only", () => {
    const tabOne = RequestManager.createRequest("tab-one", tabOneTarget);
    const tabTwo = RequestManager.createRequest("tab-two", tabTwoTarget);

    expect(RequestManager.cleanupTab(101)).toBe(1);
    expect(tabOne.controller.signal.aborted).toBe(true);
    expect(tabTwo.controller.signal.aborted).toBe(false);
  });
});

describe("request protocol", () => {
  test("request IDs are unique", () => {
    expect(createRequestId()).not.toBe(createRequestId());
  });

  test("updates must match the active request unless legacy mode is enabled", () => {
    expect(shouldAcceptRequestUpdate("active", "active")).toBe(true);
    expect(shouldAcceptRequestUpdate("late", "active")).toBe(false);
    expect(shouldAcceptRequestUpdate(undefined, "active")).toBe(false);
    expect(shouldAcceptRequestUpdate(undefined, "active", true)).toBe(true);
  });
});
