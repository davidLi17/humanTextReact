import type { ChatPayloadMessage } from "./chatTypes";
import type { SelectionContext } from "./selectionContext";

export const JARGON_VAULT_RESULT_SOURCE = "jargon-vault" as const;

export type TranslationResultSource = typeof JARGON_VAULT_RESULT_SOURCE;

interface JargonReuseRequest {
  text?: unknown;
  messages?: unknown;
  images?: unknown;
  selectionContext?: SelectionContext;
  bypassJargonVault?: boolean;
}

function hasImages(images: unknown): boolean {
  return Array.isArray(images) && images.length > 0;
}

/**
 * 只从无图片、无选区上下文的单轮纯文本请求中提取精确匹配词条。
 * 返回 undefined 代表本次请求必须继续走正常模型流程。
 */
export function getJargonReuseTerm(
  request: JargonReuseRequest
): string | undefined {
  if (
    request.bypassJargonVault ||
    request.selectionContext ||
    hasImages(request.images)
  ) {
    return undefined;
  }

  if (Array.isArray(request.messages)) {
    if (request.messages.length !== 1) return undefined;
    const message = request.messages[0] as Partial<ChatPayloadMessage>;
    if (
      message.role !== "user" ||
      typeof message.content !== "string" ||
      message.selectionContext ||
      hasImages(message.images)
    ) {
      return undefined;
    }
    return message.content.trim() || undefined;
  }

  return typeof request.text === "string"
    ? request.text.trim() || undefined
    : undefined;
}
