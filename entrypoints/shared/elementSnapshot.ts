/** Serializable bounded attachment. DOM identities stay exclusively in the content script. */
export interface ElementSnapshot {
  version: 1;
  id: string;
  number: number;
  title: string;
  url: string;
  text: string;
  question: string;
  truncated: boolean;
  capturedAt: number;
  image: string;
  scope: string;
  invalid?: boolean;
  sent?: boolean;
}
export const MAX_ELEMENT_TEXT = 8000;
export { MAX_ELEMENT_MARKS, MAX_ELEMENT_IMAGE_BYTES } from "./elementImages";
export function elementSnapshotText(items: ElementSnapshot[]): string {
  return items
    .map(
      (s) =>
        `网页标记 #${s.number}：${s.title}\n来源：${s.url}\n截图范围：${s.scope}\n文本${s.truncated ? "（已截断，最多8000字）" : "（完整快照）"}：\n${s.text}\n用户问题：${s.question}`,
    )
    .join("\n\n");
}
export function cropRect(
  rect: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
) {
  const x = Math.max(0, rect.x),
    y = Math.max(0, rect.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(width, rect.x + rect.width) - x),
    height: Math.max(0, Math.min(height, rect.y + rect.height) - y),
  };
}

/** Source attribution must not leak form query parameters, fragments or URL credentials. */
export function elementSourceUrl(href: string): string {
  try { const url = new URL(href); return `${url.origin}${url.pathname}`; } catch { return ""; }
}
