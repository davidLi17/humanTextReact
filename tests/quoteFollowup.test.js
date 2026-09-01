import { describe, expect, test } from "bun:test";
import {
  buildQuotePrompt,
  parseQuotePrompt,
  formatQuoteBlock,
  truncateQuoteText,
  isValidQuoteSelection,
  calculateFloatingQuotePosition,
  DEFAULT_MAX_QUOTE_CHARS,
  DEFAULT_QUOTE_HEADER,
} from "../entrypoints/shared/quoteFollowup.ts";
import {
  isNodeInMessageBubble,
} from "../entrypoints/sidepanel/utils/quoteUtils.ts";

function createMockElement(tagName = "div", className = "", isContentEditable = false) {
  const classes = new Set(className ? className.split(/\s+/) : []);
  const el = {
    tagName: tagName.toUpperCase(),
    nodeType: 1,
    parentElement: null,
    className,
    isContentEditable,
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => classes.add(c),
    },
    appendChild: (child) => {
      child.parentElement = el;
      return child;
    },
  };
  return el;
}

function createMockTextNode(text) {
  return {
    nodeType: 3,
    textContent: text,
    parentElement: null,
  };
}

describe("Quote Followup Prompt Engineering and Utilities", () => {
  describe("isValidQuoteSelection", () => {
    test("validates non-empty trimmed strings correctly", () => {
      expect(isValidQuoteSelection("这是一段黑话")).toBe(true);
      expect(isValidQuoteSelection("  对齐颗粒度  ")).toBe(true);
      expect(isValidQuoteSelection("A")).toBe(true);
    });

    test("invalidates empty or whitespace-only inputs", () => {
      expect(isValidQuoteSelection("")).toBe(false);
      expect(isValidQuoteSelection("   ")).toBe(false);
      expect(isValidQuoteSelection("\n\t  \r")).toBe(false);
      expect(isValidQuoteSelection(null)).toBe(false);
      expect(isValidQuoteSelection(undefined)).toBe(false);
      expect(isValidQuoteSelection(123)).toBe(false);
    });
  });

  describe("truncateQuoteText", () => {
    test("keeps text shorter than maxChars unchanged", () => {
      const text = "短文本引用";
      expect(truncateQuoteText(text, 20)).toBe("短文本引用");
    });

    test("truncates text exceeding maxChars and appends ellipsis", () => {
      const longText = "这是一段非常长的大厂职场黑话描述内容用于测试截断逻辑";
      const truncated = truncateQuoteText(longText, 10);
      expect(truncated).toBe("这是一段非常长的大厂...");
      expect(truncated.length).toBe(13); // 10 chars + '...'
    });

    test("handles non-string inputs safely", () => {
      expect(truncateQuoteText(null)).toBe("");
      expect(truncateQuoteText(undefined)).toBe("");
    });
  });

  describe("formatQuoteBlock", () => {
    test("formats single line quote into markdown blockquote with header", () => {
      const result = formatQuoteBlock("什么是 RAG？");
      expect(result).toBe("> 引用自历史文字:\n> 什么是 RAG？");
    });

    test("formats multiline quote with each line prefixed by >", () => {
      const quote = "第一行描述\n第二行描述\n第三行描述";
      const result = formatQuoteBlock(quote);
      expect(result).toBe(
        "> 引用自历史文字:\n> 第一行描述\n> 第二行描述\n> 第三行描述"
      );
    });

    test("uses custom quote header when provided", () => {
      const result = formatQuoteBlock("核心观点", "引用助手回答:");
      expect(result).toBe("> 引用助手回答:\n> 核心观点");
    });

    test("returns empty string when quote is blank", () => {
      expect(formatQuoteBlock("")).toBe("");
      expect(formatQuoteBlock("   ")).toBe("");
    });
  });

  describe("buildQuotePrompt", () => {
    test("formats standard quote and user instruction with double newline spacing", () => {
      const quoteText = "RAG 相当于给大模型配了一本带目录的参考书";
      const instruction = "请进一步举例说明如何设计召回策略？";

      const prompt = buildQuotePrompt(quoteText, instruction);

      expect(prompt).toBe(
        `> 引用自历史文字:\n> RAG 相当于给大模型配了一本带目录的参考书\n\n请进一步举例说明如何设计召回策略？`
      );
    });

    test("handles empty user instruction gracefully", () => {
      const quoteText = "只有引用没有追问指令";
      const prompt = buildQuotePrompt(quoteText, "");

      expect(prompt).toBe(`> 引用自历史文字:\n> 只有引用没有追问指令`);
    });

    test("returns user instruction directly when quoteText is empty", () => {
      const prompt = buildQuotePrompt("", "单纯的用户问题");
      expect(prompt).toBe("单纯的用户问题");

      const whitespacePrompt = buildQuotePrompt("   ", "单纯的用户问题");
      expect(whitespacePrompt).toBe("单纯的用户问题");
    });

    test("handles multiline user instructions correctly", () => {
      const quoteText = "微调的成本很高";
      const instruction = "1. 如果预算只有 1 万元怎么办？\n2. 应该选哪家云厂商？";

      const prompt = buildQuotePrompt(quoteText, instruction);
      expect(prompt).toContain("> 引用自历史文字:\n> 微调的成本很高");
      expect(prompt).toContain("1. 如果预算只有 1 万元怎么办？\n2. 应该选哪家云厂商？");
    });

    test("truncates quotes exceeding maxChars automatically", () => {
      const longQuote = "A".repeat(1500);
      const instruction = "请总结这段话";

      const prompt = buildQuotePrompt(longQuote, instruction, {
        maxChars: 500,
      });

      expect(prompt).toContain("A".repeat(500) + "...");
      expect(prompt).not.toContain("A".repeat(501));
      expect(prompt).toContain("请总结这段话");
    });
  });

  describe("parseQuotePrompt", () => {
    test("parses structured quote prompt into quoteText and userInstruction", () => {
      const prompt = `> 引用自历史文字:
> 这段是选中的历史回答
> 包含多行内容

用户输入的具体追问内容`;

      const parsed = parseQuotePrompt(prompt);
      expect(parsed).not.toBeNull();
      expect(parsed?.quoteText).toBe("这段是选中的历史回答\n包含多行内容");
      expect(parsed?.userInstruction).toBe("用户输入的具体追问内容");
    });

    test("parses prompt with only quote and no instruction", () => {
      const prompt = `> 引用自历史文字:
> 仅有引用文字`;

      const parsed = parseQuotePrompt(prompt);
      expect(parsed).not.toBeNull();
      expect(parsed?.quoteText).toBe("仅有引用文字");
      expect(parsed?.userInstruction).toBe("");
    });

    test("returns null for non-quote messages", () => {
      expect(parseQuotePrompt("普通文本消息，没有引用")).toBeNull();
      expect(parseQuotePrompt("")).toBeNull();
      expect(parseQuotePrompt(null)).toBeNull();
      expect(parseQuotePrompt(undefined)).toBeNull();
    });
  });

  describe("calculateFloatingQuotePosition", () => {
    const defaultButtonDimensions = { width: 76, height: 28 };
    const defaultContainerRect = {
      top: 100,
      bottom: 700,
      left: 50,
      right: 450,
      width: 400,
      height: 600,
    };

    test("positions button above the selection centered horizontally when space allows", () => {
      const selectionRect = {
        top: 300,
        bottom: 320,
        left: 150,
        right: 250,
        width: 100,
        height: 20,
      };

      const result = calculateFloatingQuotePosition({
        selectionRect,
        containerRect: defaultContainerRect,
        buttonDimensions: defaultButtonDimensions,
        offset: 6,
        edgePadding: 8,
      });

      expect(result.placement).toBe("top");
      // relTop = 300 - 100 = 200. top = 200 - 28 - 6 = 166
      expect(result.top).toBe(166);
      // relLeft = 150 - 50 = 100. center = 100 + (100 - 76) / 2 = 112
      expect(result.left).toBe(112);
    });

    test("flips below selection when near top boundary of the container", () => {
      const selectionRect = {
        top: 105,
        bottom: 125,
        left: 150,
        right: 250,
        width: 100,
        height: 20,
      };

      const result = calculateFloatingQuotePosition({
        selectionRect,
        containerRect: defaultContainerRect,
        buttonDimensions: defaultButtonDimensions,
        offset: 6,
        edgePadding: 8,
      });

      // relTop = 105 - 100 = 5. topAbove = 5 - 28 - 6 = -29 < 8.
      // relBottom = 125 - 100 = 25. topBelow = 25 + 6 = 31.
      expect(result.placement).toBe("bottom");
      expect(result.top).toBe(31);
      expect(result.left).toBe(112);
    });

    test("clamps position within container left and right edge padding", () => {
      const selectionNearLeft = {
        top: 300,
        bottom: 320,
        left: 52,
        right: 82,
        width: 30,
        height: 20,
      };

      const result = calculateFloatingQuotePosition({
        selectionRect: selectionNearLeft,
        containerRect: defaultContainerRect,
        buttonDimensions: defaultButtonDimensions,
        edgePadding: 8,
      });

      expect(result.left).toBe(8);

      const selectionNearRight = {
        top: 300,
        bottom: 320,
        left: 420,
        right: 445,
        width: 25,
        height: 20,
      };

      const resultRight = calculateFloatingQuotePosition({
        selectionRect: selectionNearRight,
        containerRect: defaultContainerRect,
        buttonDimensions: defaultButtonDimensions,
        edgePadding: 8,
      });

      // maxLeft = 400 - 76 - 8 = 316
      expect(resultRight.left).toBe(316);
    });

    test("adds scroll offset when container is scrolled", () => {
      const selectionRect = {
        top: 400,
        bottom: 420,
        left: 150,
        right: 250,
        width: 100,
        height: 20,
      };

      const result = calculateFloatingQuotePosition({
        selectionRect,
        containerRect: defaultContainerRect,
        buttonDimensions: defaultButtonDimensions,
        scrollTop: 150,
        scrollLeft: 20,
      });

      // relTop = 400 - 100 = 300. topAbove = 300 - 28 - 6 + 150 = 416
      expect(result.top).toBe(416);
      expect(result.left).toBe(112 + 20);
    });
  });

  describe("Quote State Flow and Lifecycle", () => {
    test("simulates selection quote creation, injection into prompt, and clear cycle", () => {
      // 1. 模拟选区识别
      const selectedRaw = " 大模型外挂知识库检索增强生成 ";
      expect(isValidQuoteSelection(selectedRaw)).toBe(true);

      // 2. 生成标准引用结构
      const quoteSnippet = {
        text: selectedRaw.trim(),
        quoteSource: "assistant",
        messageId: "msg-123",
        createdAt: 1720000000000,
      };
      expect(quoteSnippet.text).toBe("大模型外挂知识库检索增强生成");
      expect(quoteSnippet.quoteSource).toBe("assistant");

      // 3. 用户输入指令并构建发送 Prompt
      const userInstruction = "请对比它与微调的成本差异";
      const finalPrompt = buildQuotePrompt(quoteSnippet.text, userInstruction);

      expect(finalPrompt).toBe(
        `> 引用自历史文字:\n> 大模型外挂知识库检索增强生成\n\n请对比它与微调的成本差异`
      );

      // 4. 发送后逆向解析验证
      const parsed = parseQuotePrompt(finalPrompt);
      expect(parsed?.quoteText).toBe("大模型外挂知识库检索增强生成");
      expect(parsed?.userInstruction).toBe("请对比它与微调的成本差异");

      // 5. 模拟发送后清理引用
      let currentQuote = quoteSnippet;
      currentQuote = null;
      expect(currentQuote).toBeNull();
    });
  });

  describe("Selection Exclusion and Node Identification", () => {
    test("identifies nodes in message bubbles vs input/control elements", () => {
      const normalDiv = createMockElement("div", "markdown-content");
      const textNode = createMockTextNode("普通正文");
      normalDiv.appendChild(textNode);
      expect(isNodeInMessageBubble(textNode)).toBe(true);
      expect(isNodeInMessageBubble(normalDiv)).toBe(true);

      const inputEl = createMockElement("input");
      const textareaEl = createMockElement("textarea");
      const buttonEl = createMockElement("button");
      const chatTextarea = createMockElement("div", "chat-input-footer");

      expect(isNodeInMessageBubble(inputEl)).toBe(false);
      expect(isNodeInMessageBubble(textareaEl)).toBe(false);
      expect(isNodeInMessageBubble(buttonEl)).toBe(false);
      expect(isNodeInMessageBubble(chatTextarea)).toBe(false);
      expect(isNodeInMessageBubble(null)).toBe(false);
    });
  });
});
