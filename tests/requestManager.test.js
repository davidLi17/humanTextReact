import { afterEach, describe, expect, test } from "bun:test";
import { RequestManager } from "../entrypoints/background/requestManager.ts";
import {
  POPUP_TRANSLATION_TARGET,
  SIDEPANEL_TRANSLATION_TARGET,
  createRequestId,
  createSelectionTarget,
  createSidepanelTarget,
  getTranslationTargetKey,
  shouldAcceptRequestUpdate,
} from "../entrypoints/shared/requestProtocol.ts";

const tabOneTarget = createSelectionTarget(101);
const tabTwoTarget = createSelectionTarget(202);
const sidepanelOneTarget = createSidepanelTarget("session-123");
const sidepanelTwoTarget = createSidepanelTarget("session-456");

afterEach(() => {
  RequestManager.cleanupTarget(POPUP_TRANSLATION_TARGET);
  RequestManager.cleanupTarget(SIDEPANEL_TRANSLATION_TARGET);
  RequestManager.cleanupTarget(tabOneTarget);
  RequestManager.cleanupTarget(tabTwoTarget);
  RequestManager.cleanupTarget(sidepanelOneTarget);
  RequestManager.cleanupTarget(sidepanelTwoTarget);
});

describe("RequestManager", () => {
  test("new request cancels the previous request for tab and sidepanel targets", () => {
    for (const [prefix, target] of [
      ["tab", tabOneTarget],
      ["sidepanel", sidepanelOneTarget],
    ]) {
      const firstId = `${prefix}-first`;
      const secondId = `${prefix}-second`;
      const first = RequestManager.createRequest(firstId, target);
      const second = RequestManager.createRequest(secondId, target);

      expect(first.controller.signal.aborted).toBe(true);
      expect(second.controller.signal.aborted).toBe(false);
      expect(RequestManager.isActiveRequest(firstId)).toBe(false);
      expect(RequestManager.isActiveRequest(secondId)).toBe(true);
    }
  });

  test("popup, tab and different sidepanel sessions remain independent", () => {
    const popup = RequestManager.createRequest(
      "popup-request",
      POPUP_TRANSLATION_TARGET
    );
    const tab = RequestManager.createRequest("tab-request", tabOneTarget);
    const sidepanelOne = RequestManager.createRequest(
      "sidepanel-one-request",
      sidepanelOneTarget
    );
    const sidepanelTwo = RequestManager.createRequest(
      "sidepanel-two-request",
      sidepanelTwoTarget
    );

    RequestManager.cleanupRequest("popup-request");

    expect(popup.controller.signal.aborted).toBe(true);
    expect(tab.controller.signal.aborted).toBe(false);
    expect(sidepanelOne.controller.signal.aborted).toBe(false);
    expect(sidepanelTwo.controller.signal.aborted).toBe(false);
    expect(RequestManager.isActiveRequest("tab-request")).toBe(true);

    RequestManager.cleanupRequest("sidepanel-one-request");
    expect(sidepanelOne.controller.signal.aborted).toBe(true);
    expect(sidepanelTwo.controller.signal.aborted).toBe(false);
    expect(RequestManager.isActiveRequest("sidepanel-two-request")).toBe(true);
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
  test("generates stable keys for every translation target", () => {
    expect(getTranslationTargetKey(SIDEPANEL_TRANSLATION_TARGET)).toBe(
      "sidepanel"
    );
    expect(getTranslationTargetKey(sidepanelOneTarget)).toBe(
      "sidepanel:session-123"
    );
    expect(getTranslationTargetKey(POPUP_TRANSLATION_TARGET)).toBe("popup");
    expect(getTranslationTargetKey(tabOneTarget)).toBe("tab:101:selection");
  });

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
