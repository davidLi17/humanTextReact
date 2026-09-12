import type { SelectionContext } from "./selectionContext";

export type ChatRole = "system" | "user" | "assistant";

export type ExplanationRefinementMode =
  | "simpler"
  | "source-walkthrough"
  | "context-example";

export interface ExplanationRefinementMeta {
  version: 1;
  mode: ExplanationRefinementMode;
  targetAssistantMessageId: string;
  sourceUserMessageId?: string;
  targetExcerpt: string;
}

export interface ChatImageContent {
  data: string;
  mimeType: string;
  fileName?: string;
}

export interface MultimodalImageUrlItem {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export interface MultimodalTextItem {
  type: "text";
  text: string;
}

export type MultimodalContentItem = MultimodalImageUrlItem | MultimodalTextItem;

export interface ChatPayloadMessage {
  role: ChatRole;
  content: string | MultimodalContentItem[];
  images?: ChatImageContent[];
  selectionContext?: SelectionContext;
  refinementMeta?: ExplanationRefinementMeta;
}

/**
 * 将单条对话消息格式化为符合多模态 API 要求的 Payload 结构
 */
export function formatMessageForPayload(message: {
  role: ChatRole;
  content: string | any[];
  images?: ChatImageContent[];
  selectionContext?: SelectionContext;
}): ChatPayloadMessage {
  const selectionContext = message.selectionContext;
  const content = message.content;
  const images = message.images;
  if (!images || images.length === 0) {
    return {
      role: message.role,
      content,
      ...(selectionContext ? { selectionContext } : {}),
    };
  }

  if (Array.isArray(content)) {
    return {
      role: message.role,
      content,
      images,
      ...(selectionContext ? { selectionContext } : {}),
    };
  }

  const multimodalContent: MultimodalContentItem[] = [
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: img.data },
    })),
    {
      type: "text" as const,
      text: typeof content === "string" ? content : "",
    },
  ];

  return {
    role: message.role,
    content: multimodalContent,
    images,
    ...(selectionContext ? { selectionContext } : {}),
  };
}

/**
 * 构建多轮对话历史 payload，确保每一轮带有图片的消息保留并组装为多模态数组结构
 */
export function buildHistoryPayload(
  messages: Array<{
    role: ChatRole;
    content: string | any[];
    images?: ChatImageContent[];
    selectionContext?: SelectionContext;
    refinementMeta?: unknown;
  }>,
  currentMessage?: {
    role: ChatRole;
    content: string | any[];
    images?: ChatImageContent[];
    selectionContext?: SelectionContext;
    refinementMeta?: unknown;
  }
): ChatPayloadMessage[] {
  const payload = messages.map(formatMessageForPayload);
  if (currentMessage) {
    payload.push(formatMessageForPayload(currentMessage));
  }
  return payload;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  images?: ChatImageContent[];
  selectionContext?: SelectionContext;
  refinementMeta?: ExplanationRefinementMeta;
  pageMeta?: {
    title: string;
    url: string;
    wordCount?: number;
    excerpt?: string;
    isWebPageReading?: boolean;
    /**
     * 该卡片只把正文作为上下文附加，不要求模型产出速读报告。
     * 缺省（含所有历史数据）表示它属于一次真实通读，重放时仍走速读报告 Prompt。
     */
    contextOnly?: boolean;
    /** 当前网页通读消息可重放的原文片段，最多保存一段。 */
    sourceContent?: string;
    /**
     * 网页作为背景资料时保存的有界正文快照。sourceContent 保留首段，
     * 让早期记录与旧版重放逻辑继续可用。
     */
    attachedPage?: {
      version: 1;
      content: string;
      /** 页面提取器实际拿到的正文长度，可能大于已保存快照。 */
      capturedChars: number;
      /** 仅表示页面可能还有尚未加载的内容，不表示本地快照被截断。 */
      hasMoreContent: boolean;
      /** 本轮带入模型的段序号，从 1 开始。空数组表示禁用该网页背景。 */
      selectedSegments: number[];
      /** 旧记录仅保存 sourceContent，升级选择时标记为不完整快照。 */
      legacyPartial?: true;
    };
    /** 当前原文片段在整篇网页中的序号，从 1 开始。 */
    segmentIndex?: number;
    /** 整篇网页预计分段数。 */
    totalSegments?: number;
    /** 编辑网页消息时保存的用户补充指令，与原文分开存储。 */
    userInstruction?: string;
    /** 同一次网页阅读运行的稳定身份，区分同 URL 的多次阅读。 */
    readingRunId?: string;
  };
  /** 网页全文总览的来源证明；仅保存可读元信息，不保存模型 Prompt。 */
  overviewMeta?: WebReadingOverviewMeta;
  suggestedQuestions?: string[];
  createdAt: number;
  status?: "pending" | "streaming" | "completed" | "error";
  errorMessage?: string;
  /** 回答的本地来源；缺省表示模型生成或旧数据。 */
  resultSource?: import("./jargonReuse").TranslationResultSource;
}

export interface WebReadingOverviewMeta {
  kind: "web-reading-overview";
  version: 1;
  readingRunId: string;
  sourceFingerprint: string;
  title: string;
  url: string;
  totalSegments: number;
  requestChars: number;
  sourceAssistantMessageIds: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
