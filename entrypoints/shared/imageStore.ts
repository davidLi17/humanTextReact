import type { ChatSession } from "./chatTypes";

/** This module is used only by extension pages and its service worker, never by content scripts. */
export const IMAGE_REF_PREFIX = "humantext-blob:";
const DATABASE = "humantext-images";
type Store = "images" | "transfers";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("images");
      request.result.createObjectStore("transfers");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolve only when the transaction commits, so a reference never precedes its Blob. */
async function transaction<T>(store: Store, mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(store, mode);
      const request = run(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error || request.error || new Error("图片存储失败"));
      tx.onerror = () => {}; // onabort carries the transaction failure.
    });
  } finally { database.close(); }
}

export function isImageRef(value: string): boolean {
  return value.startsWith(IMAGE_REF_PREFIX);
}

export async function blobDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

/** Canvas/file images are already Base64; decoding is local and must not call fetch. */
function imageDataBlob(data: string): Blob {
  const comma = data.indexOf(",");
  if (comma < 0 || !data.slice(0, comma).endsWith(";base64")) throw new Error("无效的图片数据，请重新选择");
  const binary = atob(data.slice(comma + 1));
  return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], {type:data.slice(5, comma).split(";")[0]});
}

export async function storeImage(data: string): Promise<string> {
  if (!data.startsWith("data:image/")) return data;
  const blob = imageDataBlob(data);
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  await transaction("images", "readwrite", store => store.put(blob, id));
  return IMAGE_REF_PREFIX + id;
}

export async function readImageBlob(reference: string): Promise<Blob> {
  const blob = await transaction<Blob | undefined>("images", "readonly", store => store.get(reference.slice(IMAGE_REF_PREFIX.length)));
  if (!blob) throw new Error("截图已丢失，请重新选择网页元素");
  return blob;
}

export async function resolveImageData(data: string): Promise<string> {
  return isImageRef(data) ? blobDataUrl(await readImageBlob(data)) : data;
}

/** Only images change; runtime state and old Base64 backups retain the same shape. */
export async function persistImages<T extends {data: string}>(images: T[]): Promise<T[]> {
  return Promise.all(images.map(async image => ({...image, data: await storeImage(image.data)})));
}

export async function persistSessionImages(sessions: ChatSession[]): Promise<ChatSession[]> {
  const references = new Map<string, Promise<string>>();
  return Promise.all(sessions.map(async session => ({...session,
    messages: await Promise.all(session.messages.map(async message => ({...message,
      ...(message.images ? {images: await Promise.all(message.images.map(async image => {
        if (!references.has(image.data)) references.set(image.data, storeImage(image.data));
        return {...image, data: await references.get(image.data)!};
      }))} : {}),
    }))),
  })));
}

/** Portable JSON exports contain image bytes, never device-local database keys. */
export async function exportSessionImages(sessions: ChatSession[]): Promise<ChatSession[]> {
  return Promise.all(sessions.map(async session => ({...session,
    messages: await Promise.all(session.messages.map(async message => ({...message,
      ...(message.images ? {images: await Promise.all(message.images.map(async image =>
        ({...image, data: await resolveImageData(image.data)})))} : {}),
    }))),
  })));
}

/** Serialize Blob writes, session commits and collection across sidepanel tabs and backup restore. */
export async function withImageStoreLock<T>(operation: () => Promise<T>): Promise<T> {
  return globalThis.navigator?.locks
    ? navigator.locks.request("humantext-image-store", operation)
    : operation();
}

/** All tabs' persisted sessions and composer drafts participate. Transfers have a separate store. */
export async function collectUnusedImages(localValues: unknown, draftValues: unknown = {}): Promise<void> {
  if (typeof indexedDB === "undefined") return; // Text-only test/non-browser contexts have no image database.
  const keep = new Set<string>();
  const scan = (value: any) => {
    if (typeof value === "string" && isImageRef(value)) keep.add(value.slice(IMAGE_REF_PREFIX.length));
    else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === "object") Object.values(value).forEach(scan);
  };
  scan(localValues); scan(draftValues);
  const keys = await transaction<IDBValidKey[]>("images", "readonly", store => store.getAllKeys());
  for (const key of keys) if (!keep.has(String(key)))
    await transaction("images", "readwrite", store => store.delete(key));
}

export async function stageTransfer(key: string, data: string): Promise<void> {
  const blob = imageDataBlob(data);
  await transaction("transfers", "readwrite", store => store.put(blob, key));
}
export async function readTransfer(key: string): Promise<string> {
  const blob = await transaction<Blob | undefined>("transfers", "readonly", store => store.get(key));
  if (!blob) throw new Error("截图传输失效，请重试提问");
  return blobDataUrl(blob);
}
export async function removeTransfers(keys: string[]): Promise<void> {
  for (const key of keys) await transaction("transfers", "readwrite", store => store.delete(key));
}

/** Upgrade both legacy image keys together: writing only one could still exceed local's 10MB quota. */
export async function migrateLegacyImages(): Promise<void> {
  const api = (globalThis as any).browser || (globalThis as any).chrome;
  if (!api?.storage?.local) return;
  await withImageStoreLock(async () => {
    const stored = await api.storage.local.get(null);
    const sessions = stored.sidepanel_chat_sessions;
    const draft = stored.popupDraft;
    const hasLegacy = (images: any) => Array.isArray(images) && images.some(image => typeof image?.data === "string" && image.data.startsWith("data:image/"));
    const payload: Record<string, unknown> = {};
    if (Array.isArray(sessions) && sessions.some(session => session.messages?.some((message: any) => hasLegacy(message.images))))
      payload.sidepanel_chat_sessions = await persistSessionImages(sessions);
    if (hasLegacy(draft?.images)) payload.popupDraft = {...draft, images: await persistImages(draft.images)};
    // These belong to requests terminated by the old extension/service worker.
    const staleTransfers = Object.keys(stored).filter(key => key.startsWith("image_request:"));
    if (staleTransfers.length) await api.storage.local.remove(staleTransfers);
    if (Object.keys(payload).length) await api.storage.local.set(payload);
  });
}
