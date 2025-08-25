/**
 * 高级 Markdown 解析器
 * 支持完整的 Markdown 语法，包括代码块、列表、链接、表格等
 */
export function parseMarkdown(text: string): string {
  if (!text) return "";

  let html = text;

  // 1. 预处理：规范化换行符
  html = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. 转义HTML标签（但保留换行）
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 3. 处理代码块 (```) - 优先级最高
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    const language = lang || "text";
    codeBlocks.push(
      `<pre class="code-block"><code class="language-${language}">${code.trim()}</code></pre>`
    );
    return `__CODE_BLOCK_${index}__`;
  });

  // 4. 处理行内代码 (`)
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`\n]+)`/g, (match, code) => {
    const index = inlineCodes.length;
    inlineCodes.push(`<code class="inline-code">${code}</code>`);
    return `__INLINE_CODE_${index}__`;
  });

  // 5. 处理表格
  html = parseTable(html);

  // 6. 处理标题 (优先级：h6 -> h1)
  html = html.replace(/^#{6}\s+(.*$)/gm, "<h6>$1</h6>");
  html = html.replace(/^#{5}\s+(.*$)/gm, "<h5>$1</h5>");
  html = html.replace(/^#{4}\s+(.*$)/gm, "<h4>$1</h4>");
  html = html.replace(/^#{3}\s+(.*$)/gm, "<h3>$1</h3>");
  html = html.replace(/^#{2}\s+(.*$)/gm, "<h2>$1</h2>");
  html = html.replace(/^#{1}\s+(.*$)/gm, "<h1>$1</h1>");

  // 7. 处理水平分割线
  html = html.replace(
    /^(-{3,}|\*{3,}|_{3,})$/gm,
    '<hr class="markdown-divider">'
  );

  // 8. 处理引用块
  html = parseBlockquote(html);

  // 9. 处理列表
  html = parseList(html);

  // 10. 处理文本样式
  html = parseTextStyles(html);

  // 11. 处理链接和图片
  html = parseLinks(html);

  // 12. 处理段落
  html = parseParagraphs(html);

  // 13. 恢复代码块和行内代码
  codeBlocks.forEach((code, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, code);
  });
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });

  // 14. 清理多余的空白
  html = html.replace(/\n{3,}/g, "\n\n");
  html = html.replace(/^\s+|\s+$/g, "");

  return html;
}

/**
 * 解析表格
 */
function parseTable(html: string): string {
  // 简单表格格式：| 列1 | 列2 | 列3 |
  const tableRegex = /^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;

  return html.replace(tableRegex, (match, header, separator, rows) => {
    const headerCells = header
      .split("|")
      .slice(1, -1)
      .map((cell: string) => `<th>${cell.trim()}</th>`)
      .join("");

    const rowsHtml = rows
      .trim()
      .split("\n")
      .map((row: string) => {
        const cells = row
          .split("|")
          .slice(1, -1)
          .map((cell: string) => `<td>${cell.trim()}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `<table class="markdown-table"><thead><tr>${headerCells}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  });
}

/**
 * 解析引用块
 */
function parseBlockquote(html: string): string {
  // 处理多行引用
  const lines = html.split("\n");
  const result: string[] = [];
  let inQuote = false;
  let quoteContent: string[] = [];

  for (const line of lines) {
    if (line.match(/^>\s/)) {
      if (!inQuote) {
        inQuote = true;
        quoteContent = [];
      }
      quoteContent.push(line.replace(/^>\s?/, ""));
    } else {
      if (inQuote) {
        result.push(
          `<blockquote class="markdown-quote">${quoteContent.join(
            "<br>"
          )}</blockquote>`
        );
        inQuote = false;
        quoteContent = [];
      }
      result.push(line);
    }
  }

  // 处理最后的引用
  if (inQuote && quoteContent.length > 0) {
    result.push(
      `<blockquote class="markdown-quote">${quoteContent.join(
        "<br>"
      )}</blockquote>`
    );
  }

  return result.join("\n");
}

/**
 * 解析列表
 */
function parseList(html: string): string {
  const lines = html.split("\n");
  const result: string[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  for (const line of lines) {
    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);

    if (unorderedMatch) {
      const [, indent, content] = unorderedMatch;
      const level = Math.floor(indent.length / 2);

      if (!currentList || currentList.type !== "ul") {
        if (currentList) {
          result.push(closeList(currentList));
        }
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(
        `<li class="list-item level-${level}">${content}</li>`
      );
    } else if (orderedMatch) {
      const [, indent, content] = orderedMatch;
      const level = Math.floor(indent.length / 2);

      if (!currentList || currentList.type !== "ol") {
        if (currentList) {
          result.push(closeList(currentList));
        }
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(
        `<li class="list-item level-${level}">${content}</li>`
      );
    } else {
      if (currentList) {
        result.push(closeList(currentList));
        currentList = null;
      }
      result.push(line);
    }
  }

  // 处理最后的列表
  if (currentList) {
    result.push(closeList(currentList));
  }

  return result.join("\n");
}

function closeList(list: { type: "ul" | "ol"; items: string[] }): string {
  return `<${list.type} class="markdown-list">${list.items.join("")}</${
    list.type
  }>`;
}

/**
 * 解析文本样式
 */
function parseTextStyles(html: string): string {
  // 删除线
  html = html.replace(/~~(.*?)~~/g, '<del class="strikethrough">$1</del>');

  // 粗体 (**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="bold">$1</strong>');

  // 斜体 (*)
  html = html.replace(
    /(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g,
    '<em class="italic">$1</em>'
  );

  // 高亮 (==)
  html = html.replace(/==(.*?)==/g, '<mark class="highlight">$1</mark>');

  return html;
}

/**
 * 解析链接和图片
 */
function parseLinks(html: string): string {
  // 图片 ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="markdown-image" loading="lazy">'
  );

  // 链接 [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 自动链接 <url>
  html = html.replace(
    /<(https?:\/\/[^>]+)>/g,
    '<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return html;
}

/**
 * 解析段落
 */
function parseParagraphs(html: string): string {
  // 分割成块
  const blocks = html.split(/\n\s*\n/);

  return blocks
    .map((block) => {
      block = block.trim();
      if (!block) return "";

      // 如果已经是HTML标签，不要包装成段落
      if (block.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/)) {
        return block;
      }

      // 处理普通段落
      const lines = block.split("\n").filter((line) => line.trim());
      if (lines.length === 1) {
        return `<p class="markdown-paragraph">${lines[0]}</p>`;
      } else {
        return `<p class="markdown-paragraph">${lines.join("<br>")}</p>`;
      }
    })
    .join("\n\n");
}
