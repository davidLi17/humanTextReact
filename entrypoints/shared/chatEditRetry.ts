import { ChatMessage, ChatRole } from "./chatTypes";
import { createRequestId } from "./requestProtocol";

export interface EditUserMessageResult {
  updatedMessages: ChatMessage[];
  historyPayload: Array<{ role: ChatRole; content: string }>;
  isFirstUserMessage: boolean;
  targetIndex: number;
  newAssistantMessageId: string;
}

export interface RetryAssistantMessageResult {
  updatedMessages: ChatMessage[];
  historyPayload: Array<{ role: ChatRole; content: string }>;
  assistantIndex: number;
  precedingUserMessage?: ChatMessage;
}

/**
 * 编辑指定 User 消息并截断后续所有消息，在其后追加新的 streaming 态 Assistant 消息
 */
export function editUserMessageAndTruncate(
  messages: ChatMessage[],
  targetMessageId: string,
  newContent: string,
  options?: {
    newAssistantMessageId?: string;
    now?: number;
  }
): EditUserMessageResult {
  const targetIndex = messages.findIndex(
    (m) => m.id === targetMessageId && m.role === "user"
  );

  if (targetIndex === -1) {
    throw new Error(`未找到 ID 为 ${targetMessageId} 的用户消息`);
  }

  const oldUserMsg = messages[targetIndex];
  const now = options?.now ?? Date.now();
  const newAssistantMessageId =
    options?.newAssistantMessageId || createRequestId();

  const updatedUserMessage: ChatMessage = {
    ...oldUserMsg,
    content: newContent,
  };

  const newAssistantMessage: ChatMessage = {
    id: newAssistantMessageId,
    role: "assistant",
    content: "",
    reasoningContent: "",
    hasReasoning: false,
    createdAt: now,
    status: "streaming",
  };

  // 截断该 User 消息之后的所有消息，并追加新的 Assistant 消息
  const updatedMessages = [
    ...messages.slice(0, targetIndex),
    updatedUserMessage,
    newAssistantMessage,
  ];

  // 构建传给 API 的历史上下文（包括更新后的当前 User 消息）
  const historyPayload = [
    ...messages.slice(0, targetIndex).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user" as const,
      content: newContent,
    },
  ];

  // 判断是否为第一条用户消息（用于更新会话标题）
  const isFirstUserMessage = !messages
    .slice(0, targetIndex)
    .some((m) => m.role === "user");

  return {
    updatedMessages,
    historyPayload,
    isFirstUserMessage,
    targetIndex,
    newAssistantMessageId,
  };
}

/**
 * 重新生成/重试指定 Assistant 消息，截断后续消息并重置该消息为 streaming 态
 */
export function retryAssistantMessageAndTruncate(
  messages: ChatMessage[],
  targetAssistantMessageId: string,
  options?: {
    now?: number;
  }
): RetryAssistantMessageResult {
  const assistantIndex = messages.findIndex(
    (m) => m.id === targetAssistantMessageId && m.role === "assistant"
  );

  if (assistantIndex === -1) {
    throw new Error(`未找到 ID 为 ${targetAssistantMessageId} 的助手回答消息`);
  }

  const oldAssistantMsg = messages[assistantIndex];
  const now = options?.now ?? Date.now();

  const resetAssistantMessage: ChatMessage = {
    ...oldAssistantMsg,
    content: "",
    reasoningContent: "",
    hasReasoning: false,
    status: "streaming",
    errorMessage: undefined,
    suggestedQuestions: undefined,
    createdAt: now,
  };

  // 截断该 Assistant 消息之后的所有子消息
  const updatedMessages = [
    ...messages.slice(0, assistantIndex),
    resetAssistantMessage,
  ];

  // 构建传给 API 的上下文：包含该轮 Assistant 消息之前的所有消息（包括对应的前置 User 消息）
  const historyPayload = messages.slice(0, assistantIndex).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const precedingUserMessage =
    assistantIndex > 0 ? messages[assistantIndex - 1] : undefined;

  return {
    updatedMessages,
    historyPayload,
    assistantIndex,
    precedingUserMessage,
  };
}

/**
 * 在编辑用户消息后，根据是否为首条用户提问重新计算会话标题
 */
export function computeSessionTitleOnEdit(
  currentTitle: string,
  isFirstUserMessage: boolean,
  newContent: string
): string {
  if (isFirstUserMessage && !currentTitle.startsWith("速读:")) {
    const trimmed = newContent.trim();
    return trimmed.slice(0, 18) + (trimmed.length > 18 ? "..." : "");
  }
  return currentTitle;
}
