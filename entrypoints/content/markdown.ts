export function parseMarkdown(text: string): string {
  if (!text) return "";

  let html = text;

  // 转义HTML标签
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 代码块 (```)
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // 行内代码 (`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 粗体 (**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // 斜体 (*)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 标题
  html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");

  // 引用 (>)
  html = html.replace(/^> (.*$)/gm, "<blockquote>$1</blockquote>");

  // 无序列表 (-)
  html = html.replace(/^- (.*$)/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // 换行
  html = html.replace(/\n/g, "<br>");

  // 段落处理
  html = html.replace(/(<br>\s*){2,}/g, "</p><p>");
  html = "<p>" + html + "</p>";

  // 清理空段落
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p><br><\/p>/g, "");

  return html;
}
