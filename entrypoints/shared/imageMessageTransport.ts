/** Chrome runtime messages are limited to 64 MiB. Large image histories travel
 * by short-lived local references; model payloads still receive the original bytes. */
const INLINE_IMAGE_CHARS = 40 * 1024 * 1024;
const keyPrefix = (requestId: string) => `image_request:${requestId}:`;

export async function sendImageRequest(request: any, isActive = () => true) {
  const urls: string[] = [];
  for (const message of request.messages || [])
    if (Array.isArray(message.content)) for (const item of message.content)
      if (item.type === "image_url" && item.image_url?.url?.startsWith("data:")) urls.push(item.image_url.url);
  if (urls.reduce((sum, url) => sum + url.length, 0) <= INLINE_IMAGE_CHARS)
    return browser.runtime.sendMessage(request);
  const unique = [...new Set(urls)];
  const keys = unique.map((_, index) => keyPrefix(request.requestId) + index);
  const references = new Map(unique.map((url, index) => [url, `humantext-image:${index}`]));
  try {
    for (let index = 0; index < keys.length; index++) {
      if (!isActive()) return {success: true, cancelled: true};
      await browser.storage.local.set({[keys[index]]: unique[index]});
    }
    if (!isActive()) return {success: true, cancelled: true};
    return await browser.runtime.sendMessage({...request, imageTransferCount: keys.length,
      messages: request.messages.map((message: any) => ({...message,
        content: Array.isArray(message.content) ? message.content.map((item: any) =>
          item.type === "image_url" && references.has(item.image_url?.url)
            ? {...item, image_url: {url: references.get(item.image_url.url)}} : item) : message.content,
      })),
    });
  } finally { await browser.storage.local.remove(keys); }
}

/** Called only for a verified sidepanel request after its requestId is claimed. */
export async function restoreImageRequest(request: any, signal?: AbortSignal) {
  if (!request.imageTransferCount) return;
  if (!Number.isInteger(request.imageTransferCount) || request.imageTransferCount < 1 || request.imageTransferCount > 1000)
    throw new Error("无效的截图传输清单");
  const images: string[] = [];
  for (let index = 0; index < request.imageTransferCount; index++) {
    signal?.throwIfAborted();
    const key = keyPrefix(request.requestId) + index;
    const data = (await browser.storage.local.get(key))[key];
    signal?.throwIfAborted();
    if (typeof data !== "string" || !data.startsWith("data:image/")) throw new Error("截图传输失效，请重试提问");
    images.push(data);
  }
  request.messages = request.messages.map((message: any) => ({...message,
    content: Array.isArray(message.content) ? message.content.map((item: any) => {
      if (item.type !== "image_url" || !item.image_url?.url?.startsWith("humantext-image:")) return item;
      const index = Number(item.image_url.url.slice("humantext-image:".length));
      if (!Number.isInteger(index) || !images[index]) throw new Error("截图传输失效，请重试提问");
      return {...item, image_url: {url: images[index]}};
    }) : message.content,
  }));
}
