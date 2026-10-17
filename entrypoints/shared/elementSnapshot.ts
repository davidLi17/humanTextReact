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
export const MAX_ELEMENT_MARKS = 6;
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

/** Conservative cap on all serialized sessions before adding a new region message.
 * Leaves headroom for answers and other storage.local keys without deleting history.
 */
export const ELEMENT_SESSION_STORAGE_BUDGET = 6 * 1024 * 1024;
export function fitsElementStorage(sessions: unknown, message: unknown, limit = ELEMENT_SESSION_STORAGE_BUDGET): boolean {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(sessions)).byteLength + encoder.encode(JSON.stringify(message)).byteLength + 1024 <= limit;
}

/** Source attribution must not leak form query parameters, fragments or URL credentials. */
export function elementSourceUrl(href: string): string {
  try { const url = new URL(href); return `${url.origin}${url.pathname}`; } catch { return ""; }
}
