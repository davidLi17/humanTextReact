import type { SelectionContext } from "./selectionContext";

export type ChatRole = "system" | "user" | "assistant";

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
  }>,
  currentMessage?: {
    role: ChatRole;
    content: string | any[];
    images?: ChatImageContent[];
    selectionContext?: SelectionContext;
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
  pageMeta?: {
    title: string;
    url: string;
    wordCount?: number;
    excerpt?: string;
    isWebPageReading?: boolean;
    /** 当前网页通读消息可重放的原文片段，最多保存一段。 */
    sourceContent?: string;
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
