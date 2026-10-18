export const MAX_ELEMENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ELEMENT_MARKS = 6;
export const MAX_ELEMENT_TOTAL_BYTES = MAX_ELEMENT_IMAGE_BYTES * MAX_ELEMENT_MARKS;

/** Count decoded image bytes; base64 expansion is not part of the image budget. */
export function imageBytes(data: string): number {
  const base64 = data.slice(data.indexOf(",") + 1);
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}
export function formatImageBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export function elementImageBudget(items: Array<{ image: string; number: number }>) {
  const sizes = items.map(item => imageBytes(item.image));
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const oversized = sizes.findIndex(size => size > MAX_ELEMENT_IMAGE_BYTES);
  const error = oversized >= 0
    ? `标记 #${items[oversized].number} 截图 ${formatImageBytes(sizes[oversized])}（${sizes[oversized]} 字节）超过单张5MB，请选择更小的区域`
    : items.length > MAX_ELEMENT_MARKS ? `本次${items.length}张截图，最多6张`
    : total > MAX_ELEMENT_TOTAL_BYTES ? `本次截图合计 ${formatImageBytes(total)}（${total} 字节）超过30MB` : undefined;
  return {sizes, total, error};
}
