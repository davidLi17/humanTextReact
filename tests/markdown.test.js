import { describe, expect, test } from "bun:test";
import { parseMarkdown } from "../shared/utils/markdown.ts";

describe("Markdown Parser for Chat and Sidepanel", () => {
  test("parses code blocks with copy container", () => {
    const md = "```ts\nconst a: number = 1;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("code-block-container");
    expect(html).toContain("code-language");
    expect(html).toContain("language-ts");
    expect(html).toContain("const a: number = 1;");
  });

  test("parses inline code, bold, lists, and quotes", () => {
    const md = `> 这是一段引用\n\n- 列表项1\n- 列表项2\n\n**加粗内容** 与 \`inline code\``;
    const html = parseMarkdown(md);
    expect(html).toContain("markdown-quote");
    expect(html).toContain("markdown-list");
    expect(html).toContain("list-item");
    expect(html).toContain("bold");
    expect(html).toContain("inline-code");
  });
});
