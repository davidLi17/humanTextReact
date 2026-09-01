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
}

/**
 * 将单条对话消息格式化为符合多模态 API 要求的 Payload 结构
 */
export function formatMessageForPayload(message: {
  role: ChatRole;
  content: string | any[];
  images?: ChatImageContent[];
}): ChatPayloadMessage {
  const images = message.images;
  if (!images || images.length === 0) {
    return {
      role: message.role,
      content: message.content,
    };
  }

  if (Array.isArray(message.content)) {
    return {
      role: message.role,
      content: message.content,
      images,
    };
  }

  const multimodalContent: MultimodalContentItem[] = [
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: img.data },
    })),
    {
      type: "text" as const,
      text: typeof message.content === "string" ? message.content : "",
    },
  ];

  return {
    role: message.role,
    content: multimodalContent,
    images,
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
  }>,
  currentMessage?: {
    role: ChatRole;
    content: string | any[];
    images?: ChatImageContent[];
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
  pageMeta?: {
    title: string;
    url: string;
    wordCount?: number;
    excerpt?: string;
    isWebPageReading?: boolean;
  };
  suggestedQuestions?: string[];
  createdAt: number;
  status?: "pending" | "streaming" | "completed" | "error";
  errorMessage?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
