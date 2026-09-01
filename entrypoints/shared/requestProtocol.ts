export type TranslationTarget =
  | { kind: "popup" }
  | { kind: "sidepanel"; sessionId?: string }
  | { kind: "tab"; tabId: number; surface: "selection" };

export const POPUP_TRANSLATION_TARGET: TranslationTarget = { kind: "popup" };
export const SIDEPANEL_TRANSLATION_TARGET: TranslationTarget = {
  kind: "sidepanel",
};

export function createSidepanelTarget(sessionId?: string): TranslationTarget {
  return { kind: "sidepanel", sessionId };
}

export function createSelectionTarget(tabId: number): TranslationTarget {
  return { kind: "tab", tabId, surface: "selection" };
}

export function createRequestId(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (!cryptoApi?.getRandomValues) {
    throw new Error("当前环境不支持安全的请求 ID 生成");
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0")
  );

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function getTranslationTargetKey(target: TranslationTarget): string {
  if (target.kind === "popup") {
    return "popup";
  }
  if (target.kind === "sidepanel") {
    return target.sessionId ? `sidepanel:${target.sessionId}` : "sidepanel";
  }
  return `tab:${target.tabId}:${target.surface}`;
}

export function isTranslationTargetForTab(
  target: TranslationTarget,
  tabId: number
): boolean {
  return target.kind === "tab" && target.tabId === tabId;
}

export function shouldAcceptRequestUpdate(
  incomingRequestId: string | undefined,
  activeRequestId: string | undefined,
  allowLegacyMessage = false
): boolean {
  if (incomingRequestId) {
    return incomingRequestId === activeRequestId;
  }

  return allowLegacyMessage && Boolean(activeRequestId);
}
