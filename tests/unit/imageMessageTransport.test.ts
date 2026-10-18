import {installImageStoreEnvironment} from "../helpers/imageStoreEnvironment";
import {beforeEach, afterEach} from "bun:test";
let restoreImageEnvironment: () => void;
beforeEach(() => {restoreImageEnvironment = installImageStoreEnvironment();});
afterEach(() => restoreImageEnvironment());
import { stageTransfer, removeTransfers } from "../../entrypoints/shared/imageStore";
import { expect, test } from "bun:test";
import { sendImageRequest, restoreImageRequest } from "../../entrypoints/shared/imageMessageTransport";
import { createMemoryBrowserStorage, preserveGlobals, setTestGlobal } from "../helpers/testEnvironment.js";
const image = `data:image/png;base64,${"A".repeat(41 * 1024 * 1024)}`;
const request = () => ({action:"translate", requestId:"image-test", sessionId:"session", source:"sidepanel", autoGenUi:true,
  messages:[{role:"user",content:[{type:"image_url",image_url:{url:image}},{type:"text",text:"解释截图"}]}]});
test("large image histories use a small runtime message and restore identical bytes and request identity", async () => {
  const restore = preserveGlobals("browser"); const memory = createMemoryBrowserStorage() as any;
  try {
    setTestGlobal("browser", {...memory.browser, runtime:{sendMessage:async (wire:any) => {
      expect(JSON.stringify(wire).length).toBeLessThan(1000);
      expect(wire.requestId).toBe("image-test"); expect(wire.autoGenUi).toBe(true);
      await restoreImageRequest(wire);
      expect(wire.messages).toEqual(request().messages);
      return {success:true};
    }}});
    expect(await sendImageRequest(request())).toEqual({success:true});
    expect(Object.keys(memory.stores.local)).toHaveLength(0);
  } finally {restore();}
});
test("cancelling while staging never starts a model request, and temporary images are removed", async () => {
  const restore = preserveGlobals("browser"); const memory = createMemoryBrowserStorage() as any; let active = true, calls = 0;
  try {
    let checks = 0;
    setTestGlobal("browser", {...memory.browser,runtime:{sendMessage:async()=>{calls++;}}});
    expect(await sendImageRequest(request(),()=>++checks < 2)).toEqual({success:true,cancelled:true});
    expect(calls).toBe(0); expect(Object.keys(memory.stores.local)).toHaveLength(0);
  } finally {restore();}
});
test("failed transport keeps its error and clears staged images", async () => {
  const restore = preserveGlobals("browser"); const memory = createMemoryBrowserStorage() as any;
  try {
    setTestGlobal("browser", {...memory.browser,runtime:{sendMessage:async()=>{throw new Error("连接失败");}}});
    await expect(sendImageRequest(request())).rejects.toThrow("连接失败");
    expect(Object.keys(memory.stores.local)).toHaveLength(0);
  } finally {restore();}
});
test("cancelling background restoration aborts before resolving image bytes", async () => {
  const controller = new AbortController(); controller.abort();
  await stageTransfer("image_request:image-test:0", image);
  try {
    await expect(restoreImageRequest({...request(),imageTransferCount:2},controller.signal)).rejects.toThrow();
  } finally { await removeTransfers(["image_request:image-test:0"]); }
});
