import { describe, expect, test } from "bun:test";
import type { ChatMessage } from "../../entrypoints/shared/chatTypes";
import { createAttachedPageMeta } from "../../entrypoints/shared/pageContext";
import {
  normalizeConversationRecapMeta,
  prepareConversationRecapRequest,
} from "../../entrypoints/shared/conversationRecap";

function message(
  id: string,
  role: ChatMessage["role"],
  content: string,
  extra: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id,
    role,
    content,
    createdAt: Number(id.replace(/\D/g, "")) || 1,
    status: "completed",
    ...extra,
  };
}

const OLD_RECAP_META = {
  version: 1 as const,
  sourceMessageIds: ["old-source"],
  sourceFingerprint: "v1-0000000000000000",
  totalMessageCount: 1,
  coveredMessageCount: 1,
  truncated: false,
};

describe("对话主线回顾请求", () => {
  test("只发送当前会话的可读文字，排除旧回顾和内部证据协议", () => {
    const pageMeta = createAttachedPageMeta({
      title: "支付规划",
      url: "https://example.com/plan",
      content: "绝不能进入回顾请求的网页正文".repeat(100),
    });
    const messages: ChatMessage[] = [
      message("m1", "user", "我想把支付失败率降下来"),
      message("m2", "assistant", "建议先确认失败发生在哪个环节"),
      message("page", "user", "已附加网页", { pageMeta }),
      message("image", "user", "这是现场截图", {
        images: [{ data: "data:image/png;base64,SECRET", mimeType: "image/png" }],
      }),
      message("old-recap", "user", "回顾对话主线", {
        conversationRecapMeta: OLD_RECAP_META,
      }),
      message("old-recap-answer", "assistant", "旧回顾内容不得递归进入"),
      message(
        "m3",
        "assistant",
        [
          "支付渠道日志仍缺少错误码。",
          "<!-- human-text-evidence:v1",
          '{"citations":[{"id":"E1","segmentIndex":1,"quote":"内部引用协议不得进入"}]}',
          "-->",
        ].join("\n")
      ),
    ];

    const prepared = prepareConversationRecapRequest(messages);

    expect(prepared.success).toBe(true);
    if (!prepared.success) return;
    expect(prepared.messages.map((item) => item.role)).toEqual(["system", "user"]);
    const system = String(prepared.messages[0].content);
    const user = String(prepared.messages[1].content);
    expect(system).toContain("【对话主线回顾任务 v1】");
    expect(system).toContain("## 当前目标");
    expect(system).toContain("用户已确认：");
    expect(system).toContain("助手建议：");
    expect(user).toContain("【覆盖信息】");
    expect(user).toContain("【起始参照】");
    expect(user).toContain("【本次覆盖的当前会话文字】");
    expect(user).toContain("我想把支付失败率降下来");
    expect(user).toContain("支付渠道日志仍缺少错误码。");
    expect(user).toContain("网页资料卡片");
    expect(user).toContain("支付规划");
    expect(user).toContain("https://example.com/plan");
    expect(user).toContain("本次选入范围");
    expect(user).toContain("附带 1 张图片");
    expect(user).not.toContain("绝不能进入回顾请求的网页正文");
    expect(user).not.toContain("data:image/png;base64");
    expect(user).not.toContain("human-text-evidence");
    expect(user).not.toContain("内部引用协议不得进入");
    expect(user).not.toContain("旧回顾内容不得递归进入");
    expect(prepared.meta.totalMessageCount).toBe(5);
    expect(prepared.meta.coveredMessageCount).toBe(5);
    expect(prepared.meta.sourceMessageIds).toEqual(["m1", "m2", "page", "image", "m3"]);
  });

  test("长会话保留最早用户目标和最近窗口，并报告覆盖与裁切", () => {
    const messages: ChatMessage[] = [
      message("m1", "user", "最早目标：完成上线复盘"),
      ...Array.from({ length: 9 }, (_, index) =>
        message(
          `m${index + 2}`,
          index % 2 === 0 ? "assistant" : "user",
          `消息-${index + 2}-`.padEnd(7_000, String(index))
        )
      ),
    ];

    const prepared = prepareConversationRecapRequest(messages);

    expect(prepared.success).toBe(true);
    if (!prepared.success) return;
    const requestText = prepared.messages.map((item) => String(item.content)).join("");
    expect(requestText.length).toBeLessThanOrEqual(32_000);
    expect(requestText).toContain("最早目标：完成上线复盘");
    expect(requestText).toContain("消息-10-");
    expect(requestText).not.toContain("消息-2-");
    expect(prepared.meta.totalMessageCount).toBe(10);
    expect(prepared.meta.coveredMessageCount).toBeLessThan(10);
    expect(prepared.meta.sourceMessageIds[0]).toBe("m1");
    expect(prepared.meta.sourceMessageIds.at(-1)).toBe("m10");
    expect(prepared.meta.truncated).toBe(true);
    expect(String(prepared.messages[1].content)).toContain("已裁切：是");
  });

  test("重试复用冻结范围，历史内容变化或来源丢失时失败", () => {
    const messages = [
      message("m1", "user", "确认目标是修复结算问题"),
      message("m2", "assistant", "建议检查支付渠道"),
      message("m3", "user", "我确认先补错误码监控"),
    ];
    const first = prepareConversationRecapRequest(messages);
    expect(first.success).toBe(true);
    if (!first.success) return;

    const retry = prepareConversationRecapRequest(messages, first.meta);
    expect(retry).toEqual(first);

    const changed = messages.map((item) =>
      item.id === "m2" ? { ...item, content: "被修改的助手建议" } : item
    );
    expect(prepareConversationRecapRequest(changed, first.meta)).toMatchObject({
      success: false,
    });
    expect(
      prepareConversationRecapRequest(messages.filter((item) => item.id !== "m2"), first.meta)
    ).toMatchObject({ success: false });
    expect(
      prepareConversationRecapRequest([...messages, message("m4", "user", "新增决定")], first.meta)
    ).toMatchObject({ success: false });
  });

  test("normalize 拒绝重复 ID、计数失配、越界和伪造指纹", () => {
    const valid = prepareConversationRecapRequest([
      message("m1", "user", "回顾这个目标"),
    ]);
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(normalizeConversationRecapMeta(valid.meta)).toEqual(valid.meta);

    expect(
      normalizeConversationRecapMeta({
        ...valid.meta,
        sourceMessageIds: ["m1", "m1"],
        coveredMessageCount: 2,
      })
    ).toBeUndefined();
    expect(
      normalizeConversationRecapMeta({
        ...valid.meta,
        coveredMessageCount: 2,
      })
    ).toBeUndefined();
    expect(
      normalizeConversationRecapMeta({
        ...valid.meta,
        sourceMessageIds: ["x".repeat(129)],
      })
    ).toBeUndefined();
    expect(
      normalizeConversationRecapMeta({
        ...valid.meta,
        sourceFingerprint: "forged",
      })
    ).toBeUndefined();
    expect(
      normalizeConversationRecapMeta({
        ...valid.meta,
        totalMessageCount: 2,
        truncated: false,
      })
    ).toBeUndefined();
  });

  test("重试拒绝与当前历史不一致的冻结顺序和裁切状态", () => {
    const messages = [
      message("m1", "user", "目标一"),
      message("m2", "assistant", "建议一"),
    ];
    const first = prepareConversationRecapRequest(messages);
    expect(first.success).toBe(true);
    if (!first.success) return;

    expect(
      prepareConversationRecapRequest(messages, {
        ...first.meta,
        sourceMessageIds: [...first.meta.sourceMessageIds].reverse(),
      })
    ).toMatchObject({ success: false });
    expect(
      prepareConversationRecapRequest(messages, {
        ...first.meta,
        truncated: true,
      })
    ).toMatchObject({ success: false });
  });

  test("超多短消息仍生成可规范化且可重试的有界来源列表", () => {
    const messages = Array.from({ length: 320 }, (_, index) =>
      message(
        `m${index + 1}`,
        index % 2 === 0 ? "user" : "assistant",
        `短消息 ${index + 1}`
      )
    );

    const first = prepareConversationRecapRequest(messages);
    expect(first.success).toBe(true);
    if (!first.success) return;
    expect(first.meta.sourceMessageIds.length).toBe(256);
    expect(first.meta.coveredMessageCount).toBe(256);
    expect(first.meta.totalMessageCount).toBe(320);
    expect(first.meta.truncated).toBe(true);
    expect(normalizeConversationRecapMeta(first.meta)).toEqual(first.meta);
    expect(prepareConversationRecapRequest(messages, first.meta)).toEqual(first);
  });

  test("没有可回顾文字时返回可读错误", () => {
    expect(prepareConversationRecapRequest([])).toEqual({
      success: false,
      error: "当前会话还没有可回顾的文字内容。",
    });
  });
});
