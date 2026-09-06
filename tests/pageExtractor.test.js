import { describe, expect, test } from "bun:test";
import {
  cleanTitleSuffix,
  countWords,
  extractPageTitle,
} from "../entrypoints/content/pageExtractor.ts";

describe("Page Extractor Unit Tests", () => {
  test("cleanTitleSuffix strips common website brand suffixes", () => {
    expect(cleanTitleSuffix("为什么越来越多公司放弃微服务？ - 知乎")).toBe(
      "为什么越来越多公司放弃微服务？"
    );
    expect(cleanTitleSuffix("2026 前端架构演进指南 | 掘金")).toBe(
      "2026 前端架构演进指南"
    );
    expect(cleanTitleSuffix("深入理解 React 19 新特性 - 微信公众平台")).toBe(
      "深入理解 React 19 新特性"
    );
    expect(cleanTitleSuffix("GitHub Copilot 深度评测 - CSDN博客")).toBe(
      "GitHub Copilot 深度评测"
    );
  });

  test("countWords counts Chinese characters and English words correctly", () => {
    const cases = [
      ["", 0],
      ["   \n\t", 0],
      ["这是一段用于测试字数统计的纯中文正文", 18],
      ["Hello world from human translator", 5],
      ["用 React 19 和 AI 翻译器加速开发", 12],
      ["React-19 与 AI_tools", 3],
    ];

    for (const [text, expected] of cases) {
      expect(countWords(text)).toBe(expected);
    }
  });

  test("extractPageTitle handles mock document with og:title", () => {
    const mockDoc = {
      querySelector: (selector) => {
        if (selector === 'meta[property="og:title"]') {
          return { getAttribute: () => "AI 时代的工程师进化之路 - 少数派" };
        }
        return null;
      },
      title: "兜底标题",
    };

    const title = extractPageTitle(mockDoc);
    expect(title).toBe("AI 时代的工程师进化之路");
  });

  test("extractPageTitle falls back to h1 when meta tags not found", () => {
    const mockDoc = {
      querySelector: (selector) => {
        if (selector === "h1") {
          return { textContent: "关于端侧大模型的未来思考" };
        }
        return null;
      },
      title: "默认站点标题",
    };

    const title = extractPageTitle(mockDoc);
    expect(title).toBe("关于端侧大模型的未来思考");
  });
});
