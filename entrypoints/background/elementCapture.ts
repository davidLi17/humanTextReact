import { encodeScreenshot } from "./screenshotEncoding";
import { cropRect, MAX_ELEMENT_IMAGE_BYTES } from "../shared/elementSnapshot";
import { formatImageBytes } from "../shared/elementImages";
/** Never return/store the full viewport: only the selected, redacted crop leaves this function. */
export async function captureElement(
  request: any,
  sender: Browser.runtime.MessageSender,
) {
  if (!sender.tab?.id || sender.frameId !== 0)
    throw new Error("只能截取当前网页的主文档");
  const active = await browser.tabs.query({
    active: true,
    windowId: sender.tab.windowId,
  });
  if (active[0]?.id !== sender.tab.id)
    throw new Error("页面已切换，请返回原网页重新选择");
  const { viewport, rect, masks } = request;
  if (
    !viewport ||
    !rect ||
    !Array.isArray(masks) ||
    masks.length > 2000 ||
    ![
      viewport.width,
      viewport.height,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    ].every(Number.isFinite) ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    throw new Error("无效截图范围，请重新选择");
  const clipped = cropRect(rect, viewport.width, viewport.height);
  if (!clipped.width || !clipped.height)
    throw new Error("元素不在视口内，请滚动后重新选择");
  let data: string;
  try {
    data = await browser.tabs.captureVisibleTab(sender.tab.windowId, {format: "png"});
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`截图未获授权或不可用：请在当前网页点击扩展图标，或使用网页右键菜单「打开人话侧边栏」后重试。不需要授予全站访问权限。浏览器原因：${reason}`);
  }
  const again = await browser.tabs.query({
    active: true,
    windowId: sender.tab.windowId,
  });
  if (again[0]?.id !== sender.tab.id)
    throw new Error("截图时页面已切换，请重试");
  const bitmap = await createImageBitmap(await (await fetch(data)).blob());
  try {
    const sx = bitmap.width / viewport.width,
      sy = bitmap.height / viewport.height;
    const scale = Math.min(
      1,
      1600 / (clipped.width * sx),
      1600 / (clipped.height * sy),
    );
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.floor(clipped.width * sx * scale)),
      Math.max(1, Math.floor(clipped.height * sy * scale)),
    );
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      bitmap,
      clipped.x * sx,
      clipped.y * sy,
      clipped.width * sx,
      clipped.height * sy,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    ctx.fillStyle = "#777";
    for (const mask of masks) {
      if (![mask.x, mask.y, mask.width, mask.height].every(Number.isFinite))
        throw new Error("无效遮盖范围");
      ctx.fillRect(
        (mask.x - clipped.x) * sx * scale - 2,
        (mask.y - clipped.y) * sy * scale - 2,
        mask.width * sx * scale + 4,
        mask.height * sy * scale + 4,
      );
    }
    const bytes = new Uint8Array(
      await (await encodeScreenshot(canvas)).arrayBuffer(),
    );
    if (bytes.length > MAX_ELEMENT_IMAGE_BYTES)
      throw new Error(`截图超过5MB：实际 ${formatImageBytes(bytes.length)}（${bytes.length} 字节），请选择更小的区域`);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { success: true, image: `data:image/png;base64,${btoa(binary)}` };
  } finally {
    bitmap.close();
  }
}
