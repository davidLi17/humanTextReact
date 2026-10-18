import { AUTO_GENUI_FALLBACK_MAX_CHARS, parseGeneratedUiEnvelope, parseGeneratedUiToolEnvelope } from "@/entrypoints/shared/genui/parse";
import { idSchema } from "@/entrypoints/shared/genui/catalog";
import { jsonByteLength, normalizeGenUiAttachment } from "@/entrypoints/shared/genui/profile";
import type { ExplanationSpec, GenUiAttachment } from "@/entrypoints/shared/genui/types";
import { createRequestId } from "@/entrypoints/shared/requestProtocol";

export const GENUI_OUTPUT_BYTE_LIMIT = 65_536;
// Budget applies to the FULL persisted artifact, including host provenance. Leave
// room for local navigation state rather than succeeding with an unusable card.
export const GENUI_ATTACHMENT_BYTE_LIMIT = GENUI_OUTPUT_BYTE_LIMIT - 4_096;
export const GENUI_FAILURE_TEXT = "交互解释生成失败，请重试或继续使用文字解释。";
export const AUTO_GENUI_TOO_LARGE_TEXT = "交互讲解内容过长，未生成可显示文字回答。";

export interface GenUiRequest {
  sourceMessageIds: string[];
  contextFingerprint: string;
  assistantMessageId: string;
}

function readableSpecSummary(spec: ExplanationSpec): string {
  const lines: string[] = [];
  const add = (text: string) => {
    const value = text.trim();
    if (!value || lines.join("\n").length >= AUTO_GENUI_FALLBACK_MAX_CHARS) return;
    lines.push(value);
  };
  for (const element of Object.values(spec.elements)) {
    switch (element.type) {
      case "Card": add(element.props.title || "交互讲解"); break;
      case "Text": add(element.props.text); break;
      case "StepViewer": element.props.steps.forEach((step) => add(`${step.title}：${step.description}`)); break;
      case "ConceptTabs": element.props.tabs.forEach((tab) => add(`${tab.label}：${tab.content}`)); break;
      case "TreeInspector": element.props.nodes.forEach((node) => add(`${node.label}${node.description ? `：${node.description}` : ""}`)); break;
      case "CompareTable": {
        const labels = element.props.columns.map((column) => column.label);
        add(labels.join("｜"));
        element.props.rows.forEach((row) => add(element.props.columns.map((column) => row.cells[column.id]).join("｜")));
        break;
      }
      case "Chart": {
        add(element.props.title || "图表");
        element.props.categories.forEach((category, index) => {
          add(`${category}：${element.props.series.map((series) => `${series.name} ${series.values[index]}`).join("，")}`);
        });
        break;
      }
    }
  }
  return lines.join("\n").slice(0, AUTO_GENUI_FALLBACK_MAX_CHARS).trim() || "交互讲解";
}

/** Copy only bounded, host-owned metadata. Model output can never set ownership. */
export function validateGenUiRequest(value: unknown): GenUiRequest {
  const input = value as Partial<GenUiRequest> | null;
  const validId = (id: unknown): id is string =>
    typeof id === "string" && idSchema.safeParse(id).success;
  if (!input || !Array.isArray(input.sourceMessageIds) ||
      input.sourceMessageIds.length === 0 || input.sourceMessageIds.length > 100 ||
      !input.sourceMessageIds.every(validId) ||
      new Set(input.sourceMessageIds).size !== input.sourceMessageIds.length ||
      !validId(input.contextFingerprint) || !validId(input.assistantMessageId)) {
    throw new Error("交互解释请求参数无效");
  }
  return {
    sourceMessageIds: [...input.sourceMessageIds],
    contextFingerprint: input.contextFingerprint,
    assistantMessageId: input.assistantMessageId,
  };
}

export class GenUiOutputBuffer {
  private raw = "";
  private bytes = 0;

  append(content: string): void {
    const bytes = new TextEncoder().encode(content).byteLength;
    if (this.bytes + bytes > GENUI_OUTPUT_BYTE_LIMIT) {
      this.clear();
      throw new Error(GENUI_FAILURE_TEXT);
    }
    this.bytes += bytes;
    this.raw += content;
  }

  /** Read only after the stream finishes, for a safe text fallback on invalid UI. */
  getRaw(): string {
    return this.raw;
  }

  finish(
    request: GenUiRequest,
    includeFallbackText = false,
    attachmentId = createRequestId()
  ): { fallbackText: string; attachment: GenUiAttachment } {
    try {
      const parsed = parseGeneratedUiEnvelope(this.raw);
      const metadata = validateGenUiRequest(request);
      const candidate: GenUiAttachment = {
        id: attachmentId,
        protocolVersion: 1,
        catalogVersion: "explanation-v1",
        revision: 1,
        spec: parsed.spec,
        sourceMessageIds: metadata.sourceMessageIds,
        contextFingerprint: metadata.contextFingerprint,
        ...(includeFallbackText ? { fallbackText: parsed.fallbackText } : {}),
      };
      if (jsonByteLength(candidate) > GENUI_ATTACHMENT_BYTE_LIMIT) {
        throw new Error(GENUI_FAILURE_TEXT);
      }
      const attachment = normalizeGenUiAttachment(candidate);
      if (!attachment) throw new Error(GENUI_FAILURE_TEXT);
      return { fallbackText: parsed.fallbackText, attachment };
    } catch {
      throw new Error(GENUI_FAILURE_TEXT);
    } finally {
      this.clear();
    }
  }

  finishAuto(
    request: GenUiRequest,
    attachmentId = createRequestId()
  ): { fallbackText: string; attachment: GenUiAttachment } {
    try {
      const parsed = parseGeneratedUiToolEnvelope(this.raw);
      const metadata = validateGenUiRequest(request);
      const fallbackText = parsed.fallbackText || readableSpecSummary(parsed.spec);
      const candidate: GenUiAttachment = {
        id: attachmentId,
        protocolVersion: 1,
        catalogVersion: "explanation-v1",
        revision: 1,
        spec: parsed.spec,
        sourceMessageIds: metadata.sourceMessageIds,
        contextFingerprint: metadata.contextFingerprint,
        fallbackText,
      };
      if (jsonByteLength(candidate) > GENUI_ATTACHMENT_BYTE_LIMIT) throw new Error(GENUI_FAILURE_TEXT);
      const attachment = normalizeGenUiAttachment(candidate);
      if (!attachment) throw new Error(GENUI_FAILURE_TEXT);
      return { fallbackText, attachment };
    } catch {
      throw new Error(GENUI_FAILURE_TEXT);
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.raw = "";
    this.bytes = 0;
  }
}

export function isVerifiedGenUiSender(
  request: any,
  sender: { id?: string; url?: string; tab?: { id?: number; url?: string } },
  runtime: { id?: string; getURL(path: string): string }
): boolean {
  if (!runtime.id || sender.id !== runtime.id ||
      request.targetKind !== "sidepanel" || request.source !== "sidepanel" ||
      typeof request.sessionId !== "string" || !request.sessionId.trim() ||
      request.sessionId.length > 256 || request.tabId !== undefined) return false;
  try {
    const actual = new URL(sender.url || "");
    const expected = new URL(runtime.getURL("sidepanel.html"));
    const matchesSidepanel = (url: URL) => url.protocol === expected.protocol &&
      url.host === expected.host && url.pathname === expected.pathname;
    // Chrome supplies sender.tab when our own sidepanel page is opened in a tab.
    // Authenticate browser-provided origins, never the request's claimed source.
    return matchesSidepanel(actual) && (!sender.tab ||
      matchesSidepanel(new URL(sender.tab.url || "")));
  } catch {
    return false;
  }
}
