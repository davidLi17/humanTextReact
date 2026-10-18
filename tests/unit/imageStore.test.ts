import {installImageStoreEnvironment} from "../helpers/imageStoreEnvironment";
import {beforeEach, afterEach} from "bun:test";
let restoreImageEnvironment: () => void;
beforeEach(() => {restoreImageEnvironment = installImageStoreEnvironment();});
afterEach(() => restoreImageEnvironment());
import { expect, test } from "bun:test";
import { persistSessionImages, exportSessionImages, readImageBlob, collectUnusedImages, IMAGE_REF_PREFIX } from "../../entrypoints/shared/imageStore";
import { restoreImageRequest } from "../../entrypoints/shared/imageMessageTransport";
import { createMemoryBrowserStorage, preserveGlobals, setTestGlobal } from "../helpers/testEnvironment.js";
import { WebReadingProgressStorage, SIDEPANEL_SESSIONS_STORAGE_KEY } from "../../entrypoints/sidepanel/webReadingProgressStorage";
const image = "data:image/png;base64,aGVsbG8=";
const sessions = (): any[] => [{id:"one",title:"截图",createdAt:1,updatedAt:1,
  messages:[{id:"m",role:"user",content:"解释表格",createdAt:1,images:[{data:image,mimeType:"image/png"}]}]}];

test("legacy Base64 checkpoints become deduplicated Blob refs; hydration is lazy, export and model restore original bytes", async () => {
  const restore = preserveGlobals("browser", "fetch");
  const memory = createMemoryBrowserStorage() as any; setTestGlobal("browser", memory.browser);
  try {
    setTestGlobal("fetch", () => {throw new Error("图片解码不应调用网络 fetch");});
    const storage = new WebReadingProgressStorage(memory.browser.storage.local);
    const old = sessions(); old[0].messages.push({...old[0].messages[0],id:"again"});
    await storage.enqueueCheckpoint({progressMap:new Map(),sessions:old});
    const stored = (memory.stores.local as any)[SIDEPANEL_SESSIONS_STORAGE_KEY];
    const ref = stored[0].messages[0].images[0].data;
    expect(ref.startsWith(IMAGE_REF_PREFIX)).toBe(true);
    expect(stored[0].messages[1].images[0].data).toBe(ref);
    expect(JSON.stringify(memory.stores.local)).not.toContain(image);
    expect(old[0].messages[0].images[0].data).toBe(image); // immutable runtime snapshot
    expect(await (await readImageBlob(ref)).text()).toBe("hello");
    const exported = await exportSessionImages(stored);
    expect(exported[0].messages[0].images![0].data).toBe(image);
    const request = {requestId:"stable", messages:[{role:"user",content:[{type:"image_url",image_url:{url:ref}}]}]};
    await restoreImageRequest(request);
    expect(request.requestId).toBe("stable");
    expect(request.messages[0].content[0].image_url.url).toBe(image);
    // Keep shared image when a second session references it; remove after the final deletion.
    await storage.enqueueCheckpoint({progressMap:new Map(), sessions:[{...stored[0],id:"two"}]});
    expect((await readImageBlob(ref)).type).toBe("image/png");
    await storage.enqueueCheckpoint({progressMap:new Map(),sessions:[]});
    await expect(readImageBlob(ref)).rejects.toThrow("截图已丢失");
  } finally {restore();}
});

test("failed session writes keep legacy data recoverable; drafts protect images during collection", async () => {
  const stored = await persistSessionImages(sessions());
  const ref = stored[0].messages[0].images![0].data;
  const checkpoint = new WebReadingProgressStorage({get:async()=>({}),set:async()=>{throw new Error("quota");}});
  await expect(checkpoint.enqueueCheckpoint({progressMap:new Map(),sessions:sessions()})).rejects.toThrow("quota");
  expect((await readImageBlob(ref)).type).toBe("image/png");
  await collectUnusedImages({}, {draft:{images:[{data:ref}]}});
  expect((await readImageBlob(ref)).type).toBe("image/png");
  await collectUnusedImages({});
  await expect(restoreImageRequest({messages:[{content:[{type:"image_url",image_url:{url:ref}}]}]})).rejects.toThrow("截图已丢失");
});

test("upgrade migrates sessions and popup images atomically before local quota applies", async () => {
  const {migrateLegacyImages} = await import("../../entrypoints/shared/imageStore");
  const restore = preserveGlobals("browser");
  const large = `data:image/png;base64,${"A".repeat(8 * 1024 * 1024)}`;
  const old = sessions(); old[0].messages[0].images[0].data = large;
  const memory = createMemoryBrowserStorage({local:{sidepanel_chat_sessions:old,popupDraft:{sourceText:"草稿",images:[{data:large,mimeType:"image/png"}]}}}) as any;
  const set = memory.browser.storage.local.set;
  memory.browser.storage.local.set = async (items:any) => {
    if(JSON.stringify({...memory.stores.local,...items}).length > 10 * 1024 * 1024) throw new Error("QUOTA_BYTES");
    await set(items);
  };
  setTestGlobal("browser",memory.browser);
  try {
    await migrateLegacyImages();
    const stored = memory.stores.local;
    expect(JSON.stringify(stored).length).toBeLessThan(1500);
    const ref = stored.sidepanel_chat_sessions[0].messages[0].images[0].data;
    expect(stored.popupDraft.images[0].data).toBe(ref);
    await collectUnusedImages({popupDraft:stored.popupDraft});
    expect((await readImageBlob(ref)).size).toBe(6 * 1024 * 1024);
    await migrateLegacyImages(); // idempotent
    expect(stored.popupDraft.images[0].data).toBe(ref);
  } finally {restore();}
});
