import { describe, expect, test } from "bun:test";
import {
  buildMessagesPayload,
  formatMultimodalContent,
} from "../entrypoints/background/translationService.ts";
import { buildHistoryPayload } from "../entrypoints/shared/chatTypes.ts";

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
    test("sidepanel production history helper preserves historical/current images once and keeps one system", () => {
      const sidepanelHistory = buildHistoryPayload(
        [
          { role: "system", content: "网页通读系统提示词" },
          { role: "user", content: "第一轮看图", images: [mockImage1] },
          { role: "assistant", content: "第一轮回答" },
        ],
        { role: "user", content: "第二轮看图", images: [mockImage2] }
      );

      const payload = buildMessagesPayload({
        messages: sidepanelHistory,
        promptTemplate: "不应重复添加的默认提示词",
      });
      const serialized = JSON.stringify(payload);

      expect(
        payload.filter((message) => message.role === "system")
      ).toHaveLength(1);
      expect(serialized.split(mockImage1.data)).toHaveLength(2);
      expect(serialized.split(mockImage2.data)).toHaveLength(2);
    });

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

});
