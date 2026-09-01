import { describe, expect, test } from "bun:test";
import {
  WEB_READING_SYSTEM_PROMPT,
  buildWebReadingUserPrompt,
  extractSuggestedQuestions,
  MAX_PAGE_CONTENT_CHARS,
} from "../entrypoints/shared/webReadingPrompt.ts";

describe("Web Reading Prompt Engineering", () => {
  test("WEB_READING_SYSTEM_PROMPT includes all 4 structured sections", () => {
    expect(WEB_READING_SYSTEM_PROMPT).toContain("一句话大白话总览");
    expect(WEB_READING_SYSTEM_PROMPT).toContain("核心黑话/专业术语速查表");
    expect(WEB_READING_SYSTEM_PROMPT).toContain("要点与行动项提炼");
    expect(WEB_READING_SYSTEM_PROMPT).toContain("深度追问指引");
    expect(WEB_READING_SYSTEM_PROMPT).toContain("生活比喻");
  });

  test("buildWebReadingUserPrompt formats metadata and content correctly", () => {
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
    expect(prompt).toContain("大模型微调是指在预训练大模型的基础上");
    expect(prompt).toContain("请按照系统提示词的四个板块");
  });

  test("buildWebReadingUserPrompt truncates content exceeding MAX_PAGE_CONTENT_CHARS", () => {
    const longContent = "A".repeat(MAX_PAGE_CONTENT_CHARS + 5000);
    const pageMeta = {
      title: "超长文章测试",
      url: "https://example.com/long-article",
      content: longContent,
      wordCount: 20000,
    };

    const prompt = buildWebReadingUserPrompt(pageMeta);
    expect(prompt).toContain(`已截取前 ${MAX_PAGE_CONTENT_CHARS} 字符`);
    // 内容部分长度不超过限制 + 结构模板
    expect(prompt.length).toBeLessThan(MAX_PAGE_CONTENT_CHARS + 2000);
  });

  test("extractSuggestedQuestions parses questions from markdown output", () => {
    const markdownResponse = `
### 💡 一句话大白话总览
这篇文章主要是说，别一窝蜂自己训大模型，直接调 API 或者做 RAG 最划算。

### 📖 核心黑话/专业术语速查表
| 术语名称 | 一句话大白话释义 |
|---|---|
| RAG | 相当于给大模型配了一本带目录的参考书，用的时候现查现答 |
| LoRA | 相当于给大模型加了一个外挂小插件，不改动本体 |

### 🎯 要点与行动项提炼
1. **不要盲目预训练**：成本极高且容易翻车。
2. **优先使用 RAG**：90% 的企业知识库场景足够用。
3. **小步快跑验证**：先用开源 demo 验证业务闭环。

### 💬 深度追问指引
1. 企业如果在私有云部署 RAG，硬件最低门槛是多少？
2. 文中提到的 LoRA 微调有哪些容易被忽视的缺点？
3. 如果我的数据量只有几千条，做微调还是做知识库更好？
`;

    const questions = extractSuggestedQuestions(markdownResponse);
    expect(questions.length).toBe(3);
    expect(questions[0]).toContain("企业如果在私有云部署 RAG");
    expect(questions[1]).toContain("LoRA 微调有哪些容易被忽视的缺点");
    expect(questions[2]).toContain("如果我的数据量只有几千条");
  });

  test("extractSuggestedQuestions returns high-quality fallback questions when none parsed", () => {
    const emptyResponse = "简短回答没有列出指引。";
    const questions = extractSuggestedQuestions(emptyResponse);
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions[0]).toContain("小白视角");
  });
});
