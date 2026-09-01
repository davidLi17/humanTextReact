import { describe, expect, test } from "bun:test";
import {
  formatQuoteMarkdown,
  extractQuotePreview,
  removeQuoteFromInputText,
  calculateQuotePosition,
  isNodeInMessageBubble,
  isValidMessageSelection,
} from "../entrypoints/sidepanel/utils/quoteUtils.ts";

describe("Quote Integration and Interaction Logic", () => {
  test("isNodeInMessageBubble properly filters message content vs exclusions", () => {
    // 模拟 DOM 节点树
    const createNode = (tagName, className = "", parent = null) => {
      const el = {
        tagName: tagName.toUpperCase(),
        className,
        parentElement: parent,
        isContentEditable: false,
        getAttribute: (attr) => null,
      };
      return el;
    };

    // 1. 消息卡片内部正文
    const bubbleCard = createNode("div", "bubble-card user-card");
    const markdownContent = createNode("div", "markdown-content", bubbleCard);
    const paragraph = createNode("p", "", markdownContent);
    const textNode = { nodeType: 3, parentElement: paragraph };

    expect(isNodeInMessageBubble(textNode)).toBe(true);

    // 2. 排除输入框内部
    const textarea = createNode("textarea", "chat-textarea");
    const textareaText = { nodeType: 3, parentElement: textarea };
    expect(isNodeInMessageBubble(textareaText)).toBe(false);

    // 3. 排除底部操作栏和按钮
    const footer = createNode("footer", "chat-input-footer");
    const footerBtn = createNode("button", "send-btn", footer);
    expect(isNodeInMessageBubble(footerBtn)).toBe(false);

    // 4. 排除行内编辑区
    const inlineEdit = createNode("div", "inline-edit-footer");
    expect(isNodeInMessageBubble(inlineEdit)).toBe(false);
  });

  test("isValidMessageSelection handles empty, collapsed, or valid ranges", () => {
    expect(isValidMessageSelection(null)).toBe(false);
    expect(
      isValidMessageSelection({ rangeCount: 0, isCollapsed: false })
    ).toBe(false);
    expect(
      isValidMessageSelection({
        rangeCount: 1,
        isCollapsed: true,
        toString: () => "text",
      })
    ).toBe(false);
    expect(
      isValidMessageSelection({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => "   ",
      })
    ).toBe(false);
  });

  test("Full quote lifecycle: quote -> format -> edit -> remove", () => {
    const rawQuote = "这是一个重要的大厂黑话术语（如：底层逻辑与顶层设计）";

    // 1. 格式化引用
    const formatted = formatQuoteMarkdown(rawQuote);
    expect(formatted).toContain("> 引用自历史文字:");
    expect(formatted).toContain("> 这是一个重要的大厂黑话术语");

    // 2. 生成微型胶囊预览
    const preview = extractQuotePreview(rawQuote, 20);
    expect(preview.length).toBeLessThanOrEqual(23);
    expect(preview).toContain("...");

    // 3. 用户在输入框末尾键入追问
    const userInput = `${formatted}请问这里的“底层逻辑”具体是指什么？`;

    // 4. 用户点击 ✕ 取消引用，输入框自动保留用户键入的问题
    const remaining = removeQuoteFromInputText(userInput, rawQuote);
    expect(remaining).toBe("请问这里的“底层逻辑”具体是指什么？");
  });

  test("calculateQuotePosition respects placement and boundary clamping", () => {
    const containerRect = {
      top: 0,
      bottom: 800,
      left: 0,
      right: 420,
      width: 420,
      height: 800,
    };

    // 正常中间位置选区
    const midSelection = {
      top: 400,
      bottom: 420,
      left: 100,
      right: 300,
      width: 200,
      height: 20,
    };

    const midPos = calculateQuotePosition({
      selectionRect: midSelection,
      containerRect,
    });

    expect(midPos.placement).toBe("top");
    expect(midPos.left).toBeGreaterThan(0);
    expect(midPos.left).toBeLessThan(420);
    expect(midPos.top).toBe(400 - 30 - 8); // 362
  });
});
