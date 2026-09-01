/**
 * 侧边栏工具函数
 */
export async function openSidePanel(target: {
  windowId?: number;
  tabId?: number;
}): Promise<boolean> {
  try {
    const chromeApi = (globalThis as any).chrome;
    const browserApi = (globalThis as any).browser;
    const sidePanelApi = browserApi?.sidePanel || chromeApi?.sidePanel;

    if (typeof sidePanelApi?.open === "function") {
      if (typeof target.windowId === "number") {
        await sidePanelApi.open({ windowId: target.windowId });
        return true;
      }
      if (typeof target.tabId === "number") {
        await sidePanelApi.open({ tabId: target.tabId });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("打开侧边栏失败:", error);
    return false;
  }
}
