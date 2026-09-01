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
const sidepanelSessionTarget = createSidepanelTarget("session-123");

afterEach(() => {
  RequestManager.cleanupTarget(POPUP_TRANSLATION_TARGET);
  RequestManager.cleanupTarget(SIDEPANEL_TRANSLATION_TARGET);
  RequestManager.cleanupTarget(sidepanelSessionTarget);
  RequestManager.cleanupTarget(tabOneTarget);
  RequestManager.cleanupTarget(tabTwoTarget);
});

describe("RequestManager with sidepanel targets", () => {
  test("sidepanel requests cancel prior requests in the same session", () => {
    const first = RequestManager.createRequest(
      "sidepanel-1",
      sidepanelSessionTarget
    );
    const second = RequestManager.createRequest(
      "sidepanel-2",
      sidepanelSessionTarget
    );

    expect(first.controller.signal.aborted).toBe(true);
    expect(second.controller.signal.aborted).toBe(false);
    expect(RequestManager.isActiveRequest("sidepanel-1")).toBe(false);
    expect(RequestManager.isActiveRequest("sidepanel-2")).toBe(true);
  });

  test("sidepanel, popup and tab targets are completely isolated", () => {
    const popup = RequestManager.createRequest(
      "popup-req",
      POPUP_TRANSLATION_TARGET
    );
    const sidepanel = RequestManager.createRequest(
      "sidepanel-req",
      sidepanelSessionTarget
    );
    const tab = RequestManager.createRequest("tab-req", tabOneTarget);

    RequestManager.cleanupRequest("popup-req");

    expect(popup.controller.signal.aborted).toBe(true);
    expect(sidepanel.controller.signal.aborted).toBe(false);
    expect(tab.controller.signal.aborted).toBe(false);
    expect(RequestManager.isActiveRequest("sidepanel-req")).toBe(true);
    expect(RequestManager.isActiveRequest("tab-req")).toBe(true);
  });
});

describe("sidepanel target protocol", () => {
  test("generates correct target keys for sidepanel", () => {
    expect(getTranslationTargetKey(SIDEPANEL_TRANSLATION_TARGET)).toBe(
      "sidepanel"
    );
    expect(getTranslationTargetKey(sidepanelSessionTarget)).toBe(
      "sidepanel:session-123"
    );
    expect(getTranslationTargetKey(POPUP_TRANSLATION_TARGET)).toBe("popup");
    expect(getTranslationTargetKey(tabOneTarget)).toBe("tab:101:selection");
  });
});
