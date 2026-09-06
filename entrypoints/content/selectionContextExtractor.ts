import {
  normalizeSelectionContext,
  type SelectionContext,
} from "@/entrypoints/shared/selectionContext";

const CONTEXT_BLOCK_SELECTOR = "p,li,blockquote,pre,td,th";
const NOISE_SELECTOR =
  "script,style,noscript,template,input,textarea,select,[contenteditable='true'],[contenteditable=''],[contenteditable='plaintext-only']," +
  "[aria-hidden='true'],[hidden],[inert],[data-translator-element]";
const MAX_CONTEXT_TREE_NODES = 1000;
const MAX_CONTEXT_SCAN_CHARS = 6000;

function toElement(node: Node | null): Element | null {
  if (!node) return null;
  return node.nodeType === 1
    ? (node as Element)
    : node.parentElement;
}

function isUnsafeOrHidden(element: Element, win: Window): boolean {
  if (element.closest(NOISE_SELECTOR)) return true;
  let current: Element | null = element;
  while (current) {
    const contentEditable = current.getAttribute?.("contenteditable");
    if (
      (current as HTMLElement).isContentEditable ||
      contentEditable === "" ||
      contentEditable === "true" ||
      contentEditable === "plaintext-only"
    ) {
      return true;
    }
    const style = win.getComputedStyle(current);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.contentVisibility === "hidden" ||
      style.opacity === "0"
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

/** 受预算约束地收集语义块内可见文本，跳过隐藏、脚本、表单、编辑区与嵌套语义块。 */
export function collectVisibleContextText(
  root: Element,
  win: Window
): string | undefined {
  let visitedNodes = 0;
  let textLength = 0;
  let budgetExceeded = false;
  const parts: string[] = [];

  const visit = (node: Node): void => {
    if (
      visitedNodes >= MAX_CONTEXT_TREE_NODES ||
      textLength >= MAX_CONTEXT_SCAN_CHARS
    ) {
      budgetExceeded = true;
      return;
    }
    visitedNodes += 1;

    if (node.nodeType === 3) {
      const text = node.textContent || "";
      const remaining = MAX_CONTEXT_SCAN_CHARS - textLength;
      if (text.length > remaining) {
        budgetExceeded = true;
        return;
      }
      if (remaining > 0) {
        parts.push(text);
        textLength += text.length;
      }
      return;
    }
    if (node.nodeType !== 1) return;

    const element = node as Element;
    if (
      (element !== root && element.matches(CONTEXT_BLOCK_SELECTOR)) ||
      isUnsafeOrHidden(element, win)
    ) {
      return;
    }
    Array.from(element.childNodes).forEach(visit);
  };

  visit(root);
  if (budgetExceeded) return undefined;
  return parts.join("").replace(/\s+/g, " ").trim();
}

/**
 * 从当前 DOM 选区提取有限语义块。任何校验失败都会返回 undefined，调用方应退回纯文本。
 */
export function extractSelectionContext(
  doc: Document = document,
  win: Window = window,
  expectedSelectedText?: string
): SelectionContext | undefined {
  try {
    if (win.top !== win.self) return undefined;
    const selection = win.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) {
      return undefined;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText || (expectedSelectedText && selectedText !== expectedSelectedText.trim())) {
      return undefined;
    }
    if (
      range.startContainer.ownerDocument !== doc ||
      range.endContainer.ownerDocument !== doc
    ) {
      return undefined;
    }

    const startElement = toElement(range.startContainer);
    const endElement = toElement(range.endContainer);
    if (
      !startElement ||
      !endElement ||
      isUnsafeOrHidden(startElement, win) ||
      isUnsafeOrHidden(endElement, win)
    ) {
      return undefined;
    }

    const startBlock = startElement.closest(CONTEXT_BLOCK_SELECTOR);
    const endBlock = endElement.closest(CONTEXT_BLOCK_SELECTOR);
    if (!startBlock || startBlock !== endBlock || isUnsafeOrHidden(startBlock, win)) {
      return undefined;
    }

    const paragraph = collectVisibleContextText(startBlock, win);
    return normalizeSelectionContext(
      {
        selectedText,
        paragraph,
        source: { title: doc.title, url: win.location?.href },
      },
      selectedText
    );
  } catch {
    return undefined;
  }
}
