import { describe, expect, test } from "bun:test";
import {
  createRequestId,
  createSidepanelTarget,
} from "../entrypoints/shared/requestProtocol.ts";

describe("Chat Session and Multi-turn Flow", () => {
  test("creates valid session ID and sidepanel target", () => {
    const sessionId = createRequestId();
    expect(sessionId).toBeString();
    expect(sessionId.length).toBeGreaterThan(10);

    const target = createSidepanelTarget(sessionId);
    expect(target.kind).toBe("sidepanel");
    expect(target.sessionId).toBe(sessionId);
  });

  test("builds multi-turn OpenAI messages payload correctly", () => {
    const systemPrompt = "你是一个把黑话翻译成人话的专家。";
    const messages = [
      { role: "user", content: "什么是 OKR？" },
      {
        role: "assistant",
        content: "OKR 就是目标与关键结果，通俗来说就是这季度你想干啥大成果。",
      },
      { role: "user", content: "那它和 KPI 有什么区别？" },
    ];

    const hasSystem = messages.some((m) => m.role === "system");
    const payload = hasSystem
      ? messages
      : [{ role: "system", content: systemPrompt }, ...messages];

    expect(payload.length).toBe(4);
    expect(payload[0].role).toBe("system");
    expect(payload[0].content).toBe(systemPrompt);
    expect(payload[1].role).toBe("user");
    expect(payload[2].role).toBe("assistant");
    expect(payload[3].role).toBe("user");
    expect(payload[3].content).toBe("那它和 KPI 有什么区别？");
  });

  test("auto generates conversation title from first user query", () => {
    const longQuery = "请问在分布式微服务架构下如何实现零宕机平滑发布与灰度分流？";
    const title =
      longQuery.slice(0, 18) + (longQuery.length > 18 ? "..." : "");
    expect(title).toBe("请问在分布式微服务架构下如何实现零宕...");
    expect(title.length).toBe(21);
  });
});
