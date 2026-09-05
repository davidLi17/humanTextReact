import { MESSAGE_TYPES } from "./constants";
import type { WebPageMetadata } from "./webReadingPrompt";

/**
 * 侧边栏工具函数
 */
export interface SidePanelTarget {
  windowId?: number;
  tabId?: number;
}

const SIDE_PANEL_TOGGLE_DEDUPE_MS = 500;
const recentSidePanelToggles = new Map<
  string,
  { startedAt: number; result: Promise<boolean> }
>();

export async function openSidePanel(target: SidePanelTarget): Promise<boolean> {
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

function getSidePanelToggleKey(target: SidePanelTarget): string {
  if (typeof target.windowId === "number") return `window:${target.windowId}`;
  if (typeof target.tabId === "number") return `tab:${target.tabId}`;
  return "unknown";
}

async function performSidePanelToggle(
  target: SidePanelTarget
): Promise<boolean> {
  try {
    const chromeApi = (globalThis as any).chrome;
    const browserApi = (globalThis as any).browser;
    const sidePanelApi = browserApi?.sidePanel || chromeApi?.sidePanel;
    const runtimeApi = browserApi?.runtime || chromeApi?.runtime;

    if (!sidePanelApi || !runtimeApi) return false;

    let isOpen = false;
    if (typeof runtimeApi.getContexts === "function") {
      const filter: Record<string, unknown> = {
        contextTypes: ["SIDE_PANEL"],
      };
      if (typeof target.windowId === "number") {
        filter.windowIds = [target.windowId];
      } else if (typeof target.tabId === "number") {
        filter.tabIds = [target.tabId];
      }

      const contexts = await runtimeApi.getContexts(filter);
      isOpen = Array.isArray(contexts) && contexts.length > 0;
    }

    if (isOpen) {
      if (typeof sidePanelApi.close !== "function") {
        console.warn("当前 Chrome 版本不支持通过快捷键关闭侧边栏");
        return false;
      }

      if (typeof target.windowId === "number") {
        await sidePanelApi.close({ windowId: target.windowId });
        return true;
      }
      if (typeof target.tabId === "number") {
        await sidePanelApi.close({ tabId: target.tabId });
        return true;
      }
      return false;
    }

    return openSidePanel(target);
  } catch (error) {
    console.error("切换侧边栏失败:", error);
    return false;
  }
}

/**
 * 快捷键专用的侧边栏开关。
 * Content Script 与 commands API 可能同时收到一次按键，因此按窗口合并短时间内的重复请求。
 */
export function toggleSidePanel(target: SidePanelTarget): Promise<boolean> {
  const key = getSidePanelToggleKey(target);
  const now = Date.now();
  const recent = recentSidePanelToggles.get(key);
  if (recent && now - recent.startedAt < SIDE_PANEL_TOGGLE_DEDUPE_MS) {
    return recent.result;
  }

  const result = performSidePanelToggle(target);
  recentSidePanelToggles.set(key, { startedAt: now, result });
  return result;
}

/**
 * 判断是否属于浏览器内置受限页面（不允许注入脚本和提取）
 */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase().trim();
  return (
    lower.startsWith("chrome://") ||
    lower.startsWith("edge://") ||
    lower.startsWith("about:") ||
    lower.startsWith("chrome-extension://") ||
    lower.startsWith("devtools://") ||
    lower.startsWith("view-source:")
  );
}

export interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  windowId?: number;
}

/**
 * 获取当前活动标签页 (Active Tab)
 */
export async function getActiveTab(): Promise<TabInfo | null> {
  try {
    const browserApi = (globalThis as any).browser || (globalThis as any).chrome;
    if (!browserApi?.tabs?.query) return null;

    const tabs = await browserApi.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs && tabs.length > 0 ? tabs[0] : null;
  } catch (err) {
    console.error("获取当前标签页失败:", err);
    return null;
  }
}

/**
 * 从当前活动标签页中提取正文信息
 */
export async function extractActiveTabContent(): Promise<{
  success: boolean;
  data?: WebPageMetadata;
  error?: string;
}> {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab || typeof activeTab.id !== "number") {
      return {
        success: false,
        error: "无法获取当前活动标签页，请确保有打开的网页标签。",
      };
    }

    if (isRestrictedUrl(activeTab.url)) {
      return {
        success: false,
        error: "浏览器内置系统页面（如 chrome:// 等）不支持提取正文，请切换到常规网页重试。",
      };
    }

    const browserApi = (globalThis as any).browser || (globalThis as any).chrome;

    // 向 content script 发送提取请求
    try {
      const response = await browserApi.tabs.sendMessage(activeTab.id, {
        action: MESSAGE_TYPES.EXTRACT_PAGE_CONTENT,
      });

      if (response && response.success && response.data) {
        return {
          success: true,
          data: {
            title: response.data.title || activeTab.title || "未知网页",
            url: response.data.url || activeTab.url || "",
            content: response.data.content || "",
            excerpt: response.data.excerpt || "",
            wordCount: response.data.wordCount || 0,
          },
        };
      }
    } catch (tabSendError: any) {
      // 可能是刚打开标签页还未注入 content script，尝试通过 executeScript 动态提取
      console.warn("向标签页发送提取消息失败，尝试动态提取:", tabSendError);
    }

    // 动态提取兜底逻辑（在网页环境中直接执行提取脚本）
    if (browserApi.scripting?.executeScript) {
      const results = await browserApi.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const doc = document;
          const title =
            doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
            doc.querySelector("h1")?.textContent?.trim() ||
            doc.title ||
            "网页内容";
          const clone = (doc.querySelector("article, main, [role='main']") || doc.body).cloneNode(true) as HTMLElement;
          const noise = clone.querySelectorAll("script, style, noscript, nav, footer, header, aside, .ad");
          noise.forEach((n) => n.remove());
          const text = clone.innerText || clone.textContent || "";
          return {
            title,
            url: window.location.href,
            content: text.replace(/\s+/g, " ").trim(),
            wordCount: text.length,
          };
        },
      });

      if (results && results[0] && results[0].result) {
        const res = results[0].result;
        return {
          success: true,
          data: {
            title: res.title || activeTab.title || "网页内容",
            url: res.url || activeTab.url || "",
            content: res.content || "",
            wordCount: res.wordCount || 0,
          },
        };
      }
    }

    return {
      success: false,
      error: "无法提取该网页正文，页面可能尚未完全加载或脚本被拦截。",
    };
  } catch (error: any) {
    console.error("提取当前网页失败:", error);
    return {
      success: false,
      error: error?.message || "提取网页正文失败，请刷新网页后再试。",
    };
  }
}
