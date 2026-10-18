import {encodeScreenshot} from "../../entrypoints/background/screenshotEncoding";
// Real IndexedDB, Web Locks, React previews and production session/transport code.
// Only extension APIs and the model HTTP response are mocked by the browser test.
import React from "react";
import {createRoot} from "react-dom/client";
import {StoredImage} from "../../entrypoints/sidepanel/components/StoredImage";
import {WebReadingProgressStorage, loadWebReadingHydrationSnapshot} from "../../entrypoints/sidepanel/webReadingProgressStorage";
import {buildHistoryPayload} from "../../entrypoints/shared/chatTypes";
import {exportSessionImages} from "../../entrypoints/shared/imageStore";
import {sendImageRequest, restoreImageRequest} from "../../entrypoints/shared/imageMessageTransport";
import {buildMessagesPayload} from "../../entrypoints/background/translationService";
const w = window as any;
w.encodeScreenshot = encodeScreenshot;
function area(storage: Storage) {
  return {
    async get(keys: string | string[] | null) {
      const all = JSON.parse(storage.getItem("extension-storage") || "{}");
      return keys === null ? all : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key=>key in all).map(key=>[key,all[key]]));
    },
    async set(items: any) { storage.setItem("extension-storage", JSON.stringify({...await this.get(null),...items})); },
  };
}
w.browser = {storage:{local:area(localStorage),session:area(sessionStorage)},runtime:{sendMessage:async(input: any)=> {
  w.wire = structuredClone(input);
  const request = structuredClone(input);
  await restoreImageRequest(request);
  const messages = buildMessagesPayload({messages:request.messages});
  await fetch("/mock-model", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"mock-vision",messages})});
  w.model = messages;
  return {success:true};
}}};
const coordinator = new WebReadingProgressStorage();
const root = createRoot(document.getElementById("root")!);
w.refresh = async () => {
  const {sessions} = await loadWebReadingHydrationSnapshot();
  w.sessions = sessions || [];
  root.render(<main><h2>历史截图 · IndexedDB</h2>{w.sessions.flatMap((session:any)=>session.messages.flatMap((message:any)=>
    (message.images || []).map((image:any,index:number)=><StoredImage key={session.id+message.id+index} src={image.data} alt="已保存的网页截图" style={{maxWidth:"100%"}}/>)))}</main>);
};
w.save = async (sessions: any[]) => {
  await coordinator.enqueueCheckpoint({progressMap:new Map(),sessions});
  await w.refresh();
};
w.exportImages = async () => exportSessionImages(w.sessions);
w.followup = async () => sendImageRequest({requestId:"browser-followup",source:"sidepanel",sessionId:w.sessions[0].id,
  messages:buildHistoryPayload(w.sessions[0].messages,{role:"user",content:"继续解释这张图"})});
void w.refresh();
