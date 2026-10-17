import {test,expect} from "bun:test";
import {captureElement} from "../../entrypoints/background/elementCapture";
import {preserveGlobals,setTestGlobal} from "../helpers/testEnvironment.js";
test("capture denied by activeTab permission gives user-invocation guidance without requesting broader permissions", async()=>{
  const restore=preserveGlobals("browser");
  try {
    setTestGlobal("browser",{tabs:{query:async()=>[{id:7}],captureVisibleTab:async()=>{throw new Error("Either the '<all_urls>' or 'activeTab' permission is required");}}});
    await expect(captureElement({viewport:{width:100,height:100},rect:{x:0,y:0,width:10,height:10},masks:[]},{tab:{id:7,windowId:1},frameId:0} as any)).rejects.toThrow("打开人话侧边栏");
  } finally {restore();}
});
