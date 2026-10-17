import { MAX_ELEMENT_TEXT } from "../shared/elementSnapshot";
export const PRIVATE_ELEMENTS =
  'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
export function extractElementText(root: Element) {
  let text = "";
  let visited = 0;
  const walk = (node: Node) => {
    if (++visited > 20000 || text.length > MAX_ELEMENT_TEXT) return;
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
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
    if (node.tagName === "BR") text += "\n";
    const block = /^(block|flex|grid|list-item|table-row)$/.test(style.display);
    if (block) text += "\n";
    for (const child of Array.from(node.childNodes)) walk(child);
    if (/^(TD|TH)$/.test(node.tagName)) text += "\t";
    if (node.tagName === "IMG") text += node.getAttribute("alt") || "";
    if (block) text += "\n";
  };
  walk(root);
  return {
    text: text.slice(0, MAX_ELEMENT_TEXT).trim(),
    truncated: text.length > MAX_ELEMENT_TEXT || visited > 20000,
  };
}
