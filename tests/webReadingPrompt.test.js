import { describe, expect, test } from "bun:test";
import {
  WEB_READING_SYSTEM_PROMPT,
  buildWebReadingUserPrompt,
  extractSuggestedQuestions,
  MAX_PAGE_CONTENT_CHARS,
} from "../entrypoints/shared/webReadingPrompt.ts";

describe("Web Reading Prompt Engineering", () => {
  describe("WEB_READING_SYSTEM_PROMPT", () => {
    test("includes all 4 structured sections and requirements", () => {
      expect(WEB_READING_SYSTEM_PROMPT).toContain("💡 一句话大白话总览");
      expect(WEB_READING_SYSTEM_PROMPT).toContain("📖 核心黑话/专业术语速查表");
      expect(WEB_READING_SYSTEM_PROMPT).toContain("🎯 要点与行动项提炼");
      expect(WEB_READING_SYSTEM_PROMPT).toContain("💬 深度追问指引");
      expect(WEB_READING_SYSTEM_PROMPT).toContain("生活比喻");
      expect(WEB_READING_SYSTEM_PROMPT).toContain("英文缩写");
    });
  });

  describe("buildWebReadingUserPrompt", () => {
    test("formats complete metadata and content correctly", () => {
      const pageMeta = {
        title: "深入浅出大模型微调指南",
        url: "https://example.com/posts/llm-finetuning",
        content: "大模型微调是指在预训练大模型的基础上使用特定领域的数据进行参数优化...",
        wordCount: 1500,
      };

      const prompt = buildWebReadingUserPrompt(pageMeta);
      expect(prompt).toContain("【网页标题】: 深入浅出大模型微调指南");
      expect(prompt).toContain("【来源链接】: https://example.com/posts/llm-finetuning");
      expect(prompt).toContain("【原文预估字数】: 约 1500 字");
      expect(prompt).toContain("```text\n大模型微调是指在预训练大模型的基础上使用特定领域的数据进行参数优化...\n```");
      expect(prompt).toContain("请按照系统提示词的四个板块");
    });

    test("handles missing or empty title and optional fields gracefully", () => {
      const prompt = buildWebReadingUserPrompt({
        title: "",
        url: "",
        content: "短文内容",
      });

      expect(prompt).toContain("【网页标题】: 未知网页标题");
      expect(prompt).not.toContain("【来源链接】");
      expect(prompt).not.toContain("【原文预估字数】");
      expect(prompt).not.toContain("【注】: 原文较长");
      expect(prompt).toContain("```text\n短文内容\n```");
    });

    test("handles exact boundary at MAX_PAGE_CONTENT_CHARS without truncation note", () => {
      const exactContent = "X".repeat(MAX_PAGE_CONTENT_CHARS);
      const prompt = buildWebReadingUserPrompt({
        title: "边界测试",
        url: "https://example.com",
        content: exactContent,
      });

      expect(prompt).not.toContain("【注】: 原文较长");
      expect(prompt).toContain(exactContent);
    });

    test("truncates content exceeding MAX_PAGE_CONTENT_CHARS and includes warning note", () => {
      const excessContent = "A".repeat(MAX_PAGE_CONTENT_CHARS + 500);
      const prompt = buildWebReadingUserPrompt({
        title: "超长文章",
        url: "https://example.com/long",
        content: excessContent,
        wordCount: 17000,
      });

      expect(prompt).toContain(`【注】: 原文较长，已截取前 ${MAX_PAGE_CONTENT_CHARS} 字符进行深度通读。`);
      expect(prompt).toContain("A".repeat(MAX_PAGE_CONTENT_CHARS));
      expect(prompt).not.toContain("A".repeat(MAX_PAGE_CONTENT_CHARS + 1));
    });

    test("handles empty or whitespace content", () => {
      const prompt = buildWebReadingUserPrompt({
        title: "  空格标题  ",
        url: "  https://example.com/space  ",
        content: "   \n\n  ",
      });

      expect(prompt).toContain("【网页标题】: 空格标题");
      expect(prompt).toContain("【来源链接】: https://example.com/space");
      expect(prompt).toContain("```text\n\n```");
    });
  });

  describe("extractSuggestedQuestions", () => {
    test("returns empty array for falsy or empty text", () => {
      expect(extractSuggestedQuestions("")).toEqual([]);
      expect(extractSuggestedQuestions(null)).toEqual([]);
      expect(extractSuggestedQuestions(undefined)).toEqual([]);
    });

    test("parses questions from dedicated 深度追问指引 section", () => {
      const markdown = `
### 💡 一句话大白话总览
总结概述

### 💬 深度追问指引
1. 企业如果在私有云部署 RAG，硬件最低门槛是多少？
2. 文中提到的 LoRA 微调有哪些容易被忽视的缺点？
3. 如果我的数据量只有几千条，做微调还是做知识库更好？
`;

      const questions = extractSuggestedQuestions(markdown);
      expect(questions.length).toBe(3);
      expect(questions[0]).toBe("企业如果在私有云部署 RAG，硬件最低门槛是多少？");
      expect(questions[1]).toBe("文中提到的 LoRA 微调有哪些容易被忽视的缺点？");
      expect(questions[2]).toBe("如果我的数据量只有几千条，做微调还是做知识库更好？");
    });

    test("handles various bullet and prefix styles", () => {
      const markdown = `
深度追问指引
1、如何低成本实现私有化部署？
2) 为什么向量数据库查询可能出现幻觉？
- 建议如何选择评估指标？
* 是否需要先进行数据清洗？
• 怎么快速验证提示词效果？
? 方案的扩展性局限是什么？
❓ 如何衡量团队的落地ROI？
💬 思考：什么时候应该放弃微调？
问题 1: 如何平衡延迟与成本？
问题2：怎么设计降级策略？
`;

      const questions = extractSuggestedQuestions(markdown);
      expect(questions.length).toBe(4); // capped at 4
      expect(questions[0]).toBe("如何低成本实现私有化部署？");
      expect(questions[1]).toBe("为什么向量数据库查询可能出现幻觉？");
      expect(questions[2]).toBe("建议如何选择评估指标？");
      expect(questions[3]).toBe("是否需要先进行数据清洗？");
    });

    test("cleans up markdown bold, underscores, and quote decorations", () => {
      const markdown = `
### 💬 深度追问指引
1. **如何理解这一技术路线的优缺点？**
2. __怎么选择适合自己业务的模型规模？__
3. "为什么小参数模型反而表现更好？"
4. 「建议采用哪种混合检索机制？」
`;

      const questions = extractSuggestedQuestions(markdown);
      expect(questions).toEqual([
        "如何理解这一技术路线的优缺点？",
        "怎么选择适合自己业务的模型规模？",
        "为什么小参数模型反而表现更好？",
        "建议采用哪种混合检索机制？",
      ]);
    });

    test("filters out lines that are too short, too long, or lack trigger keywords", () => {
      const markdown = `
### 💬 深度追问指引
1. 问?
2. 这是一段超级超级长的话，没有任何实质内容并且超过了八十个字符以至于它根本不适合作为一个可以快捷点击的小胶囊问题进行展示，因此需要被算法过滤器直接过滤掉避免影响界面排版？
3. 这是一行没有疑问词和触发词的普通文本叙述没有任何引导性
4. 怎么在现有系统中快速集成？
`;

      const questions = extractSuggestedQuestions(markdown);
      expect(questions).toEqual([
        "怎么在现有系统中快速集成？",
      ]);
    });

    test("returns high-quality fallback questions when parsed output yields 0 suggestions", () => {
      const responseWithoutQuestions = `
### 💡 一句话大白话总览
这是一篇普通的总结，没有列出后续追问。
`;

      const questions = extractSuggestedQuestions(responseWithoutQuestions);
      expect(questions.length).toBe(3);
      expect(questions[0]).toContain("小白视角");
      expect(questions[1]).toContain("局限性");
      expect(questions[2]).toContain("行动项");
    });
  });
});
