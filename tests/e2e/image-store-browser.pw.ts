import {test,expect,chromium} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {readFileSync, writeFileSync} from "node:fs";
import {createServer} from "node:http";

test("IndexedDB screenshots: legacy migration, lazy preview, reload, tab, actual model JSON, portable export/import and deletion", async ({},info) => {
  execFileSync("bun",["build","tests/fixtures/image-store-browser.tsx","--target=browser","--loader=.less:text","--outfile=artifacts/image-store-browser.js"]);
  const script = readFileSync("artifacts/image-store-browser.js");
  const modelRequests: any[] = [];
  const server = createServer(async(req,res)=>{
    if(req.url === "/bundle.js") {res.setHeader("Content-Type","text/javascript");res.end(script);return;}
    if(req.url === "/mock-model") {
      let body=""; for await(const chunk of req) body+=chunk;
      modelRequests.push(JSON.parse(body));res.setHeader("Content-Type","application/json");res.end('{"ok":true}');return;
    }
    res.setHeader("Content-Type","text/html");res.end('<meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>');
  });
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,headless:true});
  try {
    const context = await browser.newContext(); const panel = await context.newPage();
    await panel.goto(url); await expect(panel.getByRole("heading")).toBeVisible();
    const image = await panel.evaluate(()=>{
      const canvas=document.createElement("canvas");canvas.width=800;canvas.height=240;
      const ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,800,240);
      ctx.fillStyle="#111";ctx.font="24px sans-serif";ctx.fillText("表格 / Code screenshot · 120 / 240",20,60);
      ctx.font="16px monospace";ctx.fillText("const revenue = 120;",20,110);ctx.fillText("console.log(revenue);",20,145);
      return canvas.toDataURL("image/png");
    });
    // Small text screenshots retain their pixels; larger frames shrink proportionally with no crop.
    const encoding = await panel.evaluate(async () => {
      const small = new OffscreenCanvas(800,240); small.getContext("2d");
      const before = await small.convertToBlob({type:"image/png"});
      const after = await (window as any).encodeScreenshot(small);
      const canvas = new OffscreenCanvas(1600,800), ctx=canvas.getContext("2d")!;
      const pixels = ctx.createImageData(1600,800);
      let seed=7; for(let i=0;i<pixels.data.length;i+=4) {
        for(let c=0;c<3;c++) {seed=(Math.imul(seed,1664525)+1013904223)|0;pixels.data[i+c]=seed>>>24;}
        pixels.data[i+3]=255;
      }
      ctx.putImageData(pixels,0,0);
      ctx.fillStyle="#fff";ctx.fillRect(20,20,1560,180);ctx.fillStyle="#111";ctx.font="32px sans-serif";
      ctx.fillText("完整截图 · 表格收入 120 / 240",45,70);ctx.font="26px monospace";
      ctx.fillText("const revenue = 120;",45,120);ctx.fillText("console.log(revenue);",45,165);
      const original = await canvas.convertToBlob({type:"image/png"});
      const compressed = await (window as any).encodeScreenshot(canvas);
      const bitmap = await createImageBitmap(compressed);
      let binary="";const bytes=new Uint8Array(await compressed.arrayBuffer());
      for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const result={png:btoa(binary),smallUnchanged:before.size===after.size, original:original.size,bytes:compressed.size,width:bitmap.width,height:bitmap.height};bitmap.close();return result;
    });
    expect(encoding.smallUnchanged).toBe(true);
    expect(encoding.original).toBeGreaterThan(3 * 1024 * 1024);
    expect(encoding.bytes).toBeLessThan(encoding.original);
    expect(encoding.width).toBeGreaterThanOrEqual(1000);
    expect(Math.abs(encoding.width / encoding.height - 2)).toBeLessThan(0.01);
    const {png,...measurements}=encoding;
    writeFileSync(info.outputPath("proportional-resize-text.png"),Buffer.from(png,"base64"));
    writeFileSync(info.outputPath("resize-measurements.json"),JSON.stringify(measurements,null,2));
    await info.attach("proportional-resize-measurements",{body:JSON.stringify(measurements,null,2),contentType:"application/json"});
    const legacy=[{id:"one",title:"截图",createdAt:1,updatedAt:1,messages:[{id:"m",role:"user",content:"解释表格和代码",createdAt:1,images:[{data:image,mimeType:"image/png"}]}]}];
    await panel.evaluate(async sessions=>{await (window as any).save(sessions);},legacy);
    const ref = await panel.evaluate(()=>(window as any).sessions[0].messages[0].images[0].data);
    expect(ref).toMatch(/^humantext-blob:/);
    expect(await panel.evaluate(()=>localStorage.getItem("extension-storage"))).not.toContain(image);
    await expect(panel.locator("img")).toHaveAttribute("src",/^blob:/);
    await expect.poll(()=>panel.locator("img").evaluate((img:any)=>img.naturalWidth)).toBe(800);
    // Persisted object is a Blob (not Base64) in native browser IndexedDB.
    expect(await panel.evaluate(async id=>{
      const database = await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open("humantext-images");r.onsuccess=()=>resolve(r.result);});
      const value=await new Promise<any>(resolve=>{const r=database.transaction("images").objectStore("images").get(id.slice("humantext-blob:".length));r.onsuccess=()=>resolve(r.result);});
      database.close(); return value instanceof Blob && value.type === "image/png";
    },ref)).toBe(true);
    await panel.reload();
    await expect(panel.locator("img")).toHaveAttribute("src",/^blob:/);
    const other = await context.newPage(); await other.goto(url);
    await expect(other.locator("img")).toHaveAttribute("src",/^blob:/);
    const previewSize=await other.locator("img").evaluate((img:any)=>({width:img.naturalWidth,height:img.naturalHeight}));
    expect(previewSize).toEqual({width:800,height:240});
    await panel.evaluate(async()=>{await (window as any).followup();});
    const wire=await panel.evaluate(()=>(window as any).wire);
    expect(JSON.stringify(wire)).toContain(ref);expect(JSON.stringify(wire)).not.toContain(image);
    expect(modelRequests).toHaveLength(1);
    expect(JSON.stringify(modelRequests[0])).toContain(image);
    expect(JSON.stringify(modelRequests[0])).not.toContain("humantext-blob:");
    expect(JSON.stringify(modelRequests[0])).toContain("继续解释这张图");
    const exported = await panel.evaluate(async()=>await (window as any).exportImages());
    expect(exported[0].messages[0].images[0].data).toBe(image);
    await panel.screenshot({path:info.outputPath("indexeddb-restored-preview.png")});
    // A shared image survives deletion of one session, then is collected after the last one.
    await panel.evaluate(async sessions=>await (window as any).save([...sessions,{...sessions[0],id:"two"}]),exported);
    await panel.evaluate(async()=>await (window as any).save([(window as any).sessions[1]]));
    await panel.reload();await expect(panel.locator("img")).toHaveAttribute("src",/^blob:/);
    await panel.evaluate(async()=>await (window as any).save([]));
    expect(await panel.evaluate(async()=>{
      const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open("humantext-images");r.onsuccess=()=>resolve(r.result);});
      const count=await new Promise<number>(resolve=>{const r=db.transaction("images").objectStore("images").count();r.onsuccess=()=>resolve(r.result);});db.close();return count;
    })).toBe(0);
    await panel.evaluate(async sessions=>await (window as any).save(sessions),exported);
    await panel.reload(); await expect(panel.locator("img")).toHaveAttribute("src",/^blob:/);
    await panel.evaluate(async()=>{await (window as any).followup();});
    expect(JSON.stringify(modelRequests[1])).toContain(image);
  } finally {await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
