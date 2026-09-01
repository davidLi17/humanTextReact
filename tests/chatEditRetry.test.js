import { describe, expect, test } from "bun:test";
import {
  computeSessionTitleOnEdit,
  editUserMessageAndTruncate,
  retryAssistantMessageAndTruncate,
} from "../entrypoints/shared/chatEditRetry.ts";

describe("Chat Edit and Retry State Logic", () => {
  const createMockMessages = () => [
    {
      id: "user-1",
      role: "user",
      content: "什么是 OKR？",
      createdAt: 1000,
      status: "completed",
    },
    {
      id: "assistant-1",
      role: "assistant",
      content: "OKR 就是目标与关键结果...",
      createdAt: 2000,
      status: "completed",
      suggestedQuestions: ["它和 KPI 有何区别？"],
    },
    {
      id: "user-2",
      role: "user",
      content: "那它和 KPI 的区别是什么？",
      images: [
        {
          data: "data:image/png;base64,abc",
          mimeType: "image/png",
          fileName: "kpi.png",
        },
      ],
      createdAt: 3000,
      status: "completed",
    },
    {
      id: "assistant-2",
      role: "assistant",
      content: "KPI 是关键绩效指标...",
      reasoningContent: "对比两者考核机制与激励导向",
      hasReasoning: true,
      createdAt: 4000,
      status: "completed",
    },
    {
      id: "user-3",
      role: "user",
      content: "怎么落地执行？",
      createdAt: 5000,
      status: "completed",
    },
    {
      id: "assistant-3",
      role: "assistant",
      content: "",
      status: "error",
      errorMessage: "网络连接超时，请重试",
      createdAt: 6000,
    },
  ];

  describe("editUserMessageAndTruncate", () => {
    test("edits the first user message, truncates all subsequent messages, and updates title", () => {
      const messages = createMockMessages();
      const result = editUserMessageAndTruncate(
        messages,
        "user-1",
        "请用极其生动的比喻解释什么是 OKR？",
        { newAssistantMessageId: "new-asst-1", now: 1500 }
      );

      expect(result.targetIndex).toBe(0);
      expect(result.isFirstUserMessage).toBe(true);
      expect(result.newAssistantMessageId).toBe("new-asst-1");

      // 验证截断后只剩更新后的 User 消息和新的 Assistant 消息
      expect(result.updatedMessages.length).toBe(2);
      expect(result.updatedMessages[0].id).toBe("user-1");
      expect(result.updatedMessages[0].content).toBe(
        "请用极其生动的比喻解释什么是 OKR？"
      );
      expect(result.updatedMessages[1].id).toBe("new-asst-1");
      expect(result.updatedMessages[1].role).toBe("assistant");
      expect(result.updatedMessages[1].status).toBe("streaming");
      expect(result.updatedMessages[1].content).toBe("");

      // 验证发送给 API 的 payload
      expect(result.historyPayload).toEqual([
        { role: "user", content: "请用极其生动的比喻解释什么是 OKR？" },
      ]);

      // 验证标题更新
      const newTitle = computeSessionTitleOnEdit(
        "旧标题",
        result.isFirstUserMessage,
        "请用极其生动的比喻解释什么是 OKR？"
      );
      expect(newTitle).toBe("请用极其生动的比喻解释什么是 OKR...");
    });

    test("edits a middle user message (round 2), preserves round 1, and truncates round 3", () => {
      const messages = createMockMessages();
      const result = editUserMessageAndTruncate(
        messages,
        "user-2",
        "KPI 和 OKR 的核心管理哲学有何不同？",
        { newAssistantMessageId: "new-asst-2", now: 3500 }
      );

      expect(result.targetIndex).toBe(2);
      expect(result.isFirstUserMessage).toBe(false);

      // 验证保留了 user-1 和 assistant-1，更新了 user-2，追加了 new-asst-2，丢弃了 assistant-2, user-3, assistant-3
      expect(result.updatedMessages.length).toBe(4);
      expect(result.updatedMessages[0].id).toBe("user-1");
      expect(result.updatedMessages[1].id).toBe("assistant-1");
      expect(result.updatedMessages[2].id).toBe("user-2");
      expect(result.updatedMessages[2].content).toBe(
        "KPI 和 OKR 的核心管理哲学有何不同？"
      );
      // 保留原有图片等附加属性
      expect(result.updatedMessages[2].images?.length).toBe(1);
      expect(result.updatedMessages[3].id).toBe("new-asst-2");
      expect(result.updatedMessages[3].status).toBe("streaming");

      // 验证 payload 包含完整的截断前文历史
      expect(result.historyPayload).toEqual([
        { role: "user", content: "什么是 OKR？" },
        { role: "assistant", content: "OKR 就是目标与关键结果..." },
        {
          role: "user",
          content: "KPI 和 OKR 的核心管理哲学有何不同？",
        },
      ]);

      // 非首条消息不改变已有标题
      const keptTitle = computeSessionTitleOnEdit(
        "什么是 OKR？",
        result.isFirstUserMessage,
        "KPI 和 OKR 的核心管理哲学有何不同？"
      );
      expect(keptTitle).toBe("什么是 OKR？");
    });

    test("throws error when target user message is not found", () => {
      const messages = createMockMessages();
      expect(() => {
        editUserMessageAndTruncate(messages, "non-existent-id", "新内容");
      }).toThrow("未找到 ID 为 non-existent-id 的用户消息");
    });

    test("throws error when target ID belongs to an assistant message", () => {
      const messages = createMockMessages();
      expect(() => {
        editUserMessageAndTruncate(messages, "assistant-1", "新内容");
      }).toThrow("未找到 ID 为 assistant-1 的用户消息");
    });
  });

  describe("retryAssistantMessageAndTruncate", () => {
    test("retries a completed assistant message, resets its content to streaming, and truncates subsequent messages", () => {
      const messages = createMockMessages();
      const result = retryAssistantMessageAndTruncate(messages, "assistant-2", {
        now: 7000,
      });

      expect(result.assistantIndex).toBe(3);
      // 保留了 user-1, assistant-1, user-2, 以及重置后的 assistant-2（共4条，截断移除了 user-3, assistant-3）
      expect(result.updatedMessages.length).toBe(4);
      expect(result.updatedMessages[3].id).toBe("assistant-2");
      expect(result.updatedMessages[3].content).toBe("");
      expect(result.updatedMessages[3].reasoningContent).toBe("");
      expect(result.updatedMessages[3].hasReasoning).toBe(false);
      expect(result.updatedMessages[3].status).toBe("streaming");
      expect(result.updatedMessages[3].errorMessage).toBeUndefined();

      // 验证上下文 payload 为 assistant-2 之前的所有轮次
      expect(result.historyPayload).toEqual([
        { role: "user", content: "什么是 OKR？" },
        { role: "assistant", content: "OKR 就是目标与关键结果..." },
        { role: "user", content: "那它和 KPI 的区别是什么？" },
      ]);

      // 验证识别出的前置用户消息
      expect(result.precedingUserMessage?.id).toBe("user-2");
      expect(result.precedingUserMessage?.images?.length).toBe(1);
    });

    test("retries an error assistant message card correctly", () => {
      const messages = createMockMessages();
      const result = retryAssistantMessageAndTruncate(messages, "assistant-3", {
        now: 7500,
      });

      expect(result.assistantIndex).toBe(5);
      expect(result.updatedMessages.length).toBe(6);
      const retried = result.updatedMessages[5];
      expect(retried.id).toBe("assistant-3");
      expect(retried.status).toBe("streaming");
      expect(retried.errorMessage).toBeUndefined();
      expect(retried.content).toBe("");

      // 验证 payload
      expect(result.historyPayload.length).toBe(5);
      expect(result.historyPayload[4]).toEqual({
        role: "user",
        content: "怎么落地执行？",
      });
      expect(result.precedingUserMessage?.id).toBe("user-3");
    });

    test("throws error when assistant message is not found", () => {
      const messages = createMockMessages();
      expect(() => {
        retryAssistantMessageAndTruncate(messages, "not-found-id");
      }).toThrow("未找到 ID 为 not-found-id 的助手回答消息");
    });
  });

  describe("computeSessionTitleOnEdit", () => {
    test("does not overwrite webpage reading titles starting with '速读:'", () => {
      const title = computeSessionTitleOnEdit(
        "速读: 架构演进实录...",
        true,
        "重新编辑用户提示词"
      );
      expect(title).toBe("速读: 架构演进实录...");
    });

    test("formats long text nicely with ellipsis", () => {
      const longText =
        "在大规模高并发分布式系统下，服务网格与无服务架构应如何平衡？";
      const title = computeSessionTitleOnEdit("默认对话", true, longText);
      expect(title).toBe("在大规模高并发分布式系统下，服务网格...");
      expect(title.length).toBe(21);
    });

    test("keeps short text as is", () => {
      const shortText = "解释闭包";
      const title = computeSessionTitleOnEdit("默认对话", true, shortText);
      expect(title).toBe("解释闭包");
    });
  });
});
