// Browser-only fixture: real feature modules; extension transport alone is mocked.
import React from "react";
import { createRoot } from "react-dom/client";
import { extractElementText } from "../../entrypoints/content/elementText";
import { ElementPicker } from "../../entrypoints/content/elementPicker";
import { captureElement } from "../../entrypoints/background/elementCapture";
import { ElementMarks } from "../../entrypoints/sidepanel/components/ElementMarks";
import { buildHistoryPayload } from "../../entrypoints/shared/chatTypes";
import { elementSnapshotText } from "../../entrypoints/shared/elementSnapshot";
const w = window as any;
w.extractElementText = extractElementText;
const listeners = new Set<any>();
w.deliver = (request: any, sender: any = {}) =>
  new Promise((resolve) => {
    let answered = false;
    for (const listener of listeners)
      listener(request, sender, (response: any) => {
        answered = true;
        resolve(response);
      });
    if (!answered) resolve(undefined);
  });
w.browser = {
  runtime: {
    onMessage: {
      addListener: (fn: any) => listeners.add(fn),
      removeListener: (fn: any) => listeners.delete(fn),
    },
    sendMessage: async (request: any) => {
      if (request.action === "captureElement")
        return captureElement(request, {
          tab: { id: 7, windowId: 1 },
          frameId: 0,
        } as any).catch((error) => ({ success: false, error: error.message }));
      if (request.action === "elementFocus") await w.forwardFocus(request);
      return { success: true };
    },
  },
  tabs: {
    get: async () => ({id:7,windowId:1,url:"http://fixture.test"}),
    query: async () => [{ id: 7, windowId: 1, url: "http://fixture.test" }],
    sendMessage: async (_id: number, request: any) =>
      w.forwardToContent(request),
    captureVisibleTab: async () => w.captureViewport(),
  },
};
if (location.pathname === "/sidepanel.html") {
  createRoot(document.getElementById("root")!).render(
    <ElementMarks
      disabled={false}
      onSend={(items) => {
        const stored = {
          role: "user" as const,
          content: elementSnapshotText(items),
          images: items.map((item) => ({
            data: item.image,
            mimeType: "image/png",
          })),
        };
        localStorage.setItem("snapshot", JSON.stringify(stored));
        w.sent = buildHistoryPayload([stored]);
        w.sendCount = (w.sendCount || 0) + 1;
        return true;
      }}
    />,
  );
  w.followup = () =>
    buildHistoryPayload([JSON.parse(localStorage.getItem("snapshot")!)], {
      role: "user",
      content: "继续解释",
    });
} else {
  const picker = new ElementPicker();
  w.destroyPicker = () => picker.destroy();
}
