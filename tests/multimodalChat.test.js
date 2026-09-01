import { describe, expect, test } from "bun:test";
import {
  buildMessagesPayload,
  formatMultimodalContent,
} from "../entrypoints/background/translationService.ts";
import {
  buildHistoryPayload,
  formatMessageForPayload,
} from "../entrypoints/shared/chatTypes.ts";

describe("Multimodal Chat & History Payload Processing", () => {
  const mockImage1 = {
    data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    mimeType: "image/png",
    fileName: "image1.png",
  };

  const mockImage2 = {
    data: "data:image/jpeg;base64,secondImageBase64DataString==",
    mimeType: "image/jpeg",
    fileName: "image2.jpg",
  };

  describe("formatMessageForPayload (Frontend Chat Assembly)", () => {
    test("returns plain string content when message has no images", () => {
      const msg = {
        role: "user",
        content: "什么是敏捷开发？",
      };
      const formatted = formatMessageForPayload(msg);
      expect(formatted).toEqual({
        role: "user",
        content: "什么是敏捷开发？",
      });
    });

    test("converts message with images into standard multimodal content array", () => {
      const msg = {
        role: "user",
        content: "这是啥",
        images: [mockImage1],
      };
      const formatted = formatMessageForPayload(msg);

      expect(formatted.role).toBe("user");
      expect(Array.isArray(formatted.content)).toBe(true);
      expect(formatted.content).toEqual([
        {
          type: "image_url",
          image_url: { url: mockImage1.data },
        },
        {
          type: "text",
          text: "这是啥",
        },
      ]);
      expect(formatted.images).toEqual([mockImage1]);
    });

    test("supports multiple images in a single message", () => {
      const msg = {
        role: "user",
        content: "对比这两张设计稿",
        images: [mockImage1, mockImage2],
      };
      const formatted = formatMessageForPayload(msg);

      expect(formatted.content).toEqual([
        {
          type: "image_url",
          image_url: { url: mockImage1.data },
        },
        {
          type: "image_url",
          image_url: { url: mockImage2.data },
        },
        {
          type: "text",
          text: "对比这两张设计稿",
        },
      ]);
    });

    test("preserves existing array content if already formatted", () => {
      const arrayContent = [
        { type: "image_url", image_url: { url: mockImage1.data } },
        { type: "text", text: "已格式化的内容" },
      ];
      const msg = {
        role: "user",
        content: arrayContent,
        images: [mockImage1],
      };
      const formatted = formatMessageForPayload(msg);
      expect(formatted.content).toBe(arrayContent);
    });

    test("handles assistant messages without changing content", () => {
      const msg = {
        role: "assistant",
        content: "这是一张架构流程图。",
      };
      const formatted = formatMessageForPayload(msg);
      expect(formatted).toEqual({
        role: "assistant",
        content: "这是一张架构流程图。",
      });
    });
  });

  describe("buildHistoryPayload (Multi-turn History Construction)", () => {
    test("builds complete multi-turn history payload preserving images across rounds", () => {
      const sessionMessages = [
        {
          id: "m-1",
          role: "user",
          content: "这是啥架构？",
          images: [mockImage1],
          createdAt: 1000,
        },
        {
          id: "m-2",
          role: "assistant",
          content: "这是一个微服务网关架构。",
          createdAt: 2000,
        },
        {
          id: "m-3",
          role: "user",
          content: "那右上角的模块起什么作用？",
          createdAt: 3000,
        },
        {
          id: "m-4",
          role: "assistant",
          content: "右上角是分布式配置中心。",
          createdAt: 4000,
        },
      ];

      const currentMessage = {
        role: "user",
        content: "看看这张新图有何区别",
        images: [mockImage2],
      };

      const payload = buildHistoryPayload(sessionMessages, currentMessage);

      expect(payload.length).toBe(5);

      // 第1轮提问（带图片）
      expect(payload[0].role).toBe("user");
      expect(payload[0].content).toEqual([
        { type: "image_url", image_url: { url: mockImage1.data } },
        { type: "text", text: "这是啥架构？" },
      ]);

      // 第1轮回答
      expect(payload[1]).toEqual({
        role: "assistant",
        content: "这是一个微服务网关架构。",
      });

      // 第2轮提问（纯文本追问）
      expect(payload[2]).toEqual({
        role: "user",
        content: "那右上角的模块起什么作用？",
      });

      // 第2轮回答
      expect(payload[3]).toEqual({
        role: "assistant",
        content: "右上角是分布式配置中心。",
      });

      // 当前新一轮提问（带新图片）
      expect(payload[4].role).toBe("user");
      expect(payload[4].content).toEqual([
        { type: "image_url", image_url: { url: mockImage2.data } },
        { type: "text", text: "看看这张新图有何区别" },
      ]);
    });
  });

  describe("formatMultimodalContent (Low-level Content Formatter)", () => {
    test("returns text as string when no images provided", () => {
      const result = formatMultimodalContent("纯文本测试", []);
      expect(result).toBe("纯文本测试");
    });

    test("returns multimodal array when images provided", () => {
      const result = formatMultimodalContent("识图测试", [mockImage1]);
      expect(result).toEqual([
        { type: "image_url", image_url: { url: mockImage1.data } },
        { type: "text", text: "识图测试" },
      ]);
    });

    test("deduplicates images when content is already an array", () => {
      const initial = [
        { type: "image_url", image_url: { url: mockImage1.data } },
        { type: "text", text: "已存在第一张图" },
      ];
      // 传入包含相同图片及新图片的数组
      const result = formatMultimodalContent(initial, [mockImage1, mockImage2]);
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        // 只补充尚未包含的 mockImage2
        expect(result.length).toBe(3);
        expect(result[0]).toEqual({
          type: "image_url",
          image_url: { url: mockImage2.data },
        });
        expect(result[1]).toEqual(initial[0]);
        expect(result[2]).toEqual(initial[1]);
      }
    });
  });

  describe("buildMessagesPayload (TranslationService Multimodal Processing)", () => {
    test("single-turn: formats text + images into system + user multimodal array", () => {
      const payload = buildMessagesPayload({
        text: "这是啥",
        images: [mockImage1],
        promptTemplate: "你是一个翻译助手。",
      });

      expect(payload.length).toBe(2);
      expect(payload[0]).toEqual({
        role: "system",
        content: "你是一个翻译助手。",
      });
      expect(payload[1]).toEqual({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: mockImage1.data } },
          { type: "text", text: "这是啥" },
        ],
      });
    });

    test("single-turn: plain text without images keeps string content", () => {
      const payload = buildMessagesPayload({
        text: "仅有文本内容",
        images: [],
        promptTemplate: "你是一个翻译助手。",
      });

      expect(payload.length).toBe(2);
      expect(payload[0]).toEqual({
        role: "system",
        content: "你是一个翻译助手。",
      });
      expect(payload[1]).toEqual({
        role: "user",
        content: "仅有文本内容",
      });
    });

    test("multi-turn: injects top-level images into the last user message when sent from sidepanel", () => {
      // 模拟用户在侧边栏输入“这是啥”，附带 mockImage1，以 messages 方式发送
      const chatMessages = [
        { role: "user", content: "什么是大模型？" },
        { role: "assistant", content: "大模型是指..." },
        { role: "user", content: "这是啥" },
      ];

      const payload = buildMessagesPayload({
        messages: chatMessages,
        images: [mockImage1], // top-level images 传入
        promptTemplate: "系统提示词",
      });

      expect(payload.length).toBe(4); // system + 3 turns
      expect(payload[0].role).toBe("system");
      expect(payload[1]).toEqual({
        role: "user",
        content: "什么是大模型？",
      });
      expect(payload[2]).toEqual({
        role: "assistant",
        content: "大模型是指...",
      });
      // 最后一轮 user 消息被正确注入图片
      expect(payload[3]).toEqual({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: mockImage1.data } },
          { type: "text", text: "这是啥" },
        ],
      });
    });

    test("multi-turn: formats any historical turn carrying images into standard multimodal content", () => {
      const chatMessages = [
        {
          role: "user",
          content: "第一轮看图",
          images: [mockImage1],
        },
        {
          role: "assistant",
          content: "这是第一轮的图片解析",
        },
        {
          role: "user",
          content: "第二轮纯文字追问",
        },
      ];

      const payload = buildMessagesPayload({
        messages: chatMessages,
        promptTemplate: "系统提示词",
      });

      expect(payload.length).toBe(4);
      expect(payload[1]).toEqual({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: mockImage1.data } },
          { type: "text", text: "第一轮看图" },
        ],
      });
      expect(payload[2]).toEqual({
        role: "assistant",
        content: "这是第一轮的图片解析",
      });
      expect(payload[3]).toEqual({
        role: "user",
        content: "第二轮纯文字追问",
      });
    });

    test("multi-turn: preserves custom system prompt when already included in messages", () => {
      const customPrompt = "自定义系统提示词，严禁覆盖！";
      const chatMessages = [
        { role: "system", content: customPrompt },
        {
          role: "user",
          content: "请识别此图",
          images: [mockImage1],
        },
      ];

      const payload = buildMessagesPayload({
        messages: chatMessages,
        promptTemplate: "默认提示词（不应被使用）",
      });

      expect(payload.length).toBe(2);
      expect(payload[0]).toEqual({
        role: "system",
        content: customPrompt,
      });
      expect(payload[1]).toEqual({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: mockImage1.data } },
          { type: "text", text: "请识别此图" },
        ],
      });
    });

    test("multi-turn: prevents duplicate image_url when images are passed in both msg.images and params.images", () => {
      const chatMessages = [
        {
          role: "user",
          content: "看图",
          images: [mockImage1],
        },
      ];

      // 顶层又传入了相同的 mockImage1
      const payload = buildMessagesPayload({
        messages: chatMessages,
        images: [mockImage1],
        promptTemplate: "系统提示词",
      });

      expect(payload.length).toBe(2);
      const userContent = payload[1].content;
      expect(Array.isArray(userContent)).toBe(true);
      // 验证没有重复添加 mockImage1
      const imageUrlItems = userContent.filter(
        (item) => item.type === "image_url"
      );
      expect(imageUrlItems.length).toBe(1);
      expect(imageUrlItems[0].image_url.url).toBe(mockImage1.data);
    });
  });

  describe("End-to-End Sidepanel Multi-modal Flow Simulation", () => {
    test("simulates user sending text+image in sidepanel through buildHistoryPayload -> buildMessagesPayload", () => {
      // 1. 侧边栏当前已有 1 轮历史
      const currentSessionMessages = [
        {
          id: "msg-1",
          role: "user",
          content: "总结这篇文档",
          createdAt: 1000,
          status: "completed",
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "这是文档的三个要点...",
          createdAt: 2000,
          status: "completed",
        },
      ];

      // 2. 用户在侧边栏粘贴图片并输入“这是啥”，点击发送
      const userInputText = "这是啥";
      const userAttachedImages = [mockImage1];

      // 3. Sidepanel 构建 historyPayload
      const historyPayload = buildHistoryPayload(currentSessionMessages, {
        role: "user",
        content: userInputText,
        images: userAttachedImages,
      });

      expect(historyPayload.length).toBe(3);
      expect(historyPayload[2].content).toEqual([
        { type: "image_url", image_url: { url: mockImage1.data } },
        { type: "text", text: "这是啥" },
      ]);

      // 4. Background 接收到 messages (historyPayload) 与 images (userAttachedImages)
      const finalApiPayload = buildMessagesPayload({
        messages: historyPayload,
        images: userAttachedImages,
        promptTemplate: "人话翻译系统提示词",
      });

      // 5. 验证最终提交给 LLM 的 Payload 符合 OpenAI / 豆包 / Claude 多模态标准规范
      expect(finalApiPayload.length).toBe(4);
      expect(finalApiPayload[0]).toEqual({
        role: "system",
        content: "人话翻译系统提示词",
      });
      expect(finalApiPayload[1]).toEqual({
        role: "user",
        content: "总结这篇文档",
      });
      expect(finalApiPayload[2]).toEqual({
        role: "assistant",
        content: "这是文档的三个要点...",
      });
      expect(finalApiPayload[3]).toEqual({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: mockImage1.data } },
          { type: "text", text: "这是啥" },
        ],
      });
    });
  });
});
