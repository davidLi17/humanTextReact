/** Reduce pixel dimensions proportionally, retaining the full redacted frame.
 * The target is best effort: do not shrink text screenshots below a 1000px long edge. */
export const SCREENSHOT_TARGET_BYTES = 1.5 * 1024 * 1024;
export const SCREENSHOT_MIN_LONG_EDGE = 1000;
export async function encodeScreenshot(canvas: OffscreenCanvas): Promise<Blob> {
  let blob = await canvas.convertToBlob({type:"image/png"});
  let current = canvas;
  for (let attempt = 0; attempt < 4 && blob.size > SCREENSHOT_TARGET_BYTES; attempt++) {
    const longest = Math.max(current.width, current.height);
    if (longest <= SCREENSHOT_MIN_LONG_EDGE) break;
    const ratio = Math.max(SCREENSHOT_MIN_LONG_EDGE / longest,
      Math.min(0.9, Math.sqrt(SCREENSHOT_TARGET_BYTES / blob.size) * 0.95));
    const next = new OffscreenCanvas(Math.max(1, Math.round(current.width * ratio)), Math.max(1, Math.round(current.height * ratio)));
    next.getContext("2d")!.drawImage(canvas, 0, 0, next.width, next.height);
    blob = await next.convertToBlob({type:"image/png"});
    current = next;
  }
  return blob;
}
