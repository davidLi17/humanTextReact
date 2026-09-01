import { describe, expect, test } from "bun:test";
import {
  formatQuoteMarkdown,
  extractQuotePreview,
  removeQuoteFromInputText,
  calculateQuotePosition,
  DEFAULT_QUOTE_BAR_DIMENSIONS,
} from "../entrypoints/sidepanel/utils/quoteUtils.ts";

describe("Sidepanel Quote Utils", () => {
  test("formatQuoteMarkdown formats single-line and multi-line selected text", () => {
    expect(formatQuoteMarkdown("")).toBe("");
    expect(formatQuoteMarkdown("  ")).toBe("");

    const single = formatQuoteMarkdown("这是一段术语解释");
    expect(single).toBe("> 引用自历史文字:\n> 这是一段术语解释\n\n");

    const multi = formatQuoteMarkdown("第一行\n第二行\n第三行");
    expect(multi).toBe(
      "> 引用自历史文字:\n> 第一行\n> 第二行\n> 第三行\n\n"
    );
  });

  test("extractQuotePreview truncates text gracefully", () => {
    expect(extractQuotePreview("")).toBe("");
    expect(extractQuotePreview("短文本", 10)).toBe("短文本");
    expect(extractQuotePreview("超长文本超长文本超长文本超长文本", 10)).toBe(
      "超长文本超长文本超长..."
    );
    expect(extractQuotePreview("多行\n换行\t测试", 20)).toBe("多行 换行 测试");
  });

  test("removeQuoteFromInputText removes formatted quote accurately", () => {
    const quote = "选中的句子";
    const formatted = formatQuoteMarkdown(quote);
    const inputWithQuestion = `${formatted}这句话怎么理解？`;

    // 1. 指定 quotedText 移除
    expect(removeQuoteFromInputText(inputWithQuestion, quote)).toBe(
      "这句话怎么理解？"
    );

    // 2. 通用正则匹配移除
    expect(removeQuoteFromInputText(inputWithQuestion)).toBe(
      "这句话怎么理解？"
    );

    // 3. 无引用内容原样返回
    expect(removeQuoteFromInputText("普通提问内容")).toBe("普通提问内容");
  });

  test("calculateQuotePosition places quote bar above selection when enough space", () => {
    const containerRect = {
      top: 100,
      bottom: 700,
      left: 50,
      right: 450,
      width: 400,
      height: 600,
    };
    const selectionRect = {
      top: 300,
      bottom: 320,
      left: 150,
      right: 250,
      width: 100,
      height: 20,
    };

    const pos = calculateQuotePosition({
      selectionRect,
      containerRect,
      barDimensions: { width: 80, height: 30 },
      offset: 8,
      edgePadding: 10,
    });

    // 选区中心相对容器: 150 + 50 - 50 = 150; left = 150 - 40 = 110
    expect(pos.left).toBe(110);
    // topPlacement: 300 - 100 - 30 - 8 = 162
    expect(pos.top).toBe(162);
    expect(pos.placement).toBe("top");
  });

  test("calculateQuotePosition flips to bottom when selection is near top edge", () => {
    const containerRect = {
      top: 100,
      bottom: 700,
      left: 50,
      right: 450,
      width: 400,
      height: 600,
    };
    const selectionRect = {
      top: 105, // 仅距离 container 顶部 5px
      bottom: 125,
      left: 150,
      right: 250,
      width: 100,
      height: 20,
    };

    const pos = calculateQuotePosition({
      selectionRect,
      containerRect,
      barDimensions: { width: 80, height: 30 },
      offset: 8,
      edgePadding: 10,
    });

    expect(pos.placement).toBe("bottom");
    // bottomPlacement: 125 - 100 + 8 = 33
    expect(pos.top).toBe(33);
  });

  test("calculateQuotePosition clamps left coordinate within padding boundaries", () => {
    const containerRect = {
      top: 0,
      bottom: 600,
      left: 0,
      right: 400,
      width: 400,
      height: 600,
    };
    // 选区在最左侧
    const leftSelection = {
      top: 200,
      bottom: 220,
      left: 0,
      right: 20,
      width: 20,
      height: 20,
    };

    const posLeft = calculateQuotePosition({
      selectionRect: leftSelection,
      containerRect,
      barDimensions: { width: 80, height: 30 },
      edgePadding: 12,
    });
    expect(posLeft.left).toBe(12);

    // 选区在最右侧
    const rightSelection = {
      top: 200,
      bottom: 220,
      left: 380,
      right: 400,
      width: 20,
      height: 20,
    };

    const posRight = calculateQuotePosition({
      selectionRect: rightSelection,
      containerRect,
      barDimensions: { width: 80, height: 30 },
      edgePadding: 12,
    });
    expect(posRight.left).toBe(400 - 80 - 12); // 308
  });
});
