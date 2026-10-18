import {test,expect,mock} from "bun:test";
import {MAX_ELEMENT_IMAGE_BYTES} from "../../entrypoints/shared/elementSnapshot";
import {captureElement} from "../../entrypoints/background/elementCapture";
import {preserveGlobals,setTestGlobal} from "../helpers/testEnvironment.js";
test("capture denied by activeTab permission gives user-invocation guidance without requesting broader permissions", async()=>{
  const restore=preserveGlobals("browser");
  try {
    setTestGlobal("browser",{tabs:{query:async()=>[{id:7}],captureVisibleTab:async()=>{throw new Error("Either the '<all_urls>' or 'activeTab' permission is required");}}});
    await expect(captureElement({viewport:{width:100,height:100},rect:{x:0,y:0,width:10,height:10},masks:[]},{tab:{id:7,windowId:1},frameId:0} as any)).rejects.toThrow("打开人话侧边栏");
  } finally {restore();}
});

for (const size of [512 * 1024 + 1, MAX_ELEMENT_IMAGE_BYTES, MAX_ELEMENT_IMAGE_BYTES + 1]) {
  test(`capture accepts PNG bytes through 5 MiB, not base64 length: ${size}`, async () => {
    const restore = preserveGlobals("browser", "createImageBitmap", "OffscreenCanvas", "fetch");
    const close = mock(() => {});
    try {
      setTestGlobal("browser", {tabs: {query: async () => [{id: 7}], captureVisibleTab: async () => "data:image/png;base64,eA=="}});
      setTestGlobal("fetch", async () => ({blob: async () => new Blob()}));
      setTestGlobal("createImageBitmap", async () => ({width: 100, height: 100, close}));
      setTestGlobal("OffscreenCanvas", class {
        width = 10; height = 10;
        getContext() { return {drawImage() {}, fillRect() {}}; }
        async convertToBlob() { return new Blob([new Uint8Array(size)]); }
      });
      const capture = captureElement({viewport: {width: 100, height: 100}, rect: {x: 0, y: 0, width: 10, height: 10}, masks: []}, {tab: {id: 7, windowId: 1}, frameId: 0} as any);
      if (size > MAX_ELEMENT_IMAGE_BYTES) await expect(capture).rejects.toThrow("截图超过5MB");
      else {
        const result = await capture;
        expect(result.success).toBe(true);
        expect(atob(result.image.split(",")[1]).length).toBe(size);
      }
      expect(close).toHaveBeenCalledTimes(1);
    } finally { restore(); }
  });
}
