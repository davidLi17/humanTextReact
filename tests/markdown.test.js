import { describe, expect, test, beforeEach } from "bun:test";
import {
  parseMarkdown,
  copyCode,
  initializeCodeCopy,
} from "../shared/utils/markdown.ts";

describe("Markdown Parser for Chat, Popup, and Sidepanel", () => {
  describe("parseMarkdown basics and edge cases", () => {
    test("handles empty, null, and undefined strings gracefully", () => {
      expect(parseMarkdown("")).toBe("");
      expect(parseMarkdown(null)).toBe("");
      expect(parseMarkdown(undefined)).toBe("");
    });

    test("normalizes CRLF and CR line endings to LF", () => {
      const input = "Line 1\r\n\r\nLine 2\r\rLine 3";
      const html = parseMarkdown(input);
      expect(html).toContain("<p class=\"markdown-paragraph\">Line 1</p>");
      expect(html).toContain("<p class=\"markdown-paragraph\">Line 2</p>");
      expect(html).toContain("<p class=\"markdown-paragraph\">Line 3</p>");
    });

    test("escapes raw HTML tags to prevent XSS injection", () => {
      const input = "<script>alert('xss')</script> and <div>test</div>";
      const html = parseMarkdown(input);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;alert('xss')&lt;/script&gt;");
      expect(html).toContain("&lt;div&gt;test&lt;/div&gt;");
    });
  });

  describe("Code blocks and inline code", () => {
    test("parses code blocks with specified language and copy button", () => {
      const md = "```ts\nconst a: number = 1;\n```";
      const html = parseMarkdown(md);
      expect(html).toContain("code-block-container");
      expect(html).toContain("<span class=\"code-language\">ts</span>");
      expect(html).toContain("data-code=\"const a: number = 1;\"");
      expect(html).toContain("<code class=\"language-ts\">const a: number = 1;</code>");
    });

    test("defaults code language to 'text' when omitted", () => {
      const md = "```\nplain text code\n```";
      const html = parseMarkdown(md);
      expect(html).toContain("<span class=\"code-language\">text</span>");
      expect(html).toContain("<code class=\"language-text\">plain text code</code>");
    });

    test("parses inline code tags correctly without conflicting with code blocks", () => {
      const md = "Use `console.log()` to debug.";
      const html = parseMarkdown(md);
      expect(html).toContain("<code class=\"inline-code\">console.log()</code>");
    });
  });

  describe("Headings and dividers", () => {
    test("parses h1 through h6 headings", () => {
      const md = `
# Title 1
## Title 2
### Title 3
#### Title 4
##### Title 5
###### Title 6
`;
      const html = parseMarkdown(md);
      expect(html).toContain("<h1>Title 1</h1>");
      expect(html).toContain("<h2>Title 2</h2>");
      expect(html).toContain("<h3>Title 3</h3>");
      expect(html).toContain("<h4>Title 4</h4>");
      expect(html).toContain("<h5>Title 5</h5>");
      expect(html).toContain("<h6>Title 6</h6>");
    });

    test("parses markdown horizontal dividers", () => {
      const md1 = "---";
      const md2 = "***";
      const md3 = "___";
      expect(parseMarkdown(md1)).toContain('<hr class="markdown-divider">');
      expect(parseMarkdown(md2)).toContain('<hr class="markdown-divider">');
      expect(parseMarkdown(md3)).toContain('<hr class="markdown-divider">');
    });
  });

  describe("Blockquotes", () => {
    test("parses single-line and multi-line blockquotes", () => {
      const md = "> 第一行引用\n> 第二行引用";
      const html = parseMarkdown(md);
      expect(html).toContain("<blockquote class=\"markdown-quote\">第一行引用<br>第二行引用</blockquote>");
    });

    test("parses HTML-escaped blockquote syntax &gt;", () => {
      const md = "&gt; 转义前缀引用";
      const html = parseMarkdown(md);
      expect(html).toContain("<blockquote class=\"markdown-quote\">转义前缀引用</blockquote>");
    });
  });

  describe("Tables", () => {
    test("parses markdown table with headers and data rows", () => {
      const md = `
| 术语 | 释义 | 例子 |
| --- | :---: | ---: |
| OKR | 目标与关键结果 | 减重10斤 |
| KPI | 关键绩效指标 | 打卡30天 |
`;
      const html = parseMarkdown(md);
      expect(html).toContain("<table class=\"markdown-table\">");
      expect(html).toContain("<thead><tr><th>术语</th><th>释义</th><th>例子</th></tr></thead>");
      expect(html).toContain("<tbody><tr><td>OKR</td><td>目标与关键结果</td><td>减重10斤</td></tr><tr><td>KPI</td><td>关键绩效指标</td><td>打卡30天</td></tr></tbody>");
    });
  });

  describe("Lists", () => {
    test("parses unordered lists with indentation levels", () => {
      const md = `
- 项 1
- 项 2
  * 子项 2.1
  * 子项 2.2
`;
      const html = parseMarkdown(md);
      expect(html).toContain("<ul class=\"markdown-list\">");
      expect(html).toContain("<li class=\"list-item level-0\">项 1</li>");
      expect(html).toContain("<li class=\"list-item level-0\">项 2</li>");
      expect(html).toContain("<li class=\"list-item level-1\">子项 2.1</li>");
    });

    test("parses ordered lists with numbering", () => {
      const md = `
1. 第一步
2. 第二步
  1. 第二步子项
`;
      const html = parseMarkdown(md);
      expect(html).toContain("<ol class=\"markdown-list\">");
      expect(html).toContain("<li class=\"list-item level-0\">第一步</li>");
      expect(html).toContain("<li class=\"list-item level-0\">第二步</li>");
      expect(html).toContain("<li class=\"list-item level-1\">第二步子项</li>");
    });
  });

  describe("Text styles (bold, italic, strikethrough, highlight)", () => {
    test("parses bold, italic, strikethrough, and highlight marks", () => {
      const md = "**粗体** *斜体* ~~删除线~~ ==高亮==";
      const html = parseMarkdown(md);
      expect(html).toContain("<strong class=\"bold\">粗体</strong>");
      expect(html).toContain("<em class=\"italic\">斜体</em>");
      expect(html).toContain("<del class=\"strikethrough\">删除线</del>");
      expect(html).toContain("<mark class=\"highlight\">高亮</mark>");
    });
  });

  describe("Links, images, and sanitization", () => {
    test("parses safe links and images with target blank", () => {
      const md = "[官方链接](https://example.com) ![Logo](https://example.com/logo.png)";
      const html = parseMarkdown(md);
      expect(html).toContain('<a href="https://example.com" class="markdown-link" target="_blank" rel="noopener noreferrer">官方链接</a>');
      expect(html).toContain('<img src="https://example.com/logo.png" alt="Logo" class="markdown-image" loading="lazy">');
    });

    test("sanitizes unsafe javascript URLs in links and images to '#'", () => {
      const md = "[恶意链接](javascript:alert(1)) ![恶意图片](javascript:evil())";
      const html = parseMarkdown(md);
      expect(html).toContain('<a href="#" class="markdown-link" target="_blank" rel="noopener noreferrer">恶意链接</a>');
      expect(html).toContain('<img src="#" alt="恶意图片" class="markdown-image" loading="lazy">');
    });

    test("allows mailto: and relative path links", () => {
      const md = "[联系我们](mailto:test@example.com) [文档](/docs/intro)";
      const html = parseMarkdown(md);
      expect(html).toContain('href="mailto:test@example.com"');
      expect(html).toContain('href="/docs/intro"');
    });
  });

  describe("Paragraph formatting", () => {
    test("wraps single-line text in paragraph tag", () => {
      const md = "这是独立的一行。";
      const html = parseMarkdown(md);
      expect(html).toBe('<p class="markdown-paragraph">这是独立的一行。</p>');
    });

    test("joins multi-line paragraphs with <br>", () => {
      const md = "第一行\n第二行";
      const html = parseMarkdown(md);
      expect(html).toBe('<p class="markdown-paragraph">第一行<br>第二行</p>');
    });

    test("does not wrap block elements (headers, tables, pre, hr, etc.) in <p>", () => {
      const md = "# 标题\n\n一段文字";
      const html = parseMarkdown(md);
      expect(html).toContain("<h1>标题</h1>");
      expect(html).toContain('<p class="markdown-paragraph">一段文字</p>');
      expect(html).not.toMatch(/<p[^>]*>\s*<h1>/);
    });
  });

  describe("copyCode and initializeCodeCopy", () => {
    let mockButton;
    let mockCopyIcon;
    let mockCheckIcon;
    let writtenClipboardText = "";

    beforeEach(() => {
      writtenClipboardText = "";
      mockCopyIcon = { style: { display: "block" } };
      mockCheckIcon = { style: { display: "none" } };

      mockButton = {
        getAttribute(attr) {
          if (attr === "data-code") return "console.log('hello');";
          return null;
        },
        querySelector(selector) {
          if (selector === ".copy-icon") return mockCopyIcon;
          if (selector === ".check-icon") return mockCheckIcon;
          return null;
        },
        classList: {
          contains: (cls) => cls === "copy-button",
        },
        closest: (selector) => {
          if (selector === ".copy-button") return mockButton;
          return null;
        },
      };

      globalThis.navigator = {
        clipboard: {
          writeText: async (text) => {
            writtenClipboardText = text;
            return true;
          },
        },
      };
    });

    test("copyCode writes data-code to clipboard and toggles icon display", async () => {
      await copyCode(mockButton);
      expect(writtenClipboardText).toBe("console.log('hello');");
      expect(mockCopyIcon.style.display).toBe("none");
      expect(mockCheckIcon.style.display).toBe("block");
    });

    test("copyCode ignores button when data-code is empty", async () => {
      const emptyBtn = {
        getAttribute: () => null,
      };
      await copyCode(emptyBtn);
      expect(writtenClipboardText).toBe("");
    });

    test("initializeCodeCopy attaches click event listener to document", () => {
      let eventName = "";
      let eventHandler = null;

      globalThis.document = {
        addEventListener: (event, handler) => {
          eventName = event;
          eventHandler = handler;
        },
      };

      initializeCodeCopy();
      expect(eventName).toBe("click");
      expect(typeof eventHandler).toBe("function");

      let defaultPrevented = false;
      eventHandler({
        target: mockButton,
        preventDefault: () => {
          defaultPrevented = true;
        },
      });

      expect(defaultPrevented).toBe(true);
    });
  });
});
