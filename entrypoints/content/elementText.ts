import { MAX_ELEMENT_TEXT } from "../shared/elementSnapshot";
export const PRIVATE_ELEMENTS =
  'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
export function extractElementText(root: Element) {
  const parts: { text: string; literal: boolean }[] = [];
  let length = 0;
  let visited = 0;
  const append = (text: string, literal = false) => {
    if (!text) return;
    const last = parts.at(-1);
    if (last?.literal === literal) last.text += text;
    else parts.push({ text, literal });
    length += text.length;
  };
  const line = () => {
    const last = parts.at(-1);
    if (last && !last.literal) {
      length -= last.text.length;
      last.text = last.text.replace(/ +$/, "");
      length += last.text.length;
      if (last.text.endsWith("\n")) return;
    }
    append("\n");
  };
  const walk = (node: Node, literal = false, inCell = false) => {
    if (++visited > 20000 || length > MAX_ELEMENT_TEXT) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent || "";
      append(literal ? value.replace(/\r\n?/g, "\n") : value.replace(/\s+/gu, " "), literal);
      return;
    }
    if (!(node instanceof Element)) return;
    if (
      node.matches(
        `${PRIVATE_ELEMENTS},script,style,noscript,[hidden],[aria-hidden="true"]`,
      )
    )
      return;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return;
    if (node.tagName === "BR") { if (literal) append("\n", true); else if (inCell) append(" "); else line(); }
    const cell = /^(TD|TH)$/.test(node.tagName);
    const block = /^(block|flex|grid|list-item|table|table-row|table-row-group)$/.test(style.display);
    const preserve = literal || /^(PRE|CODE)$/.test(node.tagName);
    if (block && !literal) { if (inCell) append(" "); else line(); }
    for (const child of Array.from(node.childNodes)) walk(child, preserve, inCell || cell);
    if (cell && node.nextElementSibling?.matches("td,th")) append("\t");
    if (node.tagName === "IMG") append(node.getAttribute("alt") || "", literal);
    if (block && !literal) { if (inCell) append(" "); else line(); }
  };
  walk(root);
  // Normalize layout whitespace once at capture, so preview, storage and requests
  // share the same bounded text. Literal code never passes through this cleanup.
  for (const part of parts) if (!part.literal) part.text = part.text
    .replace(/ {2,}/g, " ").replace(/ *\t */g, "\t")
    .replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  if (parts[0] && !parts[0].literal) parts[0].text = parts[0].text.replace(/^[ \n]+/, "");
  const last = parts.at(-1);
  if (last && !last.literal) last.text = last.text.replace(/[ \n]+$/, "");
  const text = parts.map(part => part.text).join("");
  return {
    text: text.slice(0, MAX_ELEMENT_TEXT),
    truncated: length > MAX_ELEMENT_TEXT || visited > 20000,
  };
}
